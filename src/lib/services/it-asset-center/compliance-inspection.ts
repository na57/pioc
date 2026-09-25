/**
 * IT资产中心 - 合规巡检服务
 *
 * 核心职责：
 * 1. 采集指定信息系统及其子系统的所有资产（BFS递归+并行）
 * 2. 将资产列表生成为自然语言描述文本
 * 3. 推送到配置管理应用，触发合规检查
 *
 * 说明：一阶段只做手动触发，定时任务后续扩展
 */

import { v4 as uuidv4 } from 'uuid';
import { createItAssetDataProvider } from '@/lib/services/it-asset-center/factory';
import { query } from '@/lib/database/connection';
import type {
  IItAssetDataProvider,
  ITAsset,
  InformationSystem,
  AssetType,
  AssetCategory,
} from '@/lib/services/it-asset-center';
import { fetchGraphChildrenForNode } from '@/lib/services/it-asset-center/graph-children';
import { pLimit } from '@/lib/utils/p-limit';

// ============================================
// 类型定义
// ============================================

/** 采集到的系统资产快照 */
export interface SystemAssetSnapshot {
  /** 信息系统本身 */
  system: InformationSystem;
  /** 直接关联的资产 */
  assets: ITAsset[];
  /** 子系统快照（递归） */
  subsystems: SystemAssetSnapshot[];
}

/** 巡检记录（数据库行） */
export interface InspectionRecord {
  id: string;
  system_id: string;
  system_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  config_id: string | null;
  latest_version_id: string | null;
  result_summary: string | null;
  error_message: string | null;
  created_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** 巡检结果（给前端展示用） */
export interface InspectionResult {
  record: InspectionRecord;
  /** 配置管理页面的跳转链接 */
  configUrl: string | null;
  /** 合规检查结果摘要 */
  complianceSummary: ComplianceSummary | null;
}

/** 合规检查结果摘要 */
export interface ComplianceSummary {
  overallStatus: 'pass' | 'fail' | 'warning';
  findings: Array<{
    rule: string;
    status: 'pass' | 'fail' | 'warning';
    details: string;
    suggestion: string;
    severity?: 'low' | 'medium' | 'high';
  }>;
  summary: string;
}

// ============================================
// 资产采集器
// ============================================

/**
 * 采集指定信息系统的所有资产（包含子树）
 *
 * 复用资源图谱 graph-children 的关联关系逻辑（fetchGraphChildrenForNode），
 * 同层节点并行请求，层间串行 BFS 展开。
 * 覆盖所有关联关系：强关联（system_id）+ 弱关联（IP/域名匹配）。
 */
export async function collectSystemAssets(
  provider: IItAssetDataProvider,
  system: InformationSystem
): Promise<SystemAssetSnapshot> {
  return bfsExpandAll(provider, system);
}

/**
 * BFS 逐层展开：从根信息系统开始，按 graph-children 逻辑展开所有节点
 *
 * 同层节点受并发限制（最多 concurrency 个并行查询），
 * visited 集合去重（node_type + id）防环。
 */
async function bfsExpandAll(
  provider: IItAssetDataProvider,
  rootSystem: InformationSystem
): Promise<SystemAssetSnapshot> {
  const visited = new Set<string>();

  // 所有展开的节点，按 node_type 分组
  const allNodesByType = new Map<string, { id: string; node_type: string; name: string; status?: string; key_fields: Record<string, string | undefined> }[]>();
  const allTypes = ['information_system', 'domain', 'dns_record', 'physical_device', 'virtual_machine',
    'web_server', 'web_app', 'web_site_monitor', 'port_monitor', 'ops_access_control',
    'data_source', 'database', 'third_party_service', 'backup'];
  for (const t of allTypes) {
    allNodesByType.set(t, []);
  }

  // 将根系统加入
  allNodesByType.get('information_system')!.push({
    id: rootSystem.id,
    node_type: 'information_system',
    name: rootSystem.name,
    status: rootSystem.status,
    key_fields: {},
  });
  visited.add(`information_system::${rootSystem.id}`);

  // BFS 按层级展开，并发数不超过连接池大小
  const concurrency = 6; // 留一些余量给其他请求
  let currentLayer: { id: string; node_type: string; name: string; status?: string }[] = [
    { id: rootSystem.id, node_type: 'information_system', name: rootSystem.name, status: rootSystem.status },
  ];

  while (currentLayer.length > 0) {
    // 本层节点受并发限制获取子节点
    const results = await pLimit(
      currentLayer,
      concurrency,
      (node) => fetchGraphChildrenForNode(provider, node.id, node.node_type)
    );

    // 收集下一层节点（去重）
    const nextLayer: { id: string; node_type: string; name: string; status?: string }[] = [];
    for (const children of results) {
      for (const child of children as any[]) {
        const gid = `${child.node_type}::${child.id}`;
        if (!visited.has(gid)) {
          visited.add(gid);
          allNodesByType.get(child.node_type)!.push(child);
          nextLayer.push(child);
        }
      }
    }

    currentLayer = nextLayer;
  }

  // 构建树形快照
  return buildSnapshotFromNodes(allNodesByType, rootSystem);
}

/**
 * 将 BFS 展开后的所有节点构建为 SystemAssetSnapshot 树形结构
 */
function buildSnapshotFromNodes(
  allNodesByType: Map<string, { id: string; node_type: string; name: string; status?: string; key_fields: Record<string, string | undefined> }[]>,
  rootSystem: InformationSystem
): SystemAssetSnapshot {
  // 信息系统节点映射：id -> 节点信息
  const systemNodes = allNodesByType.get('information_system') || [];
  const systemMap = new Map<string, { id: string; node_type: string; name: string; status?: string }>();
  for (const sys of systemNodes) {
    systemMap.set(sys.id, sys);
  }

  // 收集所有非 information_system 的资产
  const allAssets: ITAsset[] = [];
  for (const [type, nodes] of allNodesByType) {
    if (type === 'information_system') continue;
    for (const node of nodes) {
      allAssets.push({
        id: node.id,
        asset_type: type as AssetType,
        category: 'infrastructure' as AssetCategory, // 简化处理
        name: node.name,
        code: node.id,
        status: (node.status || 'active') as any,
        system_id: node.key_fields.system_id || 'unknown',
        created_at: '',
        updated_at: '',
      } as ITAsset);
    }
  }

  // 子系统列表
  const subSystems = systemNodes
    .filter((n) => n.id !== rootSystem.id)
    .map((n) => ({
      id: n.id,
      code: n.name,
      name: n.name,
      status: (n.status || 'active') as any,
      created_at: '',
      updated_at: '',
    } as InformationSystem));

  return {
    system: rootSystem,
    assets: allAssets,
    subsystems: subSystems.map((sub) => ({
      system: sub,
      assets: [],
      subsystems: [],
    })),
  };
}

// ============================================
// 资产描述生成器
// ============================================

/**
 * 将系统资产快照转换为自然语言描述
 *
 * 这样 AI 可以直接读懂资产结构和关联关系
 */
export function generateAssetDescription(snapshot: SystemAssetSnapshot): string {
  const parts: string[] = [];
  appendSnapshot(snapshot, parts, 0);
  return parts.join('\n');
}

function appendSnapshot(snapshot: SystemAssetSnapshot, parts: string[], depth: number): void {
  const sys = snapshot.system;
  const indent = '  '.repeat(depth);
  const prefix = depth === 0 ? '' : `[子系统] `;

  // 系统信息
  parts.push(
    `${indent}${prefix}信息系统: ${sys.name} (ID: ${sys.id}, 状态: ${sys.status}, 负责人: ${sys.owner || '未指定'}, 部门: ${sys.owner_department || '未指定'})`
  );

  // 按资产类型分组（只在根系统级别输出资产）
  if (depth === 0) {
    const assetsByType = new Map<string, ITAsset[]>();
    for (const asset of snapshot.assets) {
      const type = asset.asset_type;
      if (!assetsByType.has(type)) {
        assetsByType.set(type, []);
      }
      assetsByType.get(type)!.push(asset);
    }

    // 按类型输出资产
    if (assetsByType.size > 0) {
      parts.push(`${indent}  关联资产:`);
      const typeOrder = [
        'virtual_machine', 'physical_device', 'container', 'cluster',
        'domain', 'dns_record', 'ssl_certificate', 'security_group',
        'database', 'storage', 'backup',
        'web_server', 'web_app', 'middleware', 'api_gateway', 'load_balancer', 'microservice',
        'operating_system', 'runtime', 'software_package',
        'monitoring', 'logging', 'pipeline', 'code_repository',
        'ops_access_control',
        'third_party_service', 'external_api', 'data_source',
        'web_site_monitor', 'port_monitor',
      ];

      for (const type of typeOrder) {
        const items = assetsByType.get(type);
        if (!items || items.length === 0) continue;
        parts.push(`${indent}    - ${getAssetTypeLabel(type)} (${items.length}个):`);
        for (const item of items) {
          parts.push(`${indent}      - [${item.status}] ${item.name} (ID: ${item.id})${formatAssetDetail(item)}`);
        }
      }
    }
  }

  // 列出子系统（只显示名称和关系）
  if (snapshot.subsystems.length > 0) {
    parts.push(`${indent}  包含子系统: ${snapshot.subsystems.map((s) => s.system.name).join('、')}`);
  }

  // 递归处理子系统（depth > 0 时不重复输出资产）
  for (const sub of snapshot.subsystems) {
    appendSnapshot(sub, parts, depth + 1);
  }
}

function getAssetTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    virtual_machine: '虚拟机',
    physical_device: '物理设备',
    container: '容器',
    cluster: '集群',
    domain: '域名',
    dns_record: 'DNS记录',
    ssl_certificate: 'SSL证书',
    security_group: '安全组',
    database: '数据库',
    storage: '存储',
    backup: '备份策略',
    web_server: 'Web服务器',
    web_app: 'Web应用',
    middleware: '中间件',
    api_gateway: 'API网关',
    load_balancer: '负载均衡',
    microservice: '微服务',
    operating_system: '操作系统',
    runtime: '运行时',
    software_package: '软件包',
    monitoring: '监控',
    logging: '日志',
    pipeline: '流水线',
    code_repository: '代码仓库',
    ops_access_control: '运维访问控制',
    third_party_service: '第三方服务',
    external_api: '外部API',
    data_source: '数据源',
    web_site_monitor: 'Web站点监控',
    port_monitor: '端口监控',
  };
  return labels[type] || type;
}

function formatAssetDetail(asset: ITAsset): string {
  const parts: string[] = [];

  // 根据类型提取关键字段
  switch (asset.asset_type) {
    case 'virtual_machine': {
      const vm = asset as any;
      if (vm.ip) parts.push(`IP: ${vm.ip}`);
      if (vm.cpu) parts.push(`CPU: ${vm.cpu}`);
      if (vm.memory_gb) parts.push(`内存: ${vm.memory_gb}GB`);
      if (vm.os) parts.push(`系统: ${vm.os}`);
      break;
    }
    case 'physical_device': {
      const pd = asset as any;
      if (pd.ip_address) parts.push(`IP: ${pd.ip_address}`);
      if (pd.device_type) parts.push(`类型: ${pd.device_type}`);
      break;
    }
    case 'database': {
      const db = asset as any;
      if (db.db_type) parts.push(`类型: ${db.db_type}`);
      if (db.host) parts.push(`主机: ${db.host}`);
      if (db.port) parts.push(`端口: ${db.port}`);
      break;
    }
    case 'backup': {
      const bk = asset as any;
      if (bk.strategy) parts.push(`策略: ${bk.strategy}`);
      if (bk.target_host) parts.push(`目标: ${bk.target_host}`);
      if (bk.last_backup_at) parts.push(`最近备份: ${bk.last_backup_at}`);
      break;
    }
    case 'domain': {
      const dm = asset as any;
      if (dm.domain) parts.push(`域名: ${dm.domain}`);
      break;
    }
    case 'web_server': {
      const ws = asset as any;
      if (ws.ip_address) parts.push(`IP: ${ws.ip_address}`);
      if (ws.server_type) parts.push(`类型: ${ws.server_type}`);
      break;
    }
    case 'middleware': {
      const mw = asset as any;
      if (mw.middleware_name) parts.push(`名称: ${mw.middleware_name}`);
      if (mw.version) parts.push(`版本: ${mw.version}`);
      break;
    }
  }

  return parts.length > 0 ? ` (${parts.join(', ')})` : '';
}

// ============================================
// 配置管理推送 + 合规检查
// ============================================

/**
 * 执行一次完整的合规巡检
 *
 * 流程：
 * 1. 创建巡检记录（状态：running）
 * 2. 采集资产快照（BFS + 并行）
 * 3. 生成自然语言资产描述
 * 4. 在配置管理创建/找到一条"合规巡检"配置
 * 5. 创建配置版本（资产描述作为内容）
 * 6. 调用配置管理合规检查 API
 * 7. 保存合规报告到巡检记录
 * 8. 返回结果
 */
export async function runComplianceInspection(
  systemId: string,
  ruleIds: number[],
  username: string
): Promise<InspectionResult> {
  const recordId = uuidv4();

  // 1. 获取系统信息（通过 provider，兼容远程 API 和 mock）
  const provider = await createItAssetDataProvider();
  const system = await provider.querySystemById(systemId);
  if (!system) {
    throw new Error(`信息系统不存在: ${systemId}`);
  }

  // 创建巡检记录
  await query(
    `INSERT INTO inspection_records (id, system_id, system_name, status, created_by, started_at)
     VALUES (?, ?, ?, 'running', ?, NOW())`,
    [recordId, systemId, system.name, username]
  );

  try {
    // 2. 采集资产
    const snapshot = await collectSystemAssets(provider, system);

    // 3. 生成资产描述
    const assetDescription = generateAssetDescription(snapshot);

    // 4. 获取规则信息
    let ruleNames: string[] = [];
    let ruleNameStr = '';
    if (ruleIds.length > 0) {
      const placeholders = ruleIds.map(() => '?').join(',');
      const rulesResult = await query<Array<{ id: number; name: string; content: string }>>(
        `SELECT id, name, content FROM pioc_rules WHERE id IN (${placeholders}) AND status = 1`,
        ruleIds
      );
      ruleNames = rulesResult.map((r) => r.name);
      ruleNameStr = rulesResult.map((r) => `【${r.name}】\n${r.content}`).join('\n\n');
    }

    // 5. 创建或找到一条配置（名称：信息系统合规巡检_系统名）
    const configName = `合规巡检_${snapshot.system.name}`;
    const configDesc = `信息系统「${snapshot.system.name}」的自动合规巡检配置，包含系统下所有资产的描述信息。`;

    let configId: string;

    // 先查是否存在同名配置
    const existingConfigs = await query<Array<{ id: string }>>(
      `SELECT id FROM configsys_configs WHERE name = ? AND created_by = ? LIMIT 1`,
      [configName, username]
    );

    if (existingConfigs.length > 0) {
      configId = existingConfigs[0].id;
    } else {
      // 创建新配置
      configId = uuidv4();
      await query(
        `INSERT INTO configsys_configs (id, name, description, compliance_rule_id, created_by)
         VALUES (?, ?, ?, ?, ?)`,
        [configId, configName, configDesc, ruleIds.length > 0 ? ruleIds[0] : null, username]
      );
    }

    // 6. 创建配置版本（资产描述作为配置内容）
    const fullContent = [
      `## 信息系统: ${snapshot.system.name}`,
      `- 系统ID: ${snapshot.system.id}`,
      `- 状态: ${snapshot.system.status}`,
      `- 负责人: ${snapshot.system.owner || '未指定'}`,
      `- 所属部门: ${snapshot.system.owner_department || '未指定'}`,
      ``,
      ruleNames.length > 0 ? `## 关联合规规则:\n${ruleNames.join('\n')}` : '',
      ``,
      `## 资产清单:`,
      assetDescription,
    ]
      .filter(Boolean)
      .join('\n');

    // 自动生成版本号：v1, v2...
    const maxVersionResult = await query<Array<{ maxVersion: string }>>(
      `SELECT MAX(version_number) as maxVersion FROM configsys_versions WHERE config_id = ?`,
      [configId]
    );
    const maxVersion = maxVersionResult[0]?.maxVersion;
    let nextNum = 1;
    if (maxVersion) {
      const match = maxVersion.match(/(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    const versionNumber = `v${nextNum}`;

    const versionId = uuidv4();
    await query(
      `INSERT INTO configsys_versions (id, config_id, version_number, content, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [versionId, configId, versionNumber, fullContent, username]
    );

    // 7. 如果有规则，调用合规检查 API
    let complianceSummary: ComplianceSummary | null = null;

    if (ruleIds.length > 0 && ruleNameStr) {
      try {
        // 这里调用配置管理的合规检查内部服务
        const { configComplianceService } = await import('@/lib/ai/config-compliance-service');
        const result = await configComplianceService.checkCompliance(
          fullContent,
          ruleNameStr,
          ruleIds[0]
        );

        if (result.success && result.overallStatus) {
          complianceSummary = {
            overallStatus: result.overallStatus,
            findings: result.findings || [],
            summary: result.summary || '检查完成',
          };

          // 保存合规报告到版本记录
          const complianceReport = {
            checkedAt: new Date().toISOString(),
            ruleId: result.ruleId,
            ruleName: result.ruleName,
            ruleSummary: result.ruleSummary,
            overallStatus: result.overallStatus,
            findings: result.findings,
            summary: result.summary,
          };

          await query(
            `UPDATE configsys_versions SET compliance_report = ? WHERE id = ?`,
            [JSON.stringify(complianceReport), versionId]
          );
        }
      } catch (e) {
        console.error('合规检查调用失败，但巡检仍可继续:', e);
      }
    }

    // 8. 更新巡检记录状态
    const resultSummary = complianceSummary
      ? JSON.stringify({
          overallStatus: complianceSummary.overallStatus,
          summary: complianceSummary.summary,
        })
      : JSON.stringify({ overallStatus: 'warning', summary: '未配置合规规则或合规检查未执行' });

    await query(
      `UPDATE inspection_records
       SET status = 'completed', config_id = ?, latest_version_id = ?,
           result_summary = ?, completed_at = NOW()
       WHERE id = ?`,
      [configId, versionId, resultSummary, recordId]
    );

    // 9. 查询完整记录
    const records = await query<InspectionRecord[]>(
      `SELECT * FROM inspection_records WHERE id = ?`,
      [recordId]
    );

    return {
      record: records[0],
      configUrl: `/configsys/versions/${versionId}`,
      complianceSummary,
    };
  } catch (error) {
    // 失败时更新巡检记录
    await query(
      `UPDATE inspection_records
       SET status = 'failed', error_message = ?, completed_at = NOW()
       WHERE id = ?`,
      [String(error), recordId]
    );

    const records = await query<InspectionRecord[]>(
      `SELECT * FROM inspection_records WHERE id = ?`,
      [recordId]
    );

    return {
      record: records[0],
      configUrl: null,
      complianceSummary: null,
    };
  }
}

/**
 * 获取信息系统的巡检历史记录
 */
export async function getInspectionHistory(systemId: string): Promise<InspectionRecord[]> {
  return query<InspectionRecord[]>(
    `SELECT * FROM inspection_records WHERE system_id = ? ORDER BY created_at DESC LIMIT 20`,
    [systemId]
  );
}

/**
 * 获取最近一次巡检结果
 */
export async function getLatestInspection(systemId: string): Promise<InspectionRecord | null> {
  const records = await query<InspectionRecord[]>(
    `SELECT * FROM inspection_records WHERE system_id = ? ORDER BY created_at DESC LIMIT 1`,
    [systemId]
  );
  return records[0] || null;
}