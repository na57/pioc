/**
 * 数据对象Schema生成服务
 * 从数据库读取表结构，结合数据对象的query_statement生成AI可用的Schema描述
 */

import { findById, DataObject, update } from '@/lib/database/models/dataObject';
import { findById as findDataSourceById } from '@/lib/database/models/dataSource';
import { getConfig } from '@/lib/config';
import * as mysql from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

interface ColumnInfo {
  columnName: string;
  dataType: string;
  columnComment: string | null;
  isNullable: string;
  columnDefault: string | null;
}

interface TableSchema {
  tableName: string;
  columns: ColumnInfo[];
}

export interface SchemaGenerationResult {
  success: boolean;
  schema?: string;
  error?: string;
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

export class DataObjectSchemaService {
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
   * 调用AI服务
   */
  private async callAI(prompt: string, temperature: number = 0.1): Promise<string> {
    const { aiModel, aiApiUrl, aiApiKey } = await this.getAIConfig();

    const response = await fetch(aiApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aiApiKey}`,
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        temperature,
        max_tokens: 4000,
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
   * 清理AI响应中的思考过程标签
   * 移除 <think>...</think> 标签及其内容
   */
  private cleanThinkTags(content: string): string {
    // 移除 <think>...</think> 标签及其内容（支持多行）
    return content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  }

  /**
   * 从SQL语句中提取表名
   */
  private extractTableNames(sql: string): string[] {
    const tableNames: string[] = [];
    
    // 匹配 FROM 子句
    const fromRegex = /FROM\s+(\w+)(?:\s+AS\s+\w+)?/gi;
    let match;
    while ((match = fromRegex.exec(sql)) !== null) {
      tableNames.push(match[1]);
    }

    // 匹配 JOIN 子句
    const joinRegex = /JOIN\s+(\w+)(?:\s+AS\s+\w+)?/gi;
    while ((match = joinRegex.exec(sql)) !== null) {
      tableNames.push(match[1]);
    }

    // 去重
    return [...new Set(tableNames)];
  }

  /**
   * 获取数据源的连接
   */
  private async getDataSourceConnection(dataSourceId: string): Promise<mysql.Connection> {
    const dataSource = await findDataSourceById(dataSourceId);
    if (!dataSource) {
      throw new Error(`数据源不存在: ${dataSourceId}`);
    }

    if (dataSource.status !== 1) {
      throw new Error(`数据源已禁用: ${dataSourceId}`);
    }

    if (dataSource.type !== 'mysql') {
      throw new Error(`暂不支持非MySQL数据源: ${dataSource.type}`);
    }

    const connection = await mysql.createConnection({
      host: dataSource.host,
      port: dataSource.port,
      user: dataSource.username,
      password: dataSource.password,
      database: dataSource.db_name,
      connectTimeout: 10000,
    });

    return connection;
  }

  /**
   * 从数据库获取表结构
   */
  private async getTableSchemas(
    connection: mysql.Connection,
    databaseName: string,
    tableNames: string[]
  ): Promise<TableSchema[]> {
    const schemas: TableSchema[] = [];

    for (const tableName of tableNames) {
      const [rows] = await connection.execute(
        `SELECT 
          COLUMN_NAME as columnName,
          DATA_TYPE as dataType,
          COLUMN_COMMENT as columnComment,
          IS_NULLABLE as isNullable,
          COLUMN_DEFAULT as columnDefault
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION`,
        [databaseName, tableName]
      );

      schemas.push({
        tableName,
        columns: rows as ColumnInfo[],
      });
    }

    return schemas;
  }

  /**
   * 生成Schema描述
   */
  async generateSchema(dataObjectId: number): Promise<SchemaGenerationResult> {
    let connection: mysql.Connection | null = null;

    try {
      // 1. 获取数据对象
      const dataObject = await findById(dataObjectId);
      if (!dataObject) {
        return { success: false, error: `数据对象不存在: ${dataObjectId}` };
      }

      if (dataObject.status !== 1) {
        return { success: false, error: `数据对象已禁用: ${dataObjectId}` };
      }

      // 2. 提取表名
      const tableNames = this.extractTableNames(dataObject.query_statement);
      if (tableNames.length === 0) {
        return { success: false, error: '无法从查询语句中提取表名' };
      }

      // 3. 连接数据源
      connection = await this.getDataSourceConnection(dataObject.data_source_id);

      // 4. 获取数据库名称
      const dataSource = await findDataSourceById(dataObject.data_source_id);
      const databaseName = dataSource?.db_name || '';

      // 5. 获取表结构
      const tableSchemas = await this.getTableSchemas(connection, databaseName, tableNames);

      // 6. 使用AI生成Schema描述
      const schemaPrompt = `
你是一位数据库专家。基于以下信息，生成一个适合AI理解的Schema描述，用于Text-to-SQL任务。

数据对象名称: ${dataObject.name}
数据对象描述: ${dataObject.description || '无'}

基础查询SQL（数据对象的query_statement）:
${dataObject.query_statement}

涉及的表结构信息:
${JSON.stringify(tableSchemas, null, 2)}

请生成一个清晰、详细的Schema描述，包含以下内容：

1. **数据对象概述**: 简要说明这个数据对象包含什么数据

2. **可用字段**: 
   - 列出所有可以在查询中使用的字段
   - 说明每个字段的名称、类型、含义
   - 如果有字段注释，使用注释说明；如果没有，根据字段名推测含义

3. **常用查询场景**: 
   - 列举3-5个常见的查询场景示例
   - 说明每个场景涉及哪些字段

4. **注意事项**:
   - 字段的数据类型和取值范围
   - 特殊字段的处理方式（如日期、枚举值等）

输出格式要求:
- 使用Markdown格式
- 结构清晰，层次分明
- 字段说明使用表格形式
- 不要包含任何SQL示例（AI会根据这个Schema生成SQL）
`;

      const schemaDescription = await this.callAI(schemaPrompt, 0.1);

      // 7. 清理思考过程标签（如 <think>...</think>）
      const cleanedSchema = this.cleanThinkTags(schemaDescription);

      // 8. 保存到数据对象
      await update(dataObjectId, {
        ai_schema: cleanedSchema,
        ai_schema_status: 1,
        ai_schema_updated_at: new Date(),
      });

      return {
        success: true,
        schema: schemaDescription,
      };
    } catch (error) {
      console.error('[Schema Service] 生成Schema失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  /**
   * 更新Schema（手动编辑）
   */
  async updateSchema(dataObjectId: number, schema: string): Promise<SchemaGenerationResult> {
    try {
      const dataObject = await findById(dataObjectId);
      if (!dataObject) {
        return { success: false, error: `数据对象不存在: ${dataObjectId}` };
      }

      await update(dataObjectId, {
        ai_schema: schema,
        ai_schema_status: 2, // 已编辑
        ai_schema_updated_at: new Date(),
      });

      return {
        success: true,
        schema,
      };
    } catch (error) {
      console.error('[Schema Service] 更新Schema失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 获取Schema
   */
  async getSchema(dataObjectId: number): Promise<SchemaGenerationResult> {
    try {
      const dataObject = await findById(dataObjectId);
      if (!dataObject) {
        return { success: false, error: `数据对象不存在: ${dataObjectId}` };
      }

      if (dataObject.ai_schema) {
        return {
          success: true,
          schema: dataObject.ai_schema,
        };
      }

      // 如果没有Schema，自动生成
      return await this.generateSchema(dataObjectId);
    } catch (error) {
      console.error('[Schema Service] 获取Schema失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }
}

// 导出单例
export const dataObjectSchemaService = new DataObjectSchemaService();
