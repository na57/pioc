/**
 * 教师中心数据提供者 - 类型定义
 * 定义 ITeacherDataProvider 接口和所有相关类型
 */

// ============================================
// 基础类型定义
// ============================================

/**
 * 教师基本信息
 */
export interface Teacher {
  gh: string;
  xm: string;
  dwh: string;
  dwmc: string;
  xbm: string;
  xbmmc: string;
  zyjszwdm: string;
  zyjszwdmmc: string;
  dzzw?: string;
  yddh?: string;
  dzyx?: string;
  zp?: string;
  dqztm: string;
  dqztmmc: string;
  csrq?: string;
  zzmmmmc?: string;
  zgxlmmc?: string;
  zgxwmmc?: string;
  yjfx?: string;
  cjgzny?: string;
  lxrq?: string;
}

/**
 * 专业技术职务
 */
export interface TeacherTitle {
  gh: string;
  zyjszwmmc: string;
  zyjszwjbmmc?: string;
  pdrq?: string;
  prqsrq?: string;
  przzrq?: string;
  sfxzwmmc?: string;
}

/**
 * 岗位聘任
 */
export interface PositionAppointment {
  gh: string;
  positionType: string;
  gwmc?: string;
  gwdjmmc?: string;
  prrq?: string;
}

/**
 * 考核信息
 */
export interface Assessment {
  gh: string;
  khrq: string;
  khjgmc: string;
}

/**
 * 奖励信息
 */
export interface Award {
  gh: string;
  jlmc: string;
  jljbmc?: string;
  jlhq?: string;
}

/**
 * 部门调动
 */
export interface DepartmentTransfer {
  gh: string;
  ddrq?: string;
  ydwh?: string;
  xdwh?: string;
}

/**
 * 聘用合同
 */
export interface Contract {
  gh: string;
  htlxmc?: string;
  qdrq?: string;
  dqrq?: string;
}

/**
 * 工人技术等级及职务
 */
export interface WorkerSkill {
  gh: string;
  grjsdjmmc?: string;
  grjszwmmc?: string;
  grgzmmc?: string;
  djpdrq?: string;
  sfxzwmmc?: string;
}

/**
 * 学历学位
 */
export interface EducationDegree {
  gh: string;
  xlmmc?: string;
  hdxwmmc?: string;
  sxzymmc?: string;
  byyxxhdw?: string;
  xxqsrq?: string;
  xxzzrq?: string;
  hxwrq?: string;
}

/**
 * 工作简历
 */
export interface WorkResume {
  gh: string;
  gzqsrq?: string;
  gzzzrq?: string;
  gzdw?: string;
  crdzzw?: string;
  gznr?: string;
}

/**
 * 联系信息
 */
export interface ContactInfo {
  zgh: string;
  jjlxrxm?: string;
  jjlxrdh?: string;
  sj?: string;
  dzxx?: string;
  yxtxdz?: string;
  yxyzbm?: string;
}

/**
 * 高层次人才
 */
export interface Talent {
  gh: string;
  zjlbmmc?: string;
  pzdwjbmmc?: string;
  pzdw?: string;
  pzny?: string;
  zyfx?: string;
}

/**
 * 研究生导师
 */
export interface GraduateSupervisor {
  dsgh: string;
  xm?: string;
  sfxwds?: string;
  dslbmmc?: string;
  xyjfx?: string;
  rsdny?: string;
  rbdny?: string;
  szdwmc?: string;
}

/**
 * 社会兼职
 */
export interface SocialPartTime {
  gh: string;
  shjzmmc?: string;
  jzzwmc?: string;
  shjzqsrq?: string;
  shjzzzrq?: string;
}

// ============================================
// 科研相关类型
// ============================================

/**
 * 科研论文
 */
export interface ResearchPaper {
  lwbh?: string;
  lwzwmc: string;
  lwdyzzgh?: string;
  lwdyzzmc?: string;
  fbkwmc?: string;
  lwfbrq?: string;
  lzslqkmc?: string;
  yxyz?: string;
  doih?: string;
}

/**
 * 科研著作
 */
export interface ResearchBook {
  zzbh?: string;
  zzzwmc: string;
  zzdyzzgh?: string;
  zzdyzzxm?: string;
  cbs?: string;
  cbrq?: string;
  isbnh?: string;
}

/**
 * 科研专利
 */
export interface ResearchPatent {
  zlcgbh?: string;
  zlcgmc: string;
  dyfmrgh?: string;
  dyfmrxm?: string;
  zllxmc?: string;
  zlsqrq?: string;
  sqggrq?: string;
  zlztmc?: string;
}

/**
 * 科研获奖
 */
export interface ResearchAward {
  hjcgbh?: string;
  hjmc: string;
  dywcrgh?: string;
  dywcrxm?: string;
  hjjbmc?: string;
  hjrq?: string;
  cghjlbmc?: string;
}

/**
 * 科研鉴定成果
 */
export interface ResearchAppraisal {
  jdcgbh?: string;
  jdcgmc: string;
  dyzzgh?: string;
  dyzzxm?: string;
  jddwmc?: string;
  jdrq?: string;
  jdjlmc?: string;
}

/**
 * 科研转化成果
 */
export interface ResearchTransfer {
  cgzhbh?: string;
  cgzhmc: string;
  zhdyzzgh?: string;
  zhdyzzxm?: string;
  zhrq?: string;
  cjje?: string;
  srfmc?: string;
}

/**
 * 研究报告
 */
export interface ResearchReport {
  jdcgbh?: string;
  jdcgmc: string;
  dyzzzgh?: string;
  dyzzxm?: string;
  tjsj?: string;
  tjdw?: string;
  sfcnmc?: string;
}

/**
 * 科研艺术作品
 */
export interface ResearchArtwork {
  xmbh?: string;
  xmmc: string;
  dyzzgh?: string;
  dyzzxm?: string;
  zplxmc?: string;
  fbrq?: string;
  sfhjmc?: string;
  hjmc?: string;
}

/**
 * 科研统计
 */
export interface ResearchStats {
  paperCount: number;
  bookCount: number;
  patentCount: number;
  awardCount: number;
  appraisalCount: number;
  transferCount: number;
  reportCount: number;
  artworkCount: number;
}

// ============================================
// 教学相关类型
// ============================================

/**
 * 授课信息
 */
export interface Teaching {
  jxbh?: string;
  kcdm?: string;
  kcmc: string;
  xnxqdm: string;
  xnxqmc?: string;
  skbjsmc?: string;
  yxmc?: string;
  xdrs?: number;
  krl?: number;
}

/**
 * 教学工作量
 */
export interface Workload {
  kch?: string;
  kcm: string;
  xnxqdm: string;
  xnxqmc?: string;
  xkrs?: number;
  xs?: number;
  pkxs?: number;
}

/**
 * 教学研究项目
 */
export interface TeachingProject {
  xmmc: string;
  xmlb?: string;
  lxsj?: string;
  brpm?: string;
}

/**
 * 课程信息
 */
export interface CourseInfo {
  kch?: string;
  kcmc: string;
  kcywmc?: string;
  zxs?: number;
  llxs?: number;
  sjxs?: number;
  syxs?: number;
  xf?: number;
  kcjbmc?: string;
  kcflmc?: string;
  kcfzrh?: string;
  kcksdwh?: string;
  kcksdwmc?: string;
  kcjj?: string;
  jc?: string;
  cksm?: string;
  sfyx?: string;
}

/**
 * 教材信息
 */
export interface Textbook {
  gh: string;
  jcbh?: string;
  jcmc: string;
  isbn?: string;
  cbsmc?: string;
  cbsj?: string;
  cbsjbmc?: string;
  brpm?: string;
}

/**
 * 教学奖励
 */
export interface TeachingAward {
  gh: string;
  jxcgbh?: string;
  jxcgmc: string;
  jljbm?: string;
  hjnf?: string;
  xmlb?: string;
  brpm?: string;
}

/**
 * 教研论文
 */
export interface TeachingPaper {
  gh: string;
  lwbh?: string;
  lwzwmc: string;
  fbqk?: string;
  fbsj?: string;
  qklb?: string;
  brpm?: string;
}

/**
 * 课程团队
 */
export interface CourseTeam {
  jxbh?: string;
  kctdcy?: string;
  kcfzr?: string;
  dgzdrq?: string;
}

/**
 * 督导记录
 */
export interface SupervisionRecord {
  kcdm?: string;
  kcmc?: string;
  tksj?: string;
  zf?: string;
  pjjy?: string;
  pgzjyj?: string;
  xnxqmc?: string;
}

/**
 * 课堂统计
 */
export interface ClassroomStats {
  jxbh?: string;
  xnxqmc?: string;
  kckssj?: string;
  kcjssj?: string;
  zzd?: string;
  hyd?: string;
  ttlv?: string;
  dtlv?: string;
  ysjlv?: string;
  sjd?: string;
}

/**
 * 学生竞赛获奖
 */
export interface CompetitionAward {
  jsmc: string;
  hjdj?: string;
  hjsj?: string;
  hjxszzxm?: string;
}

/**
 * 教学统计
 */
export interface TeachingStats {
  undergraduateCourseCount: number;
  graduateCourseCount: number;
  totalWorkloadHours: number;
  supervisionCount: number;
  textbookCount: number;
  teachingAwardCount: number;
  teachingPaperCount: number;
}

// ============================================
// 教职生涯时间线
// ============================================

/**
 * 教职生涯时间线项
 */
export interface CareerTimelineItem {
  id: string;
  date: string;
  type: 'appointment' | 'title' | 'assessment' | 'award' | 'transfer' | 'contract' | 'education' | 'resume';
  title: string;
  description: string;
  isCurrent?: boolean;
  details?: Record<string, unknown>;
}

// ============================================
// 扩展信息类型
// ============================================

/**
 * 教师扩展信息
 */
export interface TeacherExtendedInfo {
  workerSkills: WorkerSkill[];
  contactInfo: ContactInfo | null;
  talents: Talent[];
  supervisorInfo: GraduateSupervisor | null;
  socialPartTimes: SocialPartTime[];
}

// ============================================
// 查询参数类型
// ============================================

/**
 * 查询教师列表参数
 */
export interface QueryTeachersParams {
  keyword?: string;
  department?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

/**
 * 部门信息
 */
export interface Department {
  dwh: string;
  dwmc: string;
}

/**
 * 状态信息
 */
export interface Status {
  dqztm: string;
  dqztmmc: string;
}

// ============================================
// 聚合数据类型
// ============================================

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
}

/**
 * 科研数据聚合
 */
export interface ResearchData {
  papers: ResearchPaper[];
  books: ResearchBook[];
  patents: ResearchPatent[];
  awards: ResearchAward[];
  appraisals: ResearchAppraisal[];
  transfers: ResearchTransfer[];
  reports: ResearchReport[];
  artworks: ResearchArtwork[];
  stats: ResearchStats;
}

/**
 * 教学数据聚合
 */
export interface TeachingData {
  undergraduateTeaching: Teaching[];
  graduateTeaching: Teaching[];
  undergraduateWorkload: Workload[];
  graduateWorkload: Workload[];
  undergraduateProjects: TeachingProject[];
  graduateProjects: TeachingProject[];
  supervisionRecords: SupervisionRecord[];
  classroomStats: ClassroomStats[];
  competitionAwards: CompetitionAward[];
  undergraduateCourseInfo: CourseInfo[];
  graduateCourseInfo: CourseInfo[];
  undergraduateTextbooks: Textbook[];
  graduateTextbooks: Textbook[];
  undergraduateTeachingAwards: TeachingAward[];
  graduateTeachingAwards: TeachingAward[];
  undergraduateTeachingPapers: TeachingPaper[];
  graduateTeachingPapers: TeachingPaper[];
  courseTeams: CourseTeam[];
  textbookAwards: TeachingAward[];
  stats: TeachingStats;
}

/**
 * AI总结输入
 */
export interface AISummaryInput {
  teacher: Teacher;
  extendedInfo: TeacherExtendedInfo;
  career: CareerTimelineItem[];
  research: ResearchStats;
  teaching: TeachingStats;
}

// ============================================
// 数据提供者接口
// ============================================

/**
 * 教师数据提供者接口
 * 所有学校特定的数据获取实现都需要实现此接口
 */
export interface ITeacherDataProvider {
  /**
   * 查询教师列表
   */
  queryTeachers(params: QueryTeachersParams): Promise<PaginatedResult<Teacher>>;

  /**
   * 根据工号查询教师基本信息
   */
  queryTeacherBasic(gh: string): Promise<Teacher | null>;

  /**
   * 查询教师扩展信息
   */
  queryTeacherExtendedInfo(gh: string): Promise<TeacherExtendedInfo>;

  /**
   * 查询部门列表（用于筛选）
   */
  queryDepartments(): Promise<Department[]>;

  /**
   * 查询状态列表（用于筛选）
   */
  queryStatuses(): Promise<Status[]>;

  /**
   * 查询教职生涯时间线
   */
  queryCareerTimeline(gh: string): Promise<CareerTimelineItem[]>;

  /**
   * 查询科研数据
   */
  queryResearchData(gh: string): Promise<ResearchData>;

  /**
   * 查询教学数据
   */
  queryTeachingData(gh: string): Promise<TeachingData>;

  /**
   * 生成AI教师画像总结
   */
  generateAISummary(data: AISummaryInput): Promise<string>;
}
