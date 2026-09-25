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
import { fetchGraphChildrenForNode } from '@/lib/services/it-asset-center/graph-children';
import { query } from '@/lib/database/connection';

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
  data: (InformationSystem & { latestInspectionStatus?: string | null })[];
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

  // 批量查询每个系统的最后一次巡检状态
  if (result.data.length > 0) {
    const systemIds = result.data.map((s: InformationSystem) => s.id);
    const placeholders = systemIds.map(() => '?').join(',');
    const latestRecords = await query<
      Array<{ system_id: string; result_summary: string | null }>
    >(
      `SELECT t.system_id, t.result_summary
       FROM inspection_records t
       INNER JOIN (
         SELECT system_id, MAX(created_at) AS max_created
         FROM inspection_records
         WHERE system_id IN (${placeholders})
         GROUP BY system_id
       ) latest ON t.system_id = latest.system_id AND t.created_at = latest.max_created`,
      systemIds
    );

    // 建立 system_id -> result_summary 的映射
    const statusMap = new Map<string, string | null>();
    for (const record of latestRecords) {
      let overallStatus: string | null = null;
      if (record.result_summary) {
        try {
          const parsed = JSON.parse(record.result_summary);
          overallStatus = parsed.overallStatus || null;
        } catch {
          // 忽略解析失败
        }
      }
      statusMap.set(record.system_id, overallStatus);
    }

    // 附加到每条系统数据上
    const enrichedData = result.data.map((system: InformationSystem) => ({
      ...system,
      latestInspectionStatus: statusMap.get(system.id) ?? null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        data: enrichedData,
        total: result.total,
        page,
        per_page,
      },
    });
  }

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

  const children = await fetchGraphChildrenForNode(provider, nodeId, nodeType);

  return NextResponse.json({
    success: true,
    data: { children },
  });
}

/** 图谱节点类型 */
interface GraphNode {
  id: string;
  node_type: string;
  name: string;
  status?: string;
  key_fields: Record<string, string | undefined>;
}

export const GET = createAppProtectedHandler(getHandler, appUrl);
