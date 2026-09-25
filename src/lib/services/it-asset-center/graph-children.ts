/**
 * IT资产中心 - 资源图谱子节点查询
 *
 * 公共模块：定义各类资产节点之间的关联关系。
 * 资源图谱前端和合规巡检后端都复用此模块，确保关联逻辑完全一致。
 */

import type {
  IItAssetDataProvider,
  ITAsset,
  AssetType,
} from '@/lib/services/it-asset-center';

// ============================================
// 类型定义
// ============================================

/** 图谱节点（前端/后端通用） */
export interface GraphNode {
  id: string;
  node_type: string;
  name: string;
  status?: string;
  key_fields: Record<string, string | undefined>;
}

// ============================================
// 辅助函数
// ============================================

/** 域名归一化：去末尾点号 + 转小写 */
export function normalizeDomain(domain: string): string {
  return domain.replace(/\.+$/, '').toLowerCase();
}

/** ITAsset → GraphNode 转换 */
export function assetToGraphNode(asset: ITAsset): GraphNode {
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

// ============================================
// 核心函数：获取一个节点的所有子节点
// ============================================

/**
 * 获取指定图谱节点的所有直接子节点
 *
 * 根据 node_type 走不同的关联分支：
 * - information_system → 子系统 + system_id 关联资产
 * - domain → DNS 记录 + Web 站点监控（域名匹配）
 * - virtual_machine / physical_device → Web 服务器 + 运维访问控制 + 备份策略 + 数据库（IP 匹配）
 * - web_server → Web 应用（复合键）+ Web 站点监控（IP 匹配）
 * - web_site_monitor → Web 服务器（IP 匹配）
 * - port_monitor → Web 服务器（IP 匹配）
 * - 其他类型 → 无子节点
 */
export async function fetchGraphChildrenForNode(
  provider: IItAssetDataProvider,
  nodeId: string,
  nodeType: string
): Promise<GraphNode[]> {
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

    // 2. 直接关联的资产（按 system_id 匹配，排除 dns_record）
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
        // 3. 备份策略（通过 target_host 包含当前 IP）
        const bkResult = await provider.queryAssets({
          asset_type: 'backup' as AssetType,
          keyword: ip,
          page: 1,
          pageSize: 100,
        });
        for (const item of bkResult.data) {
          const targetHost = (item as any).target_host || '';
          const ipList = targetHost.split(',').map((s: string) => s.trim()).filter(Boolean);
          if (ipList.includes(ip)) {
            children.push(assetToGraphNode(item));
          }
        }
        // 4. 数据库（通过 host 字段 IP 匹配）
        const dbResult = await provider.queryAssets({
          asset_type: 'database' as AssetType,
          keyword: ip,
          page: 1,
          pageSize: 100,
        });
        for (const item of dbResult.data) {
          if ((item as any).host === ip) {
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

  // 全局去重
  const seen = new Set<string>();
  const sep = '::';
  const uniqueChildren: GraphNode[] = [];
  for (const child of children) {
    const gid = `${child.node_type}${sep}${child.id}`;
    if (!seen.has(gid)) {
      seen.add(gid);
      uniqueChildren.push(child);
    }
  }

  return uniqueChildren;
}