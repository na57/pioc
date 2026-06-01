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
import {
  BaseAIQueryService,
  BaseAIQueryResult,
  AIConfig,
} from './base-ai-query-service';

export interface AIQueryResult extends BaseAIQueryResult {}

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

export class DataObjectAIQueryService extends BaseAIQueryService {
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
  protected async getAIConfig(): Promise<AIConfig> {
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
- 聚合查询示例: SELECT ${intent.aggregation?.function || 'COUNT'}(*) as result FROM (${cleanBaseQuery}) AS t
- 带条件的聚合查询示例: SELECT ${intent.aggregation?.function || 'COUNT'}(*) as result FROM (${cleanBaseQuery}) AS t WHERE age > 18
- 带分组的聚合查询示例: SELECT category, ${intent.aggregation?.function || 'COUNT'}(*) as count FROM (${cleanBaseQuery}) AS t GROUP BY category
` : `
- 使用SELECT * 或指定字段
- **必须添加 LIMIT 限制，默认返回1000条，最多10000条**
- 如果用户没有指定数量，默认使用 LIMIT 1000
- 无条件查询示例: SELECT * FROM (${cleanBaseQuery}) AS t LIMIT 1000
- 带条件查询示例: SELECT * FROM (${cleanBaseQuery}) AS t WHERE status = 1 LIMIT 1000
`}

重要规则:
- 严禁生成没有 LIMIT 的查询语句（聚合查询除外）
- 如果没有WHERE条件，不要添加WHERE关键字
- 示例中的"..."只是占位符，实际生成时必须替换为具体条件

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
   * 获取日志前缀
   */
  protected getLogPrefix(): string {
    return 'DataObject AI';
  }

  /**
   * 构建生成回答和图表配置的 prompt 模板
   */
  protected buildAnswerChartPrompt(
    question: string,
    sql: string,
    result: unknown
  ): string {
    return `
你是一位数据查询助手。请根据查询结果回答用户的问题，并推荐合适的图表展示方式。

用户问题: "${question}"

执行的SQL: ${sql}

查询结果: ${JSON.stringify(result, null, 2)}

要求:
1. 用自然语言回答用户的问题
2. 基于查询结果给出准确的数据
3. 回答要简洁明了
4. 如果结果是空数组，说明没有找到相关数据
5. 可以适当补充一些分析或建议

图表配置推荐:
请分析查询结果，判断是否应该显示图表，以及如何选择合适的图表配置：
- 如果是列表类查询（如"有哪些记录"、"显示前10条"），showChart应为false
- 如果是统计类查询（如"各分类数量"、"平均值"、"总计"），showChart应为true
- 横轴标签字段应选择有意义的名称字段（如name、title、code等），避免使用id字段
- 数值字段应选择统计值或数量字段

必须以JSON格式返回，格式如下：
{
  "answer": "自然语言回答",
  "chartRecommendation": {
    "showChart": true/false,
    "reason": "推荐理由",
    "labelField": "横轴标签字段名（如name、title、code等，避免id）",
    "valueFields": ["数值字段1", "数值字段2"],
    "seriesNames": {
      "project_count": "项目数量",
      "device_count": "设备数量",
      "total_count": "总数",
      "avg_value": "平均值"
    },
    "suggestedType": "bar/line/pie/area",
    "title": "图表标题",
    "xAxisTitle": "X轴标题",
    "yAxisTitle": "Y轴标题"
  }
}

注意：
- seriesNames用于将SQL字段名映射为友好的中文显示名称
- 常见的数值字段如count、sum、avg等应该映射为"数量"、"总和"、"平均值"等
- 如果字段名本身就很清晰（如"temperature"），可以保持原样或映射为"温度"

只返回JSON，不要其他内容。
`;
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

      // 6. 生成自然语言回答和图表配置
      const { answer, chartRecommendation } = await this.generateAnswerAndChartConfig(question, sql, queryResult.data);

      return {
        success: true,
        question,
        answer,
        sql,
        result: queryResult.data,
        chartRecommendation,
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
