/**
 * 云南大学课程中心数据提供者实现
 *
 * 课程信息（列表、详情、字典）、教学班、课堂统计通过数据中台 API 获取；
 * 教材信息仍通过 MySQL 数据库查询（暂无对应 API 文档）。
 *
 * 本文件作为外部数据中台 API 的数据适配器，API 返回字段繁多且动态变化，
 * 因此在原始数据映射阶段使用 any 类型以保持代码可维护性。
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  getCourseCenterConfigLoader,
} from '@/lib/config/course-center';
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
  CourseType,
  SupervisionRecord,
  CourseIdeology,
} from '../types';

// ============================================
// API 配置
// ============================================

const API_BASE_URL = 'https://dmp.ynu.edu.cn';
const API_KEY = process.env.YNU_API_KEY || '';
const API_SECRET = process.env.YNU_API_SECRET || '';

// 课程信息明细接口（与数据表一一对应）
const UNDERGRADUATE_COURSE_ENDPOINT = '/open_api/customization/tdwsgxjxbzkskcjbxxmx/full';
const GRADUATE_COURSE_ENDPOINT = '/open_api/customization/tdwsgxjxyjskcxxmx/full';

// 教学班信息明细接口
const UNDERGRADUATE_TEACHING_ENDPOINT = '/open_api/customization/tdwsgxjxbzksjsskxxvmx/full';
const GRADUATE_TEACHING_ENDPOINT = '/open_api/customization/tdwsgxjxyjsjsskxxmx/full';

// 课堂统计接口
const CLASSROOM_STATS_ENDPOINT = '/open_api/customization/tynugxjxaikttjjg/full';

// 课程思政接口
const COURSE_IDEOLOGY_ENDPOINT = '/open_api/customization/tdwsgxjxbzkskcszmx/full';

// 督导记录接口
const SUPERVISION_RECORD_ENDPOINT = '/open_api/customization/tdwsydxtydxtddjlmx/full';

// 字典全量拉取时的并发数与缓存时长
const DICT_FETCH_CONCURRENCY = 5;
const DICT_CACHE_TTL = 10 * 60 * 1000;

/**
 * 云南大学数据提供者
 * 实现 ICourseDataProvider 接口
 */
export class YnuDataProvider implements ICourseDataProvider {
  // API Token 缓存
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  // 全量课程缓存（用于字典查询）
  private allCoursesCache: { [type: string]: { data: Course[]; expiresAt: number } } = {};
  private allCoursesPromise: { [type: string]: Promise<Course[]> | null } = {};

  // ============================================
  // API 方法
  // ============================================

  /**
   * 获取 Access Token
   * 调用其他接口前需要先获取 token，有效期 7200 秒
   */
  private async getAccessToken(): Promise<string> {
    // 检查缓存的 token 是否有效（提前 60 秒过期）
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.accessToken;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/open_api/authentication/get_access_token?key=${API_KEY}&secret=${API_SECRET}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`获取 Token 失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.code !== 10000) {
        throw new Error(`获取 Token 失败: ${data.message || data.description}`);
      }

      this.accessToken = data.result.access_token;
      // 设置过期时间（毫秒）
      this.tokenExpiresAt = Date.now() + parseInt(data.result.expires_in) * 1000;

      return this.accessToken ?? '';
    } catch (error) {
      console.error('[YnuDataProvider] 获取 Access Token 失败:', error);
      throw error;
    }
  }

  /**
   * 调用数据中台 API
   * @param endpoint API 端点路径
   * @param params 查询参数（作为 body 传递）
   * @returns API 响应结果（result 对象）
   */
  private async callApi(endpoint: string, params?: Record<string, unknown>): Promise<any> {
    const token = await this.getAccessToken();

    const url = new URL(`${API_BASE_URL}${endpoint}`);
    url.searchParams.append('access_token', token);

    // 过滤掉 undefined 和 null 的参数
    const filteredParams: Record<string, unknown> = {};
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          filteredParams[key] = value;
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(filteredParams),
    });

    if (!response.ok) {
      throw new Error(`API 调用失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.code !== 10000) {
      // 查询结果为空（20013 Records not found）不算错误，视为空结果返回
      if (Number(data.code) === 20013) {
        return { data: [], total: 0 };
      }
      throw new Error(`API 返回错误: ${data.message || data.description}`);
    }

    return data.result;
  }

  /**
   * 调用 API 并安全返回数据列表
   */
  private async fetchList(endpoint: string, params?: Record<string, unknown>): Promise<any[]> {
    try {
      const result = await this.callApi(endpoint, params);
      return result?.data || [];
    } catch (error) {
      console.error(`[YnuDataProvider] API 数据获取失败 [${endpoint}]:`, error);
      return [];
    }
  }

  // ============================================
  // 数据转换
  // ============================================

  /**
   * 转换 API 返回的课程数据为系统标准格式
   */
  private transformCourse(raw: any, type: CourseType): Course {
    if (type === 'graduate') {
      return this.transformGraduateCourse(raw);
    }
    return this.transformUndergraduateCourse(raw);
  }

  /**
   * 转换本科生课程数据
   */
  private transformUndergraduateCourse(raw: any): Course {
    return {
      kch: raw.KCH ?? '',
      kcmc: raw.KCMC ?? '',
      kcywmc: raw.KCYWMC ?? undefined,
      kcfzrh: raw.KCFZRH ?? undefined,
      // 本科课程开设单位使用归属院系（GSYXBM/GSYXMC），KCKSDWH 多为空
      kcksdwh: raw.KCKSDWH || raw.GSYXBM || undefined,
      kcksdwmc: raw.KCKSDWMC || raw.GSYXMC || undefined,
      gsyxbm: raw.GSYXBM ?? undefined,
      gsyxmc: raw.GSYXMC ?? undefined,
      xf: raw.XF ?? undefined,
      zxs: raw.ZXS ?? undefined,
      llxs: raw.LLXS ?? undefined,
      sjxs: raw.SJXS ?? undefined,
      syxs: raw.SYXS ?? undefined,
      kcjj: raw.KCJJ ?? undefined,
      jc: raw.JC ?? undefined,
      cksm: raw.CKSM ?? undefined,
      kcccm: raw.KCCCM ?? undefined,
      kcccmc: raw.KCCCMC ?? undefined,
      kcflm: raw.KCFLM ?? undefined,
      kcflmc: raw.KCFLMC ?? undefined,
      jxfsdm: raw.JXFSDM ?? undefined,
      skyzdm: raw.SKYZDM ?? undefined,
      skyzmc: raw.SKYZMC ?? undefined,
      kcztdm: raw.KCZTDM ?? undefined,
      kslxdm: raw.KSLXDM ?? undefined,
      kslxdmmc: raw.KSLXDMMC ?? undefined,
      kcsm: raw.KCSM ?? undefined,
      kcmb: raw.KCMB ?? undefined,
      ywkcmb: raw.YWKCMB ?? undefined,
      zhxs: raw.ZHXS ?? undefined,
      tstamp: raw.TSTAMP ?? undefined,
    };
  }

  /**
   * 转换研究生课程数据
   */
  private transformGraduateCourse(raw: any): Course {
    return {
      kch: raw.KCH ?? '',
      kcmc: raw.KCMC ?? '',
      kcywmc: raw.KCYWMC ?? undefined,
      kcfzrh: raw.KCFZRH ?? undefined,
      kcksdwh: raw.KCKSDWH ?? undefined,
      kcksdwmc: raw.KCKSDWMC ?? undefined,
      xf: raw.XF ?? undefined,
      zxs: raw.ZXS ?? undefined,
      llxs: raw.LLXS ?? undefined,
      sjxs: raw.SJXS ?? undefined,
      syxs: raw.SYXS ?? undefined,
      kcjj: raw.KCJJ ?? undefined,
      jc: raw.JC ?? undefined,
      cksm: raw.CKSM ?? undefined,
      // 研究生无课程层次字段，使用课程级别（KCJBM/KCJBMC）作为课程性质
      kcccm: raw.KCJBM ?? undefined,
      kcccmc: raw.KCJBMC ?? undefined,
      // 研究生课程类别（KCLBM/KCLBMC）
      kcflm: raw.KCLBM ?? undefined,
      kcflmc: raw.KCLBMC ?? undefined,
      skyzdm: raw.SKYYLXM ?? undefined,
      sfyx: raw.SFYX ?? undefined,
      tstamp: raw.TSTAMP ?? undefined,
    };
  }

  /**
   * 转换本科生教学班数据
   */
  private transformUndergraduateTeaching(raw: any): TeachingClass {
    return {
      jxbh: raw.JXBH ?? '',
      jsgh: raw.JSGH ?? undefined,
      jsxm: raw.JSXM ?? undefined,
      xnxqdm: raw.XNXQDM ?? undefined,
      xnxqmc: raw.XNXQMC ?? undefined,
      kcdm: raw.KCDM ?? '',
      kcmc: raw.KCMC ?? '',
      skzc: raw.SKZC ?? undefined,
      skxq: raw.SKXQ ?? undefined,
      skbjmc: raw.SKBJMC ?? undefined,
      ksdwmc: raw.KCKSDWMC ?? undefined,
      xqmc: raw.JSSZXQMC ?? undefined,
      jxlmc: raw.JASDM ?? undefined,
      jsmc: raw.JASDM ?? undefined,
      zwrs: raw.XDRS ?? undefined,
      xdrs: raw.XDRS ?? undefined,
      sksj: raw.SKSJ ?? undefined,
      jxdd: raw.JXDD ?? undefined,
      krl: raw.KRL ?? undefined,
      jxbmc: raw.JXBMC ?? undefined,
      jxtz: raw.JXTZ ?? undefined,
      kksm: raw.KKSM ?? undefined,
      pkyq: raw.PKYQ ?? undefined,
    };
  }

  /**
   * 转换研究生教学班数据
   */
  private transformGraduateTeaching(raw: any): TeachingClass {
    return {
      jxbh: raw.JXBH ?? '',
      jsgh: raw.JSGH ?? undefined,
      jsxm: raw.JSXM ?? undefined,
      xnxqdm: raw.XNXQDM ?? undefined,
      xnxqmc: raw.XNXQMC ?? undefined,
      kcdm: raw.KCDM ?? '',
      kcmc: raw.KCMC ?? '',
      skzc: raw.ZC ?? undefined,
      skxq: raw.XQ ?? undefined,
      skbjmc: raw.XSZYJC ?? undefined,
      ksdwmc: raw.YXMC ?? undefined,
      xqmc: raw.JSSZXQMC ?? undefined,
      jxlmc: raw.JASDM ?? undefined,
      jsmc: raw.JASMC ?? undefined,
      zwrs: raw.XDRS ?? undefined,
      xdrs: raw.XDRS ?? undefined,
      sksj: raw.SKSJ ?? undefined,
      jxdd: raw.JXDD ?? undefined,
      krl: raw.KRL ?? undefined,
      jxbmc: raw.JXBMC ?? undefined,
      jxtz: raw.JXTZ ?? undefined,
      kksm: raw.KKSM ?? undefined,
      pkyq: raw.PKYQ ?? undefined,
    };
  }

  /**
   * 转换课堂统计数据
   */
  private transformClassroomStats(raw: any): ClassroomStats {
    return {
      jxbh: raw.JXBH ?? '',
      xnxqmc: raw.XNXQMC ?? '',
      kcdm: raw.KCH ?? '',
      kcmc: '',
      jsxm: '',
      ksrq: raw.KCKSSJ ?? undefined,
      kckssj: raw.KCKSSJ ?? undefined,
      kcjssj: raw.KCJSSJ ?? undefined,
      xdrs: '',
      kql: '',
      rwcs: raw.RWCS ?? undefined,
      zzd: raw.ZZD ?? undefined,
      hyd: raw.HYD ?? undefined,
      jszb: raw.JSZB ?? undefined,
      bszb: raw.BSZB ?? undefined,
      ysjlv: raw.YSJLV ?? undefined,
      sjd: raw.SJD ?? undefined,
      dtlv: raw.DTLV ?? undefined,
      ttlv: raw.TTLV ?? undefined,
      cjsj: raw.CJSJ ?? undefined,
      wybs: raw.WYBS ?? undefined,
    };
  }

  // ============================================
  // 课程信息查询（API）
  // ============================================

  /**
   * 查询课程列表
   */
  async queryCourses(params: QueryCoursesParams): Promise<PaginatedResult<Course>> {
    const {
      keyword,
      dept,
      status,
      nature,
      category,
      type = 'undergraduate',
      page = 1,
      pageSize = 10,
    } = params;
    const endpoint = type === 'graduate' ? GRADUATE_COURSE_ENDPOINT : UNDERGRADUATE_COURSE_ENDPOINT;

    try {
      // 构建精确筛选条件（本科与研究生字段不同）
      const conditionParams: Record<string, unknown> = {};
      if (dept) conditionParams[type === 'graduate' ? 'KCKSDWH' : 'GSYXBM'] = dept;
      if (status) conditionParams[type === 'graduate' ? 'SFYX' : 'KCZTDM'] = status;
      if (nature) conditionParams[type === 'graduate' ? 'KCJBM' : 'KCCCM'] = nature;
      if (category) conditionParams[type === 'graduate' ? 'KCLBM' : 'KCFLM'] = category;

      const trimmedKeyword = keyword?.trim();

      // 无关键词：直接分页查询
      if (!trimmedKeyword) {
        const result = await this.callApi(endpoint, {
          ...conditionParams,
          page,
          per_page: pageSize,
        });
        const courses = (result?.data || []).map((raw: any) => this.transformCourse(raw, type));
        return {
          data: courses,
          total: result?.total || 0,
        };
      }

      // 有关键词：使用中台的 like 模糊查询（KCH / KCMC / KCFZRH 三路或查询）
      const result = await this.callApi(endpoint, {
        ...conditionParams,
        or: [
          { KCMC: { like: `%${trimmedKeyword}%` } },
          { KCH: { like: `%${trimmedKeyword}%` } },
          { KCFZRH: { like: `%${trimmedKeyword}%` } },
        ],
        page,
        per_page: pageSize,
      });
      const courses = (result?.data || []).map((raw: any) => this.transformCourse(raw, type));
      return {
        data: courses,
        total: result?.total || 0,
      };
    } catch (error) {
      console.error('[YnuDataProvider] 查询课程列表失败:', error);
      return { data: [], total: 0 };
    }
  }

  /**
   * 查询单个课程详情
   */
  async queryCourseByCode(kch: string, type: CourseType = 'undergraduate'): Promise<Course | null> {
    const endpoint = type === 'graduate' ? GRADUATE_COURSE_ENDPOINT : UNDERGRADUATE_COURSE_ENDPOINT;

    try {
      const result = await this.callApi(endpoint, {
        KCH: kch,
        page: 1,
        per_page: 1,
      });
      const list = result?.data || [];
      return list[0] ? this.transformCourse(list[0], type) : null;
    } catch (error) {
      console.error('[YnuDataProvider] 查询课程详情失败:', error);
      return null;
    }
  }

  /**
   * 拉取某类型课程的全量数据（用于字典查询）
   * 使用并发分页 + 指定列，结果缓存 DICT_CACHE_TTL 时长
   */
  private async fetchAllCourses(type: CourseType): Promise<Course[]> {
    const cached = this.allCoursesCache[type];
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    // 并发请求共享同一个 promise，避免重复拉取
    if (this.allCoursesPromise[type]) {
      return this.allCoursesPromise[type]!;
    }

    const promise = this.fetchAllCoursesInternal(type);
    this.allCoursesPromise[type] = promise;

    try {
      const courses = await promise;
      this.allCoursesCache[type] = { data: courses, expiresAt: Date.now() + DICT_CACHE_TTL };
      return courses;
    } finally {
      this.allCoursesPromise[type] = null;
    }
  }

  /**
   * 全量课程拉取内部实现
   */
  private async fetchAllCoursesInternal(type: CourseType): Promise<Course[]> {
    const endpoint = type === 'graduate' ? GRADUATE_COURSE_ENDPOINT : UNDERGRADUATE_COURSE_ENDPOINT;
    const perPage = 2000; // API 单页上限
    const all: any[] = [];

    // 只拉取字典所需字段，减小响应体积
    const attrWhitelist = type === 'graduate'
      ? ['KCH', 'KCMC', 'KCFZRH', 'KCKSDWH', 'KCKSDWMC', 'KCJBM', 'KCJBMC', 'KCLBM', 'KCLBMC', 'SFYX']
      : ['KCH', 'KCMC', 'KCFZRH', 'GSYXBM', 'GSYXMC', 'KCCCM', 'KCCCMC', 'KCFLM', 'KCFLMC', 'KCZTDM'];

    try {
      const first = await this.callApi(endpoint, {
        page: 1,
        per_page: perPage,
        attr_whitelist: attrWhitelist,
      });
      const total = first?.total || 0;
      all.push(...(first?.data || []));

      const maxPage = Math.ceil(total / perPage);
      // 并发拉取剩余页
      for (let start = 2; start <= maxPage; start += DICT_FETCH_CONCURRENCY) {
        const batch = Array.from({ length: Math.min(DICT_FETCH_CONCURRENCY, maxPage - start + 1) }, (_, i) =>
          this.callApi(endpoint, {
            page: start + i,
            per_page: perPage,
            attr_whitelist: attrWhitelist,
          })
        );
        const results = await Promise.all(batch);
        results.forEach((r) => all.push(...(r?.data || [])));
      }

      return all.map((raw: any) => this.transformCourse(raw, type));
    } catch (error) {
      console.error('[YnuDataProvider] 拉取全量课程失败:', error);
      // 失败时返回已拉取的部分数据
      return all.map((raw: any) => this.transformCourse(raw, type));
    }
  }

  /**
   * 查询部门列表（用于筛选）
   */
  async queryDepartments(type: CourseType = 'undergraduate'): Promise<Department[]> {
    try {
      const courses = await this.fetchAllCourses(type);
      const departmentMap = new Map<string, Department>();

      courses.forEach((course) => {
        const code = type === 'graduate' ? course.kcksdwh : course.gsyxbm;
        const name = type === 'graduate' ? course.kcksdwmc : course.gsyxmc;
        if (code && !departmentMap.has(code)) {
          departmentMap.set(code, { dwh: code, dwmc: name || code });
        }
      });

      return Array.from(departmentMap.values()).sort((a, b) =>
        a.dwmc.localeCompare(b.dwmc, 'zh-CN')
      );
    } catch (error) {
      console.error('[YnuDataProvider] 查询部门列表失败:', error);
      return [];
    }
  }

  /**
   * 查询课程性质列表（用于筛选）
   */
  async queryCourseNatures(type: CourseType = 'undergraduate'): Promise<CourseNature[]> {
    try {
      const courses = await this.fetchAllCourses(type);
      const natureMap = new Map<string, CourseNature>();

      courses.forEach((course) => {
        if (course.kcccm && !natureMap.has(course.kcccm)) {
          natureMap.set(course.kcccm, { kcccm: course.kcccm, kcccmc: course.kcccmc || course.kcccm });
        }
      });

      return Array.from(natureMap.values()).sort((a, b) =>
        a.kcccmc.localeCompare(b.kcccmc, 'zh-CN')
      );
    } catch (error) {
      console.error('[YnuDataProvider] 查询课程性质列表失败:', error);
      return [];
    }
  }

  /**
   * 查询课程类别列表（用于筛选）
   */
  async queryCourseCategories(type: CourseType = 'undergraduate'): Promise<CourseCategory[]> {
    try {
      const courses = await this.fetchAllCourses(type);
      const categoryMap = new Map<string, CourseCategory>();

      courses.forEach((course) => {
        if (course.kcflm && !categoryMap.has(course.kcflm)) {
          categoryMap.set(course.kcflm, { kcflm: course.kcflm, kcflmc: course.kcflmc || course.kcflm });
        }
      });

      return Array.from(categoryMap.values()).sort((a, b) =>
        a.kcflmc.localeCompare(b.kcflmc, 'zh-CN')
      );
    } catch (error) {
      console.error('[YnuDataProvider] 查询课程类别列表失败:', error);
      return [];
    }
  }

  // ============================================
  // 教学班 / 课堂统计 / 教材查询（数据库）
  // ============================================

  /**
   * 查询课程的教学班列表
   */
  async queryTeachingClasses(params: QueryTeachingClassesParams): Promise<PaginatedResult<TeachingClass>> {
    const { kch, type = 'undergraduate', page = 1, pageSize = 10 } = params;
    const endpoint = type === 'graduate' ? GRADUATE_TEACHING_ENDPOINT : UNDERGRADUATE_TEACHING_ENDPOINT;

    try {
      // 按课程代码精确查询，并按学年学期降序、教学班号排序
      const result = await this.callApi(endpoint, {
        KCDM: kch,
        page,
        per_page: pageSize,
        order: {
          XNXQDM: 'desc',
          JXBH: 'asc',
        },
      });
      const classes = (result?.data || []).map((raw: any) =>
        type === 'graduate' ? this.transformGraduateTeaching(raw) : this.transformUndergraduateTeaching(raw)
      );
      return {
        data: classes,
        total: result?.total || 0,
      };
    } catch (error) {
      console.error('[YnuDataProvider] 查询教学班列表失败:', error);
      return { data: [], total: 0 };
    }
  }

  /**
   * 查询课堂统计数据
   */
  async queryClassroomStats(params: QueryClassroomStatsParams): Promise<PaginatedResult<ClassroomStats>> {
    const { kch, jxbh, page = 1, pageSize = 10 } = params;

    try {
      // 按教学班号精确查询，按课程开始时间升序排列
      const result = await this.callApi(CLASSROOM_STATS_ENDPOINT, {
        JXBH: jxbh || kch,
        page,
        per_page: pageSize,
        order: {
          KCKSSJ: 'asc',
        },
      });
      const stats = (result?.data || []).map((raw: any) => this.transformClassroomStats(raw));
      return {
        data: stats,
        total: result?.total || 0,
      };
    } catch (error) {
      console.error('[YnuDataProvider] 查询课堂统计数据失败:', error);
      return { data: [], total: 0 };
    }
  }

  /**
   * 查询课程教材信息
   */
  async queryTextbooks(params: QueryTextbooksParams): Promise<PaginatedResult<Textbook>> {
    const { kch, type = 'undergraduate', page = 1, pageSize = 10 } = params;

    // 研究生课程暂无教材表配置，直接返回空
    if (type === 'graduate') {
      return { data: [], total: 0 };
    }

    const config = getCourseCenterConfigLoader().getConfig();
    const table = config.tables.undergraduateTextbook;
    if (!table.name) {
      return { data: [], total: 0 };
    }
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
          ${f.courseCode} as kcdm,
          ${f.textbookName} as jcmc,
          ${f.semesterCode} as xnxqdm,
          ${f.semesterName} as xnxqmc,
          ${f.isbn} as isbn,
          ${f.author} as zz,
          ${f.publisher} as cbsmc,
          ${f.publishDate} as cbsj,
          ${f.isNewEdition} as sfxb,
          '' as cbh,
          '' as bc,
          '' as cbrq,
          '' as bzzzs,
          '' as sfzxjcsyqk
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
    } catch (error) {
      console.error(`[YnuDataProvider] 查询教材失败:`, error);
      // 教材表可能不存在，返回空数据保证页面可用
      return { data: [], total: 0 };
    } finally {
      await pool.end();
    }
  }

  /**
   * 查询督导记录
   * 通过 YNU 数据中台 API 获取数据
   */
  async querySupervisionRecords(jxbid: string): Promise<SupervisionRecord[]> {
    try {
      const result = await this.callApi(SUPERVISION_RECORD_ENDPOINT, { JXBID: jxbid });
      const list: any[] = result?.data || [];
      
      // 确保 wybs 绝对唯一：WYBS 可能为空或重复，遇到重复时追加序号
      const usedWybs = new Set<string>();

      return list.map((item, index) => {
        const wjdm = item.WJDM ?? '';
        const pgwjwybs = item.PGWJWYBS ?? '';
        const tstamp = item.TSTAMP ?? '';

        // 生成候选唯一标识
        let candidate = item.WYBS ?? '';
        if (!candidate) {
          candidate =
            [pgwjwybs, tstamp, index].filter(Boolean).join('_') ||
            `sr_${jxbid}_${index}`;
        }

        // 若候选值已使用过，追加序号保证唯一
        let uniqueWybs = candidate;
        let suffix = 2;
        while (usedWybs.has(uniqueWybs)) {
          uniqueWybs = `${candidate}_${suffix}`;
          suffix += 1;
        }
        usedWybs.add(uniqueWybs);

        return {
          wybs: uniqueWybs,
          wjdm,
          bpr: item.BPR ?? '',
          bprxm: item.BPRXM ?? '',
          cpr: item.CPR ?? '',
          cprxm: item.CPRXM ?? '',
          kcdm: item.KCDM ?? '',
          kcmc: item.KCMC ?? '',
          jxbid: item.JXBID ?? '',
          zf: item.ZF ?? '',
          ydrs: item.YDRS ?? '',
          sdrs: item.SDRS ?? '',
          tksj: item.TKSJ ?? '',
          xnxqdm: item.XNXQDM ?? '',
          xnxqmc: item.XNXQMC ?? '',
          pglxdm: item.PGLXDM ?? '',
          pgwjwybs,
          pgwjdm: item.PGWJDM ?? '',
          pgbpr: item.PGBPR ?? '',
          pgbprxm: item.PGBPRXM ?? '',
          pgcpr: item.PGCPR ?? '',
          pgcprxm: item.PGCPRXM ?? '',
          pgkcdm: item.PGKCDM ?? '',
          pgkcmc: item.PGKCMC ?? '',
          pgzjyj: item.PGZJYJ ?? '',
          pgysjg: item.PGYSJG ?? '',
          pgjxbid: item.PGJXBID ?? '',
          pgglwid: item.PGGLWID ?? '',
          pjjy: item.PJJY ?? '',
          tstamp,
        };
      });
    } catch (error) {
      console.error(`[YnuDataProvider] 查询督导记录失败:`, error);
      return [];
    }
  }

  /**
   * 查询课程思政
   * 通过 YNU 数据中台 API 获取数据
   */
  async queryCourseIdeology(jxbh: string): Promise<CourseIdeology[]> {
    try {
      const result = await this.callApi(COURSE_IDEOLOGY_ENDPOINT, { JXBH: jxbh });
      const list: any[] = result?.data || [];
      
      return list.map((item) => ({
        px: item.PX ?? '',
        szrhd: item.SZRHD ?? '',
        xqzj: item.XQZJ ?? '',
        zsdqr: item.ZSDQR ?? '',
        szjhd: item.SZFXZD ?? item.SZJHD ?? '',
        szyrcl: item.SZYRCL ?? '',
        tstamp: item.TSTAMP ?? '',
        jxbh: item.JXBH ?? '',
      }));
    } catch (error) {
      console.error(`[YnuDataProvider] 查询课程思政失败:`, error);
      return [];
    }
  }

  // ============================================
  // 数据库连接
  // ============================================

  /**
   * 获取数据源连接池
   */
  private async getDataSourcePool(preferredDataObjectId?: number): Promise<mysql.Pool> {
    const config = getCourseCenterConfigLoader().getConfig();
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
