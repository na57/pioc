/**
 * 数据对象AI查询服务
 * 支持Text-to-SQL查询，使用子查询模式
 */

import { findById, DataObject } from '@/lib/database/models/dataObject';
import { findById as findDataSourceById } from '@/lib/database/models/dataSource';
import { dataObjectSchemaService } from './data-object-schema-service';
import { getConfig } from '@/lib/config';
import * as mysql from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface AIQueryResult {
  success: boolean;
  question: string;
  answer?: string;
  sql?: string;
  result?: unknown;
  error?: string;
  userMessage?: string;
}

interface IntentExtraction {
  intent: string;
  queryType: 'filter' | 'aggregate' | 'sort' | 'limit' | 'complex';
  conditions: string[];
  aggregation?: {
    function: string;
    field: string;
    alias?: string;
  };
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  limit?: number;
}

// 数据对象应用配置接口
interface DataObjectAIConfig {
  providerId?: string;
  model?: string;
}

interface DataObjectAppConfig {
  configFile?: string;
  ai?: DataObjectAIConfig;
}

export class DataObjectAIQueryService {
  private readonly MAX_RETRIES = 3;

  /**
   * 获取数据对象应用配置
   * 1. 首先检查 config.yaml 中 apps.dataObject 的配置
   * 2. 如果配置了 configFile，则读取对应的子配置文件
   */
  private getDataObjectAppConfig(): DataObjectAppConfig | null {
    const mainConfig = getConfig();

    // 检查 apps.dataObject 配置
    const dataObjectConfig = mainConfig.apps?.dataObject as DataObjectAppConfig | undefined;
    if (!dataObjectConfig) {
      return null;
    }

    // 如果配置了 configFile，读取子配置文件
    if (dataObjectConfig.configFile) {
      const configPath = path.join(process.cwd(), 'config', dataObjectConfig.configFile);
      if (fs.existsSync(configPath)) {
        try {
          const fileContents = fs.readFileSync(configPath, 'utf8');
          const subConfig = yaml.load(fileContents) as DataObjectAppConfig;
          return { ...dataObjectConfig, ...subConfig };
        } catch (error) {
          console.warn(`读取数据对象子配置文件失败: ${configPath}`, error);
        }
      }
    }

    return dataObjectConfig;
  }

  /**
   * 获取AI配置
   * 优先级：
   * 1. apps.dataObject.ai.providerId（或子配置文件中的配置）
   * 2. config.yaml 中 ai.providers 的第一个配置
   */
  private async getAIConfig() {
    const mainConfig = getConfig();

    // 1. 首先尝试获取数据对象应用的专用AI配置
    const dataObjectAppConfig = this.getDataObjectAppConfig();
    let providerId = dataObjectAppConfig?.ai?.providerId;

    // 2. 如果没有专用配置，使用全局默认配置
    if (!providerId) {
      // 使用 ai.providers 的第一个 provider 的 providerId
      const firstProvider = mainConfig.ai?.providers?.[0];
      if (firstProvider) {
        providerId = firstProvider.providerId;
      }
    }

    if (!providerId) {
      throw new Error('未配置AI provider，请在 config.yaml 中配置 ai.providers');
    }

    // 3. 在全局 providers 中查找对应的 provider
    const provider = mainConfig.ai?.providers?.find((p) => p.providerId === providerId);

    if (!provider) {
      throw new Error(`未找到AI provider: ${providerId}`);
    }

    const aiModel = provider.models?.[0]?.modelId || 'gpt-4o';
    const aiApiUrl = `${provider.baseUrl}/chat/completions`;
    const aiApiKey = provider.apiKey;

    return { aiModel, aiApiUrl, aiApiKey };
  }

  /**
   * 调用AI服务（支持多轮对话）
   */
  private async callAI(
    prompt: string,
    temperature: number = 0.1,
    history?: Array<{ role: string; content: string }>
  ): Promise<string> {
    const { aiModel, aiApiUrl, aiApiKey } = await this.getAIConfig();

    // 构建消息列表，包含历史对话
    const messages: Array<{ role: string; content: string }> = [];

    // 添加系统提示，说明是多轮对话
    messages.push({
      role: 'system',
      content: '你是一个数据对象查询助手。请理解对话上下文，回答用户的问题。如果用户提到"刚才"、"之前"等词语，请参考历史对话理解其意图。',
    });

    // 添加历史消息（最多保留5轮对话）
    if (history && history.length > 0) {
      messages.push(...history.slice(-10)); // 保留最近10条消息（5轮）
    }

    // 添加当前用户消息
    messages.push({ role: 'user', content: prompt });

    const response = await fetch(aiApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aiApiKey}`,
      },
      body: JSON.stringify({
        model: aiModel,
        messages,
        stream: false,
        temperature,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API请求失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  /**
   * 验证SQL安全性
     */
  private validateSQLSafety(sql: string): { valid: boolean; error?: string } {
    const upperSQL = sql.trim().toUpperCase();

    // 必须是SELECT开头
    if (!upperSQL.startsWith('SELECT')) {
      return { valid: false, error: '只允许执行SELECT查询' };
    }

    // 禁止危险关键字
    const dangerousKeywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'TRUNCATE', 'ALTER', 'CREATE', 'GRANT', 'REVOKE'];
    for (const keyword of dangerousKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(sql)) {
        return { valid: false, error: `SQL包含禁止的操作: ${keyword}` };
      }
    }

    // 限制SQL长度
    if (sql.length > 5000) {
      return { valid: false, error: 'SQL语句过长' };
    }

    return { valid: true };
  }

  /**
   * 从AI响应中提取SQL
   */
  private extractSQL(response: string): { success: boolean; sql?: string; error?: string } {
    // 移除think标签
    const content = response.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // 尝试提取JSON格式
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        if (data.sql && typeof data.sql === 'string') {
          return { success: true, sql: data.sql.trim() };
        }
      }
    } catch (e) {
      // JSON解析失败，继续尝试其他方式
    }

    // 尝试提取代码块
    const codeBlockMatch = content.match(/```(?:sql)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      return { success: true, sql: codeBlockMatch[1].trim() };
    }

    // 尝试查找SELECT语句
    const sqlMatch = content.match(/\bSELECT\b[\s\S]*?;/i);
    if (sqlMatch) {
      return { success: true, sql: sqlMatch[0].trim() };
    }

    // 清理后返回
    const cleaned = content
      .replace(/```sql/gi, '')
      .replace(/```/g, '')
      .trim();

    if (cleaned.toUpperCase().startsWith('SELECT')) {
      return { success: true, sql: cleaned };
    }

    return {
      success: false,
      error: '无法从AI响应中提取有效的SQL语句',
    };
  }

  /**
   * 自动为SQL添加LIMIT限制
   */
  private addLimitToSQL(sql: string): string {
    // 清理SQL
    let cleanedSQL = sql.trim();

    // 移除末尾的分号
    cleanedSQL = cleanedSQL.replace(/;+$/, '');

    // 检查是否已经有 LIMIT
    const hasLimit = /\bLIMIT\s+\d+/i.test(cleanedSQL);

    if (hasLimit) {
      // 如果已有 LIMIT，检查是否超过100
      const limitMatch = cleanedSQL.match(/\bLIMIT\s+(\d+)/i);
      if (limitMatch) {
        const limitValue = parseInt(limitMatch[1], 10);
        if (limitValue > 100) {
          // 限制最大为100
          cleanedSQL = cleanedSQL.replace(/(\bLIMIT\s+)\d+/i, '$1100');
        }
      }
      return cleanedSQL;
    }

    // 检查是否是聚合查询（COUNT, SUM, AVG等）
    const isAggregate = /\b(COUNT|SUM|AVG|MAX|MIN)\s*\(/i.test(cleanedSQL);

    if (isAggregate) {
      // 聚合查询通常返回单行，不需要 LIMIT
      return cleanedSQL;
    }

    // 添加默认 LIMIT 20
    return `${cleanedSQL} LIMIT 20`;
  }

  /**
   * 提取查询意图（支持多轮对话上下文）
   */
  private async extractIntent(
    question: string,
    schema: string,
    history?: Array<{ role: string; content: string }>
  ): Promise<IntentExtraction> {
    // 构建上下文提示
    let contextPrompt = '';
    if (history && history.length > 0) {
      contextPrompt = '\n这是多轮对话，历史对话如下（供参考）：\n';
      history.slice(-6).forEach((msg) => {
        const role = msg.role === 'user' ? '用户' : '助手';
        contextPrompt += `${role}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}\n`;
      });
      contextPrompt += '\n当前用户问题可能引用之前的内容，请结合上下文理解。\n';
    }

    const prompt = `
你是一位意图分析专家。请分析用户的问题，提取查询意图和条件。

Schema描述:
${schema}
${contextPrompt}
当前用户问题: "${question}"

请分析并返回JSON格式的结果：
{
  "intent": "查询意图的简要描述",
  "queryType": "查询类型: filter/aggregate/sort/limit/complex",
  "conditions": ["条件1", "条件2", ...],
  "aggregation": {
    "function": "聚合函数: COUNT/SUM/AVG/MAX/MIN",
    "field": "聚合字段",
    "alias": "别名"
  },
  "orderBy": "排序字段",
  "orderDirection": "ASC或DESC",
  "limit": 限制条数(数字)
}

说明:
- queryType: filter(过滤)/aggregate(聚合)/sort(排序)/limit(限制)/complex(复杂)
- conditions: 字符串数组，每个元素是一个条件描述，如 "age > 18"
- aggregation: 只有当用户要求统计、计算总和/平均值等时才需要
- orderBy: 当用户要求排序时指定
- limit: 当用户要求限制条数时指定
- 如果是多轮对话，用户可能使用"刚才"、"之前"、"那个"等指代之前的查询，请结合上下文理解

只返回JSON，不要其他解释。
`;

    let content = await this.callAI(prompt, 0.1, history);
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : '{}';

    return JSON.parse(jsonStr);
  }

  /**
   * 生成SQL（使用子查询模式，支持多轮对话）
   */
  private async generateSQL(
    dataObject: DataObject,
    schema: string,
    intent: IntentExtraction,
    question: string,
    history?: Array<{ role: string; content: string }>
  ): Promise<{ success: boolean; sql?: string; error?: string }> {
    const cleanBaseQuery = dataObject.query_statement.trim().replace(/;$/, '');

    // 构建上下文提示
    let contextPrompt = '';
    if (history && history.length > 0) {
      contextPrompt = '\n这是多轮对话，历史对话如下（供参考）：\n';
      history.slice(-6).forEach((msg) => {
        const role = msg.role === 'user' ? '用户' : '助手';
        contextPrompt += `${role}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}\n`;
      });
      contextPrompt += '\n当前用户问题可能引用之前的内容，请结合上下文理解。\n';
    }

    const prompt = `
你是一位SQL专家。基于以下信息生成查询SQL。

重要规则：
1. **必须使用子查询模式**：SELECT ... FROM (${cleanBaseQuery}) AS t WHERE ...
2. 子查询别名固定为 "t"
3. 只使用SELECT查询，禁止其他操作
4. 使用标准MySQL语法

数据对象名称: ${dataObject.name}
Schema描述:
${schema}
${contextPrompt}
当前用户问题: "${question}"

意图分析:
- 查询类型: ${intent.queryType}
- 查询意图: ${intent.intent}
- 条件: ${intent.conditions?.join(', ') || '无'}
${intent.aggregation ? `- 聚合: ${intent.aggregation.function}(${intent.aggregation.field})` : ''}
${intent.orderBy ? `- 排序: ${intent.orderBy} ${intent.orderDirection || 'ASC'}` : ''}
${intent.limit ? `- 限制: ${intent.limit}条` : ''}

基础查询SQL（必须作为子查询）:
${dataObject.query_statement}

SQL生成要求:
${intent.queryType === 'aggregate' ? `
- 使用聚合函数: ${intent.aggregation?.function}(${intent.aggregation?.field})
- 如果需要分组，使用GROUP BY
- 示例: SELECT ${intent.aggregation?.function || 'COUNT'}(*) as result FROM (${cleanBaseQuery}) AS t WHERE ...
` : `
- 使用SELECT * 或指定字段
- **必须添加 LIMIT 限制，最多返回100条数据**
- 如果用户没有指定数量，默认使用 LIMIT 20
- 示例: SELECT * FROM (${cleanBaseQuery}) AS t WHERE ... LIMIT 20
`}

重要规则:
- 严禁生成没有 LIMIT 的查询语句
- 即使使用聚合函数，也要确保不会扫描全表（通过WHERE条件限制）

请以JSON格式返回: {"sql": "生成的SQL语句", "explanation": "简要说明"}
`;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.log(`[DataObject AI] SQL生成尝试 ${attempt}/${this.MAX_RETRIES}`);
        const response = await this.callAI(prompt, 0.1, history);
        console.log(`[DataObject AI] AI原始响应:`, response.substring(0, 500));

        const extractResult = this.extractSQL(response);

        if (!extractResult.success) {
          console.warn(`[DataObject AI] 第${attempt}次尝试提取SQL失败:`, extractResult.error);
          continue;
        }

        let sql = extractResult.sql!;

        // 安全检查
        const safetyCheck = this.validateSQLSafety(sql);
        if (!safetyCheck.valid) {
          console.warn(`[DataObject AI] 第${attempt}次尝试SQL安全检查失败:`, safetyCheck.error);
          continue;
        }

        // 自动添加 LIMIT 限制（如果AI没有添加）
        sql = this.addLimitToSQL(sql);

        console.log(`[DataObject AI] SQL生成成功:`, sql.substring(0, 200));
        return { success: true, sql };
      } catch (error) {
        console.error(`[DataObject AI] 第${attempt}次尝试异常:`, error);
      }
    }

    return {
      success: false,
      error: 'SQL生成失败，已重试多次',
    };
  }

  /**
   * 执行查询
   */
  private async executeQuery(
    dataSourceId: string,
    sql: string
  ): Promise<{ success: boolean; data?: unknown[]; error?: string }> {
    let connection: mysql.Connection | null = null;

    try {
      const dataSource = await findDataSourceById(dataSourceId);
      if (!dataSource) {
        return { success: false, error: `数据源不存在: ${dataSourceId}` };
      }

      if (dataSource.status !== 1) {
        return { success: false, error: `数据源已禁用: ${dataSourceId}` };
      }

      connection = await mysql.createConnection({
        host: dataSource.host,
        port: dataSource.port,
        user: dataSource.username,
        password: dataSource.password,
        database: dataSource.db_name,
        connectTimeout: 10000,
      });

      const [rows] = await connection.query(sql);
      return { success: true, data: rows as unknown[] };
    } catch (error) {
      console.error('[DataObject AI] SQL执行失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '执行查询失败',
      };
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  /**
   * 清理AI响应中的思考过程标签
   * 移除 <think>...</think> 标签及其内容
   */
  private cleanThinkTags(content: string): string {
    // 移除 <think>...</think> 标签及其内容（支持多行）
    return content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  }

  /**
   * 生成自然语言回答
   */
  private async generateAnswer(
    question: string,
    sql: string,
    result: unknown
  ): Promise<string> {
    const prompt = `
你是一位数据查询助手。请根据查询结果回答用户的问题。

用户问题: "${question}"

执行的SQL: ${sql}

查询结果: ${JSON.stringify(result, null, 2)}

要求:
1. 用自然语言回答用户的问题
2. 基于查询结果给出准确的数据
3. 回答要简洁明了
4. 如果结果是空数组，说明没有找到相关数据
5. 可以适当补充一些分析或建议

回答:
`;

    const answer = await this.callAI(prompt, 0.3);
    // 如果回答为空，返回默认回答
    if (!answer || answer.trim() === '') {
      return `查询已完成。共找到 ${Array.isArray(result) ? result.length : 0} 条数据。`;
    }
    return answer;
  }

  /**
   * 处理用户查询（支持多轮对话）
   */
  async processQuery(
    dataObjectId: number,
    question: string,
    history?: Array<{ role: string; content: string }>
  ): Promise<AIQueryResult> {
    try {
      // 1. 获取数据对象
      const dataObject = await findById(dataObjectId);
      if (!dataObject) {
        return {
          success: false,
          question,
          error: `数据对象不存在: ${dataObjectId}`,
          userMessage: '数据对象不存在',
        };
      }

      if (dataObject.status !== 1) {
        return {
          success: false,
          question,
          error: `数据对象已禁用: ${dataObjectId}`,
          userMessage: '数据对象已禁用',
        };
      }

      // 2. 获取Schema（如果不存在则自动生成）
      const schemaResult = await dataObjectSchemaService.getSchema(dataObjectId);
      if (!schemaResult.success) {
        return {
          success: false,
          question,
          error: schemaResult.error,
          userMessage: '获取数据对象Schema失败',
        };
      }

      const schema = schemaResult.schema!;

      // 3. 提取查询意图（支持多轮对话上下文）
      const intent = await this.extractIntent(question, schema, history);

      // 4. 生成SQL（支持多轮对话）
      const sqlResult = await this.generateSQL(dataObject, schema, intent, question, history);
      if (!sqlResult.success) {
        return {
          success: false,
          question,
          error: sqlResult.error,
          userMessage: '生成查询语句失败，请换个问题试试',
        };
      }

      const sql = sqlResult.sql!;

      // 5. 执行查询
      const queryResult = await this.executeQuery(dataObject.data_source_id, sql);
      if (!queryResult.success) {
        return {
          success: false,
          question,
          sql,
          error: queryResult.error,
          userMessage: '执行查询失败，请稍后重试',
        };
      }

      // 6. 生成自然语言回答
      const answer = await this.generateAnswer(question, sql, queryResult.data);

      return {
        success: true,
        question,
        answer,
        sql,
        result: queryResult.data,
      };
    } catch (error) {
      console.error('[DataObject AI] 查询处理失败:', error);
      return {
        success: false,
        question,
        error: String(error),
        userMessage: '处理查询时出现错误，请稍后重试',
      };
    }
  }
}

// 导出单例
export const dataObjectAIQueryService = new DataObjectAIQueryService();
