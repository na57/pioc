/**
 * 通用数据访问框架 - 数据查询服务
 * 提供统一的数据查询接口，支持数据对象和直接表名两种方式
 */

import * as mysql from 'mysql2/promise';
import { findById as findDataObjectById } from '../database/models/dataObject';
import { findById as findDataSourceById } from '../database/models/dataSource';
import { getPool } from '../database/connection';
import {
  TableConfig,
  QueryOptions,
  QueryResult,
  DataSourceInfo,
} from './types';
import { validateTableConfig, buildWhereClause, SimpleCache } from './utils';

/**
 * 数据源连接管理器
 * 支持连接复用和缓存
 */
class ConnectionManager {
  private connections = new Map<string, mysql.Connection>();
  private cache = new SimpleCache<mysql.Connection>(5 * 60 * 1000); // 5分钟缓存

  /**
   * 获取数据源连接
   * 如果数据源ID为空或数据源不存在，则使用主数据库连接
   */
  async getConnection(dataSourceId: string): Promise<{ connection: mysql.Connection; isMainDb: boolean }> {
    // 如果数据源ID为空，直接使用主数据库
    if (!dataSourceId) {
      const pool = getPool();
      const connection = await pool.getConnection();
      return { connection: connection as unknown as mysql.Connection, isMainDb: true };
    }

    // 获取数据源配置
    const dataSource = await findDataSourceById(dataSourceId);
    if (!dataSource) {
      // 数据源不存在，使用主数据库连接
      console.warn(`数据源不存在: ${dataSourceId}，使用主数据库连接`);
      const pool = getPool();
      const connection = await pool.getConnection();
      return { connection: connection as unknown as mysql.Connection, isMainDb: true };
    }

    if (dataSource.status !== 1) {
      throw new Error(`数据源已禁用: ${dataSourceId}`);
    }

    if (dataSource.type !== 'mysql') {
      throw new Error(`暂不支持非MySQL数据源: ${dataSource.type}`);
    }

    // 检查缓存
    const cached = this.cache.get(dataSourceId);
    if (cached) {
      try {
        // 测试连接是否有效
        await cached.ping();
        return { connection: cached, isMainDb: false };
      } catch {
        // 连接已失效，从缓存中移除
        this.cache.delete(dataSourceId);
      }
    }

    // 创建新连接
    const connection = await mysql.createConnection({
      host: dataSource.host,
      port: dataSource.port,
      user: dataSource.username,
      password: dataSource.password,
      database: dataSource.db_name,
      connectTimeout: 10000,
    });

    // 缓存连接
    this.cache.set(dataSourceId, connection);
    return { connection, isMainDb: false };
  }

  /**
   * 释放连接
   * 主数据库连接释放回连接池，外部连接关闭
   */
  async releaseConnection(dataSourceId: string, connection: mysql.Connection, isMainDb: boolean): Promise<void> {
    if (isMainDb) {
      // 主数据库连接释放回连接池
      (connection as any).release?.();
    } else {
      // 外部数据源连接不在这里关闭，由缓存管理
    }
  }

  /**
   * 关闭指定数据源的连接
   */
  async closeConnection(dataSourceId: string): Promise<void> {
    const connection = this.cache.get(dataSourceId);
    if (connection) {
      await connection.end();
      this.cache.delete(dataSourceId);
    }
  }

  /**
   * 关闭所有连接
   */
  async closeAll(): Promise<void> {
    const entries = Array.from(this.cache as unknown as Map<string, mysql.Connection>);
    for (const [, connection] of entries) {
      await connection.end();
    }
    this.cache.clear();
  }
}

// 全局连接管理器实例
const connectionManager = new ConnectionManager();

/**
 * 通用数据查询服务类
 */
export class DataQueryService {
  private globalDataSourceId?: string;

  constructor(globalDataSourceId?: string) {
    this.globalDataSourceId = globalDataSourceId;
  }

  /**
   * 设置全局数据源ID
   */
  setGlobalDataSourceId(dataSourceId: string): void {
    this.globalDataSourceId = dataSourceId;
  }

  /**
   * 通过表配置查询数据
   * 支持两种方式：数据对象ID 或 直接表名
   */
  async queryByTableConfig<T = Record<string, unknown>>(
    tableConfig: TableConfig,
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> {
    // 验证配置
    const validation = validateTableConfig(tableConfig);
    if (!validation.valid) {
      return {
        success: false,
        data: [],
        error: validation.error,
      };
    }

    try {
      // 方式一：使用数据对象ID
      if (tableConfig.dataObjectId) {
        return await this.queryByDataObjectId<T>(tableConfig.dataObjectId, options);
      }

      // 方式二：使用直接表名
      if (tableConfig.name) {
        return await this.queryByTableName<T>(
          tableConfig.name,
          tableConfig.fields,
          tableConfig.dataSourceId || this.globalDataSourceId,
          options
        );
      }

      return {
        success: false,
        data: [],
        error: '表配置错误：未配置 dataObjectId 或 name',
      };
    } catch (error) {
      console.error('查询数据失败:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 通过数据对象ID查询数据
   */
  private async queryByDataObjectId<T>(
    dataObjectId: number,
    options: QueryOptions
  ): Promise<QueryResult<T>> {
    // 获取数据对象
    const dataObject = await findDataObjectById(dataObjectId);
    if (!dataObject) {
      return {
        success: false,
        data: [],
        error: `数据对象不存在: ${dataObjectId}`,
      };
    }

    if (dataObject.status !== 1) {
      return {
        success: false,
        data: [],
        error: `数据对象已禁用: ${dataObjectId}`,
      };
    }

    // 构建查询
    let querySql = dataObject.query_statement;

    // 添加 WHERE 条件
    if (options.where && Object.keys(options.where).length > 0) {
      const { clause, params } = buildWhereClause(options.where);
      if (clause) {
        // 检查 query_statement 是否已有 WHERE
        if (querySql.toUpperCase().includes(' WHERE ')) {
          querySql += ' AND ' + clause.replace('WHERE ', '');
        } else {
          querySql += ' ' + clause;
        }
        options.params = [...(options.params || []), ...params];
      }
    }

    // 添加 ORDER BY
    if (options.orderBy) {
      querySql += ` ORDER BY ${options.orderBy}`;
    }

    // 执行计数查询
    const total = await this.executeCountQuery(
      dataObject.data_source_id,
      querySql,
      options.params || []
    );

    // 添加分页
    let queryParams = options.params || [];
    if (options.page && options.perPage) {
      const offset = (options.page - 1) * options.perPage;
      querySql += ' LIMIT ? OFFSET ?';
      queryParams = [...queryParams, options.perPage, offset];
    }

    // 执行查询
    const data = await this.executeQuery<T>(
      dataObject.data_source_id,
      querySql,
      queryParams
    );

    return {
      success: true,
      data,
      total,
    };
  }

  /**
   * 通过表名查询数据
   */
  private async queryByTableName<T>(
    tableName: string,
    fields: Record<string, string>,
    dataSourceId: string | undefined,
    options: QueryOptions
  ): Promise<QueryResult<T>> {
    // 如果没有配置数据源ID，使用空字符串（表示主数据库）
    const effectiveDataSourceId = dataSourceId || '';

    // 构建字段列表
    const fieldList = options.select
      ? options.select.join(', ')
      : Object.values(fields).join(', ');

    // 构建查询
    let querySql = `SELECT ${fieldList} FROM ${tableName}`;

    // 添加 WHERE 条件
    if (options.where && Object.keys(options.where).length > 0) {
      const { clause, params } = buildWhereClause(options.where, fields);
      if (clause) {
        querySql += ' ' + clause;
        options.params = [...(options.params || []), ...params];
      }
    }

    // 添加 ORDER BY
    if (options.orderBy) {
      querySql += ` ORDER BY ${options.orderBy}`;
    }

    // 执行计数查询
    const countSql = `SELECT COUNT(*) as total FROM ${tableName}`;
    const total = await this.executeCountQuery(effectiveDataSourceId, countSql, []);

    // 添加分页
    let queryParams = options.params || [];
    if (options.page && options.perPage) {
      const offset = (options.page - 1) * options.perPage;
      querySql += ' LIMIT ? OFFSET ?';
      queryParams = [...queryParams, options.perPage, offset];
    }

    // 执行查询
    const data = await this.executeQuery<T>(effectiveDataSourceId, querySql, queryParams);

    return {
      success: true,
      data,
      total,
    };
  }

  /**
   * 执行查询
   */
  private async executeQuery<T>(
    dataSourceId: string,
    sql: string,
    params: unknown[]
  ): Promise<T[]> {
    const { connection, isMainDb } = await connectionManager.getConnection(dataSourceId);

    try {
      const [rows] = await connection.query(sql, params);
      return rows as T[];
    } catch (error: any) {
      // 如果连接已关闭，尝试重新连接
      if (error.message && error.message.includes('connection is in closed state')) {
        await connectionManager.closeConnection(dataSourceId);
        const { connection: newConnection } = await connectionManager.getConnection(dataSourceId);
        const [rows] = await newConnection.query(sql, params);
        return rows as T[];
      }
      throw error;
    } finally {
      // 释放连接
      await connectionManager.releaseConnection(dataSourceId, connection, isMainDb);
    }
  }

  /**
   * 执行计数查询
   */
  private async executeCountQuery(
    dataSourceId: string,
    sql: string,
    params: unknown[]
  ): Promise<number> {
    // 提取 FROM 部分构建计数查询
    const upperSql = sql.toUpperCase();
    let countSql: string;

    // 如果 SQL 包含 WHERE，需要保留
    const orderByIndex = upperSql.indexOf(' ORDER BY ');
    const limitIndex = upperSql.indexOf(' LIMIT ');

    // 移除 ORDER BY 和 LIMIT
    let baseSql = sql;
    if (limitIndex > 0) {
      baseSql = baseSql.substring(0, limitIndex);
    }
    if (orderByIndex > 0) {
      baseSql = baseSql.substring(0, orderByIndex);
    }

    // 构建计数查询
    if (upperSql.includes(' WHERE ')) {
      countSql = `SELECT COUNT(*) as total FROM (${baseSql}) as t`;
    } else {
      // 简单表查询
      const fromMatch = baseSql.match(/FROM\s+(\w+)/i);
      if (fromMatch) {
        countSql = `SELECT COUNT(*) as total FROM ${fromMatch[1]}`;
      } else {
        countSql = `SELECT COUNT(*) as total FROM (${baseSql}) as t`;
      }
    }

    const { connection, isMainDb } = await connectionManager.getConnection(dataSourceId);
    try {
      const [rows] = await connection.query(countSql, params);
      return (rows as Array<{ total: number }>)[0]?.total || 0;
    } finally {
      await connectionManager.releaseConnection(dataSourceId, connection, isMainDb);
    }
  }

  /**
   * 获取表配置对应的数据源ID
   */
  async getDataSourceIdForTable(
    tableConfig: TableConfig
  ): Promise<string | null> {
    // 如果配置了数据对象ID，从数据对象获取数据源ID
    if (tableConfig.dataObjectId) {
      const dataObject = await findDataObjectById(tableConfig.dataObjectId);
      if (dataObject && dataObject.status === 1) {
        return dataObject.data_source_id;
      }
    }

    // 如果表配置了数据源ID，使用表的配置
    if (tableConfig.dataSourceId) {
      return tableConfig.dataSourceId;
    }

    // 否则返回全局数据源ID
    return this.globalDataSourceId || null;
  }

  /**
   * 执行原始SQL查询
   */
  async executeRawQuery<T = Record<string, unknown>>(
    dataSourceId: string,
    sql: string,
    params: unknown[] = []
  ): Promise<QueryResult<T>> {
    try {
      const { connection, isMainDb } = await connectionManager.getConnection(dataSourceId);
      try {
        const [rows] = await connection.query(sql, params);
        return {
          success: true,
          data: rows as T[],
        };
      } finally {
        await connectionManager.releaseConnection(dataSourceId, connection, isMainDb);
      }
    } catch (error) {
      console.error('执行原始查询失败:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }
}

/**
 * 创建数据查询服务的工厂函数
 */
export function createDataQueryService(
  globalDataSourceId?: string
): DataQueryService {
  return new DataQueryService(globalDataSourceId);
}

// 导出连接管理器供外部使用
export { connectionManager };
