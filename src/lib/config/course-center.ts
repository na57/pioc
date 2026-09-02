/**
 * 课程中心配置
 * 使用通用数据访问框架重构 - 工厂模式
 */

import {
  TableConfig,
  AppBaseConfig,
  createAppConfigBundle,
  createQueryFunction,
  BaseDataService,
  QueryOptions,
  QueryResult,
} from '@/lib/data-framework';

// ============================================
// 字段映射类型定义
// ============================================

export interface CourseFieldMapping extends Record<string, string> {
  courseCode: string;
  courseName: string;
  responsiblePerson: string;
  deptCode: string;
  deptName: string;
  credits: string;
  totalHours: string;
  theoryHours: string;
  practiceHours: string;
  practiceWeeks: string;
  introduction: string;
  materials: string;
  referenceMaterials: string;
  natureCode: string;
  natureName: string;
  categoryCode: string;
  categoryName: string;
  teachingMethodCode: string;
  languageCode: string;
  languageName: string;
  statusCode: string;
  examTypeCode: string;
  examTypeName: string;
  description: string;
  objectives: string;
  englishObjectives: string;
  comprehensiveHours: string;
  englishName: string;
  timestamp: string;
}

export interface TeachingClassFieldMapping extends Record<string, string> {
  classCode: string;
  teacherCode: string;
  teacherName: string;
  semesterCode: string;
  semesterName: string;
  courseCode: string;
  courseName: string;
  weekInfo: string;
  dayOfWeek: string;
  className: string;
  deptName: string;
  campusCode: string;
  campusName: string;
  buildingCode: string;
  buildingName: string;
  roomCode: string;
  roomName: string;
  seatCount: string;
  studentCount: string;
}

export interface ClassroomStatsFieldMapping extends Record<string, string> {
  classCode: string;
  semesterCode: string;
  semesterName: string;
  courseCode: string;
  courseName: string;
  teacherName: string;
  date: string;
  studentCount: string;
  attendanceRate: string;
  raiseHandCount: string;
  respondCount: string;
  focusRate: string;
}

export interface TextbookFieldMapping extends Record<string, string> {
  courseCode: string;
  courseName: string;
  semesterCode: string;
  semesterName: string;
  textbookName: string;
  isbn: string;
  author: string;
  publisher: string;
  publishDate: string;
  isNewEdition: string;
}

export interface SupervisionFieldMapping extends Record<string, string> {
  uniqueId: string;
  documentCode: string;
  reviewer: string;
  reviewerName: string;
  evaluatedPerson: string;
  evaluatedPersonName: string;
  courseCode: string;
  courseName: string;
  teachingClassId: string;
  totalScore: string;
  shouldAttend: string;
  actualAttend: string;
  visitTime: string;
  semesterCode: string;
  semesterName: string;
  suggestion: string;
  expertOpinion: string;
}

export interface GradeFieldMapping extends Record<string, string> {
  classCode: string;
  semesterCode: string;
  studentId: string;
  studentName: string;
  courseCode: string;
  courseName: string;
  regularScore: string;
  midtermScore: string;
  finalScore: string;
  totalScore: string;
  gradePoint: string;
  credit: string;
}

export interface CourseIdeologyFieldMapping extends Record<string, string> {
  sequence: string;
  themeActivity: string;
  selectedChapter: string;
  knowledgeEntry: string;
  ideologyPoint: string;
  educationStrategy: string;
  timestamp: string;
  teachingClassId: string;
}

// ============================================
// 课程中心配置类型
// ============================================

export interface CourseCenterConfig extends AppBaseConfig {
  /** 数据提供者名称，用于确定使用哪个数据提供者实现 */
  provider?: string;
  tables: {
    undergraduateCourse: TableConfig<CourseFieldMapping>;
    graduateCourse: TableConfig<CourseFieldMapping>;
    undergraduateTeaching: TableConfig<TeachingClassFieldMapping>;
    graduateTeaching: TableConfig<TeachingClassFieldMapping>;
    classroomStats: TableConfig<ClassroomStatsFieldMapping>;
    undergraduateTextbook: TableConfig<TextbookFieldMapping>;
    supervisionRecord: TableConfig<SupervisionFieldMapping>;
    undergraduateGrade: TableConfig<GradeFieldMapping>;
    graduateGrade: TableConfig<GradeFieldMapping>;
    courseIdeology: TableConfig<CourseIdeologyFieldMapping>;
  };
}

// ============================================
// 默认配置
// ============================================

const defaultConfig: CourseCenterConfig = {
  provider: 'ynu',
  tables: {
    undergraduateCourse: {
      name: 't_dws_gxjx_bzkskcjbxxmx',
      fields: {
        courseCode: 'kch',
        courseName: 'kcmc',
        responsiblePerson: 'kcfzrh',
        deptCode: 'gsyxbm',
        deptName: 'gsyxmc',
        credits: 'xf',
        totalHours: 'zxs',
        theoryHours: 'llxs',
        practiceHours: 'syxs',
        practiceWeeks: 'sjxs',
        introduction: 'kcjj',
        materials: 'jc',
        referenceMaterials: 'cksm',
        natureCode: 'kcccm',
        natureName: 'kcccmc',
        categoryCode: 'kcflm',
        categoryName: 'kcflmc',
        teachingMethodCode: 'jxfsdm',
        languageCode: 'skyzdm',
        languageName: 'skyzmc',
        statusCode: 'kcztdm',
        examTypeCode: 'kslxdm',
        examTypeName: 'kslxdmmc',
        description: 'kcsm',
        objectives: 'kcmb',
        englishObjectives: 'ywkcmb',
        comprehensiveHours: 'zhxs',
        englishName: 'kcywmc',
        timestamp: 'tstamp',
      },
    },
    graduateCourse: {
      name: 't_dws_gxjx_yjskcxxmx',
      fields: {
        courseCode: 'kch',
        courseName: 'kcmc',
        responsiblePerson: 'kcfzrh',
        deptCode: 'kcksdwh',
        deptName: 'kcksdwmc',
        credits: 'xf',
        totalHours: 'zxs',
        theoryHours: 'llxs',
        practiceHours: 'syxs',
        practiceWeeks: 'sjxs',
        introduction: 'kcjj',
        materials: 'jc',
        referenceMaterials: 'cksm',
        natureCode: 'kcccm',
        natureName: 'kcccmc',
        categoryCode: 'kcflm',
        categoryName: 'kcflmc',
        teachingMethodCode: 'jxfsdm',
        languageCode: 'skyzdm',
        languageName: 'skyzmc',
        statusCode: 'sfyx',
        examTypeCode: 'kslxdm',
        examTypeName: 'kslxdmmc',
        description: 'kcsm',
        objectives: 'kcmb',
        englishObjectives: 'ywkcmb',
        comprehensiveHours: 'zhxs',
        englishName: 'kcywmc',
        timestamp: 'tstamp',
      },
    },
    undergraduateTeaching: {
      name: 't_dws_gxjx_bzksjsskxx_v11mx',
      fields: {
        classCode: 'jxbh',
        teacherCode: 'jsgh',
        teacherName: 'jsxm',
        semesterCode: 'xnxqdm',
        semesterName: 'xnxqmc',
        courseCode: 'kcdm',
        courseName: 'kcmc',
        weekInfo: 'skzc',
        dayOfWeek: 'skxq',
        className: 'skbjmc',
        deptName: 'kcksdwmc',
        campusCode: 'xnqdm',
        campusName: 'xnqmc',
        buildingCode: 'jxlm',
        buildingName: 'jxlmc',
        roomCode: 'jsm',
        roomName: 'jsmc',
        seatCount: 'zws',
        studentCount: 'xkrs',
      },
    },
    graduateTeaching: {
      name: 't_dws_gxjx_yjsjsskxxmx',
      fields: {
        classCode: 'jxbh',
        teacherCode: 'jsgh',
        teacherName: 'jsxm',
        semesterCode: 'xnxqdm',
        semesterName: 'xnxqmc',
        courseCode: 'kcdm',
        courseName: 'kcmc',
        weekInfo: 'zc',
        dayOfWeek: 'xq',
        className: 'xszyjc',
        deptName: 'yxmc',
        campusCode: 'xnqdm',
        campusName: 'xnqmc',
        buildingCode: 'jxlm',
        buildingName: 'jxlmc',
        roomCode: 'jsm',
        roomName: 'jsmc',
        seatCount: 'zws',
        studentCount: 'xkrs',
      },
    },
    classroomStats: {
      name: 't_ynu_gxjx_aikttjjg',
      fields: {
        classCode: 'jxbh',
        semesterCode: 'xnxqdm',
        semesterName: 'xnxqmc',
        courseCode: 'kcdm',
        courseName: 'kcmc',
        teacherName: 'jsxm',
        date: 'sksj',
        studentCount: 'sdrs',
        attendanceRate: 'cqkl',
        raiseHandCount: 'jssc',
        respondCount: 'hdsc',
        focusRate: 'zxdl',
      },
    },
    undergraduateTextbook: {
      name: 't_dws_gxjx_bzksjcsyxxmx',
      fields: {
        courseCode: 'kcdm',
        courseName: 'kcmc',
        semesterCode: 'xnxqdm',
        semesterName: 'xnxqmc',
        textbookName: 'jcmc',
        isbn: 'isbn',
        author: 'zz',
        publisher: 'cbs',
        publishDate: 'cbrq',
        isNewEdition: 'sfzxjcsyqk',
      },
    },
    supervisionRecord: {
      name: '',
      fields: {
        uniqueId: 'wybs',
        documentCode: 'wjdm',
        reviewer: 'bpr',
        reviewerName: 'bprxm',
        evaluatedPerson: 'cpr',
        evaluatedPersonName: 'cprxm',
        courseCode: 'kcdm',
        courseName: 'kcmc',
        teachingClassId: 'jxbid',
        totalScore: 'zf',
        shouldAttend: 'ydrs',
        actualAttend: 'sdrs',
        visitTime: 'tksj',
        semesterCode: 'xnxqdm',
        semesterName: 'xnxqmc',
        suggestion: 'pjjy',
        expertOpinion: 'pgzjyj',
      },
    },
    undergraduateGrade: {
      name: 't_dws_gxxs_bzkscjxx',
      fields: {
        classCode: 'jxbh',
        semesterCode: 'xnxqm',
        studentId: 'xh',
        studentName: 'xm',
        courseCode: 'kch',
        courseName: 'kcmc',
        regularScore: 'pscj',
        midtermScore: 'qzcj',
        finalScore: 'qmcj',
        totalScore: 'zzcj',
        gradePoint: 'jd',
        credit: 'xf',
      },
    },
    graduateGrade: {
      name: 't_dws_gxxs_yjscjxx',
      fields: {
        classCode: 'jxbh',
        semesterCode: 'xnxqm',
        studentId: 'xh',
        studentName: 'xm',
        courseCode: 'kch',
        courseName: 'kcmc',
        regularScore: 'pscj',
        midtermScore: 'qzcj',
        finalScore: 'qmcj',
        totalScore: 'zzcj',
        gradePoint: 'jd',
        credit: 'xf',
      },
    },
    courseIdeology: {
      name: '',
      fields: {
        sequence: 'px',
        themeActivity: 'szrhd',
        selectedChapter: 'xqzj',
        knowledgeEntry: 'zsdqr',
        ideologyPoint: 'szjhd',
        educationStrategy: 'szyrcl',
        timestamp: 'tstamp',
        teachingClassId: 'jxbh',
      },
    },
  },
};

// ============================================
// 使用工厂创建应用配置包
// ============================================

const appBundle = createAppConfigBundle<CourseCenterConfig>({
  defaultConfig,
  configFileName: 'course-center.yaml',
  legacyConfigPath: 'apps.courseCenter',
});

const { configLoader, queryService } = appBundle;

// ============================================
// 创建通用查询函数
// ============================================

const queryTable = createQueryFunction<CourseCenterConfig>(configLoader, queryService);

// ============================================
// 向后兼容的 API
// ============================================

/**
 * 加载课程中心配置
 * @deprecated 使用 configLoader.load() 替代
 */
export function loadCourseCenterConfig(): CourseCenterConfig {
  return appBundle.loadConfig();
}

/**
 * 获取课程中心配置
 * @deprecated 使用 configLoader.getConfig() 替代
 */
export function getCourseCenterConfig(): CourseCenterConfig {
  return appBundle.getConfig();
}

// ============================================
// 新的便捷 API
// ============================================

/**
 * 获取配置加载器实例
 */
export function getCourseCenterConfigLoader() {
  return configLoader;
}

/**
 * 获取数据查询服务实例
 */
export function getCourseCenterQueryService() {
  return queryService;
}

/**
 * 通用查询接口
 * 示例：
 * ```typescript
 * const result = await queryCourseCenterTable('undergraduateCourse', {
 *   page: 1,
 *   perPage: 10,
 *   orderBy: 'kch'
 * });
 * ```
 */
export async function queryCourseCenterTable<T = Record<string, unknown>>(
  tableName: keyof CourseCenterConfig['tables'],
  options: QueryOptions = {}
): Promise<QueryResult<T>> {
  return queryTable<T>(tableName, options);
}

// ============================================
// 课程中心数据服务类
// ============================================

export class CourseCenterDataService extends BaseDataService<CourseCenterConfig> {
  /**
   * 查询本科生课程列表
   */
  async queryUndergraduateCourses(page = 1, pageSize = 10) {
    return queryCourseCenterTable('undergraduateCourse', {
      page,
      perPage: pageSize,
      orderBy: 'kch',
    });
  }

  /**
   * 查询研究生课程列表
   */
  async queryGraduateCourses(page = 1, pageSize = 10) {
    return queryCourseCenterTable('graduateCourse', {
      page,
      perPage: pageSize,
      orderBy: 'kch',
    });
  }

  /**
   * 根据课程代码查询课程
   */
  async queryCourseByCode(courseCode: string, type: 'undergraduate' | 'graduate' = 'undergraduate') {
    const tableName = type === 'undergraduate' ? 'undergraduateCourse' : 'graduateCourse';
    return queryCourseCenterTable(tableName, {
      where: { courseCode },
    });
  }

  /**
   * 查询教学班列表
   */
  async queryTeachingClasses(
    type: 'undergraduate' | 'graduate' = 'undergraduate',
    page = 1,
    pageSize = 10
  ) {
    const tableName = type === 'undergraduate' ? 'undergraduateTeaching' : 'graduateTeaching';
    return queryCourseCenterTable(tableName, {
      page,
      perPage: pageSize,
      orderBy: 'xnxqdm DESC, jxbh',
    });
  }

  /**
   * 查询课堂统计
   */
  async queryClassroomStats(page = 1, pageSize = 10) {
    return queryCourseCenterTable('classroomStats', {
      page,
      perPage: pageSize,
      orderBy: 'sksj DESC',
    });
  }
}

// 导出默认实例
export const courseCenterDataService = new CourseCenterDataService(configLoader, queryService);

export default configLoader;
