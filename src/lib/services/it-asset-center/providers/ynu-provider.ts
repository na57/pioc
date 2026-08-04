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
  WebServer,
  WebApp,
  ThirdPartyService,
  OpsAccessControl,
  VirtualMachine,
  AssetRelationship,
  SystemAssetStats,
  AssetType,
  AssetCategory,
  AssetStatus,
  QuerySystemsParams,
  QueryAssetsParams,
  PaginatedResult,
  InformationSystemStatus,
  DNSRecordDetail,
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
      parent_id: raw.FYY ?? raw.fyy ?? undefined,
      parent_name: undefined,
      custom_fields: this.extractCustomFields(raw),
      created_at: this.formatTimestamp(raw.TSTAMP ?? raw.tstamp),
      updated_at: this.formatTimestamp(raw.TSTAMP ?? raw.tstamp),
    };
  }

  /**
   * 提取中台自定义字段
   */
  private extractCustomFields(raw: any): Record<string, string> | undefined {
    const fieldMap: Record<string, string> = {
      IDSSFDJ: 'IDS是否对接',
      SJYSFCJ: '数据源是否采集',
      XTJCJG: '系统基础架构',
      XTZYX: '系统重要性',
      YHQT: '用户群体',
      SJKBB: '数据库版本',
      ZJJ: '中间件',
      KFYY: '开发语言',
      XTZYGNMK: '系统主要功能模块',
      XTYWXXMS: '系统业务信息描述',
      YHGM: '用户规模',
      BZ: '备注',
      ZT: '状态',
    };

    const customFields: Record<string, string> = {};
    Object.entries(fieldMap).forEach(([key, label]) => {
      const value = raw[key] ?? raw[key.toLowerCase()];
      if (value !== undefined && value !== null && value !== '') {
        customFields[label] = String(value);
      }
    });

    return Object.keys(customFields).length > 0 ? customFields : undefined;
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
    return 'active';
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
    const usage = raw.YMYT ?? raw.ymyt ?? '';
    const department = raw.DWMC ?? raw.dwmc ?? '';
    const owner = raw.FZRXM ?? raw.fzrxm ?? '';

    return {
      id: raw.WYBS ?? raw.wybs ?? '',
      system_id: raw.XXXTID ?? raw.xxxtid ?? '',
      asset_type: 'domain',
      category: 'network',
      name: domain,
      domain,
      status,
      description: usage || undefined,
      department: department || undefined,
      owner: owner || undefined,
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
      status?: AssetStatus;
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
  // 物理设备资产查询
  // ============================================

  /**
   * 映射物理设备状态
   * 中台 ZT 字段：运行/停机/故障/闲置
   */
  private mapDeviceStatus(statusText?: string): AssetStatus {
    const value = String(statusText ?? '').trim();
    if (!value) return 'unknown';
    if (value.includes('运行') || value.includes('活动')) return 'active';
    if (value.includes('停机') || value.includes('停用')) return 'inactive';
    if (value.includes('故障')) return 'faulty';
    if (value.includes('闲置')) return 'idle';
    return 'unknown';
  }

  /**
   * 将中台返回的物理设备数据转换为系统标准格式
   */
  private transformPhysicalDevice(raw: any): ITAsset {
    const id = raw.WYBS ?? raw.wybs ?? '';
    const name = raw.SBMC ?? raw.sbmc ?? '';
    const status = this.mapDeviceStatus(raw.ZT ?? raw.zt);
    const deviceType = raw.SBLX ?? raw.sblx ?? '';
    const systemId = raw.XXXTWYBS ?? raw.xxxtwybs ?? '';

    return {
      id,
      system_id: systemId,
      asset_type: 'physical_device',
      category: 'infrastructure',
      name,
      code: raw.SBWYBS ?? raw.sbwybs ?? id,
      status,
      description: raw.BZ ?? raw.bz ?? undefined,
      device_type: deviceType || undefined,
      brand: raw.SCCJ ?? raw.sccj ?? undefined,
      model: deviceType || undefined,
      sn: raw.SBWYBS ?? raw.sbwybs ?? undefined,
      ip_address: raw.IPDZ ?? raw.ipdz ?? undefined,
      management_ip: raw.DWGLDZ ?? raw.dwgldz ?? undefined,
      manufacturer: raw.SCCJ ?? raw.sccj ?? undefined,
      warranty_expiry: raw.WBDQSJ ?? raw.wbdqsj ? this.formatTimestamp(raw.WBDQSJ ?? raw.wbdqsj) : undefined,
      department: raw.DWMC ?? raw.dwmc ?? undefined,
      owner: raw.FZRXM ?? raw.fzrxm ?? undefined,
      owner_employee_id: raw.FZRGH ?? raw.fzrgh ?? undefined,
      system_name: raw.XXXTMC ?? raw.xxxtmc ?? undefined,
      remark: raw.BZ ?? raw.bz ?? undefined,
      created_at: this.formatTimestamp(raw.TSTAMP ?? raw.tstamp),
      updated_at: this.formatTimestamp(raw.TSTAMP ?? raw.tstamp),
    } as ITAsset;
  }

  /**
   * 查询物理设备列表
   * 中台接口：/open_api/customization/tdwsgxggfwwlsbxxmx/full
   */
  private async queryPhysicalDevices(
    params: {
      system_id?: string;
      keyword?: string;
      status?: AssetStatus;
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
        body.XXXTWYBS = system_id;
      }

      const result = await this.callApi('/open_api/customization/tdwsgxggfwwlsbxxmx/full', body);
      let devices: ITAsset[] = (result?.data || []).map((raw: any) => this.transformPhysicalDevice(raw));

      if (status) {
        devices = devices.filter((d) => d.status === status);
      }

      if (keyword) {
        const lowerKeyword = keyword.toLowerCase();
        devices = devices.filter(
          (d) =>
            d.name?.toLowerCase().includes(lowerKeyword) ||
            d.code?.toLowerCase().includes(lowerKeyword) ||
            d.description?.toLowerCase().includes(lowerKeyword) ||
            (d as any).device_type?.toLowerCase().includes(lowerKeyword) ||
            (d as any).system_name?.toLowerCase().includes(lowerKeyword) ||
            (d as any).department?.toLowerCase().includes(lowerKeyword)
        );
      }

      devices.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

      const total = hasLocalFilters ? devices.length : parseInt(result?.total, 10) || devices.length;
      const data = hasLocalFilters ? devices.slice((page - 1) * pageSize, page * pageSize) : devices;

      return { data, total };
    } catch (error) {
      console.error('查询物理设备失败:', error);
      return { data: [], total: 0 };
    }
  }

  // ============================================
  // 虚拟机资产查询
  // ============================================

  /**
   * 映射虚拟机状态
   * 中台 ZT 字段：活动/运行中/停用等
   */
  private mapVMStatus(statusText?: string): AssetStatus {
    const value = String(statusText ?? '').trim();
    if (!value) return 'unknown';
    if (value.includes('启用') || value.includes('活动') || value.includes('运行') || value.toLowerCase().includes('running')) return 'active';
    if (value.includes('停用') || value.includes('关机') || value.toLowerCase().includes('stopped')) return 'inactive';
    if (value.includes('故障')) return 'faulty';
    return 'unknown';
  }

  /**
   * 将中台返回的虚拟机数据转换为系统标准格式
   * 中台接口：/open_api/customization/tdwsgxggfwxnjxxmx/full
   */
  private transformVirtualMachine(raw: any): VirtualMachine {
    const id = raw.WYBS ?? raw.wybs ?? '';
    const host = raw.XNJWYBS ?? raw.xnjwybs ?? '';
    const ip = raw.IPDZ ?? raw.ipdz ?? '';
    const os = raw.XNJCZXT ?? raw.xnjczxt ?? '';
    const hypervisor = raw.PT ?? raw.pt ?? '';
    const status = this.mapVMStatus(raw.ZT ?? raw.zt);
    const systemId = raw.XXXTWYBS ?? raw.xxxtwybs ?? '';
    const systemName = raw.XXXTMC ?? raw.xxxtmc ?? '';
    const tstamp = raw.TSTAMP ?? raw.tstamp ?? '';
    const cjsj = raw.CJSJ ?? raw.cjsj ?? '';
    const remark = raw.BZ ?? raw.bz ?? '';

    return {
      id,
      system_id: systemId || '',
      asset_type: 'virtual_machine',
      category: 'infrastructure',
      name: ip ? `虚拟机-${ip}` : (host || id),
      code: id,
      status,
      description: remark || undefined,
      host: host || undefined,
      ip: ip || undefined,
      os: os || undefined,
      hypervisor: hypervisor || undefined,
      created_at: this.formatTimestamp(cjsj || tstamp),
      updated_at: this.formatTimestamp(tstamp),
      metadata: {
        system_name: systemName || undefined,
        department: raw.DWMC ?? raw.dwmc ?? undefined,
        department_code: raw.DWH ?? raw.dwh ?? undefined,
        owner: raw.FZRXM ?? raw.fzrxm ?? undefined,
        owner_employee_id: raw.FZRGH ?? raw.fzrgh ?? undefined,
      },
    } as VirtualMachine;
  }

  /**
   * 查询虚拟机列表
   * 中台接口：/open_api/customization/tdwsgxggfwxnjxxmx/full
   */
  private async queryVirtualMachines(
    params: {
      system_id?: string;
      keyword?: string;
      status?: AssetStatus;
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
        body.XXXTWYBS = system_id;
      }

      const result = await this.callApi('/open_api/customization/tdwsgxggfwxnjxxmx/full', body);
      let vms: ITAsset[] = (result?.data || []).map((raw: any) => this.transformVirtualMachine(raw));

      if (status) {
        vms = vms.filter((v) => v.status === status);
      }

      if (keyword) {
        const lowerKeyword = keyword.toLowerCase();
        vms = vms.filter(
          (v) =>
            v.name?.toLowerCase().includes(lowerKeyword) ||
            v.code?.toLowerCase().includes(lowerKeyword) ||
            v.description?.toLowerCase().includes(lowerKeyword) ||
            (v as VirtualMachine).host?.toLowerCase().includes(lowerKeyword) ||
            (v as VirtualMachine).ip?.toLowerCase().includes(lowerKeyword) ||
            (v as VirtualMachine).os?.toLowerCase().includes(lowerKeyword) ||
            (v as VirtualMachine).hypervisor?.toLowerCase().includes(lowerKeyword)
        );
      }

      vms.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

      const total = hasLocalFilters ? vms.length : parseInt(result?.total, 10) || vms.length;
      const data = hasLocalFilters ? vms.slice((page - 1) * pageSize, page * pageSize) : vms;

      return { data, total };
    } catch (error) {
      console.error('查询虚拟机失败:', error);
      return { data: [], total: 0 };
    }
  }

  // ============================================
  // Web 服务器（中台称 Web 应用）资产查询
  // ============================================

  /**
   * 将单条中台 Web 应用数据转换为系统标准 WebServer 格式
   * 抽象字段：server_type, ip_address, purpose
   * 扩展字段：source 等放入 metadata
   */
  private transformWebServer(raw: any): WebServer {
    const name = raw.YYMC ?? raw.yymc ?? '';
    const ipAddress = raw.IPDZ ?? raw.ipdz ?? '';
    const serverType = raw.ZDLX ?? raw.zdlx ?? 'Web应用';

    // id 会在 buildWebServerFromApps 中被覆盖为 `${ip}@@${serverType}`
    const tempId = `${ipAddress}_${serverType}`;

    return {
      id: tempId,
      system_id: 'unknown',
      asset_type: 'web_server',
      category: 'application',
      name,
      code: tempId,
      status: 'active',
      description: `Web应用: ${name}${ipAddress ? ` (${ipAddress})` : ''}`,
      server_type: serverType,
      ip_address: ipAddress || undefined,
      purpose: name ? `运行 ${name}` : undefined,
      created_at: this.formatTimestamp(raw.TSTAMP ?? raw.tstamp),
      updated_at: this.formatTimestamp(raw.TSTAMP ?? raw.tstamp),
      metadata: {
        source: raw.LY ?? raw.ly ?? undefined,
      },
    } as WebServer;
  }

  /**
   * 将单条中台 Web 应用数据转换为系统标准 WebApp 格式
   * 抽象字段：ip_address, server_type, app_name, app_version
   * 扩展字段：agent_id, source, timestamp 等放入 metadata
   */
  private transformWebApp(raw: any): WebApp {
    const wybs = raw.WYBS ?? raw.wybs ?? '';
    const agentId = raw.AGENTID ?? raw.agentid ?? '';
    const appName = raw.YYMC ?? raw.yymc ?? '';
    const ipAddress = raw.IPDZ ?? raw.ipdz ?? '';
    const serverType = raw.ZDLX ?? raw.zdlx ?? '';
    const appVersion = raw.YYBB ?? raw.yybb ?? '';
    const timestamp = raw.TSTAMP ?? raw.tstamp ?? '';
    const source = raw.LY ?? raw.ly ?? '';

    // 使用 WYBS（唯一标识_校标）作为主键
    const id = wybs || agentId || `${ipAddress}_${appName}`;

    return {
      id,
      system_id: 'unknown',
      asset_type: 'web_app',
      category: 'application',
      name: appName || id,
      code: id,
      status: 'active',
      description: `Web应用: ${appName}${ipAddress ? ` (${ipAddress})` : ''}`,
      ip_address: ipAddress || undefined,
      server_type: serverType || undefined,
      app_name: appName || undefined,
      app_version: appVersion || undefined,
      created_at: this.formatTimestamp(timestamp),
      updated_at: this.formatTimestamp(timestamp),
      metadata: {
        agent_id: agentId || undefined,
        source: source || undefined,
        timestamp: timestamp || undefined,
      },
    } as WebApp;
  }

  /**
   * 将多条 Web 应用记录按 (ip_address, server_type) 去重合并为一个 Web 服务器
   */
  private buildWebServerFromApps(apps: WebServer[]): ITAsset | null {
    if (!apps || apps.length === 0) return null;

    const first = apps[0];
    const ip = first.ip_address || 'unknown';
    const serverType = first.server_type || 'unknown';
    const key = `${ip}@@${serverType}`;

    const appNames = apps.map((app) => app.name).filter(Boolean);
    const uniqueAppNames = Array.from(new Set(appNames));

    // 合并 metadata：保留第一个的非 apps 字段，并收集所有应用名称
    const mergedMetadata: Record<string, unknown> = { ...(first.metadata || {}) };
    apps.forEach((app, idx) => {
      if (idx === 0) return;
      Object.entries(app.metadata || {}).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '' && mergedMetadata[k] === undefined) {
          mergedMetadata[k] = v;
        }
      });
    });
    mergedMetadata.apps = uniqueAppNames;

    // 取最晚的更新时间
    let latestUpdated = first.updated_at || '';
    apps.forEach((app) => {
      if (app.updated_at && app.updated_at > latestUpdated) {
        latestUpdated = app.updated_at;
      }
    });

    return {
      ...first,
      id: key,
      code: key,
      name: `${ip} 上的 ${serverType}`,
      description: `Web服务器: ${serverType} (${ip})`,
      purpose: uniqueAppNames.length > 0 ? `运行 ${uniqueAppNames.join('、')}` : undefined,
      updated_at: latestUpdated || first.updated_at,
      metadata: mergedMetadata,
    } as ITAsset;
  }

  /**
   * 查询 Web 服务器列表
   * 逻辑：从中台 Web 应用数据按 (IP地址 + Web服务器类型) 去重得到 Web 服务器
   * 中台接口：/open_api/customization/tynugxggfwedrwebyyxx/full
   */
  private async queryWebServers(
    params: {
      keyword?: string;
      status?: AssetStatus;
      page?: number;
      pageSize?: number;
    }
  ): Promise<PaginatedResult<ITAsset>> {
    const { keyword, status, page = 1, pageSize = 10 } = params;

    try {
      const hasLocalFilters = !!(keyword || status);
      const apiPage = hasLocalFilters ? 1 : page;
      const apiPerPage = hasLocalFilters ? 10000 : pageSize;

      const result = await this.callApi('/open_api/customization/tynugxggfwedrwebyyxx/full', {
        page: apiPage,
        per_page: apiPerPage,
      });

      // 1. 转换为内部 Web 应用对象
      const webApps: WebServer[] = (result?.data || []).map((raw: any) => this.transformWebServer(raw));

      // 2. 按 (ip_address, server_type) 去重得到 Web 服务器
      const serverMap = new Map<string, WebServer[]>();
      webApps.forEach((app) => {
        const ip = app.ip_address || 'unknown';
        const serverType = app.server_type || 'unknown';
        const key = `${ip}@@${serverType}`;
        if (!serverMap.has(key)) {
          serverMap.set(key, []);
        }
        serverMap.get(key)!.push(app);
      });

      let servers: ITAsset[] = [];
      serverMap.forEach((apps) => {
        const server = this.buildWebServerFromApps(apps);
        if (server) servers.push(server);
      });

      if (status) {
        servers = servers.filter((s) => s.status === status);
      }

      if (keyword) {
        const lowerKeyword = keyword.toLowerCase();
        servers = servers.filter((s) => {
          const meta = s.metadata || {};
          const apps = (meta.apps as string[]) || [];
          return (
            s.name?.toLowerCase().includes(lowerKeyword) ||
            s.code?.toLowerCase().includes(lowerKeyword) ||
            s.description?.toLowerCase().includes(lowerKeyword) ||
            (s as WebServer).ip_address?.toLowerCase().includes(lowerKeyword) ||
            (s as WebServer).server_type?.toLowerCase().includes(lowerKeyword) ||
            apps.some((appName) => appName.toLowerCase().includes(lowerKeyword)) ||
            String(meta.agent_id || '').toLowerCase().includes(lowerKeyword) ||
            String(meta.site_type || '').toLowerCase().includes(lowerKeyword) ||
            String(meta.source || '').toLowerCase().includes(lowerKeyword)
          );
        });
      }

      servers.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

      const total = servers.length;
      const data = servers.slice((page - 1) * pageSize, page * pageSize);

      return { data, total };
    } catch (error) {
      console.error('查询Web服务器失败:', error);
      return { data: [], total: 0 };
    }
  }

  /**
   * 查询 Web 应用列表
   * 中台接口：/open_api/customization/tynugxggfwedrwebyyxx/full
   */
  private async queryWebApps(
    params: {
      keyword?: string;
      ip_address?: string;
      server_type?: string;
      status?: AssetStatus;
      page?: number;
      pageSize?: number;
    }
  ): Promise<PaginatedResult<WebApp>> {
    const { keyword, ip_address, server_type, status, page = 1, pageSize = 10 } = params;

    try {
      const hasLocalFilters = !!(keyword || status);
      const apiPage = hasLocalFilters ? 1 : page;
      const apiPerPage = hasLocalFilters ? 10000 : pageSize;

      const queryParams: Record<string, unknown> = {
        page: apiPage,
        per_page: apiPerPage,
      };

      // 如果指定了 IP 地址，直接在 API 层过滤
      if (ip_address) {
        queryParams.IPDZ = ip_address;
      }

      const result = await this.callApi('/open_api/customization/tynugxggfwedrwebyyxx/full', queryParams);

      let apps: WebApp[] = (result?.data || []).map((raw: any) => this.transformWebApp(raw));

      // 如果指定了服务器类型，在内存中过滤
      if (server_type) {
        apps = apps.filter((app) => app.server_type === server_type);
      }

      if (status) {
        apps = apps.filter((app) => app.status === status);
      }

      if (keyword) {
        const lowerKeyword = keyword.toLowerCase();
        apps = apps.filter((app) => {
          const meta = app.metadata || {};
          return (
            app.name?.toLowerCase().includes(lowerKeyword) ||
            app.code?.toLowerCase().includes(lowerKeyword) ||
            app.description?.toLowerCase().includes(lowerKeyword) ||
            app.ip_address?.toLowerCase().includes(lowerKeyword) ||
            app.server_type?.toLowerCase().includes(lowerKeyword) ||
            app.app_name?.toLowerCase().includes(lowerKeyword) ||
            app.app_version?.toLowerCase().includes(lowerKeyword) ||
            String(meta.agent_id || '').toLowerCase().includes(lowerKeyword) ||
            String(meta.source || '').toLowerCase().includes(lowerKeyword)
          );
        });
      }

      apps.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

      const total = apps.length;
      const data = apps.slice((page - 1) * pageSize, page * pageSize);

      return { data, total };
    } catch (error) {
      console.error('查询Web应用失败:', error);
      return { data: [], total: 0 };
    }
  }

  // ============================================
  // 第三方服务资产查询
  // ============================================

  /**
   * 将中台短信模板数据转换为系统标准 ThirdPartyService 格式
   * 抽象字段：service_type, provider
   * 扩展字段：mbid, mbmc, mbnr, lx, tjsj 等放入 metadata
   */
  private transformSmsTemplate(raw: any): ThirdPartyService {
    const mbid = raw.MBID ?? raw.mbid ?? '';
    const mbmc = raw.MBMC ?? raw.mbmc ?? '';
    const lx = raw.LX ?? raw.lx ?? '';
    const tjsj = raw.TJSJ ?? raw.tjsj ?? '';
    const mbnr = raw.MBNR ?? raw.mbnr ?? '';
    const tstamp = raw.TSTAMP ?? raw.tstamp ?? '';

    return {
      id: `txy-dxmb-${mbid}`,
      system_id: 'unknown',
      asset_type: 'third_party_service',
      category: 'external',
      name: mbmc || `短信模板-${mbid}`,
      code: `txy-dxmb-${mbid}`,
      status: 'active',
      service_type: '短信模板',
      provider: '腾讯云',
      description: `短信模板: ${mbmc}${lx ? ` (${lx})` : ''}`,
      created_at: this.formatTimestamp(tjsj || tstamp),
      updated_at: this.formatTimestamp(tstamp),
      metadata: {
        mbid: mbid || undefined,
        mbmc: mbmc || undefined,
        mbnr: mbnr || undefined,
        lx: lx || undefined,
        tjsj: tjsj || undefined,
      },
    } as ThirdPartyService;
  }

  /**
   * 查询第三方服务资产列表
   * 目前仅包含腾讯云短信模板数据，后续可扩展其他数据源
   */
  private async queryThirdPartyServices(
    params: {
      keyword?: string;
      status?: AssetStatus;
      page?: number;
      pageSize?: number;
    }
  ): Promise<PaginatedResult<ITAsset>> {
    const { keyword, page = 1, pageSize = 10 } = params;

    try {
      const hasLocalFilters = !!keyword;
      const apiPage = hasLocalFilters ? 1 : page;
      const apiPerPage = hasLocalFilters ? 10000 : pageSize;

      const result = await this.callApi('/open_api/customization/tynugxggfwtxydxwgdxmbxx/full', {
        page: apiPage,
        per_page: apiPerPage,
      });

      let services: ITAsset[] = (result?.data || []).map((raw: any) => this.transformSmsTemplate(raw));

      if (keyword) {
        const lowerKeyword = keyword.toLowerCase();
        services = services.filter((s) =>
          s.name?.toLowerCase().includes(lowerKeyword) ||
          s.code?.toLowerCase().includes(lowerKeyword) ||
          s.description?.toLowerCase().includes(lowerKeyword)
        );
      }

      const total = services.length;
      const data = services.slice((page - 1) * pageSize, page * pageSize);

      return { data, total };
    } catch (error) {
      console.error('查询第三方服务失败:', error);
      return { data: [], total: 0 };
    }
  }

  // ============================================
  // 运维访问控制（堡垒机）资产查询
  // ============================================

  /**
   * 将中台堡垒机明细数据转换为系统标准 OpsAccessControl 格式
   * 抽象字段：source, controller_type, target_type, ip_address, hostname, access_protocol
   * 扩展字段：fzrzh, fzrxm, jysm 等放入 metadata
   */
  private transformBastionHost(raw: any): OpsAccessControl {
    const mc = raw.MC ?? raw.mc ?? '';
    const ipdz = raw.IPDZ ?? raw.ipdz ?? '';
    const zt = raw.ZT ?? raw.zt ?? '';
    const fzrzh = raw.FZRZH ?? raw.fzrzh ?? '';
    const fzrxm = raw.FZRXM ?? raw.fzrxm ?? '';
    const jysm = raw.JYSM ?? raw.jysm ?? '';
    const tstamp = raw.TSTAMP ?? raw.tstamp ?? '';

    // 使用 MC（名称）作为唯一标识（中台主键）
    const id = `bastion-${mc}`;

    // 映射状态
    const status = this.mapDeviceStatus(zt);

    return {
      id,
      system_id: 'unknown',
      asset_type: 'ops_access_control',
      category: 'operations',
      name: mc || ipdz || id,
      code: id,
      status,
      description: jysm || undefined,
      source: 'bastion',
      controller_type: 'bastion',
      target_type: 'virtual_machine', // 默认虚拟机，具体类型需要其他数据源补充
      ip_address: ipdz || undefined,
      hostname: mc || undefined,
      access_protocol: 'SSH', // 堡垒机默认 SSH，具体协议需要其他数据源补充
      created_at: this.formatTimestamp(tstamp),
      updated_at: this.formatTimestamp(tstamp),
      metadata: {
        fzrzh: fzrzh || undefined,
        fzrxm: fzrxm || undefined,
        jysm: jysm || undefined,
        zt: zt || undefined,
      },
    } as OpsAccessControl;
  }

  /**
   * 查询运维访问控制资产列表（堡垒机数据源）
   * 中台接口：/open_api/customization/tynugxggfwbljbljmx/full
   */
  private async queryOpsAccessControl(
    params: {
      keyword?: string;
      status?: AssetStatus;
      page?: number;
      pageSize?: number;
    }
  ): Promise<PaginatedResult<ITAsset>> {
    const { keyword, page = 1, pageSize = 10 } = params;

    try {
      const hasLocalFilters = !!keyword;
      const apiPage = hasLocalFilters ? 1 : page;
      const apiPerPage = hasLocalFilters ? 10000 : pageSize;

      const result = await this.callApi('/open_api/customization/tynugxggfwbljbljmx/full', {
        page: apiPage,
        per_page: apiPerPage,
      });

      let assets: ITAsset[] = (result?.data || []).map((raw: any) => this.transformBastionHost(raw));

      if (keyword) {
        const lowerKeyword = keyword.toLowerCase();
        assets = assets.filter((a) =>
          a.name?.toLowerCase().includes(lowerKeyword) ||
          a.code?.toLowerCase().includes(lowerKeyword) ||
          (a as OpsAccessControl).ip_address?.toLowerCase().includes(lowerKeyword) ||
          (a as OpsAccessControl).hostname?.toLowerCase().includes(lowerKeyword) ||
          a.description?.toLowerCase().includes(lowerKeyword)
        );
      }

      assets.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

      const total = assets.length;
      const data = assets.slice((page - 1) * pageSize, page * pageSize);

      return { data, total };
    } catch (error) {
      console.error('查询运维访问控制资产失败:', error);
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
    const { keyword, status, page = 1, pageSize = 10 } = params;

    try {
      // 如果存在本地过滤条件（关键词、状态、上级系统），先拉取较多数据再本地过滤
      const hasLocalFilters = !!(keyword || status || params.department || params.parent);
      const apiPage = hasLocalFilters ? 1 : page;
      const apiPerPage = hasLocalFilters ? 10000 : pageSize;

      const result = await this.callApi('/open_api/customization/tdwsgxggfwxxxtbaxxmx/full', {
        page: apiPage,
        per_page: apiPerPage,
      });

      let systems: InformationSystem[] = (result?.data || []).map((raw: any) => this.transformSystem(raw));

      // 解析上级系统名称：通过 id -> name 映射表填充 parent_name
      if (systems.length > 0) {
        const idToNameMap = new Map(systems.map((s) => [s.id, s.name]));
        systems = systems.map((s) => ({
          ...s,
          parent_name: s.parent_id ? idToNameMap.get(s.parent_id) || s.parent_id : undefined,
        }));
      }

      if (status) {
        systems = systems.filter((s) => s.status === status);
      }
      if (params.department) {
        systems = systems.filter((s) => s.owner_department === params.department);
      }
      if (params.parent) {
        const lowerParent = params.parent.toLowerCase();
        systems = systems.filter(
          (s) =>
            s.parent_id?.toLowerCase().includes(lowerParent) ||
            s.parent_name?.toLowerCase().includes(lowerParent)
        );
      }

      if (keyword) {
        const lowerKeyword = keyword.toLowerCase();
        systems = systems.filter(
          (s) =>
            s.name?.toLowerCase().includes(lowerKeyword) ||
            s.code?.toLowerCase().includes(lowerKeyword) ||
            s.description?.toLowerCase().includes(lowerKeyword) ||
            s.owner?.toLowerCase().includes(lowerKeyword) ||
            s.owner_department?.toLowerCase().includes(lowerKeyword) ||
            s.parent_name?.toLowerCase().includes(lowerKeyword)
        );
      }

      // 按名称排序
      systems.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

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
      const system = list[0] ? this.transformSystem(list[0]) : null;

      // 解析上级系统名称
      if (system?.parent_id) {
        try {
          const parentResult = await this.callApi('/open_api/customization/tdwsgxggfwxxxtbaxxmx/full', {
            WYBS: system.parent_id,
            page: 1,
            per_page: 1,
          });
          const parentData = parentResult?.data?.[0];
          if (parentData) {
            system.parent_name = parentData.XXXTMC ?? parentData.xxxtmc ?? system.parent_id;
          }
        } catch {
          // 静默失败，parent_name 保持为 ID
        }
      }

      return system;
    } catch (error) {
      console.error('查询信息系统详情失败:', error);
      return null;
    }
  }

  // ============================================
  // 资产查询
  // 中台提供：域名、DNS记录、物理设备数据
  // ============================================

  /**
   * 查询资产列表
   */
  async queryAssets(params: QueryAssetsParams): Promise<PaginatedResult<ITAsset>> {
    const { asset_type, category, system_id, keyword, status, page = 1, pageSize = 10 } = params;

    // 中台当前提供域名、DNS记录、物理设备、虚拟机、Web 应用、第三方服务和运维访问控制接口
    const allowedTypes = ['domain', 'dns_record', 'physical_device', 'virtual_machine', 'web_server', 'web_app', 'third_party_service', 'ops_access_control'];
    const requestedInfra = !asset_type && category === 'infrastructure';
    const requestedNetwork = !asset_type && category === 'network';
    const requestedApplication = !asset_type && category === 'application';
    const requestedExternal = !asset_type && category === 'external';
    const requestedOperations = !asset_type && category === 'operations';
    const isAllowedType = !asset_type || allowedTypes.includes(asset_type);

    if (!isAllowedType) {
      return { data: [], total: 0 };
    }

    const fetchAll =
      category === 'infrastructure' ||
      category === 'network' ||
      category === 'application' ||
      category === 'external' ||
      category === 'operations' ||
      !category;

    // 查询物理设备资产
    let physicalDevices: ITAsset[] = [];
    if (!asset_type || asset_type === 'physical_device' || requestedInfra || fetchAll) {
      const deviceResult = await this.queryPhysicalDevices({ system_id, keyword, status, page: 1, pageSize: 10000 });
      physicalDevices = deviceResult.data;
      if (system_id) {
        physicalDevices = physicalDevices.filter((d) => d.system_id === system_id);
      }
      if (status) {
        physicalDevices = physicalDevices.filter((d) => d.status === status);
      }
    }

    // 查询虚拟机资产
    let virtualMachines: ITAsset[] = [];
    if (!asset_type || asset_type === 'virtual_machine' || requestedInfra || fetchAll) {
      const vmResult = await this.queryVirtualMachines({ system_id, keyword, status, page: 1, pageSize: 10000 });
      virtualMachines = vmResult.data;
      if (system_id) {
        virtualMachines = virtualMachines.filter((v) => v.system_id === system_id);
      }
      if (status) {
        virtualMachines = virtualMachines.filter((v) => v.status === status);
      }
    }

    // 查询域名资产
    let domains: ITAsset[] = [];
    if (!asset_type || asset_type === 'domain' || requestedNetwork || fetchAll) {
      const domainResult = await this.queryDomains({ system_id, keyword, status, page: 1, pageSize: 10000 });
      domains = domainResult.data;
    }

    // 查询 DNS 记录资产
    let dnsRecords: ITAsset[] = [];
    if (!asset_type || asset_type === 'dns_record' || requestedNetwork || fetchAll) {
      const dnsResult = await this.queryDNSRecords();
      dnsRecords = this.convertDNSRecordsToAssets(dnsResult.data, domains);
      if (system_id) {
        dnsRecords = dnsRecords.filter((r) => r.system_id === system_id);
      }
      if (status) {
        dnsRecords = dnsRecords.filter((r) => r.status === status);
      }
      if (keyword) {
        const lower = keyword.toLowerCase();
        dnsRecords = dnsRecords.filter(
          (r) =>
            r.name?.toLowerCase().includes(lower) ||
            r.description?.toLowerCase().includes(lower) ||
            r.status?.toLowerCase().includes(lower)
        );
      }
    }

    // 查询 Web 服务器资产（中台称 Web 应用）
    let webServers: ITAsset[] = [];
    if (!asset_type || asset_type === 'web_server' || requestedApplication || fetchAll) {
      const webServerResult = await this.queryWebServers({ keyword, status, page: 1, pageSize: 10000 });
      webServers = webServerResult.data;
      if (system_id) {
        webServers = webServers.filter((s) => s.system_id === system_id);
      }
      if (status) {
        webServers = webServers.filter((s) => s.status === status);
      }
    }

    // 查询 Web 应用资产
    let webApps: ITAsset[] = [];
    if (!asset_type || asset_type === 'web_app' || requestedApplication || fetchAll) {
      const webAppResult = await this.queryWebApps({ keyword, status, page: 1, pageSize: 10000 });
      webApps = webAppResult.data as unknown as ITAsset[];
      if (system_id) {
        webApps = webApps.filter((s) => s.system_id === system_id);
      }
    }

    // 查询第三方服务资产
    let thirdPartyServices: ITAsset[] = [];
    if (!asset_type || asset_type === 'third_party_service' || requestedExternal || fetchAll) {
      const tpsResult = await this.queryThirdPartyServices({ keyword, status, page: 1, pageSize: 10000 });
      thirdPartyServices = tpsResult.data;
      if (system_id) {
        thirdPartyServices = thirdPartyServices.filter((s) => s.system_id === system_id);
      }
    }

    // 查询运维访问控制资产（堡垒机数据源）
    let opsAccessControls: ITAsset[] = [];
    if (!asset_type || asset_type === 'ops_access_control' || requestedOperations || fetchAll) {
      const oacResult = await this.queryOpsAccessControl({ keyword, status, page: 1, pageSize: 10000 });
      opsAccessControls = oacResult.data;
      if (system_id) {
        opsAccessControls = opsAccessControls.filter((a) => a.system_id === system_id);
      }
    }

    let assets = [...physicalDevices, ...virtualMachines, ...domains, ...dnsRecords, ...webServers, ...webApps, ...thirdPartyServices, ...opsAccessControls];

    // 按资产类型过滤
    if (asset_type) {
      assets = assets.filter((a) => a.asset_type === asset_type);
    }

    // 按分层过滤
    if (category) {
      assets = assets.filter((a) => a.category === category);
    }

    assets.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

    const total = assets.length;
    const data = assets.slice((page - 1) * pageSize, page * pageSize);

    return { data, total };
  }

  /**
   * 将 DNS 记录详情转换为 ITAsset，并关联所属系统
   */
  private convertDNSRecordsToAssets(records: DNSRecordDetail[], domains: ITAsset[]): ITAsset[] {
    const domainToSystemId = new Map(
      domains.map((d) => [this.normalizeDomain((d as any).domain), d.system_id])
    );

    return records.map((record) => {
      const domainStatus = this.mapDomainStatus(record.domain_status);
      return {
        id: record.id,
        system_id: domainToSystemId.get(this.normalizeDomain(record.domain)) || 'unknown',
        asset_type: 'dns_record',
        category: 'network',
        name: `${record.record_type} - ${record.domain}`,
        status: domainStatus,
        description: `记录值: ${record.record_value}`,
        tags: ['dns', record.record_type],
        metadata: {
          ttl: record.ttl,
          record_value: record.record_value,
          reverse_domain: record.reverse_domain,
          audit_status: record.audit_status,
        },
        created_at: record.created_at || '2024-01-01T00:00:00Z',
        updated_at: record.updated_at || '2024-01-01T00:00:00Z',
      } as ITAsset;
    });
  }

  /**
   * 根据 ID 查询资产
   * 根据 assetType 确定查询哪个接口
   */
  async queryAssetById(id: string, assetType?: AssetType): Promise<ITAsset | null> {
    try {
      // 如果指定了类型，直接查询对应接口
      if (assetType === 'physical_device') {
        const deviceResult = await this.callApi('/open_api/customization/tdwsgxggfwwlsbxxmx/full', {
          WYBS: id,
          page: 1,
          per_page: 1,
        });
        const deviceList = deviceResult?.data || [];
        if (deviceList[0]) {
          return this.transformPhysicalDevice(deviceList[0]);
        }
        return null;
      }

      // 虚拟机详情查询
      if (assetType === 'virtual_machine') {
        try {
          const result = await this.callApi('/open_api/customization/tdwsgxggfwxnjxxmx/full', {
            WYBS: id,
            page: 1,
            per_page: 1,
          });
          const vmList = result?.data || [];
          if (vmList[0]) {
            return this.transformVirtualMachine(vmList[0]);
          }
          return null;
        } catch (error) {
          console.error('查询虚拟机详情失败:', error);
          return null;
        }
      }

      // Web 服务器类资产
      // id 格式为 "ip@@server_type"
      if (assetType === 'web_server') {
        // 先尝试解码，处理 URL 编码问题
        let decodedId = id;
        try {
          decodedId = decodeURIComponent(id);
        } catch {
          // 已经是解码后的格式
        }
        const [ip, serverType] = decodedId.split('@@');
        console.log(`[YnuProvider] Web服务器详情查询: id=${id}, decodedId=${decodedId}, ip=${ip}, serverType=${serverType}`);
        if (!ip || !serverType) {
          console.warn('[YnuProvider] Web服务器详情查询: id 格式不正确');
          return null;
        }

        // 策略1: 先按 IP 地址查询，再在内存中按 server_type 筛选
        try {
          const webServerResult = await this.callApi('/open_api/customization/tynugxggfwedrwebyyxx/full', {
            IPDZ: ip,
            page: 1,
            per_page: 10000,
          });
          const rawData = webServerResult?.data || [];
          console.log(`[YnuProvider] 策略1: 按IP查询返回${rawData.length}条记录`);
          if (rawData.length > 0) {
            console.log('[YnuProvider] 第一条记录:', JSON.stringify(rawData[0]));
          }
          const webServerList: WebServer[] = rawData
            .map((raw: any) => this.transformWebServer(raw))
            .filter((app: WebServer) => {
              const match = app.server_type === serverType;
              console.log(`[YnuProvider] 过滤: app.server_type=${app.server_type} === ${serverType} => ${match}`);
              return match;
            });
          console.log(`[YnuProvider] 策略1: 过滤后${webServerList.length}条`);
          if (webServerList.length > 0) {
            const result = this.buildWebServerFromApps(webServerList);
            console.log(`[YnuProvider] 策略1: buildWebServerFromApps返回${result ? '有数据' : 'null'}`);
            return result;
          }
        } catch (err) {
          console.error('[YnuProvider] 策略1异常:', err);
        }

        // 策略2: 回退到全量查询后筛选
        try {
          console.log(`[YnuProvider] 策略2: 全量查询回退`);
          const allResult = await this.callApi('/open_api/customization/tynugxggfwedrwebyyxx/full', {
            page: 1,
            per_page: 10000,
          });
          const allApps: WebServer[] = (allResult?.data || []).map((raw: any) =>
            this.transformWebServer(raw)
          );
          console.log(`[YnuProvider] 策略2: 全量查询返回${allApps.length}条`);
          const matchedApps = allApps.filter(
            (app: WebServer) => app.ip_address === ip && app.server_type === serverType
          );
          console.log(`[YnuProvider] 策略2: 筛选后${matchedApps.length}条`);
          const result = this.buildWebServerFromApps(matchedApps);
          console.log(`[YnuProvider] 策略2: buildWebServerFromApps返回${result ? '有数据' : 'null'}`);
          return result;
        } catch (err) {
          console.error('[YnuProvider] 策略2异常:', err);
          return null;
        }
      }

      // Web 应用详情查询
      if (assetType === 'web_app') {
        try {
          // 按 WYBS（唯一标识_校标）查询
          const result = await this.callApi('/open_api/customization/tynugxggfwedrwebyyxx/full', {
            WYBS: id,
            page: 1,
            per_page: 10000,
          });
          const rawData = result?.data || [];
          if (rawData.length > 0) {
            return this.transformWebApp(rawData[0]);
          }

          // 如果没找到，回退到全量查询
          console.log(`[YnuProvider] Web应用详情: 按WYBS未找到，回退到全量查询`);
          const allResult = await this.callApi('/open_api/customization/tynugxggfwedrwebyyxx/full', {
            page: 1,
            per_page: 10000,
          });
          const allApps = (allResult?.data || []).map((raw: any) => this.transformWebApp(raw));
          const matched = allApps.find((app: WebApp) => app.id === id);
          if (matched) {
            return matched;
          }
          return null;
        } catch (error) {
          console.error('查询Web应用详情失败:', error);
          return null;
        }
      }

      // 第三方服务详情查询
      if (assetType === 'third_party_service') {
        try {
          // 短信模板类：id 格式为 "txy-dxmb-{MBID}"
          if (id.startsWith('txy-dxmb-')) {
            const mbid = id.substring('txy-dxmb-'.length);
            const result = await this.callApi('/open_api/customization/tynugxggfwtxydxwgdxmbxx/full', {
              MBID: mbid,
              page: 1,
              per_page: 10000,
            });
            const rawData = result?.data || [];
            if (rawData.length > 0) {
              return this.transformSmsTemplate(rawData[0]);
            }
          }
          return null;
        } catch (error) {
          console.error('查询第三方服务详情失败:', error);
          return null;
        }
      }

      // 运维访问控制详情查询（堡垒机数据源）
      if (assetType === 'ops_access_control') {
        try {
          // id 格式为 "bastion-{mc}"，MC 是中台主键
          if (id.startsWith('bastion-')) {
            const mc = id.substring('bastion-'.length);
            const result = await this.callApi('/open_api/customization/tynugxggfwbljbljmx/full', {
              page: 1,
              per_page: 10000,
            });
            const rawData = result?.data || [];
            const matched = rawData.find((raw: any) => {
              const rawMc = raw.MC ?? raw.mc ?? '';
              return rawMc === mc;
            });
            if (matched) {
              return this.transformBastionHost(matched);
            }
          }
          return null;
        } catch (error) {
          console.error('查询运维访问控制详情失败:', error);
          return null;
        }
      }

      // 域名类资产
      if (!assetType || assetType === 'domain') {
        const domainResult = await this.callApi('/open_api/customization/tdwsgxggfwdnsymxxmx/full', {
          WYBS: id,
          page: 1,
          per_page: 1,
        });
        const domainList = domainResult?.data || [];
        if (domainList[0]) {
          return this.transformDomain(domainList[0]);
        }
        // 如果没找到域名，再尝试物理设备
        const deviceResult = await this.callApi('/open_api/customization/tdwsgxggfwwlsbxxmx/full', {
          WYBS: id,
          page: 1,
          per_page: 1,
        });
        const deviceList = deviceResult?.data || [];
        if (deviceList[0]) {
          return this.transformPhysicalDevice(deviceList[0]);
        }
        // 再尝试虚拟机
        const vmResult = await this.callApi('/open_api/customization/tdwsgxggfwxnjxxmx/full', {
          WYBS: id,
          page: 1,
          per_page: 1,
        });
        const vmList = vmResult?.data || [];
        if (vmList[0]) {
          return this.transformVirtualMachine(vmList[0]);
        }
        return null;
      }

      // 其他类型暂不支持
      return null;
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
   * 判断资产是否处于运行/活跃状态
   */
  private isAssetRunning(asset: ITAsset): boolean {
    return asset.status === 'active';
  }

  /**
   * 查询系统资产统计
   */
  async querySystemAssetStats(systemId: string): Promise<SystemAssetStats> {
    // 获取该系统下所有类型的资产
    const allResult = await this.queryAssets({ system_id: systemId, pageSize: 10000 });
    const assets = allResult.data;
    const total = assets.length;
    const active_total = assets.filter((a) => this.isAssetRunning(a)).length;

    const byTypeMap = new Map<
      AssetType,
      { category: AssetCategory; label: string; count: number; active_count: number }
    >();
    const by_category: Record<AssetCategory, number> = {
      infrastructure: 0,
      network: 0,
      data: 0,
      application: 0,
      software: 0,
      operations: 0,
      external: 0,
    };
    const by_category_active: Record<AssetCategory, number> = {
      infrastructure: 0,
      network: 0,
      data: 0,
      application: 0,
      software: 0,
      operations: 0,
      external: 0,
    };

    for (const asset of assets) {
      const running = this.isAssetRunning(asset);

      by_category[asset.category] = (by_category[asset.category] || 0) + 1;
      if (running) {
        by_category_active[asset.category] = (by_category_active[asset.category] || 0) + 1;
      }

      const meta = ASSET_TYPE_META[asset.asset_type];
      if (!byTypeMap.has(asset.asset_type)) {
        byTypeMap.set(asset.asset_type, {
          category: asset.category,
          label: meta?.label || asset.asset_type,
          count: 0,
          active_count: 0,
        });
      }
      const stat = byTypeMap.get(asset.asset_type)!;
      stat.count += 1;
      if (running) {
        stat.active_count += 1;
      }
    }

    const by_type = Array.from(byTypeMap.entries()).map(([asset_type, stat]) => ({
      asset_type,
      ...stat,
    }));

    return {
      total,
      active_total,
      by_type,
      by_category,
      by_category_active,
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

  // ============================================
  // DNS 记录查询
  // ============================================

  /**
   * 标准化域名字符串，去除末尾的点号
   * 中台 DNS 记录接口（JLYM）返回的域名末尾可能带 "."，与域名接口不一致
   */
  private normalizeDomain(domain?: string): string {
    if (!domain) return '';
    return domain.replace(/\.+$/, '');
  }

  /**
   * 将中台返回的 DNS 记录数据转换为系统标准格式
   */
  private transformDNSRecord(raw: any): DNSRecordDetail {
    return {
      id: raw.WYBS ?? raw.wybs ?? '',
      domain: raw.JLYM ?? raw.jlym ?? '',
      record_type: raw.JLLX ?? raw.jllx ?? '',
      network_category: raw.WLLB ?? raw.wllb ?? undefined,
      ttl: raw.TTL ?? raw.ttl ?? undefined,
      record_value: raw.JLZ ?? raw.jlz ?? undefined,
      reverse_domain: raw.FXJXYM ?? raw.fxjxym ?? undefined,
      domain_status: raw.YMZT ?? raw.ymzt ?? undefined,
      audit_status: raw.SHZT ?? raw.shzt ?? undefined,
      expiry_date: this.formatTimestamp(raw.GQSJ ?? raw.gqsj),
      expiry_policy: raw.DQCL ?? raw.dqcl ?? undefined,
      created_at: this.formatTimestamp(raw.CJSJ ?? raw.cjsj),
      enable_validity: raw.SFQYYXQ ?? raw.sfqyyxq ?? undefined,
      remark: raw.BZ ?? raw.bz ?? undefined,
      updated_at: this.formatTimestamp(raw.TSTAMP ?? raw.tstamp),
    };
  }

  /**
   * 查询 DNS 记录列表
   * 中台接口：/open_api/customization/_hotel/full
   */
  async queryDNSRecords(domain?: string): Promise<PaginatedResult<DNSRecordDetail>> {
    try {
      const result = await this.callApi('/open_api/customization/_hotel/full', {
        page: 1,
        per_page: 10000,
      });

      let records: DNSRecordDetail[] = (result?.data || []).map((raw: any) => this.transformDNSRecord(raw));

      if (domain) {
        const lowerDomain = this.normalizeDomain(domain).toLowerCase();
        records = records.filter((r) => this.normalizeDomain(r.domain).toLowerCase() === lowerDomain);
      }

      return { data: records, total: records.length };
    } catch (error) {
      console.error('查询 DNS 记录失败:', error);
      return { data: [], total: 0 };
    }
  }

  /**
   * 根据 ID 查询 DNS 记录详情
   */
  async queryDNSRecordById(id: string): Promise<DNSRecordDetail | null> {
    try {
      const result = await this.callApi('/open_api/customization/_hotel/full', {
        WYBS: id,
        page: 1,
        per_page: 1,
      });
      const list = result?.data || [];
      return list[0] ? this.transformDNSRecord(list[0]) : null;
    } catch (error) {
      console.error('查询 DNS 记录详情失败:', error);
      return null;
    }
  }

  /**
   * 查询指定 Web 服务器关联的 Web 应用列表
   * 通过 IP 地址和服务器类型关联
   */
  async queryWebAppsByServer(ipAddress: string, serverType: string): Promise<PaginatedResult<WebApp>> {
    try {
      // 策略1: 先按 IP 地址查询，再在内存中按 server_type 筛选
      const result = await this.callApi('/open_api/customization/tynugxggfwedrwebyyxx/full', {
        IPDZ: ipAddress,
        page: 1,
        per_page: 10000,
      });

      let apps: WebApp[] = (result?.data || []).map((raw: any) => this.transformWebApp(raw));

      // 按 server_type 过滤
      if (serverType) {
        apps = apps.filter((app) => app.server_type === serverType);
      }

      apps.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

      return { data: apps, total: apps.length };
    } catch (error) {
      console.error(`查询Web服务器关联应用失败 (ip=${ipAddress}, server=${serverType}):`, error);
      return { data: [], total: 0 };
    }
  }
}
