/**
 * 课程中心数据服务
 * 使用通用数据访问框架重构
 */

import {
  TableConfig,
  QueryOptions,
  QueryResult,
} from '@/lib/data-framework';
import {
  queryCourseCenterTable,
  getCourseCenterQueryService,
  getCourseCenterConfigLoader,
} from '@/lib/config/course-center';

// 导出类型（保持向后兼容）
export type { QueryOptions, QueryResult };

/**
 * 通过表配置查询数据
 * @deprecated 使用 queryCourseCenterTable 或 getCourseCenterQueryService().queryByTableConfig 替代
 */
export async function queryByTableConfig<T = Record<string, unknown>>(
  tableConfig: TableConfig,
  options: QueryOptions = {}
): Promise<QueryResult<T>> {
  const queryService = getCourseCenterQueryService();
  return queryService.queryByTableConfig<T>(tableConfig, options);
}

/**
 * 获取表配置对应的数据源ID
 * @deprecated 使用 getCourseCenterQueryService().getDataSourceIdForTable 替代
 */
export async function getDataSourceIdForTable(
  tableConfig: TableConfig
): Promise<string | null> {
  const queryService = getCourseCenterQueryService();
  return queryService.getDataSourceIdForTable(tableConfig);
}

// 重新导出新的便捷 API
export {
  queryCourseCenterTable,
  getCourseCenterQueryService,
  getCourseCenterConfigLoader,
};

// 导出数据服务类
export { courseCenterDataService, CourseCenterDataService } from '@/lib/config/course-center';
