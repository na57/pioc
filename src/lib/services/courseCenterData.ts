import mysql from 'mysql2/promise';
import { findById as findDataObjectById } from '@/lib/database/models/dataObject';
import { findById as findDataSourceById } from '@/lib/database/models/dataSource';
import { TableConfig } from '@/lib/config/course-center';

export interface QueryOptions {
  page?: number;
  perPage?: number;
  where?: Record<string, unknown>;
  orderBy?: string;
  params?: unknown[];
}

export interface QueryResult<T = unknown> {
  success: boolean;
  data: T[];
  total?: number;
  error?: string;
}

/**
 * 通过表配置查询数据
 * 支持两种方式：
 * 1. 数据对象ID - 从数据对象获取查询语句
 * 2. 直接表名 - 构建简单查询
 */
export async function queryByTableConfig<T = unknown>(
  tableConfig: TableConfig<unknown>,
  options: QueryOptions = {}
): Promise<QueryResult<T>> {
  try {
    // 方式一：使用数据对象ID
    if (tableConfig.dataObjectId) {
      return await queryByDataObjectId<T>(tableConfig.dataObjectId, options);
    }

    // 方式二：使用直接表名
    if (tableConfig.name) {
      return await queryByTableName<T>(tableConfig.name, tableConfig.fields as Record<string, string>, options);
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
async function queryByDataObjectId<T>(
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

  // 获取数据源
  const dataSource = await findDataSourceById(dataObject.data_source_id);
  if (!dataSource) {
    return {
      success: false,
      data: [],
      error: `数据源不存在: ${dataObject.data_source_id}`,
    };
  }

  if (dataSource.status !== 1) {
    return {
      success: false,
      data: [],
      error: `数据源已禁用: ${dataObject.data_source_id}`,
    };
  }

  if (dataSource.type !== 'mysql') {
    return {
      success: false,
      data: [],
      error: `暂不支持非MySQL数据源: ${dataSource.type}`,
    };
  }

  // 构建查询
  let querySql = dataObject.query_statement;
  
  // 添加 WHERE 条件
  if (options.where && Object.keys(options.where).length > 0) {
    const whereConditions: string[] = [];
    for (const [key, value] of Object.entries(options.where)) {
      if (value !== undefined && value !== null) {
        whereConditions.push(`${key} = ?`);
      }
    }
    if (whereConditions.length > 0) {
      // 检查 query_statement 是否已有 WHERE
      if (querySql.toUpperCase().includes(' WHERE ')) {
        querySql += ' AND ' + whereConditions.join(' AND ');
      } else {
        querySql += ' WHERE ' + whereConditions.join(' AND ');
      }
    }
  }

  // 添加 ORDER BY
  if (options.orderBy) {
    querySql += ` ORDER BY ${options.orderBy}`;
  }

  // 执行计数查询
  const total = await executeCountQuery(dataSource, querySql, options.params || []);

  // 添加分页
  let queryParams = options.params || [];
  if (options.page && options.perPage) {
    const offset = (options.page - 1) * options.perPage;
    querySql += ' LIMIT ? OFFSET ?';
    queryParams = [...queryParams, options.perPage, offset];
  }

  // 执行查询
  const data = await executeQuery<T>(dataSource, querySql, queryParams);

  return {
    success: true,
    data,
    total,
  };
}

/**
 * 通过表名查询数据
 */
async function queryByTableName<T>(
  tableName: string,
  fields: Record<string, string>,
  options: QueryOptions
): Promise<QueryResult<T>> {
  // 获取全局数据源ID
  const { getCourseCenterConfig } = await import('@/lib/config/course-center');
  const config = getCourseCenterConfig();
  const dataSourceId = config.dataSourceId;

  if (!dataSourceId) {
    return {
      success: false,
      data: [],
      error: '未配置数据源ID',
    };
  }

  // 获取数据源
  const dataSource = await findDataSourceById(dataSourceId);
  if (!dataSource) {
    return {
      success: false,
      data: [],
      error: `数据源不存在: ${dataSourceId}`,
    };
  }

  if (dataSource.type !== 'mysql') {
    return {
      success: false,
      data: [],
      error: `暂不支持非MySQL数据源: ${dataSource.type}`,
    };
  }

  // 构建字段列表
  const fieldList = Object.values(fields).join(', ');

  // 构建查询
  let querySql = `SELECT ${fieldList} FROM ${tableName}`;
  
  // 添加 WHERE 条件
  if (options.where && Object.keys(options.where).length > 0) {
    const whereConditions: string[] = [];
    for (const [key, value] of Object.entries(options.where)) {
      if (value !== undefined && value !== null) {
        whereConditions.push(`${key} = ?`);
      }
    }
    if (whereConditions.length > 0) {
      querySql += ' WHERE ' + whereConditions.join(' AND ');
    }
  }

  // 添加 ORDER BY
  if (options.orderBy) {
    querySql += ` ORDER BY ${options.orderBy}`;
  }

  // 执行计数查询
  const countSql = `SELECT COUNT(*) as total FROM ${tableName}`;
  const total = await executeCountQuery(dataSource, countSql, []);

  // 添加分页
  let queryParams = options.params || [];
  if (options.page && options.perPage) {
    const offset = (options.page - 1) * options.perPage;
    querySql += ' LIMIT ? OFFSET ?';
    queryParams = [...queryParams, options.perPage, offset];
  }

  // 执行查询
  const data = await executeQuery<T>(dataSource, querySql, queryParams);

  return {
    success: true,
    data,
    total,
  };
}

/**
 * 执行查询
 */
async function executeQuery<T>(
  dataSource: { host: string; port: number; username: string; password: string; db_name: string },
  sql: string,
  params: unknown[]
): Promise<T[]> {
  const connection = await mysql.createConnection({
    host: dataSource.host,
    port: dataSource.port,
    user: dataSource.username,
    password: dataSource.password,
    database: dataSource.db_name,
    connectTimeout: 10000,
  });

  try {
    const [rows] = await connection.query(sql, params);
    return rows as T[];
  } finally {
    await connection.end();
  }
}

/**
 * 执行计数查询
 */
async function executeCountQuery(
  dataSource: { host: string; port: number; username: string; password: string; db_name: string },
  sql: string,
  params: unknown[]
): Promise<number> {
  // 提取 FROM 部分构建计数查询
  let countSql: string;
  
  // 如果 SQL 包含 WHERE，需要保留
  const upperSql = sql.toUpperCase();
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

  const connection = await mysql.createConnection({
    host: dataSource.host,
    port: dataSource.port,
    user: dataSource.username,
    password: dataSource.password,
    database: dataSource.db_name,
    connectTimeout: 10000,
  });

  try {
    const [rows] = await connection.query(countSql, params);
    return (rows as Array<{ total: number }>)[0]?.total || 0;
  } finally {
    await connection.end();
  }
}

/**
 * 获取表配置对应的数据源ID
 * 优先从数据对象获取，否则使用全局数据源ID
 */
export async function getDataSourceIdForTable(
  tableConfig: TableConfig<unknown>
): Promise<string | null> {
  // 如果配置了数据对象ID，从数据对象获取数据源ID
  if (tableConfig.dataObjectId) {
    const dataObject = await findDataObjectById(tableConfig.dataObjectId);
    if (dataObject && dataObject.status === 1) {
      return dataObject.data_source_id;
    }
  }

  // 否则返回全局数据源ID
  const { getCourseCenterConfig } = await import('@/lib/config/course-center');
  const config = getCourseCenterConfig();
  return config.dataSourceId || null;
}
