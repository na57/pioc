/**
 * 云南大学数据提供者实现
 * 基于数据中台 API 的教师中心数据获取实现
 *
 * 本文件作为外部数据中台 API 的数据适配器，API 返回字段繁多且动态变化，
 * 因此在原始数据映射阶段使用 any 类型以保持代码可维护性。
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { getConfig } from '@/lib/config';
import { getTeacherCenterConfigLoader } from '@/lib/config/teacher-center';

// 获取配置加载器实例
const configLoader = getTeacherCenterConfigLoader();
const loadTeacherCenterConfig = () => configLoader.load();
import {
  ITeacherDataProvider,
  QueryTeachersParams,
  PaginatedResult,
  Teacher,
  TeacherExtendedInfo,
  Department,
  Status,
  CareerTimelineItem,
  ResearchData,
  TeachingData,
  AISummaryInput,
  TeacherTitle,
  PositionAppointment,
  Assessment,
  Award,
  DepartmentTransfer,
  Contract,
  WorkerSkill,
  Talent,
  SocialPartTime,
  EducationDegree,
  WorkResume,
  ResearchPaper,
  ResearchBook,
  ResearchPatent,
  ResearchAward,
  ResearchAppraisal,
  ResearchTransfer,
  ResearchReport,
  ResearchArtwork,
  Teaching,
  Workload,
  TeachingProject,
  CourseInfo,
  Textbook,
  TeachingAward,
  TeachingPaper,
  CourseTeam,
  SupervisionRecord,
  ClassroomStats,
  CompetitionAward,
} from '../types';

// ============================================
// API 配置
// ============================================

const API_BASE_URL = 'https://dmp.ynu.edu.cn';
const API_KEY = process.env.YNU_API_KEY || '';
const API_SECRET = process.env.YNU_API_SECRET || '';

/**
 * 云南大学数据提供者
 * 实现 ITeacherDataProvider 接口，通过数据中台 API 获取数据
 */
export class YnuDataProvider implements ITeacherDataProvider {
  // API Token 缓存
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

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
      console.error('获取 Access Token 失败:', error);
      throw error;
    }
  }

  /**
   * 调用数据中台 API
   * @param endpoint API 端点路径
   * @param params 查询参数（作为 body 传递）
   * @returns API 响应数据
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
      console.error(`API 数据获取失败 [${endpoint}]:`, error);
      return [];
    }
  }

  /**
   * 转换 API 返回的教师数据为系统标准格式
   */
  private transformTeacher(raw: any): Teacher {
    return {
      gh: raw.GH ?? '',                           // 工号
      xm: raw.XM ?? '',                           // 姓名
      dwh: raw.DWH ?? '',                         // 单位号
      dwmc: raw.DWMC ?? '',                       // 单位名称
      xbm: raw.XBM ?? '',                         // 性别码
      xbmmc: raw.XBMMC ?? '',                     // 性别名称
      zyjszwdm: raw.ZYJSZWDM ?? '',               // 专业技术职务码
      zyjszwdmmc: raw.ZYJSZWDMMC ?? '',           // 专业技术职务名称
      dzzw: raw.DZZW ?? undefined,                // 党政职务
      yddh: raw.YDDH ?? undefined,                // 移动电话
      dzyx: raw.DZYX ?? undefined,                // 电子邮箱
      zp: raw.ZP ?? undefined,                    // 照片
      dqztm: raw.DQZTM ?? '',                     // 当前状态码
      dqztmmc: raw.DQZTMMC ?? '',                 // 当前状态名称
      csrq: raw.CSRQ ?? undefined,                // 出生日期
      zzmmmmc: raw.ZZMMMMC ?? undefined,          // 政治面貌名称
      zgxlmmc: raw.ZGXLMMC ?? undefined,          // 最高学历名称
      zgxwmmc: raw.ZGXWMMC ?? undefined,          // 最高学位名称
      yjfx: raw.YJFX ?? undefined,                // 研究方向
      cjgzny: raw.CJGZNY ?? undefined,            // 参加工作年月
      lxrq: raw.LXRQ ?? undefined,                // 来校日期
    };
  }

  // ============================================
  // 教师基本信息查询
  // ============================================

  /**
   * 查询教师列表
   * 使用数据中台 API 获取数据
   */
  async queryTeachers(params: QueryTeachersParams): Promise<PaginatedResult<Teacher>> {
    const { keyword, department, status, page = 1, pageSize = 10 } = params;

    try {
      // 调用数据中台 API 获取教职工基本信息
      const result = await this.callApi('/open_api/customization/tdwsgxjgjzgjbxxmx/full', {
        page: page,
        per_page: pageSize,
        // API 支持模糊查询，可以通过姓名或工号筛选
        XM: keyword || undefined,  // 姓名
        GH: keyword || undefined,  // 工号
        DWH: department || undefined,  // 单位号
        DQZTM: status || undefined,    // 当前状态码
      });

      // 转换数据格式
      const teachers = (result.data || []).map(this.transformTeacher);

      // 如果有关键词筛选，在返回前进行本地过滤
      let filteredTeachers = teachers;
      if (keyword) {
        const lowerKeyword = keyword.toLowerCase();
        filteredTeachers = teachers.filter((t: Teacher) =>
          t.xm?.toLowerCase().includes(lowerKeyword) ||
          t.gh?.toLowerCase().includes(lowerKeyword)
        );
      }

      return {
        data: filteredTeachers,
        total: parseInt(result.total) || filteredTeachers.length,
      };
    } catch (error) {
      console.error('查询教师列表失败:', error);
      return { data: [], total: 0 };
    }
  }

  /**
   * 查询单个教师基本信息
   */
  async queryTeacherBasic(gh: string): Promise<Teacher | null> {
    try {
      const result = await this.callApi('/open_api/customization/tdwsgxjgjzgjbxxmx/full', {
        GH: gh,
        page: 1,
        per_page: 1,
      });
      const list = result?.data || [];
      return list[0] ? this.transformTeacher(list[0]) : null;
    } catch (error) {
      console.error('查询教师基本信息失败:', error);
      return null;
    }
  }

  /**
   * 查询教师扩展信息
   */
  async queryTeacherExtendedInfo(gh: string): Promise<TeacherExtendedInfo> {
    const result: TeacherExtendedInfo = {
      workerSkills: [],
      contactInfo: null,
      talents: [],
      supervisorInfo: null,
      socialPartTimes: [],
    };

    try {
      const [
        workerSkillsRaw,
        contactInfoRaw,
        talentsRaw,
        supervisorInfoRaw,
        socialPartTimesRaw,
      ] = await Promise.all([
        this.fetchList('/open_api/customization/tdwsgxjgjzggrjsdjjzwxxmx/full', { GH: gh }),
        this.fetchList('/open_api/customization/tynugxjgjzglxxx/full', { ZGH: gh }),
        this.fetchList('/open_api/customization/tdwsgxjgjzgrcchxxmx/full', { GH: gh }),
        this.fetchList('/open_api/customization/tdwsgxjxyjsdsjbxxmx/full', { DSGH: gh }),
        this.fetchList('/open_api/customization/tdwsgxjgshjzxxmx/full', { GH: gh }),
      ]);

      result.workerSkills = workerSkillsRaw.map((raw: any): WorkerSkill => ({
        gh: raw.GH ?? gh,
        grjsdjmmc: raw.GRJSDJMMC ?? undefined,
        grjszwmmc: raw.GRJSZWMMC ?? undefined,
        grgzmmc: raw.GRGZMMC ?? undefined,
        djpdrq: raw.DJPDRQ ?? undefined,
        sfxzwmmc: raw.SFXZWMMC ?? undefined,
      }));

      if (contactInfoRaw.length > 0) {
        const raw = contactInfoRaw[0];
        result.contactInfo = {
          zgh: raw.ZGH ?? gh,
          jjlxrxm: raw.JJLXRXM ?? undefined,
          jjlxrdh: raw.JJLXRDH ?? undefined,
          sj: raw.SJ ?? undefined,
          dzxx: raw.DZXX ?? undefined,
          yxtxdz: raw.YXTXDZ ?? undefined,
          yxyzbm: raw.YXYZBM ?? undefined,
        };
      }

      result.talents = talentsRaw.map((raw: any): Talent => ({
        gh: raw.GH ?? gh,
        zjlbmmc: raw.ZJLBMMC ?? undefined,
        pzdwjbmmc: raw.PZDWJBMMC ?? undefined,
        pzdw: raw.PZDW ?? undefined,
        pzny: raw.PZNY ?? undefined,
        zyfx: raw.ZYFX ?? undefined,
      }));

      if (supervisorInfoRaw.length > 0) {
        const raw = supervisorInfoRaw[0];
        result.supervisorInfo = {
          dsgh: raw.DSGH ?? gh,
          xm: raw.XM ?? undefined,
          sfxwds: raw.SFXWDS ?? undefined,
          dslbmmc: raw.DSLBMMC ?? undefined,
          xyjfx: raw.XYJFX ?? undefined,
          rsdny: raw.RSDNY ?? undefined,
          rbdny: raw.RBDNY ?? undefined,
          szdwmc: raw.SZDWMC ?? undefined,
        };
      }

      result.socialPartTimes = socialPartTimesRaw.map((raw: any): SocialPartTime => ({
        gh: raw.GH ?? gh,
        shjzmmc: raw.SHJZMMC ?? undefined,
        jzzwmc: raw.JZZWMC ?? undefined,
        shjzqsrq: raw.SHJZQSRQ ?? undefined,
        shjzzzrq: raw.SHJZZZRQ ?? undefined,
      }));

      return result;
    } catch (error) {
      console.error('查询教师扩展信息失败:', error);
      return result;
    }
  }

  // ============================================
  // 筛选数据查询
  // ============================================

  /**
   * 查询部门列表（用于筛选）
   */
  async queryDepartments(): Promise<Department[]> {
    try {
      const result = await this.callApi('/open_api/customization/tdwsgxjgjzgjbxxmx/full', {
        page: 1,
        per_page: 10000,
      });
      const list = result?.data || [];
      const departmentMap = new Map<string, Department>();

      list.forEach((raw: any) => {
        const dwh = raw.DWH ?? '';
        const dwmc = raw.DWMC ?? '';
        if (dwh && !departmentMap.has(dwh)) {
          departmentMap.set(dwh, { dwh, dwmc });
        }
      });

      return Array.from(departmentMap.values()).sort((a, b) =>
        a.dwmc.localeCompare(b.dwmc, 'zh-CN')
      );
    } catch (error) {
      console.error('查询部门列表失败:', error);
      return [];
    }
  }

  /**
   * 查询状态列表（用于筛选）
   */
  async queryStatuses(): Promise<Status[]> {
    try {
      const result = await this.callApi('/open_api/customization/tdwsgxjgjzgjbxxmx/full', {
        page: 1,
        per_page: 10000,
      });
      const list = result?.data || [];
      const statusMap = new Map<string, Status>();

      list.forEach((raw: any) => {
        const dqztm = raw.DQZTM ?? '';
        const dqztmmc = raw.DQZTMMC ?? '';
        if (dqztm && !statusMap.has(dqztm)) {
          statusMap.set(dqztm, { dqztm, dqztmmc });
        }
      });

      return Array.from(statusMap.values()).sort((a, b) =>
        a.dqztmmc.localeCompare(b.dqztmmc, 'zh-CN')
      );
    } catch (error) {
      console.error('查询状态列表失败:', error);
      return [];
    }
  }

  // ============================================
  // 教职生涯时间线
  // ============================================

  /**
   * 查询教职生涯时间线数据
   */
  async queryCareerTimeline(gh: string): Promise<CareerTimelineItem[]> {
    const items: CareerTimelineItem[] = [];

    try {
      const [
        titlesRaw,
        specialistAppointmentsRaw,
        managementAppointmentsRaw,
        workerAppointmentsRaw,
        assessmentsRaw,
        awardsRaw,
        transfersRaw,
        contractsRaw,
        educationsRaw,
        resumesRaw,
      ] = await Promise.all([
        this.fetchList('/open_api/customization/tdwsgxjgjzgzyjszwxxmx/full', { GH: gh }),
        this.fetchList('/open_api/customization/tdwsgxjgjzgzjgwprxxmx/full', { GH: gh }),
        this.fetchList('/open_api/customization/tdwsgxjgjzgglgwprxxmx/full', { GH: gh }),
        this.fetchList('/open_api/customization/tdwsgxjgjzggqgwprxxmx/full', { GH: gh }),
        this.fetchList('/open_api/customization/tdwsgxjgjzgkhxxmx/full', { GH: gh }),
        this.fetchList('/open_api/customization/tdwsgxjgjzgjlxxmx/full', { GH: gh }),
        this.fetchList('/open_api/customization/tdwsgxjgjzgbmddxxmx/full', { GH: gh }),
        this.fetchList('/open_api/customization/tdwsgxjgjzgpyhtglxxmx/full', { GH: gh }),
        this.fetchList('/open_api/customization/tdwsgxjgjzgxlxwxxmx/full', { GH: gh }),
        this.fetchList('/open_api/customization/tdwsgxjgjzggzjlxxmx/full', { GH: gh }),
      ]);

      // 1. 专业技术职务
      titlesRaw.forEach((raw: any, index: number) => {
        const title: TeacherTitle = {
          gh: raw.GH ?? gh,
          zyjszwmmc: raw.ZYJSZWMC ?? '',
          zyjszwjbmmc: raw.ZYJSZWJBMMC ?? undefined,
          pdrq: raw.PDRQ ?? undefined,
          prqsrq: raw.PRQSRQ ?? undefined,
          przzrq: raw.PRZZRQ ?? undefined,
          sfxzwmmc: raw.SFXZWMMC ?? undefined,
        };
        items.push({
          id: `title-${index}`,
          date: title.pdrq || '',
          type: 'title',
          title: `专业技术职务: ${title.zyjszwmmc}`,
          description: title.zyjszwjbmmc ? `级别: ${title.zyjszwjbmmc}` : '',
          isCurrent: title.sfxzwmmc === '是' || title.sfxzwmmc === '1',
          details: title as unknown as Record<string, unknown>,
        });
      });

      // 2. 岗位聘任（专技、管理、工勤）
      const appointmentTypes: Array<{ raw: any[]; label: string }> = [
        { raw: specialistAppointmentsRaw, label: '专技岗位' },
        { raw: managementAppointmentsRaw, label: '管理岗位' },
        { raw: workerAppointmentsRaw, label: '工勤岗位' },
      ];

      appointmentTypes.forEach(({ raw, label }) => {
        raw.forEach((item: any, index: number) => {
          const appointment: PositionAppointment = {
            gh: item.GH ?? gh,
            positionType: label,
            gwmc: item.GWMC ?? item.GLGZMC ?? undefined,
            gwdjmmc: item.GWDJMMC ?? undefined,
            prrq: item.PRQSRQ ?? item.GLQSNY ?? undefined,
          };
          items.push({
            id: `appointment-${label}-${index}`,
            date: appointment.prrq || '',
            type: 'appointment',
            title: `岗位聘任: ${label}`,
            description: appointment.gwmc || appointment.gwdjmmc || '',
            details: appointment as unknown as Record<string, unknown>,
          });
        });
      });

      // 3. 考核信息
      assessmentsRaw.forEach((raw: any, index: number) => {
        const assessment: Assessment = {
          gh: raw.GH ?? gh,
          khrq: raw.JZGKHRQ ?? '',
          khjgmc: raw.DWKHJGMMC ?? '',
        };
        items.push({
          id: `assessment-${index}`,
          date: assessment.khrq,
          type: 'assessment',
          title: `年度考核: ${assessment.khjgmc}`,
          description: assessment.khrq ? `考核日期: ${assessment.khrq}` : '',
          details: assessment as unknown as Record<string, unknown>,
        });
      });

      // 4. 奖励信息
      awardsRaw.forEach((raw: any, index: number) => {
        const award: Award = {
          gh: raw.GH ?? gh,
          jlmc: raw.JLMC ?? '',
          jljbmc: raw.JLJBMMC ?? undefined,
          jlhq: raw.HJRQ ?? undefined,
        };
        items.push({
          id: `award-${index}`,
          date: award.jlhq || '',
          type: 'award',
          title: `获得奖励: ${award.jlmc}`,
          description: award.jljbmc ? `级别: ${award.jljbmc}` : '',
          details: award as unknown as Record<string, unknown>,
        });
      });

      // 5. 部门调动
      transfersRaw.forEach((raw: any, index: number) => {
        const transfer: DepartmentTransfer = {
          gh: raw.GH ?? gh,
          ddrq: raw.BMDDRQ ?? undefined,
          ydwh: raw.ZZNDCBMH ?? undefined,
          xdwh: raw.ZZNDRBMH ?? undefined,
        };
        items.push({
          id: `transfer-${index}`,
          date: transfer.ddrq || '',
          type: 'transfer',
          title: '部门调动',
          description: `${transfer.ydwh || ''} → ${transfer.xdwh || ''}`,
          details: transfer as unknown as Record<string, unknown>,
        });
      });

      // 6. 聘用合同
      contractsRaw.forEach((raw: any, index: number) => {
        const contract: Contract = {
          gh: raw.GH ?? gh,
          htlxmc: raw.PYHTLBMMC ?? undefined,
          qdrq: raw.QYRQ ?? undefined,
          dqrq: raw.JSRIQ ?? raw.SYJSRQ ?? undefined,
        };
        items.push({
          id: `contract-${index}`,
          date: contract.qdrq || '',
          type: 'contract',
          title: `签订合同: ${contract.htlxmc || ''}`,
          description: contract.dqrq ? `到期日期: ${contract.dqrq}` : '',
          details: contract as unknown as Record<string, unknown>,
        });
      });

      // 7. 学历学位
      educationsRaw.forEach((raw: any, index: number) => {
        const education: EducationDegree = {
          gh: raw.GH ?? gh,
          xlmmc: raw.XLMMC ?? undefined,
          hdxwmmc: raw.HDXWMMC ?? undefined,
          sxzymmc: raw.SXZYMMC ?? undefined,
          byyxxhdw: raw.BYYXXHDW ?? undefined,
          xxqsrq: raw.XXQSRQ ?? undefined,
          xxzzrq: raw.XXZZRQ ?? undefined,
          hxwrq: raw.HXWRQ ?? undefined,
        };
        const dateRange = education.xxqsrq && education.xxzzrq
          ? `${education.xxqsrq} ~ ${education.xxzzrq}`
          : (education.xxzzrq || education.xxqsrq || '');
        items.push({
          id: `education-${index}`,
          date: education.xxzzrq || '',
          type: 'education',
          title: `学历学位: ${education.xlmmc || ''}`,
          description: `${dateRange}${education.sxzymmc ? ' | ' + education.sxzymmc : ''}${education.byyxxhdw ? ' | ' + education.byyxxhdw : ''}`,
          details: education as unknown as Record<string, unknown>,
        });
      });

      // 8. 工作简历
      resumesRaw.forEach((raw: any, index: number) => {
        const resume: WorkResume = {
          gh: raw.GH ?? gh,
          gzqsrq: raw.GZQSRQ ?? undefined,
          gzzzrq: raw.GZZZRQ ?? undefined,
          gzdw: raw.GZDW ?? undefined,
          crdzzw: raw.CRDZZW ?? undefined,
          gznr: raw.GZNR ?? undefined,
        };
        items.push({
          id: `resume-${index}`,
          date: resume.gzqsrq || '',
          type: 'resume',
          title: `工作经历: ${resume.gzdw || ''}`,
          description: `${resume.crdzzw || ''} | ${resume.gzqsrq || ''} - ${resume.gzzzrq || '至今'}`,
          details: resume as unknown as Record<string, unknown>,
        });
      });

      // 按日期排序
      return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error('查询教职生涯时间线失败:', error);
      return [];
    }
  }

  // ============================================
  // 科研数据查询
  // ============================================

  /**
   * 查询科研数据
   */
  async queryResearchData(gh: string): Promise<ResearchData> {
    const result: ResearchData = {
      papers: [],
      books: [],
      patents: [],
      awards: [],
      appraisals: [],
      transfers: [],
      reports: [],
      artworks: [],
      stats: { paperCount: 0, bookCount: 0, patentCount: 0, awardCount: 0, appraisalCount: 0, transferCount: 0, reportCount: 0, artworkCount: 0 },
    };

    try {
      const [
        papersRaw,
        booksRaw,
        patentsRaw,
        awardsRaw,
        appraisalsRaw,
        transfersRaw,
        reportsRaw,
        artworksRaw,
      ] = await Promise.all([
        this.fetchList('/open_api/customization/tdwsgxkykjlwjzzmx/full', { LWDYZZGH: gh }),
        this.fetchList('/open_api/customization/tdwsgxkykyzzjzzmx/full', { ZZDYZZGH: gh }),
        this.fetchList('/open_api/customization/tdwsgxkykyzljzzmx/full', { DYFMRGH: gh }),
        this.fetchList('/open_api/customization/tdwsgxkykyhjcgjzzmx/full', { DYWCRGH: gh }),
        this.fetchList('/open_api/customization/tdwsgxkykyjdcgjzzmx/full', { DYZZGH: gh }),
        this.fetchList('/open_api/customization/tdwsgxkykyzhcgjzzmx/full', { ZHDYZZGH: gh }),
        this.fetchList('/open_api/customization/tdwsgxkykyyjbgjzzmx/full', { DYZZZGH: gh }),
        this.fetchList('/open_api/customization/tdwsgxkykyyszpjzzmx/full', { DYZZGH: gh }),
      ]);

      result.papers = papersRaw.map((raw: any): ResearchPaper => ({
        lwbh: raw.LWBH ?? undefined,
        lwzwmc: raw.LWZWMC ?? '',
        lwdyzzgh: raw.LWDYZZGH ?? undefined,
        lwdyzzmc: raw.LWDYZZMC ?? undefined,
        fbkwmc: raw.FBKWMC ?? undefined,
        lwfbrq: raw.LWFBRQ ?? undefined,
        lzslqkmc: raw.LZSLQKMC ?? undefined,
        yxyz: raw.YXYZ ?? undefined,
        doih: raw.DOIH ?? undefined,
      }));
      result.stats.paperCount = result.papers.length;

      result.books = booksRaw.map((raw: any): ResearchBook => ({
        zzbh: raw.ZZBH ?? undefined,
        zzzwmc: raw.ZZZWMC ?? '',
        zzdyzzgh: raw.ZZDYZZGH ?? undefined,
        zzdyzzxm: raw.ZZDYZZXM ?? undefined,
        cbs: raw.CBSMC ?? raw.CBS ?? undefined,
        cbrq: raw.CBRQ ?? undefined,
        isbnh: raw.ISBNH ?? undefined,
      }));
      result.stats.bookCount = result.books.length;

      result.patents = patentsRaw.map((raw: any): ResearchPatent => ({
        zlcgbh: raw.ZLCGBH ?? undefined,
        zlcgmc: raw.ZLCGMC ?? '',
        dyfmrgh: raw.DYFMRGH ?? undefined,
        dyfmrxm: raw.DYFMRXM ?? undefined,
        zllxmc: raw.ZLLXMC ?? undefined,
        zlsqrq: raw.ZLSQRQ ?? undefined,
        sqggrq: raw.SQGGRQ ?? undefined,
        zlztmc: raw.ZLZTMC ?? undefined,
      }));
      result.stats.patentCount = result.patents.length;

      result.awards = awardsRaw.map((raw: any): ResearchAward => ({
        hjcgbh: raw.HJCGBH ?? undefined,
        hjmc: raw.HJMC ?? '',
        dywcrgh: raw.DYWCRGH ?? undefined,
        dywcrxm: raw.DYWCRXM ?? undefined,
        hjjbmc: raw.HJJBMC ?? undefined,
        hjrq: raw.HJRQ ?? undefined,
        cghjlbmc: raw.CGHJLBMC ?? undefined,
      }));
      result.stats.awardCount = result.awards.length;

      result.appraisals = appraisalsRaw.map((raw: any): ResearchAppraisal => ({
        jdcgbh: raw.JDCGBH ?? undefined,
        jdcgmc: raw.JDCGMC ?? '',
        dyzzgh: raw.DYZZGH ?? undefined,
        dyzzxm: raw.DYZZXM ?? undefined,
        jddwmc: raw.JDDWMC ?? undefined,
        jdrq: raw.JDRQ ?? undefined,
        jdjlmc: raw.JDJLMC ?? undefined,
      }));
      result.stats.appraisalCount = result.appraisals.length;

      result.transfers = transfersRaw.map((raw: any): ResearchTransfer => ({
        cgzhbh: raw.CGZHBH ?? undefined,
        cgzhmc: raw.CGZHMC ?? '',
        zhdyzzgh: raw.ZHDYZZGH ?? undefined,
        zhdyzzxm: raw.ZHDYZZXM ?? undefined,
        zhrq: raw.ZHRQ ?? undefined,
        cjje: raw.CJJE ?? undefined,
        srfmc: raw.SRFMC ?? undefined,
      }));
      result.stats.transferCount = result.transfers.length;

      result.reports = reportsRaw.map((raw: any): ResearchReport => ({
        jdcgbh: raw.JDCGBH ?? undefined,
        jdcgmc: raw.JDCGMC ?? '',
        dyzzzgh: raw.DYZZZGH ?? undefined,
        dyzzxm: raw.DYZZXM ?? undefined,
        tjsj: raw.TJSJ ?? undefined,
        tjdw: raw.TJDW ?? undefined,
        sfcnmc: raw.SFCNMC ?? undefined,
      }));
      result.stats.reportCount = result.reports.length;

      result.artworks = artworksRaw.map((raw: any): ResearchArtwork => ({
        xmbh: raw.XMBH ?? undefined,
        xmmc: raw.XMMC ?? '',
        dyzzgh: raw.DYZZGH ?? undefined,
        dyzzxm: raw.DYZZXM ?? undefined,
        zplxmc: raw.ZPLXMC ?? undefined,
        fbrq: raw.FBRQ ?? undefined,
        sfhjmc: raw.SFHJMC ?? undefined,
        hjmc: raw.HJMC ?? undefined,
      }));
      result.stats.artworkCount = result.artworks.length;

      return result;
    } catch (error) {
      console.error('查询科研数据失败:', error);
      return result;
    }
  }

  // ============================================
  // 教学数据查询
  // ============================================

  /**
   * 查询教学数据
   */
  async queryTeachingData(gh: string): Promise<TeachingData> {
    const result: TeachingData = {
      undergraduateTeaching: [],
      graduateTeaching: [],
      undergraduateWorkload: [],
      graduateWorkload: [],
      undergraduateProjects: [],
      graduateProjects: [],
      supervisionRecords: [],
      classroomStats: [],
      competitionAwards: [],
      undergraduateCourseInfo: [],
      graduateCourseInfo: [],
      undergraduateTextbooks: [],
      graduateTextbooks: [],
      undergraduateTeachingAwards: [],
      graduateTeachingAwards: [],
      undergraduateTeachingPapers: [],
      graduateTeachingPapers: [],
      courseTeams: [],
      textbookAwards: [],
      stats: { undergraduateCourseCount: 0, graduateCourseCount: 0, totalWorkloadHours: 0, supervisionCount: 0, textbookCount: 0, teachingAwardCount: 0, teachingPaperCount: 0 },
    };

    try {
      const [
        undergraduateTeachingRaw,
        graduateTeachingRaw,
        undergraduateWorkloadRaw,
        graduateWorkloadRaw,
        undergraduateProjectsRaw,
        graduateProjectsRaw,
        supervisionRecordsRaw,
        competitionAwardsRaw,
        undergraduateCourseInfoRaw,
        graduateCourseInfoRaw,
        undergraduateTextbooksRaw,
        graduateTextbooksRaw,
        undergraduateTeachingAwardsRaw,
        graduateTeachingAwardsRaw,
        undergraduateTeachingPapersRaw,
        graduateTeachingPapersRaw,
        textbookAwardsRaw,
      ] = await Promise.all([
        this.fetchList('/open_api/customization/tdwsgxjxbzksjsskxxvmx/full', { JSGH: gh }),
        this.fetchList('/open_api/customization/tdwsgxjxyjsjsskxxmx/full', { JSGH: gh }),
        this.fetchList('/open_api/customization/tynugxjxbzksjsskgzl/full', { JSH: gh }),
        this.fetchList('/open_api/customization/tynugxjxyjsjsskgzl/full', { JSGH: gh }),
        this.fetchList('/open_api/customization/tdwsgxjxbzksjxyjxmxxmx/full', { XMCYGH: gh }),
        this.fetchList('/open_api/customization/tgxjxyjsjsjxyjxm/full', { ZCRZGH: gh }),
        this.fetchList('/open_api/customization/tdwsydxtydxtddjlmx/full', { BPR: gh }),
        this.fetchList('/open_api/customization/tynugxjxjzgzdbksjshjxx/full', { JSGH: gh }),
        this.fetchList('/open_api/customization/tdwsgxjxbzkskcjbxxmx/full', { KCFZRH: gh }),
        this.fetchList('/open_api/customization/tdwsgxjxyjskcxxmx/full', { KCFZRH: gh }),
        this.fetchList('/open_api/customization/tdwsgxjxbzksjcbjcxxmx/full', { GH: gh }),
        this.fetchList('/open_api/customization/tgxjxyjsjsycbyjsjc/full', { ZBZGH: gh }),
        this.fetchList('/open_api/customization/tdwsgxjxbzksjxjljjxjsxmxxmx/full', { XMCYGH: gh }),
        this.fetchList('/open_api/customization/tgxjxyjsjsjxjljjxjsxm/full', { HJRZGH: gh }),
        this.fetchList('/open_api/customization/tdwsgxjxbzksjsfblwxxmx/full', { GH: gh }),
        this.fetchList('/open_api/customization/tgxjxyjsjsgkfbjylw/full', { DYZZGZH: gh }),
        this.fetchList('/open_api/customization/tdwsgxjxbzksjchjxxmx/full', { GH: gh }),
      ]);

      // 从本科生授课信息中提取教学班号列表，用于二次查询课堂统计和课程团队成员
      const jxbhList = undergraduateTeachingRaw.map((raw: any) => raw.JXBH).filter(Boolean);
      let classroomStatsRaw: any[] = [];
      let courseTeamsRaw: any[] = [];
      if (jxbhList.length > 0) {
        [classroomStatsRaw, courseTeamsRaw] = await Promise.all([
          this.fetchList('/open_api/customization/tynugxjxaikttjjg/full', {
            JXBH: { in: jxbhList },
          }),
          this.fetchList('/open_api/customization/tdwsgxjxbzkskcttcymx/full', {
            JXBH: { in: jxbhList },
          }),
        ]);
      }

      result.classroomStats = classroomStatsRaw.map((raw: any): ClassroomStats => ({
        jxbh: raw.JXBH ?? undefined,
        xnxqmc: raw.XNXQMC ?? undefined,
        kckssj: raw.KCKSSJ ?? undefined,
        kcjssj: raw.KCJSSJ ?? undefined,
        zzd: raw.ZZD ?? undefined,
        hyd: raw.HYD ?? undefined,
        ttlv: raw.TTLV ?? undefined,
        dtlv: raw.DTLV ?? undefined,
        ysjlv: raw.YSJLV ?? undefined,
        sjd: raw.SJD ?? undefined,
      }));

      result.courseTeams = courseTeamsRaw.map((raw: any): CourseTeam => ({
        jxbh: raw.JXBH ?? undefined,
        kctdcy: raw.KCTDCY ?? undefined,
        kcfzr: raw.KCFZR ?? undefined,
        dgzdrq: raw.DGZDRQ ?? undefined,
      }));

      result.undergraduateTeaching = undergraduateTeachingRaw.map((raw: any): Teaching => ({
        jxbh: raw.JXBH ?? undefined,
        kcdm: raw.KCDM ?? undefined,
        kcmc: raw.KCMC ?? '',
        xnxqdm: raw.XNXQDM ?? '',
        xnxqmc: raw.XNXQMC ?? undefined,
        skbjsmc: raw.SKBJMC ?? undefined,
        xdrs: raw.XDRS ?? undefined,
        krl: raw.KRL ?? undefined,
      }));
      result.stats.undergraduateCourseCount = result.undergraduateTeaching.length;

      result.graduateTeaching = graduateTeachingRaw.map((raw: any): Teaching => ({
        jxbh: raw.JXBH ?? undefined,
        kcdm: raw.KCDM ?? undefined,
        kcmc: raw.KCMC ?? '',
        xnxqdm: raw.XNXQDM ?? '',
        xnxqmc: raw.XNXQMC ?? undefined,
        yxmc: raw.YXMC ?? undefined,
        xdrs: raw.XDRS ?? undefined,
      }));
      result.stats.graduateCourseCount = result.graduateTeaching.length;

      result.undergraduateWorkload = undergraduateWorkloadRaw.map((raw: any): Workload => ({
        kch: raw.KCH ?? undefined,
        kcm: raw.KCM ?? raw.KCMC ?? '',
        xnxqdm: raw.XNXQDM ?? '',
        xnxqmc: raw.XNXQMC ?? undefined,
        xkrs: raw.XKRS ?? undefined,
        xs: raw.XS ?? undefined,
        pkxs: raw.PKXS ?? undefined,
      }));
      result.graduateWorkload = graduateWorkloadRaw.map((raw: any): Workload => ({
        kch: raw.KCDM ?? undefined,
        kcm: raw.KCMC ?? '',
        xnxqdm: raw.IDXNXQDM ?? '',
        xnxqmc: raw.XNXQMC ?? undefined,
        xkrs: raw.XKRS ?? undefined,
        xs: raw.ZXS ?? undefined,
      }));
      result.stats.totalWorkloadHours =
        result.undergraduateWorkload.reduce((sum, w) => sum + (Number(w.xs) || 0), 0) +
        result.graduateWorkload.reduce((sum, w) => sum + (Number(w.xs) || 0), 0);

      result.undergraduateProjects = undergraduateProjectsRaw.map((raw: any): TeachingProject => ({
        xmmc: raw.XMMC ?? '',
        xmlb: raw.XMLB ?? undefined,
        lxsj: raw.LXSJ ?? undefined,
        brpm: raw.BRPM ?? undefined,
      }));
      result.graduateProjects = graduateProjectsRaw.map((raw: any): TeachingProject => ({
        xmmc: raw.XMMC ?? '',
        xmlb: raw.XMLB ?? undefined,
        lxsj: raw.LXSJ ?? undefined,
        brpm: raw.BRPM ?? undefined,
      }));

      result.supervisionRecords = supervisionRecordsRaw.map((raw: any): SupervisionRecord => ({
        kcdm: raw.KCDM ?? raw.PGKCDM ?? undefined,
        kcmc: raw.KCMC ?? raw.PGKCMC ?? undefined,
        tksj: raw.TKSJ ?? undefined,
        zf: raw.IDZF ?? raw.ZF ?? undefined,
        pjjy: raw.WIDPJJY ?? raw.PJJY ?? undefined,
        pgzjyj: raw.PGZJYJ ?? undefined,
        xnxqmc: raw.XNXQMC ?? undefined,
      }));
      result.stats.supervisionCount = result.supervisionRecords.length;

      result.competitionAwards = competitionAwardsRaw.map((raw: any): CompetitionAward => ({
        jsmc: raw.JSMC ?? '',
        hjdj: raw.HJDJ ?? undefined,
        hjsj: raw.HJSJ ?? undefined,
        hjxszzxm: raw.HJXSZZXM ?? undefined,
      }));

      result.undergraduateCourseInfo = undergraduateCourseInfoRaw.map((raw: any): CourseInfo => ({
        kch: raw.KCH ?? undefined,
        kcmc: raw.KCMC ?? '',
        kcywmc: raw.KCYWMC ?? undefined,
        zxs: raw.ZXS ?? raw.ZHXS ?? undefined,
        llxs: raw.LLXS ?? undefined,
        sjxs: raw.SJXS ?? raw.SJIXS ?? undefined,
        syxs: raw.SYXS ?? undefined,
        xf: raw.XF ?? undefined,
        kcjbmc: raw.KCJBDM ?? raw.KCJBMC ?? undefined,
        kcflmc: raw.KCFLMC ?? undefined,
        kcfzrh: raw.KCFZRH ?? undefined,
        kcksdwh: raw.KCKSDWH ?? undefined,
        kcksdwmc: raw.KCKSDWMC ?? undefined,
        kcjj: raw.KCJJ ?? undefined,
        jc: raw.JC ?? undefined,
        cksm: raw.CKSM ?? undefined,
        sfyx: raw.SFYX ?? undefined,
      }));
      result.graduateCourseInfo = graduateCourseInfoRaw.map((raw: any): CourseInfo => ({
        kch: raw.KCH ?? undefined,
        kcmc: raw.KCMC ?? '',
        kcywmc: raw.KCYWMC ?? undefined,
        zxs: raw.ZXS ?? raw.ZHXS ?? undefined,
        llxs: raw.LLXS ?? undefined,
        sjxs: raw.SJXS ?? undefined,
        syxs: raw.SYXS ?? undefined,
        xf: raw.XF ?? undefined,
        kcjbmc: raw.KCJBMC ?? raw.KCJBDM ?? undefined,
        kcflmc: raw.KCLBMC ?? raw.KCFLMC ?? undefined,
        kcfzrh: raw.KCFZRH ?? undefined,
        kcksdwh: raw.KCKSDWH ?? undefined,
        kcksdwmc: raw.KCKSDWMC ?? undefined,
        kcjj: raw.KCJJ ?? undefined,
        jc: raw.JC ?? undefined,
        cksm: raw.CKSM ?? undefined,
        sfyx: raw.SFYX ?? undefined,
      }));

      result.undergraduateTextbooks = undergraduateTextbooksRaw.map((raw: any): Textbook => ({
        gh: raw.GH ?? gh,
        jcbh: raw.JCBH ?? undefined,
        jcmc: raw.JCMC ?? '',
        isbn: raw.ISBN ?? undefined,
        cbsmc: raw.CBSMC ?? undefined,
        cbsj: raw.CBSJ ?? undefined,
        cbsjbmc: raw.CBSJBMC ?? undefined,
        brpm: raw.BRPM ?? undefined,
      }));
      result.graduateTextbooks = graduateTextbooksRaw.map((raw: any): Textbook => ({
        gh: raw.ZBZGH ?? gh,
        jcbh: raw.SH ?? undefined,
        jcmc: raw.JCMC ?? '',
        isbn: raw.CBSLB ?? undefined,
        cbsmc: raw.CBSMC ?? undefined,
        cbsj: raw.CBRQ ?? undefined,
        cbsjbmc: raw.CBSLBDM ?? undefined,
        brpm: raw.ZBXM ?? undefined,
      }));
      result.stats.textbookCount = result.undergraduateTextbooks.length + result.graduateTextbooks.length;

      result.undergraduateTeachingAwards = undergraduateTeachingAwardsRaw.map((raw: any): TeachingAward => ({
        gh: raw.XMCYGH ?? gh,
        jxcgbh: raw.JXCGBH ?? undefined,
        jxcgmc: raw.JXCGMC ?? '',
        jljbm: raw.JLJBM ?? undefined,
        hjnf: raw.HJNF ?? undefined,
        xmlb: raw.XMLB ?? undefined,
        brpm: raw.BRPM ?? undefined,
      }));
      result.graduateTeachingAwards = graduateTeachingAwardsRaw.map((raw: any): TeachingAward => ({
        gh: raw.HJRZGH ?? gh,
        jxcgbh: raw.JXCGH ?? undefined,
        jxcgmc: raw.JXCGMC ?? raw.JXJLHJSXMMC ?? '',
        jljbm: raw.JLJBM ?? raw.HJDJ ?? undefined,
        hjnf: raw.HJNF ?? raw.HJSJ ?? undefined,
        xmlb: raw.XMLB ?? raw.EJLB ?? undefined,
        brpm: raw.BRPM ?? raw.GRPM ?? undefined,
      }));
      result.stats.teachingAwardCount = result.undergraduateTeachingAwards.length + result.graduateTeachingAwards.length;

      result.undergraduateTeachingPapers = undergraduateTeachingPapersRaw.map((raw: any): TeachingPaper => ({
        gh: raw.GH ?? gh,
        lwbh: raw.LWBH ?? undefined,
        lwzwmc: raw.LWZWMC ?? '',
        fbqk: raw.FBQK ?? undefined,
        fbsj: raw.FBSJ ?? undefined,
        qklb: raw.QKLB ?? undefined,
        brpm: raw.BRPM ?? undefined,
      }));
      result.graduateTeachingPapers = graduateTeachingPapersRaw.map((raw: any): TeachingPaper => ({
        gh: raw.DYZZGZH ?? gh,
        lwbh: raw.QS ?? undefined,
        lwzwmc: raw.LWTM ?? '',
        fbqk: raw.QKMC ?? undefined,
        fbsj: raw.FBRQ ?? undefined,
        qklb: raw.QKLB ?? undefined,
        brpm: raw.DYZZXM ?? undefined,
      }));
      result.stats.teachingPaperCount = result.undergraduateTeachingPapers.length + result.graduateTeachingPapers.length;

      result.textbookAwards = textbookAwardsRaw.map((raw: any): TeachingAward => ({
        gh: raw.HJXM ?? gh,
        jxcgbh: raw.HJJCBH ?? undefined,
        jxcgmc: raw.JCMC ?? raw.HJMC ?? '',
        jljbm: raw.JLJBM ?? undefined,
        hjnf: raw.HJRQ ?? undefined,
        xmlb: raw.HJJC ?? undefined,
        brpm: raw.BJDW ?? undefined,
      }));

      return result;
    } catch (error) {
      console.error('查询教学数据失败:', error);
      return result;
    }
  }

  // ============================================
  // AI 功能
  // ============================================

  /**
   * 生成AI教师画像总结
   */
  async generateAISummary(data: AISummaryInput): Promise<string> {
    const { teacher, extendedInfo, research, teaching } = data;

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
        let errorDetails = '';
        try {
          const errorResponse = await response.text();
          errorDetails = errorResponse;
        } catch {
          errorDetails = '无法获取错误详情';
        }

        console.error(`AI API 请求失败: ${response.status}`);
        console.error(`AI API 错误响应: ${errorDetails}`);
        console.error(`AI API 请求URL: ${aiApiUrl}`);

        throw new Error(`AI API 请求失败: ${response.status} - ${errorDetails.substring(0, 500)}`);
      }

      const responseData = await response.json();
      return responseData.choices?.[0]?.message?.content || '生成总结失败';
    } catch (error) {
      console.error('生成AI总结失败:', error);
      if (error instanceof Error) {
        console.error('错误详情:', error.message);
        console.error('错误堆栈:', error.stack);
      }
      return '生成AI总结时发生错误，请稍后重试。';
    }
  }
}
