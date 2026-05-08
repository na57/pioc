import mysql from 'mysql2/promise';
import { getConfig } from '@/lib/config';
import { loadTeacherCenterConfig, getTeacherCenterConfig, TeacherCenterConfig } from '@/lib/config/teacher-center';
import { findById as findDataSourceById } from '@/lib/database/models/dataSource';

// 教师基本信息接口
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

// 专业技术职务接口
export interface TeacherTitle {
  gh: string;
  zyjszwmmc: string;
  zyjszwjbmmc?: string;
  pdrq?: string;
  prqsrq?: string;
  przzrq?: string;
  sfxzwmmc?: string;
}

// 岗位聘任接口
export interface PositionAppointment {
  gh: string;
  positionType: string;
  gwmc?: string;
  gwdjmmc?: string;
  prrq?: string;
}

// 考核信息接口
export interface Assessment {
  gh: string;
  khrq: string;
  khjgmc: string;
}

// 奖励信息接口
export interface Award {
  gh: string;
  jlmc: string;
  jljbmc?: string;
  jlhq?: string;
}

// 部门调动接口
export interface DepartmentTransfer {
  gh: string;
  ddrq?: string;
  ydwmc?: string;
  xdwmc?: string;
}

// 聘用合同接口
export interface Contract {
  gh: string;
  htlxmc?: string;
  qdrq?: string;
  dqrq?: string;
}

// 工人技术等级及职务接口
export interface WorkerSkill {
  gh: string;
  grjsdjmmc?: string;
  grjszwmmc?: string;
  grgzmmc?: string;
  djpdrq?: string;
  sfxzwmmc?: string;
}

// 学历学位接口
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

// 工作简历接口
export interface WorkResume {
  gh: string;
  gzqsrq?: string;
  gzzzrq?: string;
  gzdw?: string;
  crdzzw?: string;
  gznr?: string;
}

// 联系信息接口
export interface ContactInfo {
  zgh: string;
  jjlxrxm?: string;
  jjlxrdh?: string;
  sj?: string;
  dzxx?: string;
  yxtxdz?: string;
  yxyzbm?: string;
}

// 高层次人才接口
export interface Talent {
  gh: string;
  zjlbmmc?: string;
  pzdwjbmmc?: string;
  pzdw?: string;
  pzny?: string;
  zyfx?: string;
}

// 研究生导师接口
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

// 社会兼职接口
export interface SocialPartTime {
  gh: string;
  shjzmmc?: string;
  jzzwmc?: string;
  shjzqsrq?: string;
  shjzzzrq?: string;
}

// 科研论文接口
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

// 科研著作接口
export interface ResearchBook {
  zzbh?: string;
  zzzwmc: string;
  zzdyzzgh?: string;
  zzdyzzxm?: string;
  cbs?: string;
  cbrq?: string;
  isbnh?: string;
}

// 科研专利接口
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

// 科研获奖接口
export interface ResearchAward {
  hjcgbh?: string;
  hjmc: string;
  dywcrgh?: string;
  dywcrxm?: string;
  hjjbmc?: string;
  hjrq?: string;
  cghjlbmc?: string;
}

// 科研鉴定成果接口
export interface ResearchAppraisal {
  jdcgbh?: string;
  jdcgmc: string;
  dyzzgh?: string;
  dyzzxm?: string;
  jddwmc?: string;
  jdrq?: string;
  jdjlmc?: string;
}

// 科研转化成果接口
export interface ResearchTransfer {
  cgzhbh?: string;
  cgzhmc: string;
  zhdyzzgh?: string;
  zhdyzzxm?: string;
  zhrq?: string;
  cjje?: string;
  srfmc?: string;
}

// 研究报告接口
export interface ResearchReport {
  jdcgbh?: string;
  jdcgmc: string;
  dyzzzgh?: string;
  dyzzxm?: string;
  tjsj?: string;
  tjdw?: string;
  sfcnmc?: string;
}

// 科研艺术作品接口
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

// 授课信息接口
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

// 教学工作量接口
export interface Workload {
  kch?: string;
  kcm: string;
  xnxqdm: string;
  xnxqmc?: string;
  xkrs?: number;
  xs?: number;
  pkxs?: number;
}

// 教学研究项目接口
export interface TeachingProject {
  xmmc: string;
  xmlb?: string;
  lxsj?: string;
  brpm?: string;
}

// 课程信息接口
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

// 教材信息接口
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

// 教学奖励接口
export interface TeachingAward {
  gh: string;
  jxcgbh?: string;
  jxcgmc: string;
  jljbm?: string;
  hjnf?: string;
  xmlb?: string;
  brpm?: string;
}

// 教研论文接口
export interface TeachingPaper {
  gh: string;
  lwbh?: string;
  lwzwmc: string;
  fbqk?: string;
  fbsj?: string;
  qklb?: string;
  brpm?: string;
}

// 课程团队接口
export interface CourseTeam {
  jxbh?: string;
  kctdcy?: string;
  kcfzr?: string;
  dgzdrq?: string;
}

// 督导记录接口
export interface SupervisionRecord {
  kcdm?: string;
  kcmc?: string;
  tksj?: string;
  zf?: string;
  pjjy?: string;
  pgzjyj?: string;
  xnxqmc?: string;
}

// 课堂统计接口
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

// 学生竞赛获奖接口
export interface CompetitionAward {
  jsmc: string;
  hjdj?: string;
  hjsj?: string;
  hjxszzxm?: string;
}

// 教职生涯时间线项
export interface CareerTimelineItem {
  id: string;
  date: string;
  type: 'appointment' | 'title' | 'assessment' | 'award' | 'transfer' | 'contract' | 'education' | 'resume';
  title: string;
  description: string;
  isCurrent?: boolean;
  details?: Record<string, unknown>;
}

// 教师科研统计
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

// 教师教学统计
export interface TeachingStats {
  undergraduateCourseCount: number;
  graduateCourseCount: number;
  totalWorkloadHours: number;
  supervisionCount: number;
  textbookCount: number;
  teachingAwardCount: number;
  teachingPaperCount: number;
}

// 教师扩展信息
export interface TeacherExtendedInfo {
  workerSkills: WorkerSkill[];
  contactInfo: ContactInfo | null;
  talents: Talent[];
  supervisorInfo: GraduateSupervisor | null;
  socialPartTimes: SocialPartTime[];
}

// 数据源连接缓存
let dataSourceConnection: mysql.Connection | null = null;
let currentDataSourceId: string | null = null;

/**
 * 获取数据源连接
 */
async function getDataSourceConnection(dataSourceId: string): Promise<mysql.Connection> {
  // 如果已有连接且数据源相同，复用连接
  if (dataSourceConnection && currentDataSourceId === dataSourceId) {
    return dataSourceConnection;
  }

  // 关闭旧连接
  if (dataSourceConnection) {
    await dataSourceConnection.end();
    dataSourceConnection = null;
  }

  // 获取数据源配置
  const dataSource = await findDataSourceById(dataSourceId);
  if (!dataSource) {
    throw new Error(`数据源不存在: ${dataSourceId}`);
  }

  if (dataSource.status !== 1) {
    throw new Error(`数据源已禁用: ${dataSourceId}`);
  }

  if (dataSource.type !== 'mysql') {
    throw new Error(`暂不支持非MySQL数据源: ${dataSource.type}`);
  }

  // 创建新连接
  dataSourceConnection = await mysql.createConnection({
    host: dataSource.host,
    port: dataSource.port,
    user: dataSource.username,
    password: dataSource.password,
    database: dataSource.db_name,
    connectTimeout: 10000,
  });

  currentDataSourceId = dataSourceId;
  return dataSourceConnection;
}

/**
 * 执行查询
 */
async function executeQuery<T>(
  dataSourceId: string,
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  let connection: mysql.Connection;
  
  try {
    connection = await getDataSourceConnection(dataSourceId);
    const [rows] = await connection.query(sql, params);
    return rows as T[];
  } catch (error: any) {
    // 如果连接已关闭，尝试重新连接
    if (error.message && error.message.includes('connection is in closed state')) {
      // 重置连接
      if (dataSourceConnection) {
        dataSourceConnection = null;
        currentDataSourceId = null;
      }
      
      // 重新获取连接并执行查询
      connection = await getDataSourceConnection(dataSourceId);
      const [rows] = await connection.query(sql, params);
      return rows as T[];
    }
    
    throw error;
  }
}

/**
 * 获取教师中心数据源ID
 */
function getDataSourceId(): string | undefined {
  const config = getTeacherCenterConfig();
  return config.dataSourceId;
}

/**
 * 查询教师列表
 */
export async function queryTeachers(params: {
  keyword?: string;
  department?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ data: Teacher[]; total: number }> {
  const { keyword, department, status, page = 1, pageSize = 10 } = params;
  const config = getTeacherCenterConfig();
  const tableConfig = config.tables.teacherBasic;
  const f = tableConfig.fields;
  const dataSourceId = getDataSourceId();

  if (!dataSourceId) {
    console.error('未配置数据源ID');
    return { data: [], total: 0 };
  }

  // 构建查询条件
  const conditions: string[] = [];
  const queryParams: unknown[] = [];

  if (keyword) {
    conditions.push(`(${f.name} LIKE ? OR ${f.employeeId} LIKE ?)`);
    queryParams.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (department) {
    conditions.push(`${f.departmentCode} = ?`);
    queryParams.push(department);
  }

  if (status) {
    conditions.push(`${f.statusCode} = ?`);
    queryParams.push(status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    // 查询总数
    const countSql = `SELECT COUNT(*) as total FROM ${tableConfig.name} ${whereClause}`;
    const countResult = await executeQuery<{ total: number | string | bigint }>(dataSourceId, countSql, queryParams);
    const total = Number((countResult as any)[0]?.total || 0);

    // 查询数据
    const offset = (page - 1) * pageSize;
    const dataSql = `
      SELECT 
        ${f.employeeId} as gh,
        ${f.name} as xm,
        ${f.departmentCode} as dwh,
        ${f.departmentName} as dwmc,
        ${f.genderCode} as xbm,
        ${f.genderName} as xbmmc,
        ${f.titleCode} as zyjszwdm,
        ${f.titleName} as zyjszwdmmc,
        ${f.position} as dzzw,
        ${f.mobile} as yddh,
        ${f.email} as dzyx,
        ${f.photo} as zp,
        ${f.statusCode} as dqztm,
        ${f.statusName} as dqztmmc,
        ${f.birthDate} as csrq,
        ${f.politicalStatus} as zzmmmmc,
        ${f.highestEducation} as zgxlmmc,
        ${f.highestDegree} as zgxwmmc,
        ${f.researchArea} as yjfx,
        ${f.workDate} as cjgzny,
        ${f.hireDate} as lxrq
      FROM ${tableConfig.name}
      ${whereClause}
      ORDER BY ${f.employeeId}
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    const data = await executeQuery<Teacher>(dataSourceId, dataSql, queryParams);

    return { data, total };
  } catch (error) {
    console.error('查询教师列表失败:', error);
    return { data: [], total: 0 };
  }
}

/**
 * 查询单个教师基本信息
 */
export async function queryTeacherBasic(gh: string): Promise<Teacher | null> {
  const config = getTeacherCenterConfig();
  const tableConfig = config.tables.teacherBasic;
  const f = tableConfig.fields;
  const dataSourceId = getDataSourceId();

  if (!dataSourceId) {
    console.error('未配置数据源ID');
    return null;
  }

  try {
    const sql = `
      SELECT 
        ${f.employeeId} as gh,
        ${f.name} as xm,
        ${f.departmentCode} as dwh,
        ${f.departmentName} as dwmc,
        ${f.genderCode} as xbm,
        ${f.genderName} as xbmmc,
        ${f.titleCode} as zyjszwdm,
        ${f.titleName} as zyjszwdmmc,
        ${f.position} as dzzw,
        ${f.mobile} as yddh,
        ${f.email} as dzyx,
        ${f.photo} as zp,
        ${f.statusCode} as dqztm,
        ${f.statusName} as dqztmmc,
        ${f.birthDate} as csrq,
        ${f.politicalStatus} as zzmmmmc,
        ${f.highestEducation} as zgxlmmc,
        ${f.highestDegree} as zgxwmmc,
        ${f.researchArea} as yjfx,
        ${f.workDate} as cjgzny,
        ${f.hireDate} as lxrq
      FROM ${tableConfig.name}
      WHERE ${f.employeeId} = ?
    `;

    const result = await executeQuery<Teacher>(dataSourceId, sql, [gh]);
    return result[0] || null;
  } catch (error) {
    console.error('查询教师基本信息失败:', error);
    return null;
  }
}

/**
 * 查询教师扩展信息
 */
export async function queryTeacherExtendedInfo(gh: string): Promise<TeacherExtendedInfo> {
  const config = getTeacherCenterConfig();
  const dataSourceId = getDataSourceId();

  const result: TeacherExtendedInfo = {
    workerSkills: [],
    contactInfo: null,
    talents: [],
    supervisorInfo: null,
    socialPartTimes: [],
  };

  if (!dataSourceId) {
    return result;
  }

  try {
    // 1. 工人技术等级及职务
    const workerSkillConfig = config.tables.workerSkill;
    if (workerSkillConfig.name) {
      const f = workerSkillConfig.fields;
      const sql = `
        SELECT 
          ${f.employeeId} as gh,
          ${f.skillLevel} as grjsdjmmc,
          ${f.skillPosition} as grjszwmmc,
          ${f.workType} as grgzmmc,
          ${f.approvalDate} as djpdrq,
          ${f.isCurrent} as sfxzwmmc
        FROM ${workerSkillConfig.name}
        WHERE ${f.employeeId} = ?
        ORDER BY ${f.approvalDate} DESC
      `;
      result.workerSkills = await executeQuery<WorkerSkill>(dataSourceId, sql, [gh]);
    }

    // 2. 联系信息
    const contactConfig = config.tables.contactInfo;
    if (contactConfig.name) {
      const f = contactConfig.fields;
      const sql = `
        SELECT 
          ${f.employeeId} as zgh,
          ${f.emergencyContact} as jjlxrxm,
          ${f.emergencyPhone} as jjlxrdh,
          ${f.mobile} as sj,
          ${f.email} as dzxx,
          ${f.address} as yxtxdz,
          ${f.zipCode} as yxyzbm
        FROM ${contactConfig.name}
        WHERE ${f.employeeId} = ?
      `;
      const contactResult = await executeQuery<ContactInfo>(dataSourceId, sql, [gh]);
      result.contactInfo = contactResult[0] || null;
    }

    // 3. 高层次人才
    const talentConfig = config.tables.talent;
    if (talentConfig.name) {
      const f = talentConfig.fields;
      const sql = `
        SELECT 
          ${f.employeeId} as gh,
          ${f.talentCategory} as zjlbmmc,
          ${f.talentLevel} as pzdwjbmmc,
          ${f.approvalUnit} as pzdw,
          ${f.approvalDate} as pzny,
          ${f.major} as zyfx
        FROM ${talentConfig.name}
        WHERE ${f.employeeId} = ?
        ORDER BY ${f.approvalDate} DESC
      `;
      result.talents = await executeQuery<Talent>(dataSourceId, sql, [gh]);
    }

    // 4. 研究生导师信息
    const supervisorConfig = config.tables.graduateSupervisor;
    if (supervisorConfig.name) {
      const f = supervisorConfig.fields;
      const sql = `
        SELECT 
          ${f.employeeId} as dsgh,
          ${f.name} as xm,
          ${f.isExternal} as sfxwds,
          ${f.supervisorType} as dslbmmc,
          ${f.researchArea} as xyjfx,
          ${f.masterDate} as rsdny,
          ${f.doctorDate} as rbdny,
          ${f.unitName} as szdwmc
        FROM ${supervisorConfig.name}
        WHERE ${f.employeeId} = ?
      `;
      const supervisorResult = await executeQuery<GraduateSupervisor>(dataSourceId, sql, [gh]);
      result.supervisorInfo = supervisorResult[0] || null;
    }

    // 5. 社会兼职
    const socialPartTimeConfig = config.tables.socialPartTime;
    if (socialPartTimeConfig.name) {
      const f = socialPartTimeConfig.fields;
      const sql = `
        SELECT 
          ${f.employeeId} as gh,
          ${f.partTimeType} as shjzmmc,
          ${f.position} as jzzwmc,
          ${f.startDate} as shjzqsrq,
          ${f.endDate} as shjzzzrq
        FROM ${socialPartTimeConfig.name}
        WHERE ${f.employeeId} = ?
        ORDER BY ${f.startDate} DESC
      `;
      result.socialPartTimes = await executeQuery<SocialPartTime>(dataSourceId, sql, [gh]);
    }

    return result;
  } catch (error) {
    console.error('查询教师扩展信息失败:', error);
    return result;
  }
}

/**
 * 查询部门列表（用于筛选）
 */
export async function queryDepartments(): Promise<{ dwh: string; dwmc: string }[]> {
  const config = getTeacherCenterConfig();
  const tableConfig = config.tables.teacherBasic;
  const f = tableConfig.fields;
  const dataSourceId = getDataSourceId();

  if (!dataSourceId) {
    return [];
  }

  try {
    const sql = `
      SELECT DISTINCT ${f.departmentCode} as dwh, ${f.departmentName} as dwmc
      FROM ${tableConfig.name}
      WHERE ${f.departmentCode} IS NOT NULL AND ${f.departmentCode} != ''
      ORDER BY ${f.departmentName}
    `;

    return await executeQuery<{ dwh: string; dwmc: string }>(dataSourceId, sql);
  } catch (error) {
    console.error('查询部门列表失败:', error);
    return [];
  }
}

/**
 * 查询状态列表（用于筛选）
 */
export async function queryStatuses(): Promise<{ dqztm: string; dqztmmc: string }[]> {
  const config = getTeacherCenterConfig();
  const tableConfig = config.tables.teacherBasic;
  const f = tableConfig.fields;
  const dataSourceId = getDataSourceId();

  if (!dataSourceId) {
    return [];
  }

  try {
    const sql = `
      SELECT DISTINCT ${f.statusCode} as dqztm, ${f.statusName} as dqztmmc
      FROM ${tableConfig.name}
      WHERE ${f.statusCode} IS NOT NULL AND ${f.statusCode} != ''
      ORDER BY ${f.statusName}
    `;

    return await executeQuery<{ dqztm: string; dqztmmc: string }>(dataSourceId, sql);
  } catch (error) {
    console.error('查询状态列表失败:', error);
    return [];
  }
}

/**
 * 查询教职生涯时间线数据
 */
export async function queryCareerTimeline(gh: string): Promise<CareerTimelineItem[]> {
  const config = getTeacherCenterConfig();
  const items: CareerTimelineItem[] = [];
  const dataSourceId = getDataSourceId();

  if (!dataSourceId) {
    return [];
  }

  try {
    // 1. 专业技术职务
    const titleConfig = config.tables.teacherTitle;
    if (titleConfig.name) {
      const f = titleConfig.fields;
      const sql = `
        SELECT 
          ${f.titleName} as zyjszwmmc,
          ${f.titleLevel} as zyjszwjbmmc,
          ${f.approvalDate} as pdrq,
          ${f.appointmentStartDate} as prqsrq,
          ${f.isCurrent} as sfxzwmmc
        FROM ${titleConfig.name}
        WHERE ${f.employeeId} = ?
        ORDER BY ${f.approvalDate} DESC
      `;
      const titles = await executeQuery<TeacherTitle>(dataSourceId, sql, [gh]);
      titles.forEach((t, index) => {
        items.push({
          id: `title-${index}`,
          date: t.pdrq || '',
          type: 'title',
          title: `专业技术职务: ${t.zyjszwmmc || ''}`,
          description: t.zyjszwjbmmc ? `级别: ${t.zyjszwjbmmc}` : '',
          isCurrent: t.sfxzwmmc === '是' || t.sfxzwmmc === '1',
          details: { ...t },
        });
      });
    }

    // 2. 岗位聘任（专技、管理、工勤）
    const appointmentConfigs = [
      { config: config.tables.positionAppointment, type: '专技岗位' },
      { config: config.tables.managementAppointment, type: '管理岗位' },
      { config: config.tables.workerAppointment, type: '工勤岗位' },
    ];

    for (const { config: appointmentConfig, type } of appointmentConfigs) {
      if (appointmentConfig.name) {
        const f = appointmentConfig.fields;
        const sql = `
          SELECT 
            ${f.positionName || f.positionLevel} as gwmc,
            ${f.positionLevel} as gwdjmmc,
            ${f.appointmentDate} as prrq
          FROM ${appointmentConfig.name}
          WHERE ${f.employeeId} = ?
          ORDER BY ${f.appointmentDate} DESC
        `;
        const appointments = await executeQuery<PositionAppointment>(dataSourceId, sql, [gh]);
        appointments.forEach((a, index) => {
          items.push({
            id: `appointment-${type}-${index}`,
            date: a.prrq || '',
            type: 'appointment',
            title: `岗位聘任: ${type}`,
            description: a.gwmc || a.gwdjmmc || '',
            details: { ...a, positionType: type },
          });
        });
      }
    }

    // 3. 考核信息
    const assessmentConfig = config.tables.assessment;
    if (assessmentConfig.name) {
      const f = assessmentConfig.fields;
      const sql = `
        SELECT 
          ${f.assessmentDate} as khrq,
          ${f.assessmentResult} as khjgmc
        FROM ${assessmentConfig.name}
        WHERE ${f.employeeId} = ?
        ORDER BY ${f.assessmentDate} DESC
      `;
      const assessments = await executeQuery<Assessment>(dataSourceId, sql, [gh]);
      assessments.forEach((a, index) => {
        items.push({
          id: `assessment-${index}`,
          date: a.khrq || '',
          type: 'assessment',
          title: `年度考核: ${a.khjgmc || ''}`,
          description: a.khrq ? `考核日期: ${a.khrq}` : '',
          details: { ...a },
        });
      });
    }

    // 4. 奖励信息
    const awardConfig = config.tables.award;
    if (awardConfig.name) {
      const f = awardConfig.fields;
      const sql = `
        SELECT 
          ${f.awardName} as jlmc,
          ${f.awardLevel} as jljbmc,
          ${f.awardDate} as jlhq
        FROM ${awardConfig.name}
        WHERE ${f.employeeId} = ?
        ORDER BY ${f.awardDate} DESC
      `;
      const awards = await executeQuery<Award>(dataSourceId, sql, [gh]);
      awards.forEach((a, index) => {
        items.push({
          id: `award-${index}`,
          date: a.jlhq || '',
          type: 'award',
          title: `获得奖励: ${a.jlmc || ''}`,
          description: a.jljbmc ? `级别: ${a.jljbmc}` : '',
          details: { ...a },
        });
      });
    }

    // 5. 部门调动
    const transferConfig = config.tables.departmentTransfer;
    if (transferConfig.name) {
      const f = transferConfig.fields;
      const sql = `
        SELECT 
          ${f.transferDate} as ddrq,
          ${f.originalDepartment} as ydwmc,
          ${f.newDepartment} as xdwmc
        FROM ${transferConfig.name}
        WHERE ${f.employeeId} = ?
        ORDER BY ${f.transferDate} DESC
      `;
      const transfers = await executeQuery<DepartmentTransfer>(dataSourceId, sql, [gh]);
      transfers.forEach((t, index) => {
        items.push({
          id: `transfer-${index}`,
          date: t.ddrq || '',
          type: 'transfer',
          title: '部门调动',
          description: `${t.ydwmc || ''} → ${t.xdwmc || ''}`,
          details: { ...t },
        });
      });
    }

    // 6. 聘用合同
    const contractConfig = config.tables.contract;
    if (contractConfig.name) {
      const f = contractConfig.fields;
      const sql = `
        SELECT 
          ${f.contractType} as htlxmc,
          ${f.signDate} as qdrq,
          ${f.expireDate} as dqrq
        FROM ${contractConfig.name}
        WHERE ${f.employeeId} = ?
        ORDER BY ${f.signDate} DESC
      `;
      const contracts = await executeQuery<Contract>(dataSourceId, sql, [gh]);
      contracts.forEach((c, index) => {
        items.push({
          id: `contract-${index}`,
          date: c.qdrq || '',
          type: 'contract',
          title: `签订合同: ${c.htlxmc || ''}`,
          description: c.dqrq ? `到期日期: ${c.dqrq}` : '',
          details: { ...c },
        });
      });
    }

    // 7. 学历学位
    const educationConfig = config.tables.educationDegree;
    if (educationConfig.name) {
      const f = educationConfig.fields;
      const sql = `
        SELECT 
          ${f.educationLevel} as xlmmc,
          ${f.degree} as hdxwmmc,
          ${f.major} as sxzymmc,
          ${f.school} as byyxxhdw,
          ${f.startDate} as xxqsrq,
          ${f.endDate} as xxzzrq,
          ${f.graduationDate} as hxwrq
        FROM ${educationConfig.name}
        WHERE ${f.employeeId} = ?
        ORDER BY ${f.endDate} DESC
      `;
      const educations = await executeQuery<EducationDegree>(dataSourceId, sql, [gh]);
      educations.forEach((e, index) => {
        const dateRange = e.xxqsrq && e.xxzzrq ? `${e.xxqsrq} ~ ${e.xxzzrq}` : (e.xxzzrq || e.xxqsrq || '');
        items.push({
          id: `education-${index}`,
          date: e.xxzzrq || '',
          type: 'education',
          title: `学历学位: ${e.xlmmc || ''}`,
          description: `${dateRange}${e.sxzymmc ? ' | ' + e.sxzymmc : ''}${e.byyxxhdw ? ' | ' + e.byyxxhdw : ''}`,
          details: { ...e },
        });
      });
    }

    // 8. 工作简历
    const resumeConfig = config.tables.workResume;
    if (resumeConfig.name) {
      const f = resumeConfig.fields;
      const sql = `
        SELECT 
          ${f.startDate} as gzqsrq,
          ${f.endDate} as gzzzrq,
          ${f.workUnit} as gzdw,
          ${f.position} as crdzzw,
          ${f.workContent} as gznr
        FROM ${resumeConfig.name}
        WHERE ${f.employeeId} = ?
        ORDER BY ${f.startDate} DESC
      `;
      const resumes = await executeQuery<WorkResume>(dataSourceId, sql, [gh]);
      resumes.forEach((r, index) => {
        items.push({
          id: `resume-${index}`,
          date: r.gzqsrq || '',
          type: 'resume',
          title: `工作经历: ${r.gzdw || ''}`,
          description: `${r.crdzzw || ''} | ${r.gzqsrq || ''} - ${r.gzzzrq || '至今'}`,
          details: { ...r },
        });
      });
    }

    // 按日期排序
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error('查询教职生涯时间线失败:', error);
    return [];
  }
}

/**
 * 查询科研数据
 */
export async function queryResearchData(gh: string): Promise<{
  papers: ResearchPaper[];
  books: ResearchBook[];
  patents: ResearchPatent[];
  awards: ResearchAward[];
  appraisals: ResearchAppraisal[];
  transfers: ResearchTransfer[];
  reports: ResearchReport[];
  artworks: ResearchArtwork[];
  stats: ResearchStats;
}> {
  const config = getTeacherCenterConfig();
  const result = {
    papers: [] as ResearchPaper[],
    books: [] as ResearchBook[],
    patents: [] as ResearchPatent[],
    awards: [] as ResearchAward[],
    appraisals: [] as ResearchAppraisal[],
    transfers: [] as ResearchTransfer[],
    reports: [] as ResearchReport[],
    artworks: [] as ResearchArtwork[],
    stats: { paperCount: 0, bookCount: 0, patentCount: 0, awardCount: 0, appraisalCount: 0, transferCount: 0, reportCount: 0, artworkCount: 0 },
  };
  const dataSourceId = getDataSourceId();

  if (!dataSourceId) {
    return result;
  }

  try {
    // 1. 科研论文
    const paperConfig = config.tables.researchPaper;
    if (paperConfig.name) {
      const f = paperConfig.fields;
      const sql = `
        SELECT 
          ${f.paperId} as lwbh,
          ${f.paperTitle} as lwzwmc,
          ${f.firstAuthorId} as lwdyzzgh,
          ${f.firstAuthorName} as lwdyzzmc,
          ${f.journalName} as fbkwmc,
          ${f.publishDate} as lwfbrq,
          ${f.indexStatus} as lzslqkmc,
          ${f.impactFactor} as yxyz,
          ${f.doi} as doih
        FROM ${paperConfig.name}
        WHERE ${f.firstAuthorId} = ?
        ORDER BY ${f.publishDate} DESC
      `;
      result.papers = await executeQuery<ResearchPaper>(dataSourceId, sql, [gh]);
      result.stats.paperCount = result.papers.length;
    }

    // 2. 科研著作
    const bookConfig = config.tables.researchBook;
    if (bookConfig.name) {
      const f = bookConfig.fields;
      const sql = `
        SELECT 
          ${f.bookId} as zzbh,
          ${f.bookTitle} as zzzwmc,
          ${f.firstAuthorId} as zzdyzzgh,
          ${f.firstAuthorName} as zzdyzzxm,
          ${f.publisher} as cbs,
          ${f.publishDate} as cbrq,
          ${f.isbn} as isbnh
        FROM ${bookConfig.name}
        WHERE ${f.firstAuthorId} = ?
        ORDER BY ${f.publishDate} DESC
      `;
      result.books = await executeQuery<ResearchBook>(dataSourceId, sql, [gh]);
      result.stats.bookCount = result.books.length;
    }

    // 3. 科研专利
    const patentConfig = config.tables.researchPatent;
    if (patentConfig.name) {
      const f = patentConfig.fields;
      const sql = `
        SELECT 
          ${f.patentId} as zlcgbh,
          ${f.patentTitle} as zlcgmc,
          ${f.firstInventorId} as dyfmrgh,
          ${f.firstInventorName} as dyfmrxm,
          ${f.patentType} as zllxmc,
          ${f.applicationDate} as zlsqrq,
          ${f.grantDate} as sqggrq,
          ${f.patentStatus} as zlztmc
        FROM ${patentConfig.name}
        WHERE ${f.firstInventorId} = ?
        ORDER BY ${f.applicationDate} DESC
      `;
      result.patents = await executeQuery<ResearchPatent>(dataSourceId, sql, [gh]);
      result.stats.patentCount = result.patents.length;
    }

    // 4. 科研获奖
    const awardConfig = config.tables.researchAward;
    if (awardConfig.name) {
      const f = awardConfig.fields;
      const sql = `
        SELECT 
          ${f.awardId} as hjcgbh,
          ${f.awardName} as hjmc,
          ${f.firstCompleterId} as dywcrgh,
          ${f.firstCompleterName} as dywcrxm,
          ${f.awardLevel} as hjjbmc,
          ${f.awardDate} as hjrq,
          ${f.awardCategory} as cghjlbmc
        FROM ${awardConfig.name}
        WHERE ${f.firstCompleterId} = ?
        ORDER BY ${f.awardDate} DESC
      `;
      result.awards = await executeQuery<ResearchAward>(dataSourceId, sql, [gh]);
      result.stats.awardCount = result.awards.length;
    }

    // 5. 科研鉴定成果
    const appraisalConfig = config.tables.researchAppraisal;
    if (appraisalConfig.name) {
      const f = appraisalConfig.fields;
      const sql = `
        SELECT 
          ${f.appraisalId} as jdcgbh,
          ${f.appraisalName} as jdcgmc,
          ${f.firstAuthorId} as dyzzgh,
          ${f.firstAuthorName} as dyzzxm,
          ${f.appraisalUnit} as jddwmc,
          ${f.appraisalDate} as jdrq,
          ${f.appraisalResult} as jdjlmc
        FROM ${appraisalConfig.name}
        WHERE ${f.firstAuthorId} = ?
        ORDER BY ${f.appraisalDate} DESC
      `;
      result.appraisals = await executeQuery<ResearchAppraisal>(dataSourceId, sql, [gh]);
      result.stats.appraisalCount = result.appraisals.length;
    }

    // 6. 科研转化成果
    const transferConfig = config.tables.researchTransfer;
    if (transferConfig.name) {
      const f = transferConfig.fields;
      const sql = `
        SELECT 
          ${f.transferId} as cgzhbh,
          ${f.transferName} as cgzhmc,
          ${f.firstAuthorId} as zhdyzzgh,
          ${f.firstAuthorName} as zhdyzzxm,
          ${f.transferDate} as zhrq,
          ${f.transferAmount} as cjje,
          ${f.transferee} as srfmc
        FROM ${transferConfig.name}
        WHERE ${f.firstAuthorId} = ?
        ORDER BY ${f.transferDate} DESC
      `;
      result.transfers = await executeQuery<ResearchTransfer>(dataSourceId, sql, [gh]);
      result.stats.transferCount = result.transfers.length;
    }

    // 7. 研究报告
    const reportConfig = config.tables.researchReport;
    if (reportConfig.name) {
      const f = reportConfig.fields;
      const sql = `
        SELECT 
          ${f.reportId} as jdcgbh,
          ${f.reportName} as jdcgmc,
          ${f.firstAuthorId} as dyzzzgh,
          ${f.firstAuthorName} as dyzzxm,
          ${f.submitDate} as tjsj,
          ${f.submitUnit} as tjdw,
          ${f.isAdopted} as sfcnmc
        FROM ${reportConfig.name}
        WHERE ${f.firstAuthorId} = ?
        ORDER BY ${f.submitDate} DESC
      `;
      result.reports = await executeQuery<ResearchReport>(dataSourceId, sql, [gh]);
      result.stats.reportCount = result.reports.length;
    }

    // 8. 科研艺术作品
    const artworkConfig = config.tables.researchArtwork;
    if (artworkConfig.name) {
      const f = artworkConfig.fields;
      const sql = `
        SELECT 
          ${f.artworkId} as xmbh,
          ${f.artworkName} as xmmc,
          ${f.firstAuthorId} as dyzzgh,
          ${f.firstAuthorName} as dyzzxm,
          ${f.artworkType} as zplxmc,
          ${f.publishDate} as fbrq,
          ${f.isAwarded} as sfhjmc,
          ${f.awardName} as hjmc
        FROM ${artworkConfig.name}
        WHERE ${f.firstAuthorId} = ?
        ORDER BY ${f.publishDate} DESC
      `;
      result.artworks = await executeQuery<ResearchArtwork>(dataSourceId, sql, [gh]);
      result.stats.artworkCount = result.artworks.length;
    }

    return result;
  } catch (error) {
    console.error('查询科研数据失败:', error);
    return result;
  }
}

/**
 * 查询教学数据
 */
export async function queryTeachingData(gh: string): Promise<{
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
}> {
  const config = getTeacherCenterConfig();
  const result = {
    undergraduateTeaching: [] as Teaching[],
    graduateTeaching: [] as Teaching[],
    undergraduateWorkload: [] as Workload[],
    graduateWorkload: [] as Workload[],
    undergraduateProjects: [] as TeachingProject[],
    graduateProjects: [] as TeachingProject[],
    supervisionRecords: [] as SupervisionRecord[],
    classroomStats: [] as ClassroomStats[],
    competitionAwards: [] as CompetitionAward[],
    undergraduateCourseInfo: [] as CourseInfo[],
    graduateCourseInfo: [] as CourseInfo[],
    undergraduateTextbooks: [] as Textbook[],
    graduateTextbooks: [] as Textbook[],
    undergraduateTeachingAwards: [] as TeachingAward[],
    graduateTeachingAwards: [] as TeachingAward[],
    undergraduateTeachingPapers: [] as TeachingPaper[],
    graduateTeachingPapers: [] as TeachingPaper[],
    courseTeams: [] as CourseTeam[],
    textbookAwards: [] as TeachingAward[],
    stats: { undergraduateCourseCount: 0, graduateCourseCount: 0, totalWorkloadHours: 0, supervisionCount: 0, textbookCount: 0, teachingAwardCount: 0, teachingPaperCount: 0 },
  };
  const defaultDataSourceId = getDataSourceId();

  if (!defaultDataSourceId) {
    return result;
  }

  try {
    // 1. 本科生授课
    const ugTeachingConfig = config.tables.undergraduateTeaching;
    if (ugTeachingConfig.name) {
      const f = ugTeachingConfig.fields;
      const tableDataSourceId = ugTeachingConfig.dataSourceId || defaultDataSourceId;
      const sql = `
        SELECT 
          ${f.classId} as jxbh,
          ${f.courseCode} as kcdm,
          ${f.courseName} as kcmc,
          ${f.semesterCode} as xnxqdm,
          ${f.semesterName} as xnxqmc,
          ${f.className} as skbjsmc,
          ${f.studentCount} as xdrs,
          ${f.capacity} as krl
        FROM ${ugTeachingConfig.name}
        WHERE ${f.teacherId} = ?
        ORDER BY ${f.semesterCode} DESC
      `;
      result.undergraduateTeaching = await executeQuery<Teaching>(tableDataSourceId, sql, [gh]);
      result.stats.undergraduateCourseCount = result.undergraduateTeaching.length;
    }

    // 2. 研究生授课
    const gradTeachingConfig = config.tables.graduateTeaching;
    if (gradTeachingConfig.name) {
      const f = gradTeachingConfig.fields;
      const tableDataSourceId = gradTeachingConfig.dataSourceId || defaultDataSourceId;
      const sql = `
        SELECT 
          ${f.classId} as jxbh,
          ${f.courseCode} as kcdm,
          ${f.courseName} as kcmc,
          ${f.semesterCode} as xnxqdm,
          ${f.semesterName} as xnxqmc,
          ${f.departmentName} as yxmc,
          ${f.studentCount} as xdrs
        FROM ${gradTeachingConfig.name}
        WHERE ${f.teacherId} = ?
        ORDER BY ${f.semesterCode} DESC
      `;
      result.graduateTeaching = await executeQuery<Teaching>(tableDataSourceId, sql, [gh]);
      result.stats.graduateCourseCount = result.graduateTeaching.length;
    }

    // 3. 本科生工作量
    const ugWorkloadConfig = config.tables.undergraduateWorkload;
    if (ugWorkloadConfig.name) {
      const f = ugWorkloadConfig.fields;
      const tableDataSourceId = ugWorkloadConfig.dataSourceId || defaultDataSourceId;
      const sql = `
        SELECT 
          ${f.courseCode} as kch,
          ${f.courseName} as kcm,
          ${f.semesterCode} as xnxqdm,
          ${f.semesterName} as xnxqmc,
          ${f.studentCount} as xkrs,
          ${f.hours} as xs,
          ${f.scheduledHours} as pkxs
        FROM ${ugWorkloadConfig.name}
        WHERE ${f.teacherId} = ?
        ORDER BY ${f.semesterCode} DESC
      `;
      result.undergraduateWorkload = await executeQuery<Workload>(tableDataSourceId, sql, [gh]);
      result.stats.totalWorkloadHours += result.undergraduateWorkload.reduce((sum, w) => sum + (Number(w.xs) || 0), 0);
    }

    // 4. 研究生工作量
    const gradWorkloadConfig = config.tables.graduateWorkload;
    if (gradWorkloadConfig.name) {
      const f = gradWorkloadConfig.fields;
      const tableDataSourceId = gradWorkloadConfig.dataSourceId || defaultDataSourceId;
      const sql = `
        SELECT 
          ${f.courseCode} as kch,
          ${f.courseName} as kcm,
          ${f.semesterCode} as xnxqdm,
          ${f.semesterName} as xnxqmc,
          ${f.studentCount} as xkrs,
          ${f.hours} as xs
        FROM ${gradWorkloadConfig.name}
        WHERE ${f.teacherId} = ?
        ORDER BY ${f.semesterCode} DESC
      `;
      result.graduateWorkload = await executeQuery<Workload>(tableDataSourceId, sql, [gh]);
      result.stats.totalWorkloadHours += result.graduateWorkload.reduce((sum, w) => sum + (Number(w.xs) || 0), 0);
    }

    // 5. 本科生教学项目
    const ugProjectConfig = config.tables.undergraduateTeachingProject;
    if (ugProjectConfig.name) {
      const f = ugProjectConfig.fields;
      const tableDataSourceId = ugProjectConfig.dataSourceId || defaultDataSourceId;
      const sql = `
        SELECT 
          ${f.projectName} as xmmc,
          ${f.projectType} as xmlb,
          ${f.startDate} as lxsj,
          ${f.memberRank} as brpm
        FROM ${ugProjectConfig.name}
        WHERE ${f.memberId} = ?
        ORDER BY ${f.startDate} DESC
      `;
      result.undergraduateProjects = await executeQuery<TeachingProject>(tableDataSourceId, sql, [gh]);
    }

    // 6. 研究生教学项目
    const gradProjectConfig = config.tables.graduateTeachingProject;
    if (gradProjectConfig.name && !gradProjectConfig.dataObjectId) {
      const f = gradProjectConfig.fields;
      const tableDataSourceId = gradProjectConfig.dataSourceId || defaultDataSourceId;
      const sql = `
        SELECT 
          ${f.projectName} as xmmc,
          ${f.projectType} as xmlb,
          ${f.startDate} as lxsj,
          ${f.memberRank} as brpm
        FROM ${gradProjectConfig.name}
        WHERE ${f.teacherId} = ?
        ORDER BY ${f.startDate} DESC
      `;
      result.graduateProjects = await executeQuery<TeachingProject>(tableDataSourceId, sql, [gh]);
    }

    // 7. 督导记录
    const supervisionConfig = config.tables.supervisionRecord;
    if (supervisionConfig.name) {
      const f = supervisionConfig.fields;
      const tableDataSourceId = supervisionConfig.dataSourceId || defaultDataSourceId;
      const sql = `
        SELECT 
          ${f.courseCode} as kcdm,
          ${f.courseName} as kcmc,
          ${f.supervisionDate} as tksj,
          ${f.totalScore} as zf,
          ${f.evaluation} as pjjy,
          ${f.expertComment} as pgzjyj,
          ${f.semesterName} as xnxqmc
        FROM ${supervisionConfig.name}
        WHERE ${f.teacherId} = ?
        ORDER BY ${f.supervisionDate} DESC
      `;
      result.supervisionRecords = await executeQuery<SupervisionRecord>(tableDataSourceId, sql, [gh]);
      result.stats.supervisionCount = result.supervisionRecords.length;
    }

    // 8. 课堂统计
    const statsConfig = config.tables.classroomStats;
    if (statsConfig.name) {
      const f = statsConfig.fields;
      const tableDataSourceId = statsConfig.dataSourceId || defaultDataSourceId;
      const ugTeaching = config.tables.undergraduateTeaching;
      const sql = `
        SELECT 
          ${f.classId} as jxbh,
          ${f.semesterName} as xnxqmc,
          ${f.startTime} as kckssj,
          ${f.endTime} as kcjssj,
          ${f.focusRate} as zzd,
          ${f.activityRate} as hyd,
          ${f.headUpRate} as ttlv,
          ${f.headDownRate} as dtlv,
          ${f.phoneUsageRate} as ysjlv,
          ${f.sleepiness} as sjd
        FROM ${statsConfig.name}
        WHERE ${f.classId} IN (
          SELECT ${ugTeaching.fields.classId} FROM ${ugTeaching.name} WHERE ${ugTeaching.fields.teacherId} = ?
        )
        ORDER BY ${f.startTime} DESC
      `;
      result.classroomStats = await executeQuery<ClassroomStats>(tableDataSourceId, sql, [gh]);
    }

    // 9. 指导学生竞赛获奖
    const competitionConfig = config.tables.studentCompetitionAward;
    if (competitionConfig.name) {
      const f = competitionConfig.fields;
      const tableDataSourceId = competitionConfig.dataSourceId || defaultDataSourceId;
      const sql = `
        SELECT 
          ${f.competitionName} as jsmc,
          ${f.awardLevel} as hjdj,
          ${f.awardDate} as hjsj,
          ${f.studentName} as hjxszzxm
        FROM ${competitionConfig.name}
        WHERE ${f.teacherId} = ?
        ORDER BY ${f.awardDate} DESC
      `;
      result.competitionAwards = await executeQuery<CompetitionAward>(tableDataSourceId, sql, [gh]);
    }

    // 10. 本科生课程信息（负责人）
    const ugCourseConfig = config.tables.undergraduateCourseInfo;
    if (ugCourseConfig.name) {
      const f = ugCourseConfig.fields;
      const tableDataSourceId = ugCourseConfig.dataSourceId || defaultDataSourceId;
      const sql = `
        SELECT 
          ${f.courseCode} as kch,
          ${f.courseName} as kcmc,
          ${f.courseEnglishName} as kcywmc,
          ${f.totalHours} as zxs,
          ${f.theoryHours} as llxs,
          ${f.practiceHours} as sjxs,
          ${f.experimentHours} as syxs,
          ${f.credit} as xf,
          ${f.courseLevel} as kcjbmc,
          ${f.courseCategory} as kcflmc,
          ${f.responsiblePersonId} as kcfzrh,
          ${f.departmentCode} as kcksdwh,
          ${f.departmentName} as kcksdwmc,
          ${f.courseIntro} as kcjj,
          ${f.textbook} as jc,
          ${f.referenceBooks} as cksm,
          ${f.isValid} as sfyx
        FROM ${ugCourseConfig.name}
        WHERE ${f.responsiblePersonId} = ?
        ORDER BY ${f.courseCode}
      `;
      result.undergraduateCourseInfo = await executeQuery<CourseInfo>(tableDataSourceId, sql, [gh]);
    }

    // 11. 研究生课程信息（负责人）
    const gradCourseConfig = config.tables.graduateCourseInfo;
    if (gradCourseConfig.name) {
      const f = gradCourseConfig.fields;
      const tableDataSourceId = gradCourseConfig.dataSourceId || defaultDataSourceId;
      const sql = `
        SELECT 
          ${f.courseCode} as kch,
          ${f.courseName} as kcmc,
          ${f.courseEnglishName} as kcywmc,
          ${f.totalHours} as zxs,
          ${f.theoryHours} as llxs,
          ${f.practiceHours} as sjxs,
          ${f.experimentHours} as syxs,
          ${f.credit} as xf,
          ${f.courseLevel} as kcjbmc,
          ${f.courseCategory} as kclbmc,
          ${f.responsiblePersonId} as kcfzrh,
          ${f.departmentCode} as kcksdwh,
          ${f.departmentName} as kcksdwmc,
          ${f.courseIntro} as kcjj,
          ${f.textbook} as jc,
          ${f.referenceBooks} as cksm,
          ${f.isValid} as sfyx
        FROM ${gradCourseConfig.name}
        WHERE ${f.responsiblePersonId} = ?
        ORDER BY ${f.courseCode}
      `;
      result.graduateCourseInfo = await executeQuery<CourseInfo>(tableDataSourceId, sql, [gh]);
    }

    // 12. 本科生教材
    const ugTextbookConfig = config.tables.undergraduateTextbook;
    if (ugTextbookConfig.name) {
      const f = ugTextbookConfig.fields;
      const tableDataSourceId = ugTextbookConfig.dataSourceId || defaultDataSourceId;
      const sql = `
        SELECT 
          ${f.teacherId} as gh,
          ${f.textbookId} as jcbh,
          ${f.textbookName} as jcmc,
          ${f.isbn} as isbn,
          ${f.publisher} as cbsmc,
          ${f.publishDate} as cbsj,
          ${f.publisherLevel} as cbsjbmc,
          ${f.authorRank} as brpm
        FROM ${ugTextbookConfig.name}
        WHERE ${f.teacherId} = ?
        ORDER BY ${f.publishDate} DESC
      `;
      result.undergraduateTextbooks = await executeQuery<Textbook>(tableDataSourceId, sql, [gh]);
    }

    // 13. 研究生教材
    const gradTextbookConfig = config.tables.graduateTextbook;
    if (gradTextbookConfig.name) {
      const f = gradTextbookConfig.fields;
      const tableDataSourceId = gradTextbookConfig.dataSourceId || defaultDataSourceId;
      const sql = `
        SELECT 
          ${f.teacherId} as gh,
          ${f.textbookName} as jcmc,
          ${f.isbn} as isbn,
          ${f.publisher} as cbsmc,
          ${f.publishDate} as cbsj,
          ${f.publisherLevel} as cbsjbmc,
          ${f.authorRank} as brpm
        FROM ${gradTextbookConfig.name}
        WHERE ${f.teacherId} = ?
        ORDER BY ${f.publishDate} DESC
      `;
      result.graduateTextbooks = await executeQuery<Textbook>(tableDataSourceId, sql, [gh]);
    }
    result.stats.textbookCount = result.undergraduateTextbooks.length + result.graduateTextbooks.length;

    // 14. 本科生教学奖励
    const ugAwardConfig = config.tables.undergraduateTeachingAward;
    if (ugAwardConfig.name) {
      const f = ugAwardConfig.fields;
      const tableDataSourceId = ugAwardConfig.dataSourceId || defaultDataSourceId;
      const sql = `
        SELECT 
          ${f.teacherId} as gh,
          ${f.awardId} as jxcgbh,
          ${f.awardName} as jxcgmc,
          ${f.awardLevel} as jljbm,
          ${f.awardDate} as hjnf,
          ${f.awardCategory} as xmlb,
          ${f.authorRank} as brpm
        FROM ${ugAwardConfig.name}
        WHERE ${f.teacherId} = ?
        ORDER BY ${f.awardDate} DESC
      `;
      result.undergraduateTeachingAwards = await executeQuery<TeachingAward>(tableDataSourceId, sql, [gh]);
    }

    // 15. 研究生教学奖励
    const gradAwardConfig = config.tables.graduateTeachingAward;
    if (gradAwardConfig.name) {
      const f = gradAwardConfig.fields;
      const tableDataSourceId = gradAwardConfig.dataSourceId || defaultDataSourceId;
      const sql = `
        SELECT 
          ${f.teacherId} as gh,
          ${f.awardName} as jxcgmc,
          ${f.awardLevel} as jljbm,
          ${f.awardDate} as hjnf,
          ${f.awardCategory} as xmlb,
          ${f.authorRank} as brpm
        FROM ${gradAwardConfig.name}
        WHERE ${f.teacherId} = ?
        ORDER BY ${f.awardDate} DESC
      `;
      result.graduateTeachingAwards = await executeQuery<TeachingAward>(tableDataSourceId, sql, [gh]);
    }
    result.stats.teachingAwardCount = result.undergraduateTeachingAwards.length + result.graduateTeachingAwards.length;

    // 16. 本科生教研论文
    const ugPaperConfig = config.tables.undergraduateTeachingPaper;
    if (ugPaperConfig.name) {
      const f = ugPaperConfig.fields;
      const tableDataSourceId = ugPaperConfig.dataSourceId || defaultDataSourceId;
      const sql = `
        SELECT 
          ${f.teacherId} as gh,
          ${f.paperId} as lwbh,
          ${f.paperTitle} as lwzwmc,
          ${f.journalName} as fbqk,
          ${f.publishDate} as fbsj,
          ${f.journalCategory} as qklb,
          ${f.authorRank} as brpm
        FROM ${ugPaperConfig.name}
        WHERE ${f.teacherId} = ?
        ORDER BY ${f.publishDate} DESC
      `;
      result.undergraduateTeachingPapers = await executeQuery<TeachingPaper>(tableDataSourceId, sql, [gh]);
    }

    // 17. 研究生教研论文
    const gradPaperConfig = config.tables.graduateTeachingPaper;
    if (gradPaperConfig.name) {
      const f = gradPaperConfig.fields;
      const tableDataSourceId = gradPaperConfig.dataSourceId || defaultDataSourceId;
      const sql = `
        SELECT 
          ${f.teacherId} as gh,
          ${f.paperTitle} as lwzwmc,
          ${f.journalName} as fbqk,
          ${f.publishDate} as fbsj,
          ${f.journalCategory} as qklb,
          ${f.authorRank} as brpm
        FROM ${gradPaperConfig.name}
        WHERE ${f.teacherId} = ?
        ORDER BY ${f.publishDate} DESC
      `;
      result.graduateTeachingPapers = await executeQuery<TeachingPaper>(tableDataSourceId, sql, [gh]);
    }
    result.stats.teachingPaperCount = result.undergraduateTeachingPapers.length + result.graduateTeachingPapers.length;

    // 18. 课程团队成员
    const courseTeamConfig = config.tables.undergraduateCourseTeam;
    if (courseTeamConfig.name) {
      const f = courseTeamConfig.fields;
      const tableDataSourceId = courseTeamConfig.dataSourceId || defaultDataSourceId;
      const sql = `
        SELECT 
          ${f.courseId} as jxbh,
          ${f.teamMember} as kctdcy,
          ${f.responsiblePerson} as kcfzr,
          ${f.outlineDate} as dgzdrq
        FROM ${courseTeamConfig.name}
        WHERE ${f.responsiblePerson} = ? OR ${f.teamMember} LIKE ?
        ORDER BY ${f.outlineDate} DESC
      `;
      result.courseTeams = await executeQuery<CourseTeam>(tableDataSourceId, sql, [gh, `%${gh}%`]);
    }

    // 19. 教材获奖
    const textbookAwardConfig = config.tables.textbookAward;
    if (textbookAwardConfig.name) {
      const f = textbookAwardConfig.fields;
      const tableDataSourceId = textbookAwardConfig.dataSourceId || defaultDataSourceId;
      const sql = `
        SELECT 
          '' as gh,
          ${f.awardId} as jxcgbh,
          ${f.textbookName} as jxcgmc,
          ${f.awardLevel} as jljbm,
          ${f.awardDate} as hjnf,
          ${f.awardCategory} as xmlb,
          '' as brpm
        FROM ${textbookAwardConfig.name}
        ORDER BY ${f.awardDate} DESC
      `;
      result.textbookAwards = await executeQuery<TeachingAward>(tableDataSourceId, sql);
    }

    return result;
  } catch (error) {
    console.error('查询教学数据失败:', error);
    return result;
  }
}

/**
 * 生成AI教师画像总结
 */
export async function generateAISummary(
  teacher: Teacher,
  extendedInfo: TeacherExtendedInfo,
  career: CareerTimelineItem[],
  research: ResearchStats,
  teaching: TeachingStats
): Promise<string> {
  // 获取主配置和教师中心配置
  const mainConfig = await getConfig();
  const tcConfig = await loadTeacherCenterConfig();

  // 从教师中心配置获取 providerId，其他配置从主配置的 providers 中读取
  const providerId = tcConfig.ai?.providerId || mainConfig.ai?.defaultModel || 'openai';

  // 根据 providerId 查找对应的 AI provider 配置
  const provider = mainConfig.ai?.providers?.find(p => p.providerId === providerId);

  if (!provider) {
    console.warn(`未找到 AI provider: ${providerId}`);
    return 'AI服务未配置，无法生成教师画像总结。';
  }

  // 使用 provider 配置中的默认模型
  const aiModel = provider.models?.[0]?.modelId || 'gpt-4o';
  console.log(`使用AI模型: ${aiModel} (provider: ${providerId})`);

  // 构建 API URL
  const aiApiUrl = `${provider.baseUrl}/chat/completions`;
  const aiApiKey = provider.apiKey;

  const prompt = `请根据以下教师信息生成一份教师画像总结：

基本信息：
- 姓名：${teacher.xm}
- 单位：${teacher.dwmc}
- 职称：${teacher.zyjszwdmmc || '未知'}
- 职务：${teacher.dzzw || '无'}
- 最高学历：${teacher.zgxlmmc || '未知'}
- 最高学位：${teacher.zgxwmmc || '未知'}
- 研究方向：${teacher.yjfx || '未填写'}

扩展信息：
- 是否为研究生导师：${extendedInfo.supervisorInfo ? '是' : '否'}
${extendedInfo.supervisorInfo ? `  - 导师类型：${extendedInfo.supervisorInfo.dslbmmc || '未知'}` : ''}
${extendedInfo.talents.length > 0 ? `- 高层次人才称号：${extendedInfo.talents.map(t => t.zjlbmmc).join('、')}` : ''}
${extendedInfo.socialPartTimes.length > 0 ? `- 社会兼职数量：${extendedInfo.socialPartTimes.length}个` : ''}

科研情况：
- 发表论文：${research.paperCount} 篇
- 出版著作：${research.bookCount} 部
- 申请专利：${research.patentCount} 项
- 科研获奖：${research.awardCount} 项
- 鉴定成果：${research.appraisalCount} 项
- 转化成果：${research.transferCount} 项
- 研究报告：${research.reportCount} 篇
- 艺术作品：${research.artworkCount} 件

教学情况：
- 本科生授课：${teaching.undergraduateCourseCount} 门
- 研究生授课：${teaching.graduateCourseCount} 门
- 教学工作量：${teaching.totalWorkloadHours} 学时
- 出版教材：${teaching.textbookCount} 部
- 教学奖励：${teaching.teachingAwardCount} 项
- 教研论文：${teaching.teachingPaperCount} 篇
- 督导听课：${teaching.supervisionCount} 次

请生成以下内容：
1. 教学科研整体评价
2. 主要成果亮点
3. 发展趋势分析
4. 综合评价等级（优秀/良好/一般）

请用中文回答，格式清晰，有段落分隔。`;

  try {
    const response = await fetch(aiApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiApiKey}`,
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          {
            role: 'system',
            content: '你是一位专业的高校教师评价专家，擅长分析教师的教学科研工作。请客观、全面地评价教师的表现。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        stream: false,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      // 获取详细的错误响应内容
      let errorDetails = '';
      try {
        const errorResponse = await response.text();
        errorDetails = errorResponse;
      } catch (e) {
        errorDetails = '无法获取错误详情';
      }
      
      console.error(`AI API 请求失败: ${response.status}`);
      console.error(`AI API 错误响应: ${errorDetails}`);
      console.error(`AI API 请求URL: ${aiApiUrl}`);
      
      throw new Error(`AI API 请求失败: ${response.status} - ${errorDetails.substring(0, 500)}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '生成总结失败';
  } catch (error) {
    console.error('生成AI总结失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message);
      console.error('错误堆栈:', error.stack);
    }
    return '生成AI总结时发生错误，请稍后重试。';
  }
}
