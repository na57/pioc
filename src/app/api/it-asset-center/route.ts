import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { createItAssetDataProvider } from '@/lib/services/it-asset-center/factory';
import {
  InformationSystem,
  ITAsset,
  AssetRelationship,
  SystemAssetStats,
  AssetType,
  AssetCategory,
  DNSRecordDetail,
  WebApp,
} from '@/lib/services/it-asset-center';

const appUrl = '/it-asset-center';

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * GET /api/it-asset-center?action=xxx&...
 * 统一 API 路由处理 IT 资产中心相关请求
 */
async function getHandler(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const provider = await createItAssetDataProvider();
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    switch (action) {
      case 'systems':
        return await handleSystems(searchParams, provider);
      case 'system-detail':
        return await handleSystemDetail(searchParams, provider);
      case 'assets':
        return await handleAssets(searchParams, provider);
      case 'asset-detail':
        return await handleAssetDetail(searchParams, provider);
      case 'system-assets':
        return await handleSystemAssets(searchParams, provider);
      case 'system-stats':
        return await handleSystemStats(searchParams, provider);
      case 'asset-relationships':
        return await handleAssetRelationships(searchParams, provider);
      case 'asset-types':
        return await handleAssetTypes(provider);
      case 'departments':
        return await handleDepartments(provider);
      case 'dns-records':
        return await handleDNSRecords(searchParams, provider);
      case 'web-apps-by-server':
        return await handleWebAppsByServer(searchParams, provider);
      case 'graph-children':
        return await handleGraphChildren(searchParams, provider);
      default:
        return NextResponse.json(
          { success: false, error: '未知的 action 参数' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('IT资产中心API错误:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

interface SystemListResponse {
  data: InformationSystem[];
  total: number;
  page: number;
  per_page: number;
}

async function handleSystems(
  searchParams: URLSearchParams,
  provider: any
): Promise<NextResponse<ApiResponse<SystemListResponse>>> {
  const keyword = searchParams.get('keyword') || undefined;
  const status = (searchParams.get('status') as InformationSystem['status']) || undefined;
  const department = searchParams.get('department') || undefined;
  const parent = searchParams.get('parent') || undefined;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const per_page = parseInt(searchParams.get('per_page') || '10', 10);

  const result = await provider.querySystems({ keyword, status, department, parent, page, pageSize: per_page });

  return NextResponse.json({
    success: true,
    data: {
      data: result.data,
      total: result.total,
      page,
      per_page,
    },
  });
}

async function handleSystemDetail(
  searchParams: URLSearchParams,
  provider: any
): Promise<NextResponse<ApiResponse<{ system: InformationSystem | null }>>> {
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json(
      { success: false, error: '缺少 id 参数' },
      { status: 400 }
    );
  }

  const system = await provider.querySystemById(id);
  return NextResponse.json({
    success: true,
    data: { system },
  });
}

interface AssetListResponse {
  data: ITAsset[];
  total: number;
  page: number;
  per_page: number;
}

async function handleAssets(
  searchParams: URLSearchParams,
  provider: any
): Promise<NextResponse<ApiResponse<AssetListResponse>>> {
  const keyword = searchParams.get('keyword') || undefined;
  const system_id = searchParams.get('system_id') || undefined;
  const asset_type = (searchParams.get('asset_type') as AssetType) || undefined;
  const category = (searchParams.get('category') as AssetCategory) || undefined;
  const status = (searchParams.get('status') as ITAsset['status']) || undefined;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const per_page = parseInt(searchParams.get('per_page') || '10', 10);

  const result = await provider.queryAssets({
    keyword,
    system_id,
    asset_type,
    category,
    status,
    page,
    pageSize: per_page,
  });

  return NextResponse.json({
    success: true,
    data: {
      data: result.data,
      total: result.total,
      page,
      per_page,
    },
  });
}

async function handleAssetDetail(
  searchParams: URLSearchParams,
  provider: any
): Promise<NextResponse<ApiResponse<{ asset: ITAsset | DNSRecordDetail | null }>>> {
  const id = searchParams.get('id');
  const assetType = searchParams.get('asset_type');
  if (!id) {
    return NextResponse.json(
      { success: false, error: '缺少 id 参数' },
      { status: 400 }
    );
  }

  if (assetType === 'dns_record') {
    const dnsRecord = await provider.queryDNSRecordById(id);
    return NextResponse.json({
      success: true,
      data: { asset: dnsRecord },
    });
  }

  const asset = await provider.queryAssetById(id, assetType as AssetType);
  return NextResponse.json({
    success: true,
    data: { asset },
  });
}

async function handleSystemAssets(
  searchParams: URLSearchParams,
  provider: any
): Promise<NextResponse<ApiResponse<AssetListResponse>>> {
  const systemId = searchParams.get('system_id');
  if (!systemId) {
    return NextResponse.json(
      { success: false, error: '缺少 system_id 参数' },
      { status: 400 }
    );
  }

  const asset_type = (searchParams.get('asset_type') as AssetType) || undefined;
  const category = (searchParams.get('category') as AssetCategory) || undefined;
  const status = (searchParams.get('status') as ITAsset['status']) || undefined;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const per_page = parseInt(searchParams.get('per_page') || '10', 10);

  const result = await provider.queryAssetsBySystemId(systemId, {
    asset_type,
    category,
    status,
    page,
    pageSize: per_page,
  });

  return NextResponse.json({
    success: true,
    data: {
      data: result.data,
      total: result.total,
      page,
      per_page,
    },
  });
}

async function handleSystemStats(
  searchParams: URLSearchParams,
  provider: any
): Promise<NextResponse<ApiResponse<SystemAssetStats>>> {
  const systemId = searchParams.get('system_id');
  if (!systemId) {
    return NextResponse.json(
      { success: false, error: '缺少 system_id 参数' },
      { status: 400 }
    );
  }

  const stats = await provider.querySystemAssetStats(systemId);
  return NextResponse.json({
    success: true,
    data: stats,
  });
}

async function handleAssetRelationships(
  searchParams: URLSearchParams,
  provider: any
): Promise<NextResponse<ApiResponse<{ relationships: AssetRelationship[] }>>> {
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json(
      { success: false, error: '缺少 id 参数' },
      { status: 400 }
    );
  }

  const relationships = await provider.queryAssetRelationships(id);
  return NextResponse.json({
    success: true,
    data: { relationships },
  });
}

async function handleAssetTypes(
  provider: any
): Promise<NextResponse<ApiResponse<{ types: { type: AssetType; category: AssetCategory; label: string }[] }>>> {
  const types = await provider.queryAssetTypes();
  return NextResponse.json({
    success: true,
    data: { types },
  });
}

async function handleDepartments(
  provider: any
): Promise<NextResponse<ApiResponse<{ departments: string[] }>>> {
  const departments = await provider.queryDepartments();
  return NextResponse.json({
    success: true,
    data: { departments },
  });
}

interface DNSRecordListResponse {
  data: DNSRecordDetail[];
  total: number;
}

async function handleDNSRecords(
  searchParams: URLSearchParams,
  provider: any
): Promise<NextResponse<ApiResponse<DNSRecordListResponse>>> {
  const domain = searchParams.get('domain') || undefined;
  const result = await provider.queryDNSRecords(domain);
  return NextResponse.json({
    success: true,
    data: {
      data: result.data,
      total: result.total,
    },
  });
}

interface WebAppListResponse {
  data: WebApp[];
  total: number;
}

async function handleWebAppsByServer(
  searchParams: URLSearchParams,
  provider: any
): Promise<NextResponse<ApiResponse<WebAppListResponse>>> {
  const ip = searchParams.get('ip') || '';
  const serverType = searchParams.get('server_type') || '';

  if (!ip || !serverType) {
    return NextResponse.json(
      { success: false, error: '缺少 ip 或 server_type 参数' },
      { status: 400 }
    );
  }

  const result = await provider.queryWebAppsByServer(ip, serverType);
  return NextResponse.json({
    success: true,
    data: {
      data: result.data,
      total: result.total,
    },
  });
}

// ============================================
// 资源图谱 - 子节点查询
// 根据节点类型返回其直接子节点
// ============================================

interface GraphNode {
  id: string;
  node_type: string;
  name: string;
  status?: string;
  key_fields: Record<string, string | undefined>;
}

function assetToGraphNode(asset: ITAsset): GraphNode {
  const a = asset as any;
  return {
    id: asset.id,
    node_type: asset.asset_type,
    name: asset.name,
    status: asset.status,
    key_fields: {
      domain: a.domain,
      ip: a.ip || a.ip_address,
      ip_address: a.ip_address,
      server_type: a.server_type,
      system_id: asset.system_id,
    },
  };
}

function normalizeDomain(domain: string): string {
  return domain.replace(/\.+$/, '').toLowerCase();
}

async function handleGraphChildren(
  searchParams: URLSearchParams,
  provider: any
): Promise<NextResponse<ApiResponse<{ children: GraphNode[] }>>> {
  const nodeId = searchParams.get('node_id');
  const nodeType = searchParams.get('node_type');

  if (!nodeId || !nodeType) {
    return NextResponse.json(
      { success: false, error: '缺少 node_id 或 node_type 参数' },
      { status: 400 }
    );
  }

  const children: GraphNode[] = [];

  if (nodeType === 'information_system') {
    // 1. 子信息系统
    const subSystems = await provider.querySystems({ parent: nodeId, page: 1, pageSize: 1000 });
    for (const sys of subSystems.data) {
      children.push({
        id: sys.id,
        node_type: 'information_system',
        name: sys.name,
        status: sys.status,
        key_fields: {},
      });
    }

    // 2. 直接关联的资产（系统已自动剔除 web_site_monitor/port_monitor/dns_record）
    const assets = await provider.queryAssetsBySystemId(nodeId, { page: 1, pageSize: 1000 });
    for (const asset of assets.data) {
      if (asset.asset_type === 'dns_record') continue;
      children.push(assetToGraphNode(asset));
    }
  } else if (nodeType === 'domain') {
    const asset = await provider.queryAssetById(nodeId, 'domain' as AssetType);
    if (asset) {
      const domain = (asset as any).domain;
      if (domain) {
        // 1. DNS 记录（强关联）
        const dnsResult = await provider.queryDNSRecords(domain);
        for (const dns of dnsResult.data) {
          // DNSRecordDetail 没有 host_record 字段，使用 record_value（记录值，如 IP/CNAME目标）
          // fallback: 若 record_value 也为空则用 domain + record_type
          const recordValue = dns.record_value || dns.domain;
          children.push({
            id: dns.id,
            node_type: 'dns_record',
            name: `${recordValue} (${dns.record_type})`,
            status: 'active',
            key_fields: {},
          });
        }
        // 2. Web 站点监控（域名匹配）
        const normalized = normalizeDomain(domain);
        const wsmResult = await provider.queryAssets({
          asset_type: 'web_site_monitor' as AssetType,
          keyword: normalized,
          page: 1,
          pageSize: 100,
        });
        for (const item of wsmResult.data) {
          const itemDomain = ((item as any).domain || '').toString();
          if (itemDomain && normalizeDomain(itemDomain) === normalized) {
            children.push(assetToGraphNode(item));
          }
        }
      }
    }
  } else if (nodeType === 'physical_device' || nodeType === 'virtual_machine') {
    const asset = await provider.queryAssetById(nodeId, nodeType as AssetType);
    if (asset) {
      const ip = (asset as any).ip || (asset as any).ip_address;
      if (ip) {
        // 1. Web 服务器（IP 精确匹配）
        const wsResult = await provider.queryAssets({
          asset_type: 'web_server' as AssetType,
          keyword: ip,
          page: 1,
          pageSize: 100,
        });
        for (const item of wsResult.data) {
          if ((item as any).ip_address === ip) {
            children.push(assetToGraphNode(item));
          }
        }
        // 2. 运维访问控制（IP 精确匹配）
        const oacResult = await provider.queryAssets({
          asset_type: 'ops_access_control' as AssetType,
          keyword: ip,
          page: 1,
          pageSize: 100,
        });
        for (const item of oacResult.data) {
          if ((item as any).ip_address === ip) {
            children.push(assetToGraphNode(item));
          }
        }
      }
    }
  } else if (nodeType === 'web_server') {
    const asset = await provider.queryAssetById(nodeId, 'web_server' as AssetType);
    if (asset) {
      const ip = (asset as any).ip_address;
      const serverType = (asset as any).server_type;
      if (ip && serverType) {
        // 1. Web 应用（复合键关联）
        const waResult = await provider.queryWebAppsByServer(ip, serverType);
        for (const item of waResult.data) {
          children.push(assetToGraphNode(item as unknown as ITAsset));
        }
        // 2. Web 站点监控（IP 精确匹配）
        const wsmResult = await provider.queryAssets({
          asset_type: 'web_site_monitor' as AssetType,
          keyword: ip,
          page: 1,
          pageSize: 100,
        });
        for (const item of wsmResult.data) {
          if ((item as any).ip === ip) {
            children.push(assetToGraphNode(item));
          }
        }
      }
    }
  } else if (nodeType === 'web_site_monitor') {
    const asset = await provider.queryAssetById(nodeId, 'web_site_monitor' as AssetType);
    if (asset) {
      const domain = (asset as any).domain;
      const ip = (asset as any).ip;
      if (domain) {
        // 1. 域名（域名归一化匹配）
        const normalized = normalizeDomain(domain);
        const domainResult = await provider.queryAssets({
          asset_type: 'domain' as AssetType,
          keyword: normalized,
          page: 1,
          pageSize: 100,
        });
        for (const item of domainResult.data) {
          const itemDomain = ((item as any).domain || '').toString();
          if (itemDomain && normalizeDomain(itemDomain) === normalized) {
            children.push(assetToGraphNode(item));
          }
        }
      }
      if (ip) {
        // 2. Web 服务器（IP 精确匹配）
        const wsResult = await provider.queryAssets({
          asset_type: 'web_server' as AssetType,
          keyword: ip,
          page: 1,
          pageSize: 100,
        });
        for (const item of wsResult.data) {
          if ((item as any).ip_address === ip) {
            children.push(assetToGraphNode(item));
          }
        }
      }
    }
  } else if (nodeType === 'port_monitor') {
    const asset = await provider.queryAssetById(nodeId, 'port_monitor' as AssetType);
    if (asset) {
      const ip = (asset as any).ip;
      if (ip) {
        const wsResult = await provider.queryAssets({
          asset_type: 'web_server' as AssetType,
          keyword: ip,
          page: 1,
          pageSize: 100,
        });
        for (const item of wsResult.data) {
          if ((item as any).ip_address === ip) {
            children.push(assetToGraphNode(item));
          }
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    data: { children },
  });
}

export const GET = createAppProtectedHandler(getHandler, appUrl);
