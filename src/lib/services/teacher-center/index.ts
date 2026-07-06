/**
 * 教师中心数据提供者 - 统一导出
 * 
 * 使用示例：
 * ```typescript
 * import { createTeacherDataProvider, ITeacherDataProvider } from '@/lib/services/teacher-center';
 * 
 * const provider = createTeacherDataProvider('ynu');
 * const teachers = await provider.queryTeachers({ page: 1, pageSize: 10 });
 * ```
 */

// 导出类型定义
export type {
  // 基础类型
  Teacher,
  TeacherTitle,
  PositionAppointment,
  Assessment,
  Award,
  DepartmentTransfer,
  Contract,
  WorkerSkill,
  EducationDegree,
  WorkResume,
  ContactInfo,
  Talent,
  GraduateSupervisor,
  SocialPartTime,
  
  // 科研类型
  ResearchPaper,
  ResearchBook,
  ResearchPatent,
  ResearchAward,
  ResearchAppraisal,
  ResearchTransfer,
  ResearchReport,
  ResearchArtwork,
  ResearchStats,
  
  // 教学类型
  Teaching,
  Workload,
  TeachingProject,
  CourseInfo,
  Textbook,
  TeachingAward,
  TeachingPaper,
  CourseTeam,
  SupervisionRecord,
  ClassroomStats,
  CompetitionAward,
  TeachingStats,
  
  // 时间线类型
  CareerTimelineItem,
  
  // 扩展信息
  TeacherExtendedInfo,
  
  // 查询参数
  QueryTeachersParams,
  Department,
  Status,
  
  // 聚合数据
  PaginatedResult,
  ResearchData,
  TeachingData,
  AISummaryInput,
  
  // 接口
  ITeacherDataProvider,
} from './types';

// 导出工厂函数
export { createTeacherDataProvider } from './factory';

// 导出具体实现（供扩展使用）
export { YnuDataProvider } from './providers/ynu-provider';
