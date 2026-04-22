import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { getConfig } from './index';

// 字段映射配置
export interface FieldMapping {
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

// 教学班字段映射
export interface TeachingClassFieldMapping {
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

// 课堂统计字段映射
export interface ClassroomStatsFieldMapping {
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

// 教材字段映射
export interface TextbookFieldMapping {
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

// 督导记录字段映射
export interface SupervisionFieldMapping {
  classCode: string;
  teacherName: string;
  semesterCode: string;
  supervisorName: string;
  supervisionType: string;
  supervisionDate: string;
  evaluation: string;
  rating: string;
}

// 成绩字段映射
export interface GradeFieldMapping {
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

// 课程思政字段映射
export interface CourseIdeologyFieldMapping {
  classCode: string;
  semesterCode: string;
  courseCode: string;
  courseName: string;
  teacherName: string;
  ideologyPoint: string;
  sequence: string;
}

// 表配置 - 支持两种方式：数据对象ID 或 表名
export interface TableConfig<T> {
  // 方式一：数据对象ID（优先级高）
  dataObjectId?: number;
  // 方式二：直接表名
  name?: string;
  fields: T;
}

// 课程中心完整配置
export interface CourseCenterConfig {
  // 全局数据源ID（当表配置没有指定数据对象ID时使用）
  dataSourceId?: string;
  tables: {
    undergraduateCourse: TableConfig<FieldMapping>;
    graduateCourse: TableConfig<FieldMapping>;
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

// 默认配置
const defaultConfig: CourseCenterConfig = {
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
      name: 't_dws_ydxt_ydxtddjlmx',
      fields: {
        classCode: 'jxbid',
        teacherName: 'jsxm',
        semesterCode: 'xnxqm',
        supervisorName: 'ddzxm',
        supervisionType: 'ddlxmc',
        supervisionDate: 'tksj',
        evaluation: 'pj',
        rating: 'sypf',
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
      name: 't_dws_gxjx_bzkskcszmx',
      fields: {
        classCode: 'jxbh',
        semesterCode: 'xnxqm',
        courseCode: 'kch',
        courseName: 'kcmc',
        teacherName: 'jsxm',
        ideologyPoint: 'szfxzd',
        sequence: 'px',
      },
    },
  },
};

let courseCenterConfig: CourseCenterConfig | null = null;

/**
 * 加载课程中心配置
 * 优先从单独配置文件加载，如果不存在则使用主配置文件或默认值
 */
export function loadCourseCenterConfig(): CourseCenterConfig {
  if (courseCenterConfig) {
    return courseCenterConfig;
  }

  const configPath = path.join(process.cwd(), 'config', 'course-center.yaml');

  // 尝试从单独配置文件加载
  if (fs.existsSync(configPath)) {
    try {
      const fileContents = fs.readFileSync(configPath, 'utf8');
      const userConfig = yaml.load(fileContents) as Partial<CourseCenterConfig>;
      
      // 深度合并用户配置和默认配置
      courseCenterConfig = deepMerge(defaultConfig, userConfig);
      return courseCenterConfig;
    } catch (error) {
      console.warn('加载 course-center.yaml 失败，使用默认配置:', error);
    }
  }

  // 尝试从主配置文件加载（向后兼容）
  try {
    const mainConfig = getConfig();
    if (mainConfig.apps?.courseCenter) {
      const legacyConfig = mainConfig.apps.courseCenter;
      
      // 构建兼容的配置
      courseCenterConfig = {
        dataSourceId: legacyConfig.dataSourceId || undefined,
        tables: {
          undergraduateCourse: {
            ...defaultConfig.tables.undergraduateCourse,
            name: legacyConfig.undergraduateCourseTableName || defaultConfig.tables.undergraduateCourse.name,
          },
          graduateCourse: {
            ...defaultConfig.tables.graduateCourse,
            name: legacyConfig.graduateCourseTableName || defaultConfig.tables.graduateCourse.name,
          },
          undergraduateTeaching: {
            ...defaultConfig.tables.undergraduateTeaching,
            name: legacyConfig.undergraduateTeachingTableName || defaultConfig.tables.undergraduateTeaching.name,
          },
          graduateTeaching: {
            ...defaultConfig.tables.graduateTeaching,
            name: legacyConfig.graduateTeachingTableName || defaultConfig.tables.graduateTeaching.name,
          },
          classroomStats: {
            ...defaultConfig.tables.classroomStats,
            name: legacyConfig.classroomStatsTableName || defaultConfig.tables.classroomStats.name,
          },
          undergraduateTextbook: {
            ...defaultConfig.tables.undergraduateTextbook,
            name: legacyConfig.undergraduateTextbookTableName || defaultConfig.tables.undergraduateTextbook.name,
          },
          supervisionRecord: {
            ...defaultConfig.tables.supervisionRecord,
            name: legacyConfig.supervisionRecordTableName || defaultConfig.tables.supervisionRecord.name,
          },
          undergraduateGrade: {
            ...defaultConfig.tables.undergraduateGrade,
            name: legacyConfig.undergraduateGradeTableName || defaultConfig.tables.undergraduateGrade.name,
          },
          graduateGrade: {
            ...defaultConfig.tables.graduateGrade,
            name: legacyConfig.graduateGradeTableName || defaultConfig.tables.graduateGrade.name,
          },
          courseIdeology: {
            ...defaultConfig.tables.courseIdeology,
            name: legacyConfig.courseIdeologyTableName || defaultConfig.tables.courseIdeology.name,
          },
        },
      };
      return courseCenterConfig;
    }
  } catch (error) {
    console.warn('从主配置文件加载课程中心配置失败:', error);
  }

  // 使用默认配置
  courseCenterConfig = defaultConfig;
  return courseCenterConfig;
}

/**
 * 获取课程中心配置
 */
export function getCourseCenterConfig(): CourseCenterConfig {
  if (!courseCenterConfig) {
    return loadCourseCenterConfig();
  }
  return courseCenterConfig;
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

export default getCourseCenterConfig;
