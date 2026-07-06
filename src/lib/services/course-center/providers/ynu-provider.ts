/**
 * 云南大学课程中心数据提供者实现
 * 基于MySQL数据库查询的课程中心数据获取实现
 */

import { getConfig } from '@/lib/config';
import { getCourseCenterConfigLoader } from '@/lib/config/course-center';
import { findById as findDataSourceById } from '@/lib/database/models/dataSource';
import { findById as findDataObjectById } from '@/lib/database/models/dataObject';
import mysql from 'mysql2/promise';
import {
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
} from '../types';

// 获取配置加载器实例
const configLoader = getCourseCenterConfigLoader();
const getCourseCenterConfig = () => configLoader.getConfig();

/**
 * 云南大学数据提供者
 * 实现 ICourseDataProvider 接口，通过MySQL数据库查询数据
 */
export class YnuDataProvider implements ICourseDataProvider {
  /**
   * 查询课程列表（本科生 + 研究生）
   */
  async queryCourses(params: QueryCoursesParams): Promise<PaginatedResult<Course>> {
    const { keyword, dept, status, nature, category, page = 1, pageSize = 10 } = params;
    const config = getCourseCenterConfig();

    // 优先查询本科生课程
    const ugTable = config.tables.undergraduateCourse;
    const gradTable = config.tables.graduateCourse;

    // 这里简化处理，实际应该根据参数决定查询哪个表或合并查询
    // 暂时只查询本科生课程
    return this.queryUndergraduateCourses(params);
  }

  /**
   * 查询本科生课程
   */
  private async queryUndergraduateCourses(params: QueryCoursesParams): Promise<PaginatedResult<Course>> {
    const { keyword, dept, status, page = 1, pageSize = 10 } = params;
    const config = getCourseCenterConfig();
    const table = config.tables.undergraduateCourse;
    const f = table.fields;

    const pool = await this.getDataSourcePool(table.dataObjectId);

    try {
      const whereConditions: string[] = [];
      const queryParams: (string | number)[] = [];

      if (keyword) {
        whereConditions.push(`(${f.courseCode} LIKE ? OR ${f.courseName} LIKE ? OR ${f.deptName} LIKE ? OR ${f.responsiblePerson} LIKE ?)`);
        const kw = `%${keyword}%`;
        queryParams.push(kw, kw, kw, kw);
      }

      if (dept) {
        whereConditions.push(`${f.deptCode} = ?`);
        queryParams.push(dept);
      }

      if (status) {
        whereConditions.push(`${f.statusCode} = ?`);
        queryParams.push(status);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // 查询总数
      const [countRows] = await pool.execute(
        `SELECT COUNT(*) as total FROM ${table.name} ${whereClause}`,
        queryParams
      );
      const total = (countRows as Array<{ total: number }>)[0]?.total || 0;

      // 查询数据
      const offset = (page - 1) * pageSize;
      const [rows] = await pool.query(
        `SELECT
          ${f.courseCode} as kch,
          ${f.courseName} as kcmc,
          ${f.responsiblePerson} as kcfzrh,
          ${f.deptCode} as kcksdwh,
          ${f.deptName} as kcksdwmc,
          ${f.credits} as xf,
          ${f.totalHours} as zxs,
          ${f.theoryHours} as llxs,
          ${f.practiceHours} as sjxs,
          ${f.introduction} as kcjj,
          ${f.materials} as jc,
          ${f.referenceMaterials} as cksm,
          ${f.natureCode} as kcxzm,
          ${f.natureName} as kcxzmc,
          ${f.categoryCode} as kclbm,
          ${f.categoryName} as kclbmc,
          ${f.statusCode} as sfyx,
          ${f.englishName} as kcywmc
        FROM ${table.name}
        ${whereClause}
        ORDER BY ${f.courseCode}
        LIMIT ? OFFSET ?`,
        [...queryParams, pageSize, offset]
      );

      return {
        data: rows as Course[],
        total,
      };
    } finally {
      await pool.end();
    }
  }

  /**
   * 查询单个课程详情
   */
  async queryCourseByCode(kch: string): Promise<Course | null> {
    const config = getCourseCenterConfig();
    const table = config.tables.undergraduateCourse;
    const f = table.fields;

    const pool = await this.getDataSourcePool(table.dataObjectId);

    try {
      const [rows] = await pool.execute(
        `SELECT
          ${f.courseCode} as kch,
          ${f.courseName} as kcmc,
          ${f.responsiblePerson} as kcfzrh,
          ${f.deptCode} as kcksdwh,
          ${f.deptName} as kcksdwmc,
          ${f.credits} as xf,
          ${f.totalHours} as zxs,
          ${f.theoryHours} as llxs,
          ${f.practiceHours} as sjxs,
          ${f.introduction} as kcjj,
          ${f.materials} as jc,
          ${f.referenceMaterials} as cksm,
          ${f.natureCode} as kcxzm,
          ${f.natureName} as kcxzmc,
          ${f.categoryCode} as kclbm,
          ${f.categoryName} as kclbmc,
          ${f.statusCode} as sfyx,
          ${f.englishName} as kcywmc
        FROM ${table.name}
        WHERE ${f.courseCode} = ?`,
        [kch]
      );

      const courses = rows as Course[];
      return courses[0] || null;
    } finally {
      await pool.end();
    }
  }

  /**
   * 查询课程的教学班列表
   */
  async queryTeachingClasses(params: QueryTeachingClassesParams): Promise<PaginatedResult<TeachingClass>> {
    const { kch, page = 1, pageSize = 10 } = params;
    const config = getCourseCenterConfig();
    const table = config.tables.undergraduateTeaching;
    const f = table.fields;

    const pool = await this.getDataSourcePool(table.dataObjectId);

    try {
      const [countRows] = await pool.execute(
        `SELECT COUNT(*) as total FROM ${table.name} WHERE ${f.courseCode} = ?`,
        [kch]
      );
      const total = (countRows as Array<{ total: number }>)[0]?.total || 0;

      const offset = (page - 1) * pageSize;
      const [rows] = await pool.query(
        `SELECT
          ${f.classCode} as jxbh,
          ${f.teacherCode} as jsgh,
          ${f.teacherName} as jsxm,
          ${f.semesterCode} as xnxqdm,
          ${f.semesterName} as xnxqmc,
          ${f.courseCode} as kch,
          ${f.courseName} as kcmc,
          ${f.weekInfo} as zc,
          ${f.dayOfWeek} as xq,
          ${f.className} as skbjmc,
          ${f.deptName} as ksdwmc,
          ${f.campusName} as xqmc,
          ${f.buildingName} as jxlmc,
          ${f.roomName} as jsmc,
          ${f.seatCount} as zwrs,
          ${f.studentCount} as xdrs
        FROM ${table.name}
        WHERE ${f.courseCode} = ?
        ORDER BY ${f.semesterCode} DESC, ${f.classCode}
        LIMIT ? OFFSET ?`,
        [kch, pageSize, offset]
      );

      return {
        data: rows as TeachingClass[],
        total,
      };
    } finally {
      await pool.end();
    }
  }

  /**
   * 查询课堂统计数据
   */
  async queryClassroomStats(params: QueryClassroomStatsParams): Promise<PaginatedResult<ClassroomStats>> {
    const { kch, jxbh, page = 1, pageSize = 10 } = params;
    const config = getCourseCenterConfig();
    const table = config.tables.classroomStats;
    const f = table.fields;

    const pool = await this.getDataSourcePool(table.dataObjectId);

    try {
      let whereClause = `${f.courseCode} = ?`;
      const queryParams: (string | number)[] = [kch];

      if (jxbh) {
        whereClause += ` AND ${f.classCode} = ?`;
        queryParams.push(jxbh);
      }

      const [countRows] = await pool.execute(
        `SELECT COUNT(*) as total FROM ${table.name} WHERE ${whereClause}`,
        queryParams
      );
      const total = (countRows as Array<{ total: number }>)[0]?.total || 0;

      const offset = (page - 1) * pageSize;
      const [rows] = await pool.query(
        `SELECT
          ${f.classCode} as jxbh,
          ${f.semesterCode} as xnxqdm,
          ${f.semesterName} as xnxqmc,
          ${f.courseCode} as kch,
          ${f.courseName} as kcmc,
          ${f.teacherName} as jsxm,
          ${f.date} as ksrq,
          ${f.studentCount} as xdrs,
          ${f.attendanceRate} as kql,
          ${f.focusRate} as zzd
        FROM ${table.name}
        WHERE ${whereClause}
        ORDER BY ${f.date} ASC
        LIMIT ? OFFSET ?`,
        [...queryParams, pageSize, offset]
      );

      return {
        data: rows as ClassroomStats[],
        total,
      };
    } finally {
      await pool.end();
    }
  }

  /**
   * 查询课程教材信息
   */
  async queryTextbooks(params: QueryTextbooksParams): Promise<PaginatedResult<Textbook>> {
    const { kch, page = 1, pageSize = 10 } = params;
    const config = getCourseCenterConfig();
    const table = config.tables.undergraduateTextbook;
    const f = table.fields;

    const pool = await this.getDataSourcePool(table.dataObjectId);

    try {
      const [countRows] = await pool.execute(
        `SELECT COUNT(*) as total FROM ${table.name} WHERE ${f.courseCode} = ?`,
        [kch]
      );
      const total = (countRows as Array<{ total: number }>)[0]?.total || 0;

      const offset = (page - 1) * pageSize;
      const [rows] = await pool.query(
        `SELECT
          ${f.courseCode} as kch,
          ${f.courseName} as kcmc,
          ${f.textbookName} as jcmc,
          ${f.isbn} as isbn,
          ${f.author} as zz,
          ${f.publisher} as cbsmc,
          ${f.publishDate} as cbsj,
          ${f.isNewEdition} as sfxb
        FROM ${table.name}
        WHERE ${f.courseCode} = ?
        ORDER BY ${f.isNewEdition} DESC, ${f.publishDate} DESC
        LIMIT ? OFFSET ?`,
        [kch, pageSize, offset]
      );

      return {
        data: rows as Textbook[],
        total,
      };
    } finally {
      await pool.end();
    }
  }

  /**
   * 查询部门列表
   */
  async queryDepartments(): Promise<Department[]> {
    const config = getCourseCenterConfig();
    const table = config.tables.undergraduateCourse;
    const f = table.fields;

    const pool = await this.getDataSourcePool(table.dataObjectId);

    try {
      const [rows] = await pool.execute(
        `SELECT DISTINCT ${f.deptCode} as dwh, ${f.deptName} as dwmc 
         FROM ${table.name} 
         WHERE ${f.deptCode} IS NOT NULL AND ${f.deptCode} != '' 
         ORDER BY ${f.deptName}`
      );

      return rows as Department[];
    } finally {
      await pool.end();
    }
  }

  /**
   * 查询课程性质列表
   */
  async queryCourseNatures(): Promise<CourseNature[]> {
    const config = getCourseCenterConfig();
    const table = config.tables.undergraduateCourse;
    const f = table.fields;

    const pool = await this.getDataSourcePool(table.dataObjectId);

    try {
      const [rows] = await pool.execute(
        `SELECT DISTINCT ${f.natureCode} as kcxzm, ${f.natureName} as kcxzmc 
         FROM ${table.name} 
         WHERE ${f.natureCode} IS NOT NULL AND ${f.natureCode} != '' 
         ORDER BY ${f.natureName}`
      );

      return rows as CourseNature[];
    } finally {
      await pool.end();
    }
  }

  /**
   * 查询课程类别列表
   */
  async queryCourseCategories(): Promise<CourseCategory[]> {
    const config = getCourseCenterConfig();
    const table = config.tables.undergraduateCourse;
    const f = table.fields;

    const pool = await this.getDataSourcePool(table.dataObjectId);

    try {
      const [rows] = await pool.execute(
        `SELECT DISTINCT ${f.categoryCode} as kclbm, ${f.categoryName} as kclbmc 
         FROM ${table.name} 
         WHERE ${f.categoryCode} IS NOT NULL AND ${f.categoryCode} != '' 
         ORDER BY ${f.categoryName}`
      );

      return rows as CourseCategory[];
    } finally {
      await pool.end();
    }
  }

  /**
   * 获取数据源连接池
   */
  private async getDataSourcePool(preferredDataObjectId?: number): Promise<mysql.Pool> {
    const config = getCourseCenterConfig();
    let dataSourceId = config.dataSourceId;

    // 如果指定了优先使用的数据对象ID，从数据对象获取数据源ID
    if (preferredDataObjectId) {
      const dataObject = await findDataObjectById(preferredDataObjectId);
      if (dataObject && dataObject.status === 1) {
        dataSourceId = dataObject.data_source_id;
      }
    }

    // 如果没有全局 dataSourceId，尝试从第一个配置了 dataObjectId 的表获取
    if (!dataSourceId) {
      const tables = config.tables;
      for (const [, tableConfig] of Object.entries(tables)) {
        if (tableConfig.dataObjectId) {
          const dataObject = await findDataObjectById(tableConfig.dataObjectId);
          if (dataObject && dataObject.status === 1) {
            dataSourceId = dataObject.data_source_id;
            break;
          }
        }
      }
    }

    if (!dataSourceId) {
      throw new Error('数据源ID未配置');
    }

    const dataSource = await findDataSourceById(dataSourceId);
    if (!dataSource) {
      throw new Error(`数据源不存在: ${dataSourceId}`);
    }

    if (dataSource.type !== 'mysql') {
      throw new Error('暂不支持非MySQL数据源');
    }

    return mysql.createPool({
      host: dataSource.host,
      port: dataSource.port,
      user: dataSource.username,
      password: dataSource.password,
      database: dataSource.db_name,
      connectionLimit: 5,
    });
  }
}
