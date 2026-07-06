/**
 * 课程中心数据提供者类型定义
 */

// ============================================
// 基础类型
// ============================================

export interface Course {
  kch: string;                    // 课程号
  kcmc: string;                   // 课程名称
  kcywmc?: string;                // 课程英文名称
  kcfzrh?: string;                // 课程负责人
  kcksdwh?: string;               // 课程开设单位号
  kcksdwmc?: string;              // 课程开设单位名称
  xf?: string;                    // 学分
  zxs?: string;                   // 总学时
  llxs?: string;                  // 理论学时
  sjxs?: string;                  // 实践学时
  syxs?: string;                  // 实验学时
  kcjj?: string;                  // 课程简介
  jc?: string;                    // 教材
  cksm?: string;                  // 参考书目
  kcxzm?: string;                 // 课程性质码
  kcxzmc?: string;                // 课程性质名称
  kclbm?: string;                 // 课程类别码
  kclbmc?: string;                // 课程类别名称
  jxfsm?: string;                 // 教学方式码
  kcyym?: string;                 // 课程语言码
  kcyymc?: string;                // 课程语言名称
  sfyx?: string;                  // 是否有效
  kskcm?: string;                 // 考试课程码
  kskcmc?: string;                // 考试课程名称
  kcms?: string;                  // 课程描述
  kcmb?: string;                  // 课程目标
  ywmb?: string;                  // 英文目标
  zhxs?: string;                  // 综合学时
}

export interface TeachingClass {
  jxbh: string;                   // 教学班号
  jsgh: string;                   // 教师工号
  jsxm: string;                   // 教师姓名
  xnxqdm: string;                 // 学年学期代码
  xnxqmc: string;                 // 学年学期名称
  kch: string;                    // 课程号
  kcmc: string;                   // 课程名称
  zc: string;                     // 周次
  xq: string;                     // 星期
  skbjmc: string;                 // 上课班级名称
  ksdwmc: string;                 // 开课单位名称
  xqh: string;                    // 校区号
  xqmc: string;                   // 校区名称
  jxlh: string;                   // 教学楼号
  jxlmc: string;                  // 教学楼名称
  jsh: string;                    // 教室号
  jsmc: string;                   // 教室名称
  zwrs: string;                   // 座位人数
  xdrs: string;                   // 学生人数
}

export interface ClassroomStats {
  jxbh: string;                   // 教学班号
  xnxqdm: string;                 // 学年学期代码
  xnxqmc: string;                 // 学年学期名称
  kch: string;                    // 课程号
  kcmc: string;                   // 课程名称
  jsxm: string;                   // 教师姓名
  ksrq: string;                   // 考试日期
  xdrs: string;                   // 学生人数
  kql: string;                    // 考勤率
  qjrs: string;                   // 请假人数
  hdcs: string;                   // 互动次数
  zzd: string;                    // 专注度
}

export interface Textbook {
  kch: string;                    // 课程号
  kcmc: string;                   // 课程名称
  xnxqdm: string;                 // 学年学期代码
  xnxqmc: string;                 // 学年学期名称
  jcmc: string;                   // 教材名称
  isbn: string;                   // ISBN
  zz: string;                     // 作者
  cbsmc: string;                  // 出版社名称
  cbsj: string;                   // 出版时间
  sfxb?: string;                  // 是否新版
}

export interface Department {
  dwh: string;                    // 单位号
  dwmc: string;                   // 单位名称
}

export interface CourseNature {
  kcxzm: string;                  // 课程性质码
  kcxzmc: string;                 // 课程性质名称
}

export interface CourseCategory {
  kclbm: string;                  // 课程类别码
  kclbmc: string;                 // 课程类别名称
}

// ============================================
// 查询参数类型
// ============================================

export interface QueryCoursesParams {
  keyword?: string;               // 搜索关键词
  dept?: string;                  // 部门筛选
  status?: string;                // 状态筛选
  nature?: string;                // 课程性质筛选
  category?: string;              // 课程类别筛选
  page?: number;                  // 页码
  pageSize?: number;              // 每页条数
}

export interface QueryTeachingClassesParams {
  kch: string;                    // 课程号
  xnxqdm?: string;                // 学年学期
  page?: number;
  pageSize?: number;
}

export interface QueryClassroomStatsParams {
  kch: string;
  jxbh?: string;
  xnxqdm?: string;
  page?: number;
  pageSize?: number;
}

export interface QueryTextbooksParams {
  kch: string;
  xnxqdm?: string;
  page?: number;
  pageSize?: number;
}

// ============================================
// 分页结果类型
// ============================================

export interface PaginatedResult<T> {
  data: T[];
  total: number;
}

// ============================================
// 数据提供者接口
// ============================================

export interface ICourseDataProvider {
  /**
   * 查询课程列表
   */
  queryCourses(params: QueryCoursesParams): Promise<PaginatedResult<Course>>;

  /**
   * 查询单个课程详情
   */
  queryCourseByCode(kch: string): Promise<Course | null>;

  /**
   * 查询课程的教学班列表
   */
  queryTeachingClasses(params: QueryTeachingClassesParams): Promise<PaginatedResult<TeachingClass>>;

  /**
   * 查询课堂统计数据
   */
  queryClassroomStats(params: QueryClassroomStatsParams): Promise<PaginatedResult<ClassroomStats>>;

  /**
   * 查询课程教材信息
   */
  queryTextbooks(params: QueryTextbooksParams): Promise<PaginatedResult<Textbook>>;

  /**
   * 查询部门列表
   */
  queryDepartments(): Promise<Department[]>;

  /**
   * 查询课程性质列表
   */
  queryCourseNatures(): Promise<CourseNature[]>;

  /**
   * 查询课程类别列表
   */
  queryCourseCategories(): Promise<CourseCategory[]>;
}
