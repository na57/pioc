/**
 * 云南大学 IT 资产中心数据提供者实现
 * 基于数据中台 API 的信息系统备案信息获取实现
 *
 * 当前中台仅提供了信息系统备案信息明细接口，其他资产接口暂无数据，
 * 因此资产相关查询均返回空结果，待后续接口开放后再补充。
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  IItAssetDataProvider,
  InformationSystem,
  ITAsset,
  AssetRelationship,
  SystemAssetStats,
  AssetType,
  AssetCategory,
  QuerySystemsParams,
  QueryAssetsParams,
  PaginatedResult,
  InformationSystemStatus,
  InformationSystemLevel,
} from '../types';
import { ASSET_TYPE_META } from '../constants';

// ============================================
// API 配置
// ============================================

const API_BASE_URL = process.env.ITAM_API_BASE_URL || 'https://dmp.ynu.edu.cn';
const APP_KEY = process.env.ITAM_APP_KEY || '';
const APP_SECRET = process.env.ITAM_APP_SECRET || '';

/**
 * 云南大学 IT 资产数据提供者
 * 实现 IItAssetDataProvider 接口，通过数据中台 API 获取数据
 */
export class YnuDataProvider implements IItAssetDataProvider {
  // API Token 缓存
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  // ============================================
  // 认证与通用请求
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
        `${API_BASE_URL}/open_api/authentication/get_access_token?key=${encodeURIComponent(APP_KEY)}&secret=${encodeURIComponent(APP_SECRET)}`,
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

      if (String(data.code) !== '10000' || data.message !== 'ok') {
        throw new Error(`获取 Token 失败: ${data.message || data.description || data.code}`);
      }

      this.accessToken = data.result.access_token;
      // 设置过期时间（毫秒）
      this.tokenExpiresAt = Date.now() + parseInt(data.result.expires_in, 10) * 1000;

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
        if (value !== undefined && value !== null && value !== '') {
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

    if (String(data.code) !== '10000' || data.message !== 'ok') {
      throw new Error(`API 返回错误: ${data.message || data.description || data.code}`);
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

  // ============================================
  // 数据转换
  // ============================================

  /**
   * 将中台返回的信息系统备案数据转换为系统标准格式
   */
  private transformSystem(raw: any): InformationSystem {
    const id = raw.WYBS ?? raw.wybs ?? '';
    const name = raw.XXXTMC ?? raw.xxxtmc ?? '';
    const description = this.buildDescription(raw);

    return {
      id,
      code: id,
      name,
      description,
      owner: raw.FZRXM ?? raw.fzrxm ?? undefined,
      owner_department: raw.DWMC ?? raw.dwmc ?? undefined,
      status: this.mapStatus(raw),
      level: this.mapLevel(raw.XTZYX ?? raw.xtzyx),
      created_at: this.formatTimestamp(raw.TSTAMP ?? raw.tstamp),
      updated_at: this.formatTimestamp(raw.TSTAMP ?? raw.tstamp),
    };
  }

  /**
   * 根据 API 返回构建系统描述
   */
  private buildDescription(raw: any): string | undefined {
    const parts: string[] = [];

    const push = (label: string, value: unknown) => {
      if (value !== undefined && value !== null && value !== '') {
        parts.push(`${label}：${value}`);
      }
    };

    push('业务描述', raw.XTYWXXMS ?? raw.xtywxxms);
    push('主要功能模块', raw.XTZYGNMK ?? raw.xtzygnmk);
    push('基础架构', raw.XTJCJG ?? raw.xtjcjg);
    push('开发语言', raw.KFYY ?? raw.kfyy);
    push('中间件', raw.ZJJ ?? raw.zjj);
    push('数据库版本', raw.SJKBB ?? raw.sjkbb);
    push('用户群体', raw.YHQT ?? raw.yhqt);
    push('用户规模', raw.YHGM ?? raw.yhgm);
    push('系统重要性', raw.XTZYX ?? raw.xtzyx);
    push('备注', raw.BZ ?? raw.bz);

    return parts.length > 0 ? parts.join('；') : undefined;
  }

  /**
   * 映射系统状态
   * 中台暂无状态字段，默认返回运行中
   */
  private mapStatus(_raw: any): InformationSystemStatus {
    return 'running';
  }

  /**
   * 根据系统重要性映射系统等级
   */
  private mapLevel(importance?: string): InformationSystemLevel {
    const value = String(importance ?? '').toLowerCase();
    if (value.includes('核心')) return 'core';
    if (value.includes('重要')) return 'important';
    return 'general';
  }

  /**
   * 格式化时间戳字段
   */
  private formatTimestamp(tstamp?: string): string {
    if (!tstamp) return new Date().toISOString();

    // 尝试按常见格式解析，如 20240101120000 或标准 ISO 字符串
    if (/^\d{14}$/.test(tstamp)) {
      const year = tstamp.slice(0, 4);
      const month = tstamp.slice(4, 6);
      const day = tstamp.slice(6, 8);
      const hour = tstamp.slice(8, 10);
      const minute = tstamp.slice(10, 12);
      const second = tstamp.slice(12, 14);
      return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`).toISOString();
    }

    const date = new Date(tstamp);
    return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  }

  /**
   * 映射域名状态
   * 中台 YMZT 字段当前返回：启用 - 活跃，停用 - 停用
   * 同时兼容 yes/no 的后续调整
   */
  private mapDomainStatus(statusText?: string): 'active' | 'inactive' | 'unknown' {
    const value = String(statusText ?? '').trim().toLowerCase();
    if (!value) return 'unknown';
    if (value === 'yes' || value.includes('正常') || value.includes('使用中') || value.includes('启用')) {
      return 'active';
    }
    if (value === 'no' || value.includes('停用') || value.includes('注销') || value.includes('过期')) {
      return 'inactive';
    }
    return 'unknown';
  }

  /**
   * 将中台返回的 DNS 域名数据转换为系统标准格式
   */
  private transformDomain(raw: any): ITAsset {
    const domain = raw.YM ?? raw.ym ?? '';
    const status = this.mapDomainStatus(raw.YMZT ?? raw.ymzt);

    const parts: string[] = [];
    const push = (label: string, value: unknown) => {
      if (value !== undefined && value !== null && value !== '') {
        parts.push(`${label}：${value}`);
      }
    };

    push('用途', raw.YMYT ?? raw.ymyt);
    push('部门', raw.DWMC ?? raw.dwmc);
    push('负责人', raw.FZRXM ?? raw.fzrxm);
    push('备注', raw.BZ ?? raw.bz);

    return {
      id: raw.WYBS ?? raw.wybs ?? '',
      system_id: raw.XXXTID ?? raw.xxxtid ?? '',
      asset_type: 'domain',
      category: 'network',
      name: domain,
      domain,
      status,
      description: parts.length > 0 ? parts.join('；') : undefined,
      created_at: this.formatTimestamp(raw.TSTAMP ?? raw.tstamp),
      updated_at: this.formatTimestamp(raw.TSTAMP ?? raw.tstamp),
    } as ITAsset;
  }

  // ============================================
  // 域名资产查询
  // ============================================

  /**
   * 查询域名资产列表
   * 中台仅提供 DNS 域名信息明细接口，其他类型资产暂无数据
   */
  private async queryDomains(
    params: {
      system_id?: string;
      keyword?: string;
      status?: 'active' | 'inactive' | 'unknown';
      page?: number;
      pageSize?: number;
    }
  ): Promise<PaginatedResult<ITAsset>> {
    const { system_id, keyword, status, page = 1, pageSize = 10 } = params;

    try {
      const hasLocalFilters = !!(keyword || status);
      const apiPage = hasLocalFilters ? 1 : page;
      const apiPerPage = hasLocalFilters ? 10000 : pageSize;

      const body: Record<string, unknown> = { page: apiPage, per_page: apiPerPage };
      if (system_id) {
        body.XXXTID = system_id;
      }

      const result = await this.callApi('/open_api/customization/tdwsgxggfwdnsymxxmx/full', body);
      let domains: ITAsset[] = (result?.data || []).map((raw: any) => this.transformDomain(raw));

      if (status) {
        domains = domains.filter((d) => d.status === status);
      }

      if (keyword) {
        const lowerKeyword = keyword.toLowerCase();
        domains = domains.filter(
          (d) =>
            d.name?.toLowerCase().includes(lowerKeyword) ||
            d.description?.toLowerCase().includes(lowerKeyword) ||
            d.status?.toLowerCase().includes(lowerKeyword)
        );
      }

      domains.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

      const total = hasLocalFilters ? domains.length : parseInt(result?.total, 10) || domains.length;
      const data = hasLocalFilters ? domains.slice((page - 1) * pageSize, page * pageSize) : domains;

      return { data, total };
    } catch (error) {
      console.error('查询域名资产失败:', error);
      return { data: [], total: 0 };
    }
  }

  // ============================================
  // 信息系统查询
  // ============================================

  /**
   * 查询信息系统列表
   */
  async querySystems(params: QuerySystemsParams): Promise<PaginatedResult<InformationSystem>> {
    const { keyword, status, level, page = 1, pageSize = 10 } = params;

    try {
      // 如果存在本地过滤条件（关键词、状态、等级），先拉取较多数据再本地过滤
      const hasLocalFilters = !!(keyword || status || level || params.department);
      const apiPage = hasLocalFilters ? 1 : page;
      const apiPerPage = hasLocalFilters ? 10000 : pageSize;

      const result = await this.callApi('/open_api/customization/tdwsgxggfwxxxtbaxxmx/full', {
        page: apiPage,
        per_page: apiPerPage,
      });

      let systems: InformationSystem[] = (result?.data || []).map((raw: any) => this.transformSystem(raw));

      if (status) {
        systems = systems.filter((s) => s.status === status);
      }
      if (level) {
        systems = systems.filter((s) => s.level === level);
      }
      if (params.department) {
        systems = systems.filter((s) => s.owner_department === params.department);
      }

      if (keyword) {
        const lowerKeyword = keyword.toLowerCase();
        systems = systems.filter(
          (s) =>
            s.name?.toLowerCase().includes(lowerKeyword) ||
            s.code?.toLowerCase().includes(lowerKeyword) ||
            s.description?.toLowerCase().includes(lowerKeyword) ||
            s.owner?.toLowerCase().includes(lowerKeyword) ||
            s.owner_department?.toLowerCase().includes(lowerKeyword)
        );
      }

      // 按等级和名称排序
      const levelOrder = { core: 0, important: 1, general: 2 };
      systems.sort(
        (a, b) =>
          (levelOrder[a.level || 'general'] || 99) - (levelOrder[b.level || 'general'] || 99) ||
          a.name.localeCompare(b.name, 'zh-CN')
      );

      const total = hasLocalFilters ? systems.length : parseInt(result?.total, 10) || systems.length;
      const data = hasLocalFilters ? systems.slice((page - 1) * pageSize, page * pageSize) : systems;

      return { data, total };
    } catch (error) {
      console.error('查询信息系统列表失败:', error);
      return { data: [], total: 0 };
    }
  }

  /**
   * 根据 ID 查询信息系统
   */
  async querySystemById(id: string): Promise<InformationSystem | null> {
    try {
      const result = await this.callApi('/open_api/customization/tdwsgxggfwxxxtbaxxmx/full', {
        WYBS: id,
        page: 1,
        per_page: 1,
      });
      const list = result?.data || [];
      return list[0] ? this.transformSystem(list[0]) : null;
    } catch (error) {
      console.error('查询信息系统详情失败:', error);
      return null;
    }
  }

  // ============================================
  // ============================================
  // 资产查询（当前中台仅提供域名数据）
  // ============================================

  /**
   * 查询资产列表
   */
  async queryAssets(params: QueryAssetsParams): Promise<PaginatedResult<ITAsset>> {
    const { asset_type, category, system_id, keyword, status, page = 1, pageSize = 10 } = params;

    // 中台暂无其他类型资产接口，按非域名类型或分类过滤时直接返回空
    if ((asset_type && asset_type !== 'domain') || (category && category !== 'network')) {
      return { data: [], total: 0 };
    }

    return this.queryDomains({ system_id, keyword, status, page, pageSize });
  }

  /**
   * 根据 ID 查询资产
   */
  async queryAssetById(id: string): Promise<ITAsset | null> {
    try {
      const result = await this.callApi('/open_api/customization/tdwsgxggfwdnsymxxmx/full', {
        WYBS: id,
        page: 1,
        per_page: 1,
      });
      const list = result?.data || [];
      return list[0] ? this.transformDomain(list[0]) : null;
    } catch (error) {
      console.error('查询资产详情失败:', error);
      return null;
    }
  }

  /**
   * 查询指定系统下的资产
   */
  async queryAssetsBySystemId(
    systemId: string,
    params: Omit<QueryAssetsParams, 'system_id'> = {}
  ): Promise<PaginatedResult<ITAsset>> {
    return this.queryAssets({ ...params, system_id: systemId });
  }

  /**
   * 查询系统资产统计
   */
  async querySystemAssetStats(systemId: string): Promise<SystemAssetStats> {
    const result = await this.queryDomains({ system_id: systemId, pageSize: 10000 });
    const count = result.data.length;

    return {
      total: count,
      by_type: count > 0 ? [{ asset_type: 'domain', category: 'network', label: '域名', count }] : [],
      by_category: {
        infrastructure: 0,
        network: count,
        data: 0,
        application: 0,
        software: 0,
        operations: 0,
        external: 0,
      },
    };
  }

  /**
   * 查询所有资产类型
   */
  async queryAssetTypes(): Promise<{ type: AssetType; category: AssetCategory; label: string }[]> {
    return Object.entries(ASSET_TYPE_META).map(([type, meta]) => ({
      type: type as AssetType,
      category: meta.category,
      label: meta.label,
    }));
  }

  /**
   * 查询所属部门列表
   * 中台暂无独立接口，通过拉取全部系统后提取 DWMC 去重
   */
  async queryDepartments(): Promise<string[]> {
    try {
      const result = await this.callApi('/open_api/customization/tdwsgxggfwxxxtbaxxmx/full', {
        page: 1,
        per_page: 10000,
      });
      const systems: InformationSystem[] = (result?.data || []).map((raw: any) => this.transformSystem(raw));
      const departments = new Set<string>();
      systems.forEach((s) => {
        if (s.owner_department) {
          departments.add(s.owner_department);
        }
      });
      return Array.from(departments).sort((a, b) => a.localeCompare(b, 'zh-CN'));
    } catch (error) {
      console.error('查询部门列表失败:', error);
      return [];
    }
  }

  async queryAssetRelationships(_assetId: string): Promise<AssetRelationship[]> {
    return [];
  }
}
