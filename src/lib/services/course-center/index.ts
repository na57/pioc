/**
 * 课程中心数据服务
 * 提供依赖注入的 Provider 模式数据访问
 */

// 导出类型定义
export type {
  ICourseDataProvider,
  QueryCoursesParams,
  QueryTeachingClassesParams,
  QueryClassroomStatsParams,
  QueryTextbooksParams,
  PaginatedResult,
  Course,
  TeachingClass,
  ClassroomStats,
  Textbook,
  Department,
  CourseNature,
  CourseCategory,
} from './types';

// 导出工厂函数
export { createCourseDataProvider, clearProviderCache } from './factory';

// 导出 Provider 实现（供需要直接使用的情况）
export { YnuDataProvider } from './providers/ynu-provider';
