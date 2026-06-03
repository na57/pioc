/**
 * 教师中心配置
 * 使用通用数据访问框架重构 - 工厂模式
 */

import {
  TableConfig,
  AppBaseConfig,
  AIConfig,
  createAppConfigBundle,
  createQueryFunction,
  createConfigGetter,
  BaseDataService,
  QueryOptions,
  QueryResult,
} from '@/lib/data-framework';

// ============================================
// 字段映射类型定义
// ============================================

export interface TeacherBasicFieldMapping extends Record<string, string> {
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

export interface TeacherTitleFieldMapping extends Record<string, string> {
  employeeId: string;
  titleName: string;
  titleLevel: string;
  approvalDate: string;
  appointmentStartDate: string;
  appointmentEndDate: string;
  isCurrent: string;
}

export interface PositionAppointmentFieldMapping extends Record<string, string> {
  employeeId: string;
  positionName: string;
  positionLevel: string;
  appointmentDate: string;
}

export interface ManagementAppointmentFieldMapping extends Record<string, string> {
  employeeId: string;
  positionName: string;
  positionLevel: string;
  appointmentDate: string;
}

export interface WorkerAppointmentFieldMapping extends Record<string, string> {
  employeeId: string;
  positionName: string;
  positionLevel: string;
  appointmentDate: string;
}

export interface AssessmentFieldMapping extends Record<string, string> {
  employeeId: string;
  assessmentDate: string;
  assessmentResult: string;
}

export interface AwardFieldMapping extends Record<string, string> {
  employeeId: string;
  awardName: string;
  awardLevel: string;
  awardDate: string;
}

export interface DepartmentTransferFieldMapping extends Record<string, string> {
  employeeId: string;
  transferDate: string;
  originalDepartment: string;
  newDepartment: string;
}

export interface ContractFieldMapping extends Record<string, string> {
  employeeId: string;
  contractType: string;
  signDate: string;
  expireDate: string;
}

export interface WorkerSkillFieldMapping extends Record<string, string> {
  employeeId: string;
  skillLevel: string;
  skillPosition: string;
  workType: string;
  approvalDate: string;
  isCurrent: string;
}

export interface EducationDegreeFieldMapping extends Record<string, string> {
  employeeId: string;
  educationLevel: string;
  degree: string;
  major: string;
  school: string;
  startDate: string;
  endDate: string;
  graduationDate: string;
}

export interface WorkResumeFieldMapping extends Record<string, string> {
  employeeId: string;
  startDate: string;
  endDate: string;
  workUnit: string;
  position: string;
  workContent: string;
}

export interface ContactInfoFieldMapping extends Record<string, string> {
  employeeId: string;
  emergencyContact: string;
  emergencyPhone: string;
  mobile: string;
  email: string;
  address: string;
  zipCode: string;
}

export interface TalentFieldMapping extends Record<string, string> {
  employeeId: string;
  talentCategory: string;
  talentLevel: string;
  approvalUnit: string;
  approvalDate: string;
  major: string;
}

export interface GraduateSupervisorFieldMapping extends Record<string, string> {
  employeeId: string;
  name: string;
  isExternal: string;
  supervisorType: string;
  researchArea: string;
  masterDate: string;
  doctorDate: string;
  unitName: string;
}

export interface SocialPartTimeFieldMapping extends Record<string, string> {
  employeeId: string;
  partTimeType: string;
  position: string;
  startDate: string;
  endDate: string;
}

export interface ResearchPaperFieldMapping extends Record<string, string> {
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

export interface ResearchBookFieldMapping extends Record<string, string> {
  bookId: string;
  bookTitle: string;
  firstAuthorId: string;
  firstAuthorName: string;
  publisher: string;
  publishDate: string;
  isbn: string;
}

export interface ResearchPatentFieldMapping extends Record<string, string> {
  patentId: string;
  patentTitle: string;
  firstInventorId: string;
  firstInventorName: string;
  patentType: string;
  applicationDate: string;
  grantDate: string;
  patentStatus: string;
}

export interface ResearchAwardFieldMapping extends Record<string, string> {
  awardId: string;
  awardName: string;
  firstCompleterId: string;
  firstCompleterName: string;
  awardLevel: string;
  awardDate: string;
  awardCategory: string;
}

export interface ResearchAppraisalFieldMapping extends Record<string, string> {
  appraisalId: string;
  appraisalName: string;
  firstAuthorId: string;
  firstAuthorName: string;
  appraisalUnit: string;
  appraisalDate: string;
  appraisalResult: string;
}

export interface ResearchTransferFieldMapping extends Record<string, string> {
  transferId: string;
  transferName: string;
  firstAuthorId: string;
  firstAuthorName: string;
  transferDate: string;
  transferAmount: string;
  transferee: string;
}

export interface ResearchReportFieldMapping extends Record<string, string> {
  reportId: string;
  reportName: string;
  firstAuthorId: string;
  firstAuthorName: string;
  submitDate: string;
  submitUnit: string;
  isAdopted: string;
}

export interface ResearchArtworkFieldMapping extends Record<string, string> {
  artworkId: string;
  artworkName: string;
  firstAuthorId: string;
  firstAuthorName: string;
  artworkType: string;
  publishDate: string;
  isAwarded: string;
  awardName: string;
}

export type TeachingFieldMapping = {
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
} & Record<string, string>;

export type WorkloadFieldMapping = {
  teacherId: string;
  teacherName: string;
  courseCode: string;
  courseName: string;
  semesterCode: string;
  semesterName: string;
  studentCount: string;
  hours: string;
  scheduledHours?: string;
} & Record<string, string>;

export interface UndergraduateWorkloadFieldMapping extends Record<string, string> {
  teacherId: string;
  teacherName: string;
  courseCode: string;
  courseName: string;
  semesterCode: string;
  semesterName: string;
  studentCount: string;
  hours: string;
  scheduledHours: string;
}

export interface GraduateWorkloadFieldMapping extends Record<string, string> {
  teacherId: string;
  teacherName: string;
  courseCode: string;
  courseName: string;
  semesterCode: string;
  semesterName: string;
  studentCount: string;
  hours: string;
}

export interface TeachingProjectFieldMapping extends Record<string, string> {
  teacherId: string;
  teacherName: string;
  memberId: string;
  memberName: string;
  projectName: string;
  projectType: string;
  startDate: string;
  memberRank: string;
}

export interface UndergraduateTeachingProjectFieldMapping extends Record<string, string> {
  memberId: string;
  memberName: string;
  projectName: string;
  projectType: string;
  startDate: string;
  memberRank: string;
}

export interface GraduateTeachingProjectFieldMapping extends Record<string, string> {
  teacherId: string;
  teacherName: string;
  projectName: string;
  projectType: string;
  startDate: string;
  memberRank: string;
}

export interface CourseInfoFieldMapping extends Record<string, string> {
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

export interface TextbookFieldMapping extends Record<string, string> {
  teacherId: string;
  textbookId: string;
  textbookName: string;
  isbn: string;
  publisher: string;
  publishDate: string;
  publisherLevel: string;
  authorRank: string;
}

export interface TeachingAwardFieldMapping extends Record<string, string> {
  teacherId: string;
  awardId: string;
  awardName: string;
  awardLevel: string;
  awardDate: string;
  awardCategory: string;
  authorRank: string;
  textbookName: string;
}

export interface BasicTeachingAwardFieldMapping extends Record<string, string> {
  teacherId: string;
  awardId: string;
  awardName: string;
  awardLevel: string;
  awardDate: string;
  awardCategory: string;
  authorRank: string;
}

export interface TeachingPaperFieldMapping extends Record<string, string> {
  teacherId: string;
  paperId: string;
  paperTitle: string;
  journalName: string;
  publishDate: string;
  journalCategory: string;
  authorRank: string;
}

export interface CourseTeamFieldMapping extends Record<string, string> {
  courseId: string;
  teamMember: string;
  responsiblePerson: string;
  outlineDate: string;
}

export interface SupervisionRecordFieldMapping extends Record<string, string> {
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

export interface ClassroomStatsFieldMapping extends Record<string, string> {
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

export interface CompetitionAwardFieldMapping extends Record<string, string> {
  teacherId: string;
  teacherName: string;
  competitionName: string;
  awardLevel: string;
  awardDate: string;
  studentName: string;
}

// ============================================
// 教师中心配置类型
// ============================================

export interface TeacherCenterConfig extends AppBaseConfig {
  ai?: AIConfig;
  tables: {
    teacherBasic: TableConfig<TeacherBasicFieldMapping>;
    teacherTitle: TableConfig<TeacherTitleFieldMapping>;
    workerSkill: TableConfig<WorkerSkillFieldMapping>;
    contactInfo: TableConfig<ContactInfoFieldMapping>;
    talent: TableConfig<TalentFieldMapping>;
    graduateSupervisor: TableConfig<GraduateSupervisorFieldMapping>;
    socialPartTime: TableConfig<SocialPartTimeFieldMapping>;
    positionAppointment: TableConfig<PositionAppointmentFieldMapping>;
    managementAppointment: TableConfig<ManagementAppointmentFieldMapping>;
    workerAppointment: TableConfig<WorkerAppointmentFieldMapping>;
    assessment: TableConfig<AssessmentFieldMapping>;
    award: TableConfig<AwardFieldMapping>;
    departmentTransfer: TableConfig<DepartmentTransferFieldMapping>;
    contract: TableConfig<ContractFieldMapping>;
    educationDegree: TableConfig<EducationDegreeFieldMapping>;
    workResume: TableConfig<WorkResumeFieldMapping>;
    researchPaper: TableConfig<ResearchPaperFieldMapping>;
    researchBook: TableConfig<ResearchBookFieldMapping>;
    researchPatent: TableConfig<ResearchPatentFieldMapping>;
    researchAward: TableConfig<ResearchAwardFieldMapping>;
    researchAppraisal: TableConfig<ResearchAppraisalFieldMapping>;
    researchTransfer: TableConfig<ResearchTransferFieldMapping>;
    researchReport: TableConfig<ResearchReportFieldMapping>;
    researchArtwork: TableConfig<ResearchArtworkFieldMapping>;
    undergraduateTeaching: TableConfig<TeachingFieldMapping>;
    graduateTeaching: TableConfig<TeachingFieldMapping>;
    undergraduateWorkload: TableConfig<UndergraduateWorkloadFieldMapping>;
    graduateWorkload: TableConfig<GraduateWorkloadFieldMapping>;
    undergraduateTeachingProject: TableConfig<UndergraduateTeachingProjectFieldMapping>;
    graduateTeachingProject: TableConfig<GraduateTeachingProjectFieldMapping>;
    supervisionRecord: TableConfig<SupervisionRecordFieldMapping>;
    classroomStats: TableConfig<ClassroomStatsFieldMapping>;
    studentCompetitionAward: TableConfig<CompetitionAwardFieldMapping>;
    undergraduateCourseInfo: TableConfig<CourseInfoFieldMapping>;
    graduateCourseInfo: TableConfig<CourseInfoFieldMapping>;
    undergraduateTextbook: TableConfig<TextbookFieldMapping>;
    graduateTextbook: TableConfig<TextbookFieldMapping>;
    undergraduateTeachingAward: TableConfig<BasicTeachingAwardFieldMapping>;
    graduateTeachingAward: TableConfig<BasicTeachingAwardFieldMapping>;
    undergraduateTeachingPaper: TableConfig<TeachingPaperFieldMapping>;
    graduateTeachingPaper: TableConfig<TeachingPaperFieldMapping>;
    undergraduateCourseTeam: TableConfig<CourseTeamFieldMapping>;
    textbookAward: TableConfig<TeachingAwardFieldMapping>;
  };
}

// ============================================
// 默认配置
// ============================================

const defaultConfig: TeacherCenterConfig = {
  dataSourceId: '9',
  ai: {
    providerId: 'openai',
    model: 'gpt-4o',
  },
  tables: {
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
    positionAppointment: {
      name: 't_dws_gxjg_jzgzjgwprxxmx',
      fields: {
        employeeId: 'gh',
        positionName: 'gwmc',
        positionLevel: 'gwdjmmc',
        appointmentDate: 'prqsrq',
      },
    },
    managementAppointment: {
      name: 't_dws_gxjg_jzgglgwprxxmx',
      fields: {
        employeeId: 'gh',
        positionName: 'glgzmc',
        positionLevel: 'gwdjmmc',
        appointmentDate: 'glqsny',
      },
    },
    workerAppointment: {
      name: 't_dws_gxjg_jzggqgwprxxmx',
      fields: {
        employeeId: 'gh',
        positionName: 'gwmc',
        positionLevel: 'gwdjmmc',
        appointmentDate: 'prqsrq',
      },
    },
    assessment: {
      name: 't_dws_gxjg_jzgkhxxmx',
      fields: {
        employeeId: 'gh',
        assessmentDate: 'jzgkhrq',
        assessmentResult: 'dwkhjgmmc',
      },
    },
    award: {
      name: 't_dws_gxjg_jzgjlxxmx',
      fields: {
        employeeId: 'gh',
        awardName: 'jlmc',
        awardLevel: 'jljbmmc',
        awardDate: 'hjrq',
      },
    },
    departmentTransfer: {
      name: 't_dws_gxjg_jzgbmddxxmx',
      fields: {
        employeeId: 'gh',
        transferDate: 'bmddrq',
        originalDepartment: 'zzndcbmh',
        newDepartment: 'zzndrbmh',
      },
    },
    contract: {
      name: 't_dws_gxjg_jzgpyhtglxxmx',
      fields: {
        employeeId: 'gh',
        contractType: 'pyhtlbmmc',
        signDate: 'qyrq',
        expireDate: 'jsriq',
      },
    },
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
    undergraduateTeaching: {
      name: 't_dws_gxjx_bzksjsskxx_v11mx',
      fields: {
        teacherId: 'jsgh',
        teacherName: 'jsxm',
        classId: 'jxbh',
        courseCode: 'kcdm',
        courseName: 'kcmc',
        semesterCode: 'xnxqdm',
        semesterName: 'xnxqmc',
        className: 'skbjmc',
        departmentName: 'kcksdwmc',
        studentCount: 'xdrs',
        capacity: 'krl',
      },
    },
    graduateTeaching: {
      name: 't_dws_gxjx_yjsjsskxxmx',
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
        capacity: 'krl',
      },
    },
    undergraduateWorkload: {
      name: 't_ynu_gxjx_bzksjsskgzl',
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
    graduateWorkload: {
      name: 't_ynu_gxjx_yjsjsskgzl',
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
    undergraduateTeachingProject: {
      name: 't_dws_gxjx_bzksjxyjxmxxmx',
      fields: {
        memberId: 'xmcygh',
        memberName: 'xmcyxm',
        projectName: 'xmmc',
        projectType: 'xmlb',
        startDate: 'lxsj',
        memberRank: 'brpm',
      },
    },
    graduateTeachingProject: {
      name: 't_gxjx_yjsjsjxyjxm',
      fields: {
        teacherId: 'zcrzgh',
        teacherName: 'zcr',
        projectName: 'xmmc',
        projectType: 'xmlb',
        startDate: 'xmkssj',
        memberRank: 'brpm',
      },
    },
    supervisionRecord: {
      name: 't_dws_ydxt_ydxtddjlmx',
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
    classroomStats: {
      name: 't_ynu_gxjx_aikttjjg',
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
    studentCompetitionAward: {
      name: 't_ynu_gxjx_jzgzdbksjshjxx',
      fields: {
        teacherId: 'jsgh',
        teacherName: 'jsxm',
        competitionName: 'jsmc',
        awardLevel: 'hjdj',
        awardDate: 'hjsj',
        studentName: 'hjxszzxm',
      },
    },
    undergraduateCourseInfo: {
      name: 't_dws_gxjx_bzkskcjbxxmx',
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
    graduateCourseInfo: {
      name: 't_dws_gxjx_yjskcxxmx',
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
    undergraduateTextbook: {
      name: 't_dws_gxjx_bzksjcbjcxxmx',
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
    graduateTextbook: {
      name: 't_gxjx_yjsjsycbyjsjc',
      fields: {
        teacherId: 'zbzgh',
        textbookId: 'jcbh',
        textbookName: 'jcmc',
        isbn: 'sh',
        publisher: 'cbsmc',
        publishDate: 'cbrq',
        publisherLevel: 'cbslb',
        authorRank: 'zbzgh',
      },
    },
    undergraduateTeachingAward: {
      name: 't_dws_gxjx_bzksjxjljjxjsxmxxmx',
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
    graduateTeachingAward: {
      name: 't_gxjx_yjsjsjxjljjxjsxm',
      fields: {
        teacherId: 'hjrzgh',
        awardId: 'jxcgbh',
        awardName: 'jxjlhjsxmmc',
        awardLevel: 'hjdj',
        awardDate: 'hjsj',
        awardCategory: 'yjlb',
        authorRank: 'grpm',
      },
    },
    undergraduateTeachingPaper: {
      name: 't_dws_gxjx_bzksjsfblwxxmx',
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
    graduateTeachingPaper: {
      name: 't_gxjx_yjsjsgkfbjylw',
      fields: {
        teacherId: 'dyzzgzh',
        paperId: 'lwbh',
        paperTitle: 'lwtm',
        journalName: 'qkmc',
        publishDate: 'fbrq',
        journalCategory: 'qklb',
        authorRank: 'dyzzgzh',
      },
    },
    undergraduateCourseTeam: {
      name: 't_dws_gxjx_bzkskcttcymx',
      fields: {
        courseId: 'jxbh',
        teamMember: 'kctdcy',
        responsiblePerson: 'kcfzr',
        outlineDate: 'dgzdrq',
      },
    },
    textbookAward: {
      name: 't_dws_gxjx_bzksjchjxxmx',
      fields: {
        teacherId: 'gh',
        awardId: 'hjjcbh',
        awardName: 'hjmc',
        textbookName: 'jcmc',
        awardLevel: 'jljbm',
        awardDate: 'hjrq',
        awardCategory: 'hjxm',
        authorRank: 'brpm',
      },
    },
  },
};

// ============================================
// 使用工厂创建应用配置包
// ============================================

const appBundle = createAppConfigBundle<TeacherCenterConfig>({
  defaultConfig,
  configFileName: 'teacher-center.yaml',
  legacyConfigPath: 'apps.teacherCenter',
});

const { configLoader, queryService } = appBundle;

// ============================================
// 创建通用查询函数
// ============================================

const queryTable = createQueryFunction<TeacherCenterConfig>(configLoader, queryService);

// ============================================
// 向后兼容的 API
// ============================================

/**
 * 加载教师中心配置
 * @deprecated 使用 configLoader.load() 替代
 */
export function loadTeacherCenterConfig(): TeacherCenterConfig {
  return appBundle.loadConfig();
}

/**
 * 获取教师中心配置
 * @deprecated 使用 configLoader.getConfig() 替代
 */
export function getTeacherCenterConfig(): TeacherCenterConfig {
  return appBundle.getConfig();
}

// ============================================
// 新的便捷 API
// ============================================

/**
 * 获取配置加载器实例
 */
export function getTeacherCenterConfigLoader() {
  return configLoader;
}

/**
 * 获取数据查询服务实例
 */
export function getTeacherCenterQueryService() {
  return queryService;
}

/**
 * 通用查询接口
 * 示例：
 * ```typescript
 * const result = await queryTeacherCenterTable('teacherBasic', {
 *   where: { employeeId: '12345' }
 * });
 * ```
 */
export async function queryTeacherCenterTable<T = Record<string, unknown>>(
  tableName: keyof TeacherCenterConfig['tables'],
  options: QueryOptions = {}
): Promise<QueryResult<T>> {
  return queryTable<T>(tableName, options);
}

// ============================================
// 教师中心数据服务类
// ============================================

export class TeacherCenterDataService extends BaseDataService<TeacherCenterConfig> {
  /**
   * 查询教师列表
   */
  async queryTeachers(page = 1, pageSize = 10) {
    return queryTeacherCenterTable('teacherBasic', {
      page,
      perPage: pageSize,
      orderBy: 'gh',
    });
  }

  /**
   * 根据职工号查询教师基本信息
   */
  async queryTeacherById(employeeId: string) {
    return queryTeacherCenterTable('teacherBasic', {
      where: { employeeId },
    });
  }

  /**
   * 查询教师职称信息
   */
  async queryTeacherTitles(employeeId: string) {
    return queryTeacherCenterTable('teacherTitle', {
      where: { employeeId },
      orderBy: 'prqsrq DESC',
    });
  }

  /**
   * 查询授课列表
   */
  async queryTeaching(
    type: 'undergraduate' | 'graduate' = 'undergraduate',
    page = 1,
    pageSize = 10
  ) {
    const tableName = type === 'undergraduate' ? 'undergraduateTeaching' : 'graduateTeaching';
    return queryTeacherCenterTable(tableName, {
      page,
      perPage: pageSize,
      orderBy: 'xnxqdm DESC, kcdm',
    });
  }

  /**
   * 查询科研论文
   */
  async queryResearchPapers(page = 1, pageSize = 10) {
    return queryTeacherCenterTable('researchPaper', {
      page,
      perPage: pageSize,
      orderBy: 'lwfbrq DESC',
    });
  }

  /**
   * 查询教学奖励
   */
  async queryTeachingAwards(
    type: 'undergraduate' | 'graduate' = 'undergraduate',
    page = 1,
    pageSize = 10
  ) {
    const tableName = type === 'undergraduate' ? 'undergraduateTeachingAward' : 'graduateTeachingAward';
    return queryTeacherCenterTable(tableName, {
      page,
      perPage: pageSize,
      orderBy: 'hjnf DESC',
    });
  }
}

// 导出默认实例
export const teacherCenterDataService = new TeacherCenterDataService(configLoader, queryService);

export default configLoader;
