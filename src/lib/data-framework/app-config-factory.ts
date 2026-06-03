/**
 * 应用配置工厂
 * 提供统一的配置加载器、查询服务和数据服务创建功能
 * 消除各应用配置模块中的重复代码
 */

import {
  ConfigLoader,
  createConfigLoader,
  createDataQueryService,
  DataQueryService,
} from './index';
import { AppBaseConfig, ConfigLoadOptions, QueryOptions, QueryResult } from './types';

/**
 * 应用配置工厂选项
 */
export interface AppConfigFactoryOptions<T extends AppBaseConfig> {
  /** 默认配置对象 */
  defaultConfig: T;
  /** 配置文件名 */
  configFileName: string;
  /** 主配置中的应用配置路径（用于向后兼容） */
  legacyConfigPath?: string;
}

/**
 * 应用配置包
 * 包含配置加载器、查询服务和相关便捷方法
 */
export interface AppConfigBundle<T extends AppBaseConfig> {
  /** 配置加载器实例 */
  configLoader: ConfigLoader<T>;
  /** 数据查询服务实例 */
  queryService: DataQueryService;
  /** 重新加载配置 */
  reloadConfig: () => void;
  /** 获取配置 */
  getConfig: () => T;
  /** 加载配置 */
  loadConfig: () => T;
}

/**
 * 数据服务基类
 * 提供通用的数据服务基础功能
 */
export abstract class BaseDataService<T extends AppBaseConfig> {
  protected configLoader: ConfigLoader<T>;
  protected queryService: DataQueryService;

  constructor(configLoader: ConfigLoader<T>, queryService: DataQueryService) {
    this.configLoader = configLoader;
    this.queryService = queryService;
  }

  /**
   * 重新加载配置
   */
  reloadConfig(): void {
    this.configLoader.reload();
    const newDataSourceId = this.configLoader.getDataSourceId();
    if (newDataSourceId) {
      this.queryService.setGlobalDataSourceId(newDataSourceId);
    }
  }
}

/**
 * 创建应用配置包
 * 封装配置加载器、查询服务和相关方法的创建逻辑
 *
 * @example
 * ```typescript
 * const appBundle = createAppConfigBundle<MyAppConfig>({
 *   defaultConfig,
 *   configFileName: 'my-app.yaml',
 *   legacyConfigPath: 'apps.myApp',
 * });
 *
 * // 使用配置加载器
 * const config = appBundle.getConfig();
 *
 * // 使用查询服务
 * const result = await appBundle.queryService.queryByTableConfig(...);
 *
 * // 重新加载配置
 * appBundle.reloadConfig();
 * ```
 */
export function createAppConfigBundle<T extends AppBaseConfig>(
  options: AppConfigFactoryOptions<T>
): AppConfigBundle<T> {
  const configLoader = createConfigLoader<T>(options.defaultConfig, {
    configFileName: options.configFileName,
    legacyConfigPath: options.legacyConfigPath,
  });

  const queryService = createDataQueryService(configLoader.getDataSourceId());

  return {
    configLoader,
    queryService,
    reloadConfig: () => {
      configLoader.reload();
      const newDataSourceId = configLoader.getDataSourceId();
      if (newDataSourceId) {
        queryService.setGlobalDataSourceId(newDataSourceId);
      }
    },
    getConfig: () => configLoader.getConfig(),
    loadConfig: () => configLoader.load(),
  };
}

/**
 * 创建通用查询函数
 * 为应用配置创建类型安全的表查询函数
 *
 * @example
 * ```typescript
 * const queryTable = createQueryFunction(configLoader, queryService);
 * const result = await queryTable<MyData>('users', { page: 1, perPage: 10 });
 * ```
 */
export function createQueryFunction<T extends AppBaseConfig>(
  configLoader: ConfigLoader<T>,
  queryService: DataQueryService
) {
  return async function queryTable<R = Record<string, unknown>>(
    tableName: keyof T['tables'],
    options: QueryOptions = {}
  ): Promise<QueryResult<R>> {
    const tableConfig = configLoader.getTableConfig(tableName);
    return queryService.queryByTableConfig<R>(tableConfig, options);
  };
}

/**
 * 创建应用配置加载器获取函数
 * 用于向后兼容的便捷函数
 */
export function createConfigGetter<T extends AppBaseConfig>(
  bundle: AppConfigBundle<T>
) {
  return {
    getConfigLoader: () => bundle.configLoader,
    getQueryService: () => bundle.queryService,
    loadConfig: () => bundle.loadConfig(),
    getConfig: () => bundle.getConfig(),
  };
}
