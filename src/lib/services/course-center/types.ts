/**
 * 课程中心数据提供者类型定义
 */

// 课程类型：本科 / 研究生
export type CourseType = 'undergraduate' | 'graduate';

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
  gsyxbm?: string;                // 归属院系编码（本科使用）
  gsyxmc?: string;                // 归属院系名称（本科使用）
  xf?: string;                    // 学分
  zxs?: string;                   // 总学时
  llxs?: string;                  // 理论学时
  sjxs?: string;                  // 实践学时
  syxs?: string;                  // 实验学时
  kcjj?: string;                  // 课程简介
  jc?: string;                    // 教材
  cksm?: string;                  // 参考书目
  kcccm?: string;                 // 课程性质码
  kcccmc?: string;                // 课程性质名称
  kcflm?: string;                 // 课程分类码
  kcflmc?: string;                // 课程分类名称
  jxfsdm?: string;                // 教学方式码
  skyzdm?: string;                // 授课语种码
  skyzmc?: string;                // 授课语种名称
  kcztdm?: string;                // 课程状态码
  kcztdmmc?: string;              // 课程状态名称
  kslxdm?: string;                // 考试类型码
  kslxdmmc?: string;              // 考试类型名称
  kcsm?: string;                  // 课程说明
  kcmb?: string;                  // 课程目标
  ywkcmb?: string;                // 英文课程目标
  zhxs?: string;                  // 综合学时
  sfyx?: string;                  // 是否有效（研究生使用）
  tstamp?: string;                // 时间戳
}

export interface TeachingClass {
  jxbh: string;                   // 教学班号
  jxbmc?: string;                 // 教学班名称
  jsgh?: string;                  // 教师工号
  jsxm?: string;                  // 教师姓名
  xnxqdm?: string;                // 学年学期代码
  xnxqmc?: string;                // 学年学期名称
  kcdm?: string;                  // 课程代码
  kch?: string;                   // 课程号（统一字段）
  kcmc?: string;                  // 课程名称
  kxh?: string;                   // 课序号
  skzc?: string;                  // 上课周次
  skxq?: string;                  // 上课星期
  zc?: string;                    // 周次（研究生）
  xq?: string;                    // 星期（研究生）
  skbjmc?: string;                // 上课班级名称
  xszyjc?: string;                // 学生专业简称（研究生）
  ksdwmc?: string;                // 开课单位名称
  yxmc?: string;                  // 院系名称（研究生）
  xqmc?: string;                  // 校区名称
  jxlmc?: string;                 // 教学楼名称
  jsmc?: string;                  // 教室名称
  jasdm?: string;                 // 教室代码
  jsszxqh?: string;               // 教室所属校区号
  jsszxqmc?: string;              // 教室所属校区名称
  sksj?: string;                  // 上课时间
  jxdd?: string;                  // 教学地点
  jxzy?: string;                  // 教学资源
  zws?: string;                   // 座位数
  zwrs?: string;                  // 座位人数
  xkrs?: string;                  // 选课人数
  xdrs?: string;                  // 学生人数
  krl?: string;                   // 课容量
  xkxqh?: string;                 // 选课校区号
  xkrsxd?: string;                // 选课人数限制
  xknj?: string;                  // 选课年级
  pkyq?: string;                  // 排课要求
  jslxm?: string;                 // 教室类型码
  qsz?: string;                   // 起始周
  zzz?: string;                   // 终止周
  kcxzm?: string;                 // 课程性质码
  jxtz?: string;                  // 教学特征
  kksm?: string;                  // 开课说明
  tstamp?: string;                // 时间戳
}

export interface ClassroomStats {
  jxbh?: string;                  // 教学班号
  xnxqdm?: string;                // 学年学期代码
  xnxqmc?: string;                // 学年学期名称
  kcdm?: string;                  // 课程代码
  kch?: string;                   // 课程号
  kcmc?: string;                  // 课程名称
  jsxm?: string;                  // 教师姓名
  ksrq?: string;                  // 考试日期
  sksj?: string;                  // 上课时间
  kckssj?: string;                // 课程开始时间
  kcjssj?: string;                // 课程结束时间
  xdrs?: string;                  // 学生人数
  sdrs?: string;                  // 实到人数
  kql?: string;                   // 考勤率
  cqkl?: string;                  // 出勤率
  qjrs?: string;                  // 请假人数
  hdcs?: string;                  // 互动次数
  jssc?: string;                  // 举手次数
  rwcs?: string;                  // 任务次数
  zzd?: string;                   // 专注度
  zxdl?: string;                  // 专注度率
  hyd?: string;                   // 活跃度
  jszb?: string;                  // 讲授占比
  bszb?: string;                  // 板书占比
  ysjlv?: string;                 // 用手机率
  sjd?: string;                   // 睡觉度
  dtlv?: string;                  // 低头率
  ttlv?: string;                  // 抬头率
  cjsj?: string;                  // 创建时间
  wybs?: string;                  // 唯一标识
}

export interface Textbook {
  wybs?: string;                  // 唯一标识
  kch?: string;                   // 课程号
  kcdm?: string;                  // 课程代码
  kcmc?: string;                  // 课程名称
  xnxqdm?: string;                // 学年学期代码
  xnxqmc?: string;                // 学年学期名称
  jcmc?: string;                  // 教材名称
  cbh?: string;                   // 出版号/ISBN
  isbn?: string;                  // ISBN
  zz?: string;                    // 作者
  bzzzs?: string;                 // 编著者总数
  cbsmc?: string;                 // 出版社名称
  cbs?: string;                   // 出版社
  cbsj?: string;                  // 出版时间
  cbrq?: string;                  // 出版日期
  bc?: string;                    // 版次
  sfxb?: string;                  // 是否新版
  sfzxjcsyqk?: string;            // 是否最新教材使用情况
  tstamp?: string;                // 时间戳
}

export interface Department {
  dwh: string;                    // 单位号
  dwmc: string;                   // 单位名称
}

export interface CourseNature {
  kcccm: string;                  // 课程性质码
  kcccmc: string;                 // 课程性质名称
}

export interface CourseCategory {
  kcflm: string;                  // 课程分类码
  kcflmc: string;                 // 课程分类名称
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
  type?: CourseType;              // 课程类型：本科/研究生
  page?: number;                  // 页码
  pageSize?: number;              // 每页条数
}

export interface QueryTeachingClassesParams {
  kch: string;                    // 课程号
  type?: CourseType;              // 课程类型
  xnxqdm?: string;                // 学年学期
  page?: number;
  pageSize?: number;
}

export interface QueryClassroomStatsParams {
  kch: string;
  type?: CourseType;              // 课程类型
  jxbh?: string;
  xnxqdm?: string;
  page?: number;
  pageSize?: number;
}

export interface QueryTextbooksParams {
  kch: string;
  type?: CourseType;              // 课程类型
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
  queryCourseByCode(kch: string, type?: CourseType): Promise<Course | null>;

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
  queryDepartments(type?: CourseType): Promise<Department[]>;

  /**
   * 查询课程性质列表
   */
  queryCourseNatures(type?: CourseType): Promise<CourseNature[]>;

  /**
   * 查询课程类别列表
   */
  queryCourseCategories(type?: CourseType): Promise<CourseCategory[]>;

  /**
   * 查询督导记录
   */
  querySupervisionRecords(jxbid: string): Promise<SupervisionRecord[]>;

  /**
   * 查询课程思政
   */
  queryCourseIdeology(jxbh: string): Promise<CourseIdeology[]>;
}

// 督导记录类型
export interface SupervisionRecord {
  wybs: string;
  wjdm: string;
  bpr: string;
  bprxm: string;
  cpr: string;
  cprxm: string;
  kcdm: string;
  kcmc: string;
  jxbid: string;
  zf: string;
  ydrs: string;
  sdrs: string;
  tksj: string;
  xnxqdm: string;
  xnxqmc: string;
  pjjy: string;
  pgzjyj: string;
}

// 课程思政类型
export interface CourseIdeology {
  px: string;
  szrhd: string;
  xqzj: string;
  zsdqr: string;
  szjhd: string;
  szyrcl: string;
  tstamp: string;
  jxbh: string;
}
