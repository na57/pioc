import mysql from 'mysql2/promise';
import { MongoClient, Document } from 'mongodb';
import type { DataSource } from '../database/models/dataSource';

export interface FieldComment {
  name: string;
  comment: string;
}

export interface QueryResult {
  success: boolean;
  data: unknown[];
  total?: number;
  error?: string;
  fieldComments?: FieldComment[];
}

export interface QueryOptions {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

class DataSourceQueryService {
  async executeQuery(
    dataSource: DataSource,
    queryStatement: string,
    options?: QueryOptions
  ): Promise<QueryResult> {
    try {
      let data: any[] = [];
      let total = 0;

      if (dataSource.type === 'mysql') {
        data = await this.executeMySQLQuery(dataSource, queryStatement, options);
        total = await this.getMySQLTotalCount(dataSource, queryStatement);
      } else if (dataSource.type === 'mongodb') {
        data = await this.executeMongoDBQuery(dataSource, queryStatement, options);
        total = await this.getMongoDBTotalCount(dataSource, queryStatement);
      } else {
        throw new Error(`不支持的数据源类型: ${dataSource.type}`);
      }

      return {
        success: true,
        data,
        total,
      };
    } catch (error) {
      console.error('查询执行失败:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  private async executeMySQLQuery(
    dataSource: DataSource,
    queryStatement: string,
    options?: QueryOptions
  ): Promise<unknown[]> {
    const connection = await mysql.createConnection({
      host: dataSource.host,
      port: dataSource.port,
      user: dataSource.username,
      password: dataSource.password,
      database: dataSource.db_name,
      connectTimeout: 10000,
    });

    try {
      // 添加分页限制
      let finalQuery = queryStatement;
      if (options?.page && options?.pageSize) {
        const offset = (options.page - 1) * options.pageSize;
        finalQuery = `${queryStatement} LIMIT ${options.pageSize} OFFSET ${offset}`;
      }

      const [rows] = await connection.query(finalQuery);
      return rows as any[];
    } finally {
      await connection.end();
    }
  }

  private async getMySQLTotalCount(
    dataSource: DataSource,
    queryStatement: string
  ): Promise<number> {
    const connection = await mysql.createConnection({
      host: dataSource.host,
      port: dataSource.port,
      user: dataSource.username,
      password: dataSource.password,
      database: dataSource.db_name,
      connectTimeout: 10000,
    });

    try {
      // 将原始查询包装为子查询来计算总数
      const countQuery = `SELECT COUNT(*) as total FROM (${queryStatement}) as t`;
      const [rows] = await connection.query(countQuery);
      const result = rows as { total: number }[];
      return result[0]?.total || 0;
    } finally {
      await connection.end();
    }
  }

  private async executeMongoDBQuery(
    dataSource: DataSource,
    queryStatement: string,
    options?: QueryOptions
  ): Promise<unknown[]> {
    const uri = `mongodb://${dataSource.username}:${encodeURIComponent(dataSource.password)}@${dataSource.host}:${dataSource.port}/${dataSource.db_name}`;
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 10000,
    });

    try {
      await client.connect();
      const db = client.db(dataSource.db_name);

      // Parse collection name from query statement
      const collectionName = this.extractMongoCollectionName(queryStatement);
      const collection = db.collection(collectionName);

      // Parse aggregation pipeline if provided
      const pipeline = this.parseMongoQuery(queryStatement);

      let cursor;
      if (pipeline.length > 0) {
        cursor = collection.aggregate(pipeline);
      } else {
        cursor = collection.find({});
      }

      // Apply pagination
      if (options?.page && options?.pageSize) {
        cursor = cursor.skip((options.page - 1) * options.pageSize).limit(options.pageSize);
      }

      return await cursor.toArray();
    } finally {
      await client.close();
    }
  }

  private async getMongoDBTotalCount(
    dataSource: DataSource,
    queryStatement: string
  ): Promise<number> {
    const uri = `mongodb://${dataSource.username}:${encodeURIComponent(dataSource.password)}@${dataSource.host}:${dataSource.port}/${dataSource.db_name}`;
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 10000,
    });

    try {
      await client.connect();
      const db = client.db(dataSource.db_name);

      // Parse collection name from query statement
      const collectionName = this.extractMongoCollectionName(queryStatement);
      const collection = db.collection(collectionName);

      // Parse aggregation pipeline if provided
      const pipeline = this.parseMongoQuery(queryStatement);

      if (pipeline.length > 0) {
        // 对于聚合管道，添加 $count 阶段
        const countPipeline = [...pipeline, { $count: 'total' }];
        const result = await collection.aggregate(countPipeline).toArray();
        return result[0]?.total || 0;
      } else {
        // 简单查询，直接统计文档数
        return await collection.countDocuments();
      }
    } finally {
      await client.close();
    }
  }

  private extractMongoCollectionName(query: string): string {
    // Try to extract from db.collectionName.aggregate() or db.collectionName.find()
    const collectionMatch = query.match(/db\.(\w+)\./);
    if (collectionMatch) return collectionMatch[1];

    // Try to extract from getCollection("collectionName")
    const getCollectionMatch = query.match(/getCollection\s*\(\s*['"]?([^'"\)]+)['"]?\s*\)/);
    if (getCollectionMatch) return getCollectionMatch[1];

    // Default fallback
    return 'collection';
  }

  private parseMongoQuery(query: string): Document[] {
    try {
      // Try to extract aggregation pipeline - use [\s\S] instead of s flag for compatibility
      const aggregateMatch = query.match(/aggregate\s*\(([\s\S]*)\)/);
      if (aggregateMatch) {
        const pipelineStr = aggregateMatch[1].trim();
        return JSON.parse(pipelineStr) as Document[];
      }
    } catch (error) {
      console.warn('解析MongoDB聚合管道失败:', error);
    }
    return [];
  }

  async testConnection(dataSource: DataSource): Promise<{ success: boolean; message: string }> {
    try {
      if (dataSource.type === 'mysql') {
        const connection = await mysql.createConnection({
          host: dataSource.host,
          port: dataSource.port,
          user: dataSource.username,
          password: dataSource.password,
          database: dataSource.db_name,
          connectTimeout: 5000,
        });

        try {
          await connection.execute('SELECT 1');
          return { success: true, message: 'MySQL 连接成功' };
        } finally {
          await connection.end();
        }
      } else if (dataSource.type === 'mongodb') {
        const uri = `mongodb://${dataSource.username}:${encodeURIComponent(dataSource.password)}@${dataSource.host}:${dataSource.port}/${dataSource.db_name}`;
        const client = new MongoClient(uri, {
          serverSelectionTimeoutMS: 5000,
        });

        try {
          await client.connect();
          await client.db(dataSource.db_name).command({ ping: 1 });
          return { success: true, message: 'MongoDB 连接成功' };
        } finally {
          await client.close();
        }
      } else {
        return { success: false, message: `不支持的数据源类型: ${dataSource.type}` };
      }
    } catch (error) {
      return {
        success: false,
        message: `连接失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }

  // Preview query - limited results for testing
  async previewQuery(dataSource: DataSource, queryStatement: string): Promise<QueryResult> {
    const result = await this.executeQuery(dataSource, queryStatement, { page: 1, pageSize: 10 });
    
    // 获取字段注释（仅 MySQL）
    if (result.success && dataSource.type === 'mysql') {
      try {
        const fieldComments = await this.getMySQLFieldComments(dataSource, queryStatement);
        result.fieldComments = fieldComments;
      } catch (error) {
        console.warn('获取字段注释失败:', error);
        // 获取注释失败不影响主功能
      }
    }
    
    return result;
  }

  // 获取 MySQL 表字段注释
  async getMySQLFieldComments(
    dataSource: DataSource,
    queryStatement: string
  ): Promise<FieldComment[]> {
    const connection = await mysql.createConnection({
      host: dataSource.host,
      port: dataSource.port,
      user: dataSource.username,
      password: dataSource.password,
      database: dataSource.db_name,
      connectTimeout: 10000,
    });

    try {
      // 从查询语句中提取表名
      const tableName = this.extractTableNameFromQuery(queryStatement);
      if (!tableName) {
        return [];
      }

      // 查询 INFORMATION_SCHEMA 获取字段注释
      const [rows] = await connection.query(
        `SELECT COLUMN_NAME as name, COLUMN_COMMENT as comment 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
        [dataSource.db_name, tableName]
      );

      return (rows as { name: string; comment: string }[]).map(row => ({
        name: row.name,
        comment: row.comment || row.name, // 如果没有注释，使用字段名
      }));
    } finally {
      await connection.end();
    }
  }

  // 从查询语句中提取表名
  private extractTableNameFromQuery(queryStatement: string): string | null {
    // 匹配 SELECT ... FROM table_name ...
    const fromMatch = queryStatement.match(/FROM\s+(\w+)/i);
    if (fromMatch) {
      return fromMatch[1];
    }
    return null;
  }
}

export const queryService = new DataSourceQueryService();
export default queryService;
