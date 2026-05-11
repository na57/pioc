/**
 * 通用数据访问框架 (Data Framework)
 *
 * 提供统一的数据查询和配置管理接口，支持：
 * 1. 配置驱动开发 - 通过 YAML 配置文件定义数据表和字段映射
 * 2. 双模式查询 - 支持数据对象和直接表名两种方式
 * 3. 多数据源支持 - 每个表可以独立配置数据源
 * 4. 通用查询接口 - 统一的 queryByTableConfig 方法
 *
 * 快速开始：
 * ```typescript
 * // 1. 定义应用配置类型
 * interface MyAppConfig extends AppBaseConfig {
 *   tables: {
 *     users: TableConfig<UserFields>;
 *   };
 * }
 *
 * // 2. 创建配置加载器
 * const configLoader = createConfigLoader<MyAppConfig>(
 *   defaultConfig,
 *   { configFileName: 'my-app.yaml' }
 * );
 *
 * // 3. 创建查询服务
 * const queryService = createDataQueryService(
 *   configLoader.getDataSourceId()
 * );
 *
 * // 4. 查询数据
 * const result = await queryService.queryByTableConfig(
 *   configLoader.getTableConfig('users'),
 *   { page: 1, perPage: 10 }
 * );
 * ```
 */

// 导出类型
export type {
  TableConfig,
  QueryOptions,
  QueryResult,
  AppBaseConfig,
  DataSourceInfo,
  DataObjectInfo,
  ConfigLoadOptions,
} from './types';

// 导出工具函数
export {
  deepMerge,
  buildSelectFields,
  mapRowToObject,
  validateTableConfig,
  buildWhereClause,
  getNestedValue,
  SimpleCache,
} from './utils';

// 导出配置加载器
export { ConfigLoader, createConfigLoader } from './config-loader';

// 导出查询服务
export {
  DataQueryService,
  createDataQueryService,
  connectionManager,
} from './query-service';
