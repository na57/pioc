/**
 * 通用数据访问框架 - 类型定义
 * 提供统一的数据查询和配置管理接口
 */

/**
 * 表配置接口 - 支持两种方式：数据对象ID 或 直接表名
 */
export interface TableConfig<T extends Record<string, string> = Record<string, string>> {
  /** 方式一：数据对象ID（优先级高） */
  dataObjectId?: number;
  /** 方式二：直接表名 */
  name?: string;
  /** 方式三：指定数据源ID（覆盖全局配置） */
  dataSourceId?: string;
  /** 字段映射配置 */
  fields: T;
}

/**
 * 查询选项
 */
export interface QueryOptions {
  /** 页码（从1开始） */
  page?: number;
  /** 每页条数 */
  perPage?: number;
  /** 查询条件 */
  where?: Record<string, unknown>;
  /** 排序字段 */
  orderBy?: string;
  /** 查询参数 */
  params?: unknown[];
  /** 字段选择（可选） */
  select?: string[];
}

/**
 * 查询结果
 */
export interface QueryResult<T = unknown> {
  /** 是否成功 */
  success: boolean;
  /** 数据列表 */
  data: T[];
  /** 总记录数 */
  total?: number;
  /** 错误信息 */
  error?: string;
}

/**
 * AI 配置接口
 * 统一的 AI 配置类型，用于各应用配置模块
 */
export interface AIConfig {
  /** AI Provider ID */
  providerId?: string;
  /** AI 模型名称 */
  model?: string;
}

/**
 * 应用基础配置接口
 */
export interface AppBaseConfig {
  /** 全局数据源ID */
  dataSourceId?: string;
  /** AI配置（可选） */
  ai?: AIConfig;
  /** 表配置 - 使用更宽松的类型（API-only 应用可省略） */
  tables?: Record<string, TableConfig>;
}

/**
 * 数据源信息
 */
export interface DataSourceInfo {
  id: string;
  host: string;
  port: number;
  username: string;
  password: string;
  db_name: string;
  type: 'mysql' | 'mongodb';
  status: number;
}

/**
 * 数据对象信息
 */
export interface DataObjectInfo {
  id: number;
  name: string;
  data_source_id: string;
  query_statement: string;
  primary_key: string;
  display_template: string;
  status: number;
}

/**
 * 配置加载选项
 */
export interface ConfigLoadOptions {
  /** 配置文件名 */
  configFileName: string;
  /** 配置目录（默认为 config） */
  configDir?: string;
  /** 主配置中的应用配置路径（用于向后兼容） */
  legacyConfigPath?: string;
}
