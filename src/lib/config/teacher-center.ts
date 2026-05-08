import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { getConfig } from './index';

// 字段映射配置 - 教职工基本信息
export interface TeacherBasicFieldMapping {
  employeeId: string;
  name: string;
  departmentCode: string;
  departmentName: string;
  genderCode: string;
  genderName: string;
  titleCode: string;
  titleName: string;
  position: string;
  mobile: string;
  email: string;
  photo: string;
  statusCode: string;
  statusName: string;
  birthDate: string;
  politicalStatus: string;
  highestEducation: string;
  highestDegree: string;
  researchArea: string;
  workDate: string;
  hireDate: string;
}

// 专业技术职务字段映射
export interface TeacherTitleFieldMapping {
  employeeId: string;
  titleName: string;
  titleLevel: string;
  approvalDate: string;
  appointmentStartDate: string;
  appointmentEndDate: string;
  isCurrent: string;
}

// 岗位聘任字段映射
export interface PositionAppointmentFieldMapping {
  employeeId: string;
  positionName: string;
  positionLevel: string;
  appointmentDate: string;
}

// 管理岗位聘任字段映射
export interface ManagementAppointmentFieldMapping {
  employeeId: string;
  positionName: string;
  positionLevel: string;
  appointmentDate: string;
}

// 工勤岗位聘任字段映射
export interface WorkerAppointmentFieldMapping {
  employeeId: string;
  positionName: string;
  positionLevel: string;
  appointmentDate: string;
}

// 考核信息字段映射
export interface AssessmentFieldMapping {
  employeeId: string;
  assessmentDate: string;
  assessmentResult: string;
}

// 奖励信息字段映射
export interface AwardFieldMapping {
  employeeId: string;
  awardName: string;
  awardLevel: string;
  awardDate: string;
}

// 部门调动字段映射
export interface DepartmentTransferFieldMapping {
  employeeId: string;
  transferDate: string;
  originalDepartment: string;
  newDepartment: string;
}

// 聘用合同字段映射
export interface ContractFieldMapping {
  employeeId: string;
  contractType: string;
  signDate: string;
  expireDate: string;
}

// 工人技术等级及职务字段映射
export interface WorkerSkillFieldMapping {
  employeeId: string;
  skillLevel: string;
  skillPosition: string;
  workType: string;
  approvalDate: string;
  isCurrent: string;
}

// 学历学位字段映射
export interface EducationDegreeFieldMapping {
  employeeId: string;
  educationLevel: string;
  degree: string;
  major: string;
  school: string;
  startDate: string;
  endDate: string;
  graduationDate: string;
}

// 工作简历字段映射
export interface WorkResumeFieldMapping {
  employeeId: string;
  startDate: string;
  endDate: string;
  workUnit: string;
  position: string;
  workContent: string;
}

// 联系信息字段映射
export interface ContactInfoFieldMapping {
  employeeId: string;
  emergencyContact: string;
  emergencyPhone: string;
  mobile: string;
  email: string;
  address: string;
  zipCode: string;
}

// 高层次人才字段映射
export interface TalentFieldMapping {
  employeeId: string;
  talentCategory: string;
  talentLevel: string;
  approvalUnit: string;
  approvalDate: string;
  major: string;
}

// 研究生导师字段映射
export interface GraduateSupervisorFieldMapping {
  employeeId: string;
  name: string;
  isExternal: string;
  supervisorType: string;
  researchArea: string;
  masterDate: string;
  doctorDate: string;
  unitName: string;
}

// 社会兼职字段映射
export interface SocialPartTimeFieldMapping {
  employeeId: string;
  partTimeType: string;
  position: string;
  startDate: string;
  endDate: string;
}

// 科研论文字段映射
export interface ResearchPaperFieldMapping {
  paperId: string;
  paperTitle: string;
  firstAuthorId: string;
  firstAuthorName: string;
  journalName: string;
  publishDate: string;
  indexStatus: string;
  impactFactor: string;
  doi: string;
}

// 科研著作字段映射
export interface ResearchBookFieldMapping {
  bookId: string;
  bookTitle: string;
  firstAuthorId: string;
  firstAuthorName: string;
  publisher: string;
  publishDate: string;
  isbn: string;
}

// 科研专利字段映射
export interface ResearchPatentFieldMapping {
  patentId: string;
  patentTitle: string;
  firstInventorId: string;
  firstInventorName: string;
  patentType: string;
  applicationDate: string;
  grantDate: string;
  patentStatus: string;
}

// 科研获奖字段映射
export interface ResearchAwardFieldMapping {
  awardId: string;
  awardName: string;
  firstCompleterId: string;
  firstCompleterName: string;
  awardLevel: string;
  awardDate: string;
  awardCategory: string;
}

// 科研鉴定成果字段映射
export interface ResearchAppraisalFieldMapping {
  appraisalId: string;
  appraisalName: string;
  firstAuthorId: string;
  firstAuthorName: string;
  appraisalUnit: string;
  appraisalDate: string;
  appraisalResult: string;
}

// 科研转化成果字段映射
export interface ResearchTransferFieldMapping {
  transferId: string;
  transferName: string;
  firstAuthorId: string;
  firstAuthorName: string;
  transferDate: string;
  transferAmount: string;
  transferee: string;
}

// 研究报告字段映射
export interface ResearchReportFieldMapping {
  reportId: string;
  reportName: string;
  firstAuthorId: string;
  firstAuthorName: string;
  submitDate: string;
  submitUnit: string;
  isAdopted: string;
}

// 科研艺术作品字段映射
export interface ResearchArtworkFieldMapping {
  artworkId: string;
  artworkName: string;
  firstAuthorId: string;
  firstAuthorName: string;
  artworkType: string;
  publishDate: string;
  isAwarded: string;
  awardName: string;
}

// 授课信息字段映射
export interface TeachingFieldMapping {
  teacherId: string;
  teacherName: string;
  classId: string;
  courseCode: string;
  courseName: string;
  semesterCode: string;
  semesterName: string;
  className?: string;
  departmentName?: string;
  studentCount: string;
  capacity?: string;
}

// 教学工作量字段映射
export interface WorkloadFieldMapping {
  teacherId: string;
  teacherName: string;
  courseCode: string;
  courseName: string;
  semesterCode: string;
  semesterName: string;
  studentCount: string;
  hours: string;
  scheduledHours?: string;
}

// 教学研究项目字段映射
export interface TeachingProjectFieldMapping {
  teacherId?: string;
  teacherName?: string;
  memberId?: string;
  memberName?: string;
  projectName: string;
  projectType: string;
  startDate: string;
  memberRank: string;
}

// 课程信息字段映射
export interface CourseInfoFieldMapping {
  courseCode: string;
  courseName: string;
  courseEnglishName: string;
  totalHours: string;
  theoryHours: string;
  practiceHours: string;
  experimentHours: string;
  credit: string;
  courseLevel: string;
  courseCategory: string;
  responsiblePersonId: string;
  departmentCode: string;
  departmentName: string;
  courseIntro: string;
  textbook: string;
  referenceBooks: string;
  isValid: string;
}

// 教材信息字段映射
export interface TextbookFieldMapping {
  teacherId: string;
  textbookId: string;
  textbookName: string;
  isbn: string;
  publisher: string;
  publishDate: string;
  publisherLevel: string;
  authorRank: string;
}

// 教学奖励字段映射
export interface TeachingAwardFieldMapping {
  teacherId: string;
  awardId: string;
  awardName: string;
  awardLevel: string;
  awardDate: string;
  awardCategory: string;
  authorRank: string;
  textbookName?: string;
}

// 教研论文字段映射
export interface TeachingPaperFieldMapping {
  teacherId: string;
  paperId: string;
  paperTitle: string;
  journalName: string;
  publishDate: string;
  journalCategory: string;
  authorRank: string;
}

// 课程团队成员字段映射
export interface CourseTeamFieldMapping {
  courseId: string;
  teamMember: string;
  responsiblePerson: string;
  outlineDate: string;
}

// 督导记录字段映射
export interface SupervisionRecordFieldMapping {
  teacherId: string;
  teacherName: string;
  courseCode: string;
  courseName: string;
  classId: string;
  supervisionDate: string;
  totalScore: string;
  evaluation: string;
  expertComment: string;
  semesterName: string;
}

// 课堂统计字段映射
export interface ClassroomStatsFieldMapping {
  classId: string;
  semesterName: string;
  startTime: string;
  endTime: string;
  focusRate: string;
  activityRate: string;
  headUpRate: string;
  headDownRate: string;
  phoneUsageRate: string;
  sleepiness: string;
}

// 指导学生竞赛获奖字段映射
export interface CompetitionAwardFieldMapping {
  teacherId: string;
  teacherName: string;
  competitionName: string;
  awardLevel: string;
  awardDate: string;
  studentName: string;
}

// 表配置 - 支持两种方式：数据对象ID 或 表名
export interface TableConfig<T> {
  // 方式一：数据对象ID（优先级高）
  dataObjectId?: number;
  // 方式二：直接表名
  name?: string;
  // 方式三：指定数据源ID（覆盖全局配置）
  dataSourceId?: string;
  fields: T;
}

// AI 配置
export interface AITeacherCenterConfig {
  // AI Provider ID，对应 config.yaml 中 ai.providers 列表中的 providerId
  providerId?: string;
  // 使用的模型名称
  model?: string;
}

// 教师中心完整配置
export interface TeacherCenterConfig {
  // 全局数据源ID（当表配置没有指定数据对象ID时使用）
  dataSourceId?: string;
  // AI 配置
  ai?: AITeacherCenterConfig;
  tables: {
    // 核心表
    teacherBasic: TableConfig<TeacherBasicFieldMapping>;
    teacherTitle: TableConfig<TeacherTitleFieldMapping>;
    // 基本信息扩展表
    workerSkill: TableConfig<WorkerSkillFieldMapping>;
    contactInfo: TableConfig<ContactInfoFieldMapping>;
    talent: TableConfig<TalentFieldMapping>;
    graduateSupervisor: TableConfig<GraduateSupervisorFieldMapping>;
    socialPartTime: TableConfig<SocialPartTimeFieldMapping>;
    // 教职生涯表
    positionAppointment: TableConfig<PositionAppointmentFieldMapping>;
    managementAppointment: TableConfig<ManagementAppointmentFieldMapping>;
    workerAppointment: TableConfig<WorkerAppointmentFieldMapping>;
    assessment: TableConfig<AssessmentFieldMapping>;
    award: TableConfig<AwardFieldMapping>;
    departmentTransfer: TableConfig<DepartmentTransferFieldMapping>;
    contract: TableConfig<ContractFieldMapping>;
    educationDegree: TableConfig<EducationDegreeFieldMapping>;
    workResume: TableConfig<WorkResumeFieldMapping>;
    // 科研表
    researchPaper: TableConfig<ResearchPaperFieldMapping>;
    researchBook: TableConfig<ResearchBookFieldMapping>;
    researchPatent: TableConfig<ResearchPatentFieldMapping>;
    researchAward: TableConfig<ResearchAwardFieldMapping>;
    researchAppraisal: TableConfig<ResearchAppraisalFieldMapping>;
    researchTransfer: TableConfig<ResearchTransferFieldMapping>;
    researchReport: TableConfig<ResearchReportFieldMapping>;
    researchArtwork: TableConfig<ResearchArtworkFieldMapping>;
    // 教学表
    undergraduateTeaching: TableConfig<TeachingFieldMapping>;
    graduateTeaching: TableConfig<TeachingFieldMapping>;
    undergraduateWorkload: TableConfig<WorkloadFieldMapping>;
    graduateWorkload: TableConfig<WorkloadFieldMapping>;
    undergraduateTeachingProject: TableConfig<TeachingProjectFieldMapping>;
    graduateTeachingProject: TableConfig<TeachingProjectFieldMapping>;
    supervisionRecord: TableConfig<SupervisionRecordFieldMapping>;
    classroomStats: TableConfig<ClassroomStatsFieldMapping>;
    studentCompetitionAward: TableConfig<CompetitionAwardFieldMapping>;
    // 教学扩展表
    undergraduateCourseInfo: TableConfig<CourseInfoFieldMapping>;
    graduateCourseInfo: TableConfig<CourseInfoFieldMapping>;
    undergraduateTextbook: TableConfig<TextbookFieldMapping>;
    graduateTextbook: TableConfig<TextbookFieldMapping>;
    undergraduateTeachingAward: TableConfig<TeachingAwardFieldMapping>;
    graduateTeachingAward: TableConfig<TeachingAwardFieldMapping>;
    undergraduateTeachingPaper: TableConfig<TeachingPaperFieldMapping>;
    graduateTeachingPaper: TableConfig<TeachingPaperFieldMapping>;
    undergraduateCourseTeam: TableConfig<CourseTeamFieldMapping>;
    textbookAward: TableConfig<TeachingAwardFieldMapping>;
  };
}

// 默认配置
const defaultConfig: TeacherCenterConfig = {
  dataSourceId: '6',
  ai: {
    providerId: 'openai',
    model: 'gpt-4o',
  },
  tables: {
    // 教职工基本信息
    teacherBasic: {
      name: 't_dws_gxjg_jzgjbxxmx',
      fields: {
        employeeId: 'gh',
        name: 'xm',
        departmentCode: 'dwh',
        departmentName: 'dwmc',
        genderCode: 'xbm',
        genderName: 'xbmmc',
        titleCode: 'zyjszwdm',
        titleName: 'zyjszwdmmc',
        position: 'dzzw',
        mobile: 'yddh',
        email: 'dzyx',
        photo: 'zp',
        statusCode: 'dqztm',
        statusName: 'dqztmmc',
        birthDate: 'csrq',
        politicalStatus: 'zzmmmmc',
        highestEducation: 'zgxlmmc',
        highestDegree: 'zgxwmmc',
        researchArea: 'yjfx',
        workDate: 'cjgzny',
        hireDate: 'lxrq',
      },
    },
    // 专业技术职务
    teacherTitle: {
      name: 't_dws_gxjg_jzgzyjszwxxmx',
      fields: {
        employeeId: 'gh',
        titleName: 'zyjszwmmc',
        titleLevel: 'zyjszwjbmmc',
        approvalDate: 'pdrq',
        appointmentStartDate: 'prqsrq',
        appointmentEndDate: 'przzrq',
        isCurrent: 'sfxzwmmc',
      },
    },
    // 工人技术等级及职务
    workerSkill: {
      name: 't_dws_gxjg_jzggrjsdjjzwxxmx',
      fields: {
        employeeId: 'gh',
        skillLevel: 'grjsdjmmc',
        skillPosition: 'grjszwmmc',
        workType: 'grgzmmc',
        approvalDate: 'djpdrq',
        isCurrent: 'sfxzwmmc',
      },
    },
    // 联系信息
    contactInfo: {
      name: 't_ynu_gxjg_jzglxxx',
      fields: {
        employeeId: 'zgh',
        emergencyContact: 'jjlxrxm',
        emergencyPhone: 'jjlxrdh',
        mobile: 'sj',
        email: 'dzxx',
        address: 'yxtxdz',
        zipCode: 'yxyzbm',
      },
    },
    // 高层次人才
    talent: {
      name: 't_dws_gxjg_jzgrcchxxmx',
      fields: {
        employeeId: 'gh',
        talentCategory: 'zjlbmmc',
        talentLevel: 'pzdwjbmmc',
        approvalUnit: 'pzdw',
        approvalDate: 'pzny',
        major: 'zyfx',
      },
    },
    // 研究生导师
    graduateSupervisor: {
      name: 't_dws_gxjx_yjsdsjbxxmx',
      fields: {
        employeeId: 'dsgh',
        name: 'xm',
        isExternal: 'sfxwds',
        supervisorType: 'dslbmmc',
        researchArea: 'xyjfx',
        masterDate: 'rsdny',
        doctorDate: 'rbdny',
        unitName: 'szdwmc',
      },
    },
    // 社会兼职
    socialPartTime: {
      name: 't_dws_gxjg_shjzxxmx',
      fields: {
        employeeId: 'gh',
        partTimeType: 'shjzmmc',
        position: 'jzzwmc',
        startDate: 'shjzqsrq',
        endDate: 'shjzzzrq',
      },
    },
    // 专技岗位聘任
    positionAppointment: {
      name: 't_dws_gxjg_jzgzjgwprxxmx',
      fields: {
        employeeId: 'gh',
        positionName: 'gwmc',
        positionLevel: 'gwdjmmc',
        appointmentDate: 'prqsrq',
      },
    },
    // 管理岗位聘任
    managementAppointment: {
      name: 't_dws_gxjg_jzgglgwprxxmx',
      fields: {
        employeeId: 'gh',
        positionName: 'glgzmc',
        positionLevel: 'gwdjmmc',
        appointmentDate: 'glqsny',
      },
    },
    // 工勤岗位聘任
    workerAppointment: {
      name: 't_dws_gxjg_jzggqgwprxxmx',
      fields: {
        employeeId: 'gh',
        positionName: 'gwmc',
        positionLevel: 'gwdjmmc',
        appointmentDate: 'prqsrq',
      },
    },
    // 考核信息
    assessment: {
      name: 't_dws_gxjg_jzgkhxxmx',
      fields: {
        employeeId: 'gh',
        assessmentDate: 'jzgkhrq',
        assessmentResult: 'dwkhjgmmc',
      },
    },
    // 奖励信息
    award: {
      name: 't_dws_gxjg_jzgjlxxmx',
      fields: {
        employeeId: 'gh',
        awardName: 'jlmc',
        awardLevel: 'jljbmmc',
        awardDate: 'hjrq',
      },
    },
    // 部门调动
    departmentTransfer: {
      name: 't_dws_gxjg_jzgbmddxxmx',
      fields: {
        employeeId: 'gh',
        transferDate: 'bmddrq',
        originalDepartment: 'zzndcbmh',
        newDepartment: 'zzndrbmh',
      },
    },
    // 聘用合同
    contract: {
      name: 't_dws_gxjg_jzgpyhtglxxmx',
      fields: {
        employeeId: 'gh',
        contractType: 'pyhtlbmmc',
        signDate: 'qyrq',
        expireDate: 'jsriq',
      },
    },
    // 学历学位
    educationDegree: {
      name: 't_dws_gxjg_jzgxlxwxxmx',
      fields: {
        employeeId: 'gh',
        educationLevel: 'xlmmc',
        degree: 'hdxwmmc',
        major: 'sxzymmc',
        school: 'byyxxhdw',
        startDate: 'xxqsrq',
        endDate: 'xxzzrq',
        graduationDate: 'hxwrq',
      },
    },
    // 工作简历
    workResume: {
      name: 't_dws_gxjg_jzggzjlxxmx',
      fields: {
        employeeId: 'gh',
        startDate: 'gzqsrq',
        endDate: 'gzzzrq',
        workUnit: 'gzdw',
        position: 'crdzzw',
        workContent: 'gznr',
      },
    },
    // 科研论文
    researchPaper: {
      name: 't_dws_gxky_kjlwjzzmx',
      fields: {
        paperId: 'lwbh',
        paperTitle: 'lwzwmc',
        firstAuthorId: 'lwdyzzgh',
        firstAuthorName: 'lwdyzzmc',
        journalName: 'fbkwmc',
        publishDate: 'lwfbrq',
        indexStatus: 'lzslqkmc',
        impactFactor: 'yxyz',
        doi: 'doih',
      },
    },
    // 科研著作
    researchBook: {
      name: 't_dws_gxky_kyzzjzzmx',
      fields: {
        bookId: 'zzbh',
        bookTitle: 'zzzwmc',
        firstAuthorId: 'zzdyzzgh',
        firstAuthorName: 'zzdyzzxm',
        publisher: 'cbs',
        publishDate: 'cbrq',
        isbn: 'isbnh',
      },
    },
    // 科研专利
    researchPatent: {
      name: 't_dws_gxky_kyzljzzmx',
      fields: {
        patentId: 'zlcgbh',
        patentTitle: 'zlcgmc',
        firstInventorId: 'dyfmrgh',
        firstInventorName: 'dyfmrxm',
        patentType: 'zllxmc',
        applicationDate: 'zlsqrq',
        grantDate: 'sqggrq',
        patentStatus: 'zlztmc',
      },
    },
    // 科研获奖
    researchAward: {
      name: 't_dws_gxky_kyhjcgjzzmx',
      fields: {
        awardId: 'hjcgbh',
        awardName: 'hjmc',
        firstCompleterId: 'dywcrgh',
        firstCompleterName: 'dywcrxm',
        awardLevel: 'hjjbmc',
        awardDate: 'hjrq',
        awardCategory: 'cghjlbmc',
      },
    },
    // 科研鉴定成果
    researchAppraisal: {
      name: 't_dws_gxky_kyjdcgjzzmx',
      fields: {
        appraisalId: 'jdcgbh',
        appraisalName: 'jdcgmc',
        firstAuthorId: 'dyzzgh',
        firstAuthorName: 'dyzzxm',
        appraisalUnit: 'jddwmc',
        appraisalDate: 'jdrq',
        appraisalResult: 'jdjlmc',
      },
    },
    // 科研转化成果
    researchTransfer: {
      name: 't_dws_gxky_kyzhcgjzzmx',
      fields: {
        transferId: 'cgzhbh',
        transferName: 'cgzhmc',
        firstAuthorId: 'zhdyzzgh',
        firstAuthorName: 'zhdyzzxm',
        transferDate: 'zhrq',
        transferAmount: 'cjje',
        transferee: 'srfmc',
      },
    },
    // 研究报告
    researchReport: {
      name: 't_dws_gxky_yjbgjzzmx',
      fields: {
        reportId: 'jdcgbh',
        reportName: 'jdcgmc',
        firstAuthorId: 'dyzzzgh',
        firstAuthorName: 'dyzzxm',
        submitDate: 'tjsj',
        submitUnit: 'tjdw',
        isAdopted: 'sfcnmc',
      },
    },
    // 科研艺术作品
    researchArtwork: {
      name: 't_dws_gxky_kyyszpjzzmx',
      fields: {
        artworkId: 'xmbh',
        artworkName: 'xmmc',
        firstAuthorId: 'dyzzgh',
        firstAuthorName: 'dyzzxm',
        artworkType: 'zplxmc',
        publishDate: 'fbrq',
        isAwarded: 'sfhjmc',
        awardName: 'hjmc',
      },
    },
    // 本科生授课（数据源7）
    undergraduateTeaching: {
      name: 't_dws_gxjx_bzksjsskxx_v11mx',
      dataSourceId: '7',
      fields: {
        teacherId: 'jsgh',
        teacherName: 'jsxm',
        classId: 'jxbh',
        courseCode: 'kcdm',
        courseName: 'kcmc',
        semesterCode: 'xnxqdm',
        semesterName: 'xnxqmc',
        className: 'skbjmc',
        studentCount: 'xdrs',
        capacity: 'krl',
      },
    },
    // 研究生授课（数据源7）
    graduateTeaching: {
      name: 't_dws_gxjx_yjsjsskxxmx',
      dataSourceId: '7',
      fields: {
        teacherId: 'jsgh',
        teacherName: 'jsxm',
        classId: 'jxbh',
        courseCode: 'kcdm',
        courseName: 'kcmc',
        semesterCode: 'xnxqdm',
        semesterName: 'xnxqmc',
        departmentName: 'yxmc',
        studentCount: 'xdrs',
      },
    },
    // 本科生工作量（数据源7）
    undergraduateWorkload: {
      name: 't_ynu_gxjx_bzksjsskgzl',
      dataSourceId: '7',
      fields: {
        teacherId: 'jsh',
        teacherName: 'jsm',
        courseCode: 'kch',
        courseName: 'kcm',
        semesterCode: 'xnxqdm',
        semesterName: 'xnxqmc',
        studentCount: 'xkrs',
        hours: 'xs',
        scheduledHours: 'pkxs',
      },
    },
    // 研究生工作量（数据源7）
    graduateWorkload: {
      name: 't_ynu_gxjx_yjsjsskgzl',
      dataSourceId: '7',
      fields: {
        teacherId: 'jsgh',
        teacherName: 'qbrkjs',
        courseCode: 'kcdm',
        courseName: 'kcmc',
        semesterCode: 'xnxqdm',
        semesterName: 'xnxqmc',
        studentCount: 'xkrs',
        hours: 'cdxs',
      },
    },
    // 本科生教学项目（数据源7）
    undergraduateTeachingProject: {
      name: 't_dws_gxjx_bzksjxyjxmxxmx',
      dataSourceId: '7',
      fields: {
        memberId: 'xmcygh',
        memberName: 'xmcyxm',
        projectName: 'xmmc',
        projectType: 'xmlb',
        startDate: 'lxsj',
        memberRank: 'brpm',
      },
    },
    // 研究生教学项目（数据源6）
    graduateTeachingProject: {
      name: 't_gxjx_yjsjsjxyjxm',
      dataSourceId: '6',
      fields: {
        teacherId: 'zcrzgh',
        teacherName: 'zcr',
        projectName: 'xmmc',
        projectType: 'xmlb',
        startDate: 'xmkssj',
        memberRank: 'brpm',
      },
    },
    // 督导记录（数据源7）
    supervisionRecord: {
      name: 't_dws_ydxt_ydxtddjlmx',
      dataSourceId: '7',
      fields: {
        teacherId: 'bpr',
        teacherName: 'bprxm',
        courseCode: 'kcdm',
        courseName: 'kcmc',
        classId: 'jxbid',
        supervisionDate: 'tksj',
        totalScore: 'zf',
        evaluation: 'pjjy',
        expertComment: 'pgzjyj',
        semesterName: 'xnxqmc',
      },
    },
    // 课堂统计（数据源7）
    classroomStats: {
      name: 't_ynu_gxjx_aikttjjg',
      dataSourceId: '7',
      fields: {
        classId: 'jxbh',
        semesterName: 'xnxqmc',
        startTime: 'kckssj',
        endTime: 'kcjssj',
        focusRate: 'zzd',
        activityRate: 'hyd',
        headUpRate: 'ttlv',
        headDownRate: 'dtlv',
        phoneUsageRate: 'ysjlv',
        sleepiness: 'sjd',
      },
    },
    // 指导学生竞赛获奖（数据源7）
    studentCompetitionAward: {
      name: 't_ynu_gxjx_jzgzdbksjshjxx',
      dataSourceId: '7',
      fields: {
        teacherId: 'jsgh',
        teacherName: 'jsxm',
        competitionName: 'jsmc',
        awardLevel: 'hjdj',
        awardDate: 'hjsj',
        studentName: 'hjxszzxm',
      },
    },
    // 本科生课程信息
    undergraduateCourseInfo: {
      name: 't_dws_gxjx_bzkskcjbxxmx',
      dataSourceId: '7',
      fields: {
        courseCode: 'kch',
        courseName: 'kcmc',
        courseEnglishName: 'kcywmc',
        totalHours: 'zxs',
        theoryHours: 'llxs',
        practiceHours: 'sjxs',
        experimentHours: 'syxs',
        credit: 'xf',
        courseLevel: 'kcjbmc',
        courseCategory: 'kcflmc',
        responsiblePersonId: 'kcfzrh',
        departmentCode: 'kcksdwh',
        departmentName: 'gsyxmc',
        courseIntro: 'kcjj',
        textbook: 'jc',
        referenceBooks: 'cksm',
        isValid: 'sfyx',
      },
    },
    // 研究生课程信息
    graduateCourseInfo: {
      name: 't_dws_gxjx_yjskcxxmx',
      dataSourceId: '7',
      fields: {
        courseCode: 'kch',
        courseName: 'kcmc',
        courseEnglishName: 'kcywmc',
        totalHours: 'zxs',
        theoryHours: 'llxs',
        practiceHours: 'sjxs',
        experimentHours: 'syxs',
        credit: 'xf',
        courseLevel: 'kcjbmc',
        courseCategory: 'kclbmc',
        responsiblePersonId: 'kcfzrh',
        departmentCode: 'kcksdwh',
        departmentName: 'kcksdwmc',
        courseIntro: 'kcjj',
        textbook: 'jc',
        referenceBooks: 'cksm',
        isValid: 'sfyx',
      },
    },
    // 本科生教材
    undergraduateTextbook: {
      name: 't_dws_gxjx_bzksjcbjcxxmx',
      dataSourceId: '7',
      fields: {
        teacherId: 'gh',
        textbookId: 'jcbh',
        textbookName: 'jcmc',
        isbn: 'isbn',
        publisher: 'cbsmc',
        publishDate: 'cbsj',
        publisherLevel: 'cbsjbmc',
        authorRank: 'brpm',
      },
    },
    // 研究生教材
    graduateTextbook: {
      name: 't_gxjx_yjsjsycbyjsjc',
      dataSourceId: '6',
      fields: {
        teacherId: 'zbzgh',
        textbookId: '',
        textbookName: 'jcmc',
        isbn: 'sh',
        publisher: 'cbsmc',
        publishDate: 'cbrq',
        publisherLevel: 'cbslb',
        authorRank: 'zbzgh',
      },
    },
    // 本科生教学奖励
    undergraduateTeachingAward: {
      name: 't_dws_gxjx_bzksjxjljjxjsxmxxmx',
      dataSourceId: '7',
      fields: {
        teacherId: 'xmcygh',
        awardId: 'jxcgbh',
        awardName: 'jxcgmc',
        awardLevel: 'jljbm',
        awardDate: 'hjnf',
        awardCategory: 'xmlb',
        authorRank: 'brpm',
      },
    },
    // 研究生教学奖励
    graduateTeachingAward: {
      name: 't_gxjx_yjsjsjxjljjxjsxm',
      dataSourceId: '6',
      fields: {
        teacherId: 'hjrzgh',
        awardId: '',
        awardName: 'jxjlhjsxmmc',
        awardLevel: 'hjdj',
        awardDate: 'hjsj',
        awardCategory: 'yjlb',
        authorRank: 'grpm',
      },
    },
    // 本科生教研论文
    undergraduateTeachingPaper: {
      name: 't_dws_gxjx_bzksjsfblwxxmx',
      dataSourceId: '7',
      fields: {
        teacherId: 'gh',
        paperId: 'lwbh',
        paperTitle: 'lwzwmc',
        journalName: 'fbqk',
        publishDate: 'fbsj',
        journalCategory: 'qklb',
        authorRank: 'brpm',
      },
    },
    // 研究生教研论文
    graduateTeachingPaper: {
      name: 't_gxjx_yjsjsgkfbjylw',
      dataSourceId: '6',
      fields: {
        teacherId: 'dyzzgzh',
        paperId: '',
        paperTitle: 'lwtm',
        journalName: 'qkmc',
        publishDate: 'fbrq',
        journalCategory: 'qklb',
        authorRank: 'dyzzgzh',
      },
    },
    // 课程团队成员
    undergraduateCourseTeam: {
      name: 't_dws_gxjx_bzkskcttcymx',
      dataSourceId: '7',
      fields: {
        courseId: 'jxbh',
        teamMember: 'kctdcy',
        responsiblePerson: 'kcfzr',
        outlineDate: 'dgzdrq',
      },
    },
    // 教材获奖
    textbookAward: {
      name: 't_dws_gxjx_bzksjchjxxmx',
      dataSourceId: '7',
      fields: {
        teacherId: '',
        awardId: 'hjjcbh',
        awardName: 'hjmc',
        textbookName: 'jcmc',
        awardLevel: 'jljbm',
        awardDate: 'hjrq',
        awardCategory: 'hjxm',
        authorRank: '',
      },
    },
  },
};

let teacherCenterConfig: TeacherCenterConfig | null = null;

/**
 * 获取教师中心配置文件名
 * 优先从主配置的 apps.teacherCenter.configFile 读取
 */
function getConfigFileName(): string {
  try {
    const mainConfig = getConfig();
    if (mainConfig.apps?.teacherCenter?.configFile) {
      return mainConfig.apps.teacherCenter.configFile;
    }
  } catch (error) {
    // 如果主配置不存在或读取失败，使用默认文件名
    console.warn('读取主配置失败，使用默认配置文件名');
  }
  return 'teacher-center.yaml';
}

/**
 * 加载教师中心配置
 * 优先从单独配置文件加载，如果不存在则使用主配置文件或默认值
 */
export function loadTeacherCenterConfig(): TeacherCenterConfig {
  if (teacherCenterConfig) {
    return teacherCenterConfig;
  }

  const configFileName = getConfigFileName();
  const configPath = path.join(process.cwd(), 'config', configFileName);

  // 尝试从单独配置文件加载
  if (fs.existsSync(configPath)) {
    try {
      const fileContents = fs.readFileSync(configPath, 'utf8');
      const userConfig = yaml.load(fileContents) as Partial<TeacherCenterConfig>;
      
      // 深度合并用户配置和默认配置
      teacherCenterConfig = deepMerge(defaultConfig, userConfig);
      return teacherCenterConfig;
    } catch (error) {
      console.warn(`加载 ${configFileName} 失败，使用默认配置:`, error);
    }
  }

  // 尝试从主配置文件加载（向后兼容）
  try {
    const mainConfig = getConfig();
    if (mainConfig.apps?.teacherCenter) {
      const legacyConfig = mainConfig.apps.teacherCenter;
      
      // 构建兼容的配置
      teacherCenterConfig = {
        dataSourceId: (legacyConfig as any).dataSourceId || defaultConfig.dataSourceId,
        tables: {
          teacherBasic: {
            ...defaultConfig.tables.teacherBasic,
            name: (legacyConfig as any).teacherBasicTableName || defaultConfig.tables.teacherBasic.name,
          },
          teacherTitle: {
            ...defaultConfig.tables.teacherTitle,
            name: (legacyConfig as any).teacherTitleTableName || defaultConfig.tables.teacherTitle.name,
          },
          workerSkill: defaultConfig.tables.workerSkill,
          contactInfo: defaultConfig.tables.contactInfo,
          talent: defaultConfig.tables.talent,
          graduateSupervisor: defaultConfig.tables.graduateSupervisor,
          socialPartTime: defaultConfig.tables.socialPartTime,
          positionAppointment: defaultConfig.tables.positionAppointment,
          managementAppointment: defaultConfig.tables.managementAppointment,
          workerAppointment: defaultConfig.tables.workerAppointment,
          assessment: defaultConfig.tables.assessment,
          award: defaultConfig.tables.award,
          departmentTransfer: defaultConfig.tables.departmentTransfer,
          contract: defaultConfig.tables.contract,
          educationDegree: defaultConfig.tables.educationDegree,
          workResume: defaultConfig.tables.workResume,
          researchPaper: defaultConfig.tables.researchPaper,
          researchBook: defaultConfig.tables.researchBook,
          researchPatent: defaultConfig.tables.researchPatent,
          researchAward: defaultConfig.tables.researchAward,
          researchAppraisal: defaultConfig.tables.researchAppraisal,
          researchTransfer: defaultConfig.tables.researchTransfer,
          researchReport: defaultConfig.tables.researchReport,
          researchArtwork: defaultConfig.tables.researchArtwork,
          undergraduateTeaching: defaultConfig.tables.undergraduateTeaching,
          graduateTeaching: defaultConfig.tables.graduateTeaching,
          undergraduateWorkload: defaultConfig.tables.undergraduateWorkload,
          graduateWorkload: defaultConfig.tables.graduateWorkload,
          undergraduateTeachingProject: defaultConfig.tables.undergraduateTeachingProject,
          graduateTeachingProject: defaultConfig.tables.graduateTeachingProject,
          supervisionRecord: defaultConfig.tables.supervisionRecord,
          classroomStats: defaultConfig.tables.classroomStats,
          studentCompetitionAward: defaultConfig.tables.studentCompetitionAward,
          undergraduateCourseInfo: defaultConfig.tables.undergraduateCourseInfo,
          graduateCourseInfo: defaultConfig.tables.graduateCourseInfo,
          undergraduateTextbook: defaultConfig.tables.undergraduateTextbook,
          graduateTextbook: defaultConfig.tables.graduateTextbook,
          undergraduateTeachingAward: defaultConfig.tables.undergraduateTeachingAward,
          graduateTeachingAward: defaultConfig.tables.graduateTeachingAward,
          undergraduateTeachingPaper: defaultConfig.tables.undergraduateTeachingPaper,
          graduateTeachingPaper: defaultConfig.tables.graduateTeachingPaper,
          undergraduateCourseTeam: defaultConfig.tables.undergraduateCourseTeam,
          textbookAward: defaultConfig.tables.textbookAward,
        },
      };
      return teacherCenterConfig;
    }
  } catch (error) {
    console.warn('从主配置文件加载教师中心配置失败:', error);
  }

  // 使用默认配置
  teacherCenterConfig = defaultConfig;
  return teacherCenterConfig;
}

/**
 * 获取教师中心配置
 */
export function getTeacherCenterConfig(): TeacherCenterConfig {
  if (!teacherCenterConfig) {
    return loadTeacherCenterConfig();
  }
  return teacherCenterConfig;
}

/**
 * 深度合并两个对象
 */
function deepMerge<T>(target: T, source: Partial<T>): T {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] !== undefined && source[key] !== null) {
      if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(result[key] as unknown as Record<string, unknown>, source[key] as Record<string, unknown>) as unknown as T[Extract<keyof T, string>];
      } else {
        result[key] = source[key] as T[Extract<keyof T, string>];
      }
    }
  }
  
  return result;
}

export default getTeacherCenterConfig;
