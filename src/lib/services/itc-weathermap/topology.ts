/**
 * 网络天气图拓扑定义（写死，不会变）。
 * YAML 只负责 SNMP 设备和认证，拓扑数据全部在本文件。
 */

export type NodeKind = 'fw' | 'core' | 'biz' | 'ext' | 'sw' | 'zone';
export type LinkGeometry = 'uplink' | 'irf' | 'row1' | 'row2' | 'ext' | 'hci-up' | 'hci-down' | 'hci-peer';

export interface TopoNode {
  id: string;
  name: string;
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
  kind: NodeKind;
  peer?: string;
  /** 节点吞吐标注取数用的逻辑链路 key（HCI 下行业务节点） */
  metricKey?: string;
  /** 节点点击跳转链接（渲染为 SVG 内 <a> 包裹整个节点） */
  href?: string;
}

/**
 * HCI 下行业务分类定义（依据《超融合业务组.md》§5，纳总 2026-10-15 端口规划表 + SNMP 实测）。
 * 交换机 48 口全光，端口号 [N] 与接口 aggN / eth-0-N 一一对应（agg ifIndex=2048+N，
 * eth ifIndex=N，两者计数器实测 1:1）；同一台服务器双归到配对两台交换机的同号端口。
 */
export interface HciCategoryDef {
  /** 逻辑链路后缀：down:<交换机id>:<key> */
  key: string;
  /** 业务节点名 */
  name: string;
  /** 该分类包含的端口号 [N] */
  ports: number[];
  /** 链路明细「对端」列 */
  peer: string;
}

export interface TopoLink {
  a: string;
  b: string;
  port: string;
  description: string;
  peer?: string;
  geometry: LinkGeometry;
  speed: number;
  row: number;
  order: number;
}

/** 节点样式预设（renderer.nodeStylePresets 按此取调色板） */
export type NodeStylePreset = 'core' | 'hci' | 'lb' | 'ykt' | 'storage' | 'zab';

export interface TopoView {
  id: string;
  title: string;
  description: string;
  deviceIds: string[];
  canvasWidth: number;
  canvasHeight: number;
  nodeStylePreset: NodeStylePreset;
  nodeOrder: string[];
  nodes: TopoNode[];
  links: TopoLink[];
}

/**
 * 通用逻辑端口定义（collector.discoverLogicalPortsByNames 按此发现并聚合计数器）。
 * 适用于「聚合口/物理口名可枚举」的设备（一卡通锐捷、分布式存储 H3C S6530X）：
 * 一条逻辑链路可由聚合口承载（跨成员 LACP，整链 agg 候选）或多个物理口求和；
 * 每个成员还可自带聚合口候选（同号 BAGG 优先、物理口兜底，杜绝双算）。
 */
export interface LogicalPortDef {
  /** 逻辑链路 key（PortData.port，与 TopoLink.port 对应） */
  key: string;
  /** 整条链路的聚合口 ifName 候选：任一存在于设备即整条链路只取该聚合口 */
  agg?: string[];
  /** 物理成员口：name 为 ifName 精确名或端口尾（如 '1/0/4'，按非数字边界尾匹配）；agg 为该成员的聚合口候选（存在则优先于 name） */
  members: { name: string; agg?: string[] }[];
}

// =====================================================================
// 数据中心核心链路视图
// =====================================================================

const coreNodes: TopoNode[] = [
  // 防火墙
  { id: 'fw_tsg', name: 'CG_TSG_M9000CN', description: '图书馆 M9000 防火墙', x: 400, y: 88, width: 250, height: 56, kind: 'fw' },
  { id: 'fw_lxl', name: 'CG_LXL_M9000CN', description: '礼贤楼 M9000 防火墙', x: 900, y: 88, width: 250, height: 56, kind: 'fw' },
  // 核心交换机
  { id: 'core1', name: 'CG-TSG-S12510', description: '图书馆 TSG · 接口前缀 1/x/x/x', x: 400, y: 312, width: 280, height: 84, kind: 'core' },
  { id: 'core2', name: 'CG-XZL-S12510', description: '礼贤楼 LXL · 接口前缀 2/x/x/x', x: 900, y: 312, width: 280, height: 84, kind: 'core' },
  // 业务 row 1
  { id: 'hci25', name: '超融合业务', description: '1|2/0/0/16·17', x: 128, y: 550, width: 190, height: 60, kind: 'biz', href: '/itc-weathermap/hyperconverged' },
  { id: 'store25', name: '图书馆分布式存储', description: '1|2/0/0/22', x: 384, y: 550, width: 190, height: 60, kind: 'biz', href: '/itc-weathermap/storage' },
  { id: 'ykt10', name: '图书馆一卡通业务', description: '1|2/0/0/20', x: 640, y: 550, width: 190, height: 60, kind: 'biz', href: '/itc-weathermap/ykt' },
  { id: 'db40', name: '图书馆灾备业务', description: '1|2/0/0/33', x: 896, y: 550, width: 190, height: 60, kind: 'biz', href: '/itc-weathermap/zab' },
  // 业务 row 2
  { id: 'lb', name: '负载均衡业务', description: '1|2/0/0/31', x: 256, y: 712, width: 190, height: 60, kind: 'biz', href: '/itc-weathermap/loadbalancer' },
  { id: 'dns', name: 'DNS业务组', description: '1|2/1/0/7·8', x: 640, y: 712, width: 190, height: 60, kind: 'biz' },
  { id: 'other', name: '其他业务组', description: '1|2/0/0/7 等 5 口', x: 1024, y: 712, width: 190, height: 60, kind: 'biz' },
];

const coreLinks: TopoLink[] = [
  // 防火墙上联
  { a: 'fw_tsg', b: 'core1', port: '1/0/0/34', description: '上联 TSG M9000', peer: 'CG_TSG_M9000CN_ShuJuZhongXin', geometry: 'uplink', speed: 40000, row: 0, order: 0 },
  { a: 'fw_lxl', b: 'core2', port: '2/0/0/34', description: '上联 LXL M9000', peer: 'CG_LXL_M9000CN_ShuJuZhongXin', geometry: 'uplink', speed: 40000, row: 0, order: 0 },
  // IRF 堆叠
  { a: 'core1', b: 'core2', port: '1/0/0/35', description: 'IRF 堆叠互联 35', peer: 'S12510-S-IRF', geometry: 'irf', speed: 40000, row: 0, order: 0 },
  { a: 'core1', b: 'core2', port: '1/0/0/36', description: 'IRF 堆叠互联 36', peer: 'S12510-S-IRF', geometry: 'irf', speed: 40000, row: 0, order: 1 },
  { a: 'core1', b: 'core2', port: '1/0/0/32', description: 'BFD MAD 检测', peer: 'S12510-S-IRF', geometry: 'irf', speed: 10000, row: 0, order: 2 },
  // Row 1 业务下联 → core1
  { a: 'hci25', b: 'core1', port: '1/0/0/16', description: '超融合业务 → CG-TSG-S12510', peer: 'cg-tsg-d06-yewu1', geometry: 'row1', speed: 10000, row: 1, order: 0 },
  { a: 'hci25', b: 'core1', port: '1/0/0/17', description: '超融合业务 → CG-TSG-S12510', peer: 'cg-lxl2-b02-yewu3', geometry: 'row1', speed: 10000, row: 1, order: 1 },
  { a: 'store25', b: 'core1', port: '1/0/0/22', description: '图书馆分布式存储 → CG-TSG-S12510', peer: 'YD_TSG_B09_23U_SW2', geometry: 'row1', speed: 25000, row: 1, order: 2 },
  { a: 'ykt10', b: 'core1', port: '1/0/0/20', description: '图书馆一卡通业务 → CG-TSG-S12510', peer: 'Yndx_YKT', geometry: 'row1', speed: 10000, row: 1, order: 3 },
  { a: 'db40', b: 'core1', port: '1/0/0/33', description: '图书馆灾备业务 → CG-TSG-S12510', peer: 'TSG-RJ-JieRu', geometry: 'row1', speed: 40000, row: 1, order: 4 },
  // Row 1 业务下联 → core2
  { a: 'hci25', b: 'core2', port: '2/0/0/16', description: '超融合业务 → CG-XZL-S12510', peer: 'cg-tsg-d07-yewu2', geometry: 'row1', speed: 10000, row: 1, order: 5 },
  { a: 'hci25', b: 'core2', port: '2/0/0/17', description: '超融合业务 → CG-XZL-S12510', peer: 'cg-lxl2-b03-yewu4', geometry: 'row1', speed: 10000, row: 1, order: 6 },
  { a: 'store25', b: 'core2', port: '2/0/0/22', description: '图书馆分布式存储 → CG-XZL-S12510', peer: 'YD_TSG_B10_23U_SW2', geometry: 'row1', speed: 25000, row: 1, order: 7 },
  { a: 'ykt10', b: 'core2', port: '2/0/0/20', description: '图书馆一卡通业务 → CG-XZL-S12510', peer: 'Yndx_YKT', geometry: 'row1', speed: 10000, row: 1, order: 8 },
  { a: 'db40', b: 'core2', port: '2/0/0/33', description: '图书馆灾备业务 → CG-XZL-S12510', peer: 'TSG-RJ-JieRu', geometry: 'row1', speed: 40000, row: 1, order: 9 },
  // Row 2 → core1
  { a: 'lb', b: 'core1', port: '1/0/0/31', description: '负载均衡业务 → CG-TSG-S12510', peer: 'H3C-TSG-LB1', geometry: 'row2', speed: 10000, row: 2, order: 0 },
  { a: 'dns', b: 'core1', port: '1/1/0/7', description: '递归 DNS → CG-TSG-S12510', geometry: 'row2', speed: 1000, row: 2, order: 1 },
  { a: 'dns', b: 'core1', port: '1/1/0/8', description: '权威 DNS → CG-TSG-S12510', geometry: 'row2', speed: 1000, row: 2, order: 2 },
  { a: 'other', b: 'core1', port: '1/0/0/7', description: 'M6K 接入 → CG-TSG-S12510', geometry: 'row2', speed: 10000, row: 2, order: 3 },
  // Row 2 → core2
  { a: 'lb', b: 'core2', port: '2/0/0/31', description: '负载均衡业务 → CG-XZL-S12510', peer: 'H3C-LXL-LB2', geometry: 'row2', speed: 10000, row: 2, order: 4 },
  { a: 'dns', b: 'core2', port: '2/1/0/7', description: '递归 DNS → CG-XZL-S12510', geometry: 'row2', speed: 1000, row: 2, order: 5 },
  { a: 'dns', b: 'core2', port: '2/1/0/8', description: '权威 DNS → CG-XZL-S12510', geometry: 'row2', speed: 1000, row: 2, order: 6 },
  { a: 'other', b: 'core2', port: '2/0/0/7', description: 'M6K 接入 → CG-XZL-S12510', geometry: 'row2', speed: 10000, row: 2, order: 7 },
  { a: 'other', b: 'core1', port: '1/0/0/27', description: 'IDC 医保专线 → CG-TSG-S12510', peer: 'CG_S12500F-AF_CORE_BG', geometry: 'row2', speed: 10000, row: 2, order: 8 },
  { a: 'other', b: 'core1', port: '1/0/0/15', description: '腾讯云 → CG-TSG-S12510', peer: 'GC-1', geometry: 'row2', speed: 10000, row: 2, order: 9 },
  { a: 'other', b: 'core1', port: '1/1/0/11', description: '对外安全设备 → CG-TSG-S12510', peer: 'CG-TSG-AnQuanSheBei-DaiWai', geometry: 'row2', speed: 1000, row: 2, order: 10 },
];

export const coreView: TopoView = {
  id: 'core',
  title: '数据中心核心链路',
  description: 'H3C S12510-S IRF 堆叠 + 防火墙上联 + 各业务下联',
  deviceIds: ['core'],
  canvasWidth: 1280,
  canvasHeight: 800,
  nodeStylePreset: 'core',
  nodeOrder: [
    'fw_tsg', 'fw_lxl',
    'core1', 'core2',
    'hci25', 'store25', 'ykt10', 'db40',
    'lb', 'dns', 'other',
  ],
  nodes: coreNodes,
  links: coreLinks,
};

// =====================================================================
// 超融合视图
// =====================================================================

// 图书馆 HCI 对（交换机1·yewu1=sw10 / 交换机2·yewu2=sw13）下行业务分类
// （文档 §5.1 2026-10-21 按品牌细分、§5.3 端口映射。实测物理机接口表确认
//  yewu1/yewu2 仅接四路服务器 [9]–[18] 与云桌面 [31]，无二路服务器）
const hciLibraryCategories: HciCategoryDef[] = [
  { key: 'inspur', name: '浪潮超融合', ports: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18], peer: '浪潮四路服务器1–10（另一归 yewu2）' },
  { key: 'rds', name: 'RDS', ports: [19, 20], peer: 'RDS 云数据库 ×2（另一归 yewu2）' },
  { key: 'access', name: '其他接入', ports: [21], peer: 'Access VLAN2011（无设备名，非双归）' },
  { key: 'security', name: '安全设备', ports: [30], peer: 'B08 深信服 S6520（另一归 yewu2）' },
  { key: 'oycloud', name: '噢易云桌面', ports: [31], peer: '噢易云桌面服务器（另一归 yewu2）' },
  { key: 'test', name: '算力测试', ports: [33, 34], peer: '算力测试服务器 ×2（另一归 yewu2）' },
  { key: 'oob', name: '带外管理', ports: [47], peer: '图书馆带外交换机（非双归）' },
];

// 礼贤楼 HCI 对（交换机3·yewu3=sw14 / 交换机4·yewu4=sw15）下行业务分类
// （文档 §5.1 2026-10-21 按品牌细分 / §5.2）
const hciLxlCategories: HciCategoryDef[] = [
  { key: 'sxf', name: '深信服超融合', ports: [1, 2, 3, 4, 5, 6, 7, 8, 16, 19], peer: '深信服二路服务器1–10（另一归 yewu4）' },
  { key: 'zstack', name: 'zstack超融合', ports: [9, 10, 11, 12, 13, 14, 15], peer: 'zstack四路服务器1–7（另一归 yewu4）' },
  { key: 'rds', name: 'RDS', ports: [17, 18], peer: 'RDS 云数据库 ×2（另一归 yewu4）' },
  { key: 'ai', name: '智算节点', ports: [21, 22, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39], peer: '阿里智算×2 + 浪潮智算×11（另一归 yewu4）' },
  { key: 'aistore', name: '智算存储', ports: [40, 41, 42], peer: '智算存储 ×3（另一归 yewu4）' },
  { key: 'oob', name: '带外管理', ports: [47], peer: '带外服务器（非双归）' },
];

/** 每台交换机 → 下行业务分类（collector 按此把端口计数器归类） */
export const hciDownCategories: Record<string, HciCategoryDef[]> = {
  sw10: hciLibraryCategories,
  sw13: hciLibraryCategories,
  sw14: hciLxlCategories,
  sw15: hciLxlCategories,
};

/**
 * 「智算集群」= 算力测试（图书馆对 [33][34]，2 台）
 *             + 智算节点（礼贤楼对 [21][22][29]–[39]，13 台）
 *             + 智算存储（礼贤楼对 [40]–[42]，3 台）
 * 合计 18 台设备、36 条双归链路。SVG 上三类合并为一个节点，每台交换机只画一段；
 * 逐类/逐口的逻辑 key 仍保留（节点悬停分量、链路明细表逐口行使用）。
 */
export const HCI_AI_CLUSTER_CATS = new Set(['test', 'ai', 'aistore']);
export const HCI_AI_CLUSTER_NODE = 'dn_aicluster';

/** 交换机在图书馆/礼贤楼对中的另一归（双归对端） */
export const hciPairPeer: Record<string, string> = {
  sw10: 'yewu2', sw13: 'yewu1',
  sw14: 'yewu4', sw15: 'yewu3',
};

/** 交换机展示名（明细表逐口行用） */
export const hciSwitchMeta: Record<string, { label: string }> = {
  sw10: { label: 'yewu1' },
  sw14: { label: 'yewu3' },
  sw13: { label: 'yewu2' },
  sw15: { label: 'yewu4' },
};

/** 图书馆对浪潮四路服务器端口错位：端口 [N] → 四路服务器号（文档 §5.3） */
const LIB_COMPUTE4_SERVER: Record<number, number> = {
  9: 8, 10: 9, 11: 10, 12: 5, 13: 6, 14: 7, 15: 2, 16: 3, 17: 4, 18: 1,
};

/**
 * 逐端口对端文案（链路明细表「对端」列用），依据文档 §5.1/§5.2/§5.3
 * （计算节点 2026-10-21 按品牌细分：sxf=深信服二路、zstack=zstack四路、
 * inspur=浪潮四路、oycloud=噢易云桌面）：
 * 同号端口在配对两台交换机上接同一台设备（双归），[N] 后的设备名按端口规划表还原。
 */
export function hciPortPeer(swId: string, catKey: string, port: number): string {
  const other = hciPairPeer[swId];
  switch (catKey) {
    case 'sxf': {
      // 礼贤楼对：[1]–[8] → 1–8，[16] → 9，[19] → 10
      const n = port <= 8 ? port : port === 16 ? 9 : 10;
      return `深信服二路服务器${n}（另一归 ${other}）`;
    }
    case 'zstack':
      // 礼贤楼对：[9]–[15] → zstack四路服务器 1–7
      return `zstack四路服务器${port - 8}（另一归 ${other}）`;
    case 'inspur':
      // 图书馆对：[9]–[18] 端口错位映射
      return `浪潮四路服务器${LIB_COMPUTE4_SERVER[port]}（另一归 ${other}）`;
    case 'oycloud':
      return `噢易云桌面服务器（另一归 ${other}）`;
    case 'rds': {
      // 图书馆 [19][20] / 礼贤 [17][18] → RDS 1/2
      const n = swId === 'sw10' || swId === 'sw13' ? port - 18 : port - 16;
      return `RDS 云数据库${n}（另一归 ${other}）`;
    }
    case 'access':
      return 'Access VLAN2011（无设备名，非双归）';
    case 'security':
      return `B08 深信服 S6520（另一归 ${other}）`;
    case 'test':
      return `算力测试服务器${port - 32}（另一归 ${other}）`;
    case 'ai':
      if (port === 21) return `阿里智算服务器1（另一归 ${other}）`;
      if (port === 22) return `阿里智算服务器2（另一归 ${other}）`;
      return `浪潮智算服务器${port - 28}（另一归 ${other}）`;
    case 'aistore':
      return `智算存储${port - 39}（另一归 ${other}）`;
    case 'oob':
      if (swId === 'sw10') return '图书馆D05带外交换机（非双归）';
      if (swId === 'sw13') return '图书馆B08带外交换机（非双归）';
      if (swId === 'sw14') return '带外（规划未用）';
      return '带外服务器（非双归）';
    default:
      return '';
  }
}

/**
 * 物理设备枚举（节点「x/y 台在线」的唯一口径）：
 * 同一交换机对内，双归业务的每个端口号 = 一台设备（同号口双网卡接配对两台交换机）；
 * 非双归业务（接入/带外）每台交换机上的口各自是独立设备。
 */
const HCI_NON_DUAL_CATS = new Set(['access', 'oob']);
const HCI_SWITCH_PAIRS: [string, string][] = [
  ['sw10', 'sw13'], // 图书馆对
  ['sw14', 'sw15'], // 礼贤楼对
];

export interface HciDevice {
  /** 该设备在各交换机上的逐口逻辑 key（双归 2 个，非双归 1 个），任一 Up 即在线 */
  ports: string[];
}

export function hciNodeDevices(nodeId: string): HciDevice[] {
  const catKeys = nodeId === HCI_AI_CLUSTER_NODE
    ? [...HCI_AI_CLUSTER_CATS]
    : [nodeId.replace(/^dn_/, '')];
  const devices: HciDevice[] = [];
  for (const catKey of catKeys) {
    for (const [swA, swB] of HCI_SWITCH_PAIRS) {
      const catA = hciDownCategories[swA]?.find((c) => c.key === catKey);
      const catB = hciDownCategories[swB]?.find((c) => c.key === catKey);
      const cat = catA ?? catB;
      if (!cat) continue;
      for (const p of cat.ports) {
        const keyA = catA ? `down:${swA}:${catKey}#${p}` : null;
        const keyB = catB ? `down:${swB}:${catKey}#${p}` : null;
        if (HCI_NON_DUAL_CATS.has(catKey)) {
          // 非双归：两台交换机上的同号口是各自独立的设备
          if (keyA) devices.push({ ports: [keyA] });
          if (keyB) devices.push({ ports: [keyB] });
        } else {
          // 双归：一台设备两条链路
          devices.push({ ports: [keyA, keyB].filter((k): k is string => k !== null) });
        }
      }
    }
  }
  return devices;
}

const hciHeadNodes: TopoNode[] = [
  { id: 'core1', name: 'CG-TSG-S12510', description: '图书馆 TSG · 接口前缀 1/x/x/x', x: 375, y: 92, width: 300, height: 66, kind: 'core', href: '/itc-weathermap' },
  { id: 'core2', name: 'CG-XZL-S12510', description: '礼贤楼 LXL · 接口前缀 2/x/x/x', x: 915, y: 92, width: 300, height: 66, kind: 'core', href: '/itc-weathermap' },
  // 同机楼对相邻排列：图书馆对（yewu1/yewu2）左、礼贤楼对（yewu3/yewu4）右。
  // 下联按对就近、集群互联短；代价是两条上联在对间空档形成一处有序 X 交叉。
  { id: 'sw10', name: 'cg-tsg-d06-yewu1', description: '10.10.251.10', x: 250, y: 322, width: 212, height: 64, kind: 'sw' },
  { id: 'sw13', name: 'cg-tsg-d07-yewu2', description: '10.10.251.13', x: 500, y: 322, width: 212, height: 64, kind: 'sw' },
  { id: 'sw14', name: 'cg-lxl2-b02-yewu3', description: '10.10.251.14', x: 800, y: 322, width: 212, height: 64, kind: 'sw' },
  { id: 'sw15', name: 'cg-lxl2-b03-yewu4', description: '10.10.251.15', x: 1050, y: 322, width: 212, height: 64, kind: 'sw' },
];

function portsLabel(ports: number[]): string {
  // 压缩连续端口：[1,2,3,4,5,6,7,8] → [1]–[8]；[1..8,16,19] → [1]–[8]、[16]、[19]
  const parts: string[] = [];
  let start = ports[0];
  let prev = ports[0];
  const flush = () => {
    parts.push(start === prev ? `[${start}]` : `[${start}]–[${prev}]`);
  };
  for (let i = 1; i < ports.length; i += 1) {
    const p = ports[i];
    if (p === prev + 1) { prev = p; continue; }
    flush();
    start = p; prev = p;
  }
  flush();
  return parts.join('、');
}

// 交换机顺序（下联落点排序、明细遍历用）
const hciSwitches = [
  { id: 'sw10', x: 250, label: 'yewu1' },
  { id: 'sw13', x: 500, label: 'yewu2' },
  { id: 'sw14', x: 800, label: 'yewu3' },
  { id: 'sw15', x: 1050, label: 'yewu4' },
];

// 下行业务节点：计算节点按品牌分组（文档 §5.1 2026-10-21），同组全组合并为
// 一个节点（跨交换机双归的同一组设备）。智算节点/智算存储/算力测试三类再向上
// 归并为单个「智算集群」节点（18 台设备、36 条双归链路）。位置按所接交换机
// 重心排序：图书馆专属（重心 375）→ 四台共享组（重心 650）→ 礼贤楼专属
// （重心 925），集群按端口加权重心 864 居最右，二部图交叉最小化。
const HCI_DN_W = 118;
const HCI_DN_H = 54;
const HCI_DN_Y = 498;
const hciMergedOrder: { key: string; x: number }[] = [
  { key: 'access', x: 123 },
  { key: 'security', x: 252 },
  { key: 'inspur', x: 381 },
  { key: 'oycloud', x: 510 },
  { key: 'rds', x: 639 },
  { key: 'oob', x: 768 },
  { key: 'sxf', x: 897 },
  { key: 'zstack', x: 1026 },
  { key: 'aicluster', x: 1155 },
];

const hciCategoryName = new Map<string, string>();
for (const cats of Object.values(hciDownCategories)) {
  for (const c of cats) {
    if (!hciCategoryName.has(c.key)) hciCategoryName.set(c.key, c.name);
  }
}

/** 合并节点静态说明（渲染时按 · 拆成两行）：按机楼对统计端口数；集群为设备/链路规模 */
function hciMergedDescription(key: string): string {
  if (key === 'aicluster') return '18 台设备 · 36 条双归链路';
  const libN = hciDownCategories.sw10.find((c) => c.key === key)?.ports.length;
  const lxlN = hciDownCategories.sw14.find((c) => c.key === key)?.ports.length;
  const parts: string[] = [];
  if (libN) parts.push(`图书馆 ${libN} 口`);
  if (lxlN) parts.push(`礼贤 ${lxlN} 口`);
  return parts.join(' · ');
}

const hciDownNodes: TopoNode[] = hciMergedOrder.map(({ key, x }) => ({
  id: `dn_${key}`,
  name: key === 'aicluster' ? '智算集群' : hciCategoryName.get(key)!,
  description: hciMergedDescription(key),
  x,
  y: HCI_DN_Y,
  width: HCI_DN_W,
  height: HCI_DN_H,
  kind: 'zone',
}));

// 下行链路：普通分类按「交换机 × 业务分类」逐段（key=down:<sw>:<cat>）；
// 智算集群三类在每台交换机上合并为一段（key=down:<sw>:aicluster）。
const hciDownLinks: TopoLink[] = [];
for (const sw of hciSwitches) {
  const cats = hciDownCategories[sw.id];
  const clusterCats = cats.filter((c) => HCI_AI_CLUSTER_CATS.has(c.key));
  cats.forEach((cat, i) => {
    if (HCI_AI_CLUSTER_CATS.has(cat.key)) return; // 集群三类统一合并为一段
    const peerText = cat.key === 'oob'
      ? cat.peer
      : cat.peer.replace('yewu2', hciPairPeer[sw.id]).replace('yewu4', hciPairPeer[sw.id]);
    hciDownLinks.push({
      a: `dn_${cat.key}`,
      b: sw.id,
      port: `down:${sw.id}:${cat.key}`,
      description: `${sw.label} 下行 · ${cat.name} ×${cat.ports.length}（${portsLabel(cat.ports)}）`,
      peer: peerText,
      geometry: 'hci-down',
      speed: 0,
      row: 0,
      order: i,
    });
  });
  if (clusterCats.length > 0) {
    const totalPorts = clusterCats.reduce((n, c) => n + c.ports.length, 0);
    const detail = clusterCats
      .map((c) => `${c.name} ×${c.ports.length}（${portsLabel(c.ports)}）`)
      .join('、');
    const peerText = clusterCats
      .map((c) => c.peer.replace('yewu2', hciPairPeer[sw.id]).replace('yewu4', hciPairPeer[sw.id]))
      .join('、');
    hciDownLinks.push({
      a: HCI_AI_CLUSTER_NODE,
      b: sw.id,
      port: `down:${sw.id}:aicluster`,
      description: `${sw.label} 下行 · 智算集群 ${totalPorts} 口：${detail}`,
      peer: peerText,
      geometry: 'hci-down',
      speed: 0,
      row: 0,
      order: 99,
    });
  }
}

const hciNodes: TopoNode[] = [...hciHeadNodes, ...hciDownNodes];

const hciLinks: TopoLink[] = [
  // 上联 sw → core
  { a: 'sw10', b: 'core1', port: 'uplink:sw10', description: 'cg-tsg-d06-yewu1 → CG-TSG-S12510', peer: 'CG-TSG-S12510 · 1/0/0/16（10G）', geometry: 'hci-up', speed: 10000, row: 0, order: 0 },
  { a: 'sw14', b: 'core1', port: 'uplink:sw14', description: 'cg-lxl2-b02-yewu3 → CG-TSG-S12510', peer: 'CG-TSG-S12510 · 1/0/0/17（10G）', geometry: 'hci-up', speed: 10000, row: 1, order: 0 },
  { a: 'sw13', b: 'core2', port: 'uplink:sw13', description: 'cg-tsg-d07-yewu2 → CG-XZL-S12510', peer: 'CG-XZL-S12510 · 2/0/0/16（10G，待机）', geometry: 'hci-up', speed: 10000, row: 0, order: 0 },
  { a: 'sw15', b: 'core2', port: 'uplink:sw15', description: 'cg-lxl2-b03-yewu4 → CG-XZL-S12510', peer: 'CG-XZL-S12510 · 2/0/0/17（10G）', geometry: 'hci-up', speed: 10000, row: 1, order: 0 },
  // 下行：同类业务合并为共享节点，逐交换机分段（agg/eth 实测计数器归类，见 hciDownCategories）
  ...hciDownLinks,
  // 交换机间跨核心互联
  { a: 'sw10', b: 'sw13', port: 'peerlink:sw10', description: 'cg-tsg-d06-yewu1 ↔ cg-tsg-d07-yewu2', peer: 'cg-tsg-d07-yewu2 · agg55（80G）', geometry: 'hci-peer', speed: 80000, row: 0, order: 0 },
  { a: 'sw14', b: 'sw15', port: 'peerlink:sw14', description: 'cg-lxl2-b02-yewu3 ↔ cg-lxl2-b03-yewu4', peer: 'cg-lxl2-b03-yewu4 · agg55（80G）', geometry: 'hci-peer', speed: 80000, row: 0, order: 0 },
];

export const hyperconvergedView: TopoView = {
  id: 'hyperconverged',
  title: '超融合业务',
  description: '4 台浪潮 CN9300H-48Y8C 双归上联核心 · 下行业务按品牌/业务分组合并显示（超融合计算/RDS/安全/云桌面/智算集群/带外），逐端口流量见链路明细 · 交换机间集群互联',
  deviceIds: ['sw10', 'sw13', 'sw14', 'sw15'],
  canvasWidth: 1280,
  canvasHeight: 555,
  nodeStylePreset: 'hci',
  nodeOrder: ['core1', 'core2', 'sw10', 'sw13', 'sw14', 'sw15', ...hciDownNodes.map((n) => n.id)],
  nodes: hciNodes,
  links: hciLinks,
};

// =====================================================================
// 负载均衡视图
// =====================================================================

/**
 * LB VLAN 分组定义（依据《负载均衡业务.md》）。
 * 同一物理 trunk Te1/2/4 承载 8 个 VLAN 子接口，按业务分三组：
 * 组一公网入口（VLAN25/26）→ 组二业务服务（VLAN27/28/29）→
 * 组三内网管理/后端（VLAN88/92/248，VLAN248 挂后端真实服务器）。
 */
export interface LbVlanGroupDef {
  /** 逻辑链路后缀：down:lb:<key>（聚合）与 down:lb:<key>#<vlan>（逐 VLAN） */
  key: string;
  name: string;
  vlans: number[];
  /** 链路明细「对端」列（分组聚合行） */
  peer: string;
}

export const lbVlanGroups: LbVlanGroupDef[] = [
  { key: 'pub', name: '公网入口区', vlans: [25, 26], peer: '运营商网段 202.203.208.0/26 · 202.203.209.112/25' },
  { key: 'svc', name: '业务服务区', vlans: [27, 28, 29], peer: '服务网段 113.55.15.0/22 · 113.55.16.0/24 · 113.55.17.0/24' },
  { key: 'mgmt', name: '内网管理·后端', vlans: [88, 92, 248], peer: 'VLAN88 管理 · VLAN92 内网 · VLAN248 后端真实服务器' },
];

/** 逐 VLAN 的 VRRP VIP（明细表逐 VLAN 行「对端」列用） */
export const lbVlanVip: Record<number, string> = {
  25: '202.203.208.5',
  26: '202.203.209.114',
  27: '113.55.16.2',
  28: '113.55.15.1',
  29: '113.55.17.2',
  88: '10.10.88.2（VRRP 管理地址）',
  92: '10.10.92.2 · 10.10.93.2',
  248: '10.10.249.2',
};

const lbNodes: TopoNode[] = [
  { id: 'core1', name: 'CG-TSG-S12510', description: '图书馆 TSG · 接口前缀 1/x/x/x', x: 375, y: 92, width: 300, height: 66, kind: 'core', href: '/itc-weathermap' },
  { id: 'core2', name: 'CG-XZL-S12510', description: '礼贤楼 LXL · 接口前缀 2/x/x/x', x: 915, y: 92, width: 300, height: 66, kind: 'core', href: '/itc-weathermap' },
  // LB HA 主备堆叠：SNMP 只在 active 成员（LB1）上应答，
  // standby（LB2）的上行链路不可见，故不画上行，仅 HA 心跳拱弧
  { id: 'lb1', name: 'H3C-TSG-LB1', description: 'HA 主用（active）· L5060', x: 420, y: 300, width: 240, height: 64, kind: 'sw' },
  { id: 'lb2', name: 'H3C-LXL-LB2', description: 'HA 备用（standby）· SNMP 不可见', x: 860, y: 300, width: 240, height: 64, kind: 'sw' },
  // 下排 VLAN 业务分组节点
  { id: 'dn_pub', name: '公网入口区', description: 'VLAN 25 / 26 · 虚 IP 入口', x: 210, y: 480, width: 190, height: 56, kind: 'zone' },
  { id: 'dn_svc', name: '业务服务区', description: 'VLAN 27 / 28 / 29 · 服务虚 IP', x: 430, y: 480, width: 190, height: 56, kind: 'zone' },
  { id: 'dn_mgmt', name: '内网管理·后端', description: 'VLAN 88 / 92 / 248 · 管理与后端', x: 650, y: 480, width: 190, height: 56, kind: 'zone' },
];

const lbLinks: TopoLink[] = [
  // 上行 trunk（LB1 active 成员可见）：LB 侧 Te1/2/4 ↔ core 侧 1/0/0/31
  { a: 'lb1', b: 'core1', port: 'uplink:lb', description: '负载均衡上行 trunk（8 个 VLAN 子接口）', peer: 'CG-TSG-S12510 · 1/0/0/31（10G，主用）', geometry: 'row1', speed: 10000, row: 0, order: 0 },
  // HA Keepalive
  { a: 'lb1', b: 'lb2', port: 'peerlink:lb', description: 'HA Keepalive 心跳', peer: 'H3C-LXL-LB2 · Te1/2/0（10G）', geometry: 'hci-peer', speed: 10000, row: 0, order: 0 },
  // VLAN 分组下行（聚合：trunk 子接口按组求和）
  ...lbVlanGroups.map((g, i) => ({
    a: `dn_${g.key}`,
    b: 'lb1',
    port: `down:lb:${g.key}`,
    description: `${g.name} · VLAN${g.vlans.join('/')}（${g.vlans.length} 个子接口）`,
    peer: g.peer,
    geometry: 'hci-down' as const,
    speed: 0,
    row: 0,
    order: i,
  })),
];

export const loadbalancerView: TopoView = {
  id: 'loadbalancer',
  title: '负载均衡',
  description: 'H3C SecPath L5060 ×2 HA 主备（单台逻辑设备 · 管理地址 10.10.88.2）· 上行 trunk 承载 8 个 VLAN 子接口分三组 · 业务模型：公网/服务虚 IP → VLAN248 后端真实服务器（38 NAT / 180 server-farm / 226 real-server）',
  deviceIds: ['lb'],
  canvasWidth: 1280,
  canvasHeight: 555,
  nodeStylePreset: 'lb',
  nodeOrder: ['core1', 'core2', 'lb1', 'lb2', 'dn_pub', 'dn_svc', 'dn_mgmt'],
  nodes: lbNodes,
  links: lbLinks,
};

// =====================================================================
// 图书馆一卡通业务视图（Yndx_YKT，依据《图书馆一卡通业务.md》）
// =====================================================================

/**
 * Yndx_YKT（锐捷 S6150 两台堆叠 · TF1/TF2）下行逻辑端口定义（collector 按此发现）。
 * 跨堆叠聚合（Ag1~4）按堆叠成员拆为两条物理链路（TF1/TF2 各一条）——聚合口计数
 * 为跨成员整体、无法归到单台成员，故全部按成员物理口采集。
 * 上联 Ag4（TF1/0/45 + TF2/0/45 跨成员 LACP 20G）数据取核心侧物理口
 * Te1/0/0/20、Te2/0/0/20（discoverCorePorts 自动采集）。
 */
export function yktPortDefs(): LogicalPortDef[] {
  return [
    // 堆叠互联（TF1/0/47/48 + TF2/0/47/48；取 TF1 侧两口求和，避免对端双算）
    { key: 'link:ykt:stack', members: [{ name: '1/0/47' }, { name: '1/0/48' }] },
    // 深信服虚拟化平台 3 组业务口：Ag1/Ag2/Ag3 各 2×10G 跨堆叠成员
    //（成员口 SERVER1~3 标于 TF1|2/0/4~6，聚合与端口的精确对应待核实）
    { key: 'down:ykt:t1:sxf1', members: [{ name: '1/0/4' }] },
    { key: 'down:ykt:t2:sxf1', members: [{ name: '2/0/4' }] },
    { key: 'down:ykt:t1:sxf2', members: [{ name: '1/0/5' }] },
    { key: 'down:ykt:t2:sxf2', members: [{ name: '2/0/5' }] },
    { key: 'down:ykt:t1:sxf3', members: [{ name: '1/0/6' }] },
    { key: 'down:ykt:t2:sxf3', members: [{ name: '2/0/6' }] },
    // 一卡通数据库一体机：2×10G（TF2/0/25·26，新华三 MAC 94:a6:d8）
    // + 2×1G 光转电（TF1/0/36、TF2/0/36，台账误标 10G）
    { key: 'down:ykt:t2:db10g1', members: [{ name: '2/0/25' }] },
    { key: 'down:ykt:t2:db10g2', members: [{ name: '2/0/26' }] },
    { key: 'down:ykt:t1:db1g1', members: [{ name: '1/0/36' }] },
    { key: 'down:ykt:t2:db1g2', members: [{ name: '2/0/36' }] },
    // 原防火墙接口（alias FW1/FW2，已停用 DOWN）
    { key: 'down:ykt:t1:fw', members: [{ name: '1/0/46' }] },
    { key: 'down:ykt:t2:fw', members: [{ name: '2/0/46' }] },
  ];
}

/** 交换机展示名（明细表 switchLabel 列用；ykts1/ykts2 为堆叠成员 TF1/TF2） */
export const yktSwitchMeta: Record<string, { label: string }> = {
  ykts1: { label: 'Yndx_YKT·TF1' },
  ykts2: { label: 'Yndx_YKT·TF2' },
};

const yktNodes: TopoNode[] = [
  { id: 'core1', name: 'CG-TSG-S12510', description: '图书馆 TSG · 接口前缀 1/x/x/x', x: 375, y: 92, width: 300, height: 66, kind: 'core', href: '/itc-weathermap' },
  { id: 'core2', name: 'CG-XZL-S12510', description: '礼贤楼 LXL · 接口前缀 2/x/x/x', x: 915, y: 92, width: 300, height: 66, kind: 'core', href: '/itc-weathermap' },
  { id: 'ykts1', name: 'Yndx_YKT · TF1', description: '一卡通业务交换机 · 堆叠成员 1 · 10.10.251.4', x: 375, y: 300, width: 280, height: 76, kind: 'sw' },
  { id: 'ykts2', name: 'Yndx_YKT · TF2', description: '一卡通业务交换机 · 堆叠成员 2 · 10.10.251.4', x: 915, y: 300, width: 280, height: 76, kind: 'sw' },
  { id: 'dn_sxf', name: '深信服虚拟化平台', description: '3 节点（Ag1/Ag2/Ag3 各 20G）', x: 200, y: 510, width: 210, height: 64, kind: 'zone' },
  { id: 'dn_db', name: '一卡通数据库一体机', description: '2×10G + 2×1G（光转电）', x: 645, y: 510, width: 220, height: 64, kind: 'zone' },
  { id: 'dn_fw', name: 'FW1 / FW2', description: '原防火墙接口（已停用 DOWN）', x: 1055, y: 510, width: 180, height: 64, kind: 'zone' },
];

const yktLinks: TopoLink[] = [
  // 上联（Ag4 跨成员 LACP 按成员口显示：TF1/0/45 ⇄ Te1/0/0/20、TF2/0/45 ⇄ Te2/0/0/20，各 10G）
  { a: 'ykts1', b: 'core1', port: '1/0/0/20', description: 'Yndx_YKT·TF1 → CG-TSG-S12510', peer: 'CG-TSG-S12510 · Te1/0/0/20（YKT 侧 Ag4 成员 TF1/0/45）', geometry: 'hci-up', speed: 10000, row: 0, order: 0 },
  { a: 'ykts2', b: 'core2', port: '2/0/0/20', description: 'Yndx_YKT·TF2 → CG-XZL-S12510', peer: 'CG-XZL-S12510 · Te2/0/0/20（YKT 侧 Ag4 成员 TF2/0/45）', geometry: 'hci-up', speed: 10000, row: 0, order: 1 },
  // 堆叠互联（TF1/0/47/48 + TF2/0/47/48，已确认 UP；取 TF1 侧两口求和）
  { a: 'ykts1', b: 'ykts2', port: 'link:ykt:stack', description: 'Yndx_YKT 堆叠互联', peer: 'TF1/0/47/48 + TF2/0/47/48（各 10G，本线取 TF1 侧求和 20G）', geometry: 'hci-peer', speed: 20000, row: 0, order: 2 },
  // 下行（description 以「标签（TFx） 下行」开头，节点悬停按标签展示分支；
  // 跨堆叠双归按成员拆两条，同一标签 TF1/TF2 各一条）
  { a: 'dn_sxf', b: 'ykts1', port: 'down:ykt:t1:sxf1', description: 'Ag1（TF1）下行 · 深信服虚拟化平台', peer: '深信服节点 1 · Ag1 成员 TF1/0/4（Ag1 跨堆叠 2×10G 之 TF1 侧）', geometry: 'hci-down', speed: 10000, row: 0, order: 0 },
  { a: 'dn_sxf', b: 'ykts2', port: 'down:ykt:t2:sxf1', description: 'Ag1（TF2）下行 · 深信服虚拟化平台', peer: '深信服节点 1 · Ag1 成员 TF2/0/4（Ag1 跨堆叠 2×10G 之 TF2 侧）', geometry: 'hci-down', speed: 10000, row: 0, order: 1 },
  { a: 'dn_sxf', b: 'ykts1', port: 'down:ykt:t1:sxf2', description: 'Ag2（TF1）下行 · 深信服虚拟化平台', peer: '深信服节点 2 · Ag2 成员 TF1/0/5（Ag2 跨堆叠 2×10G 之 TF1 侧）', geometry: 'hci-down', speed: 10000, row: 0, order: 2 },
  { a: 'dn_sxf', b: 'ykts2', port: 'down:ykt:t2:sxf2', description: 'Ag2（TF2）下行 · 深信服虚拟化平台', peer: '深信服节点 2 · Ag2 成员 TF2/0/5（Ag2 跨堆叠 2×10G 之 TF2 侧）', geometry: 'hci-down', speed: 10000, row: 0, order: 3 },
  { a: 'dn_sxf', b: 'ykts1', port: 'down:ykt:t1:sxf3', description: 'Ag3（TF1）下行 · 深信服虚拟化平台', peer: '深信服节点 3 · Ag3 成员 TF1/0/6（Ag3 跨堆叠 2×10G 之 TF1 侧）', geometry: 'hci-down', speed: 10000, row: 0, order: 4 },
  { a: 'dn_sxf', b: 'ykts2', port: 'down:ykt:t2:sxf3', description: 'Ag3（TF2）下行 · 深信服虚拟化平台', peer: '深信服节点 3 · Ag3 成员 TF2/0/6（Ag3 跨堆叠 2×10G 之 TF2 侧）', geometry: 'hci-down', speed: 10000, row: 0, order: 5 },
  { a: 'dn_db', b: 'ykts2', port: 'down:ykt:t2:db10g1', description: 'DB·10G①（TF2）下行 · 一卡通数据库一体机', peer: '一卡通数据库一体机 · TF2/0/25（10G，业务 MAC 94:a6:d8）', geometry: 'hci-down', speed: 10000, row: 1, order: 0 },
  { a: 'dn_db', b: 'ykts2', port: 'down:ykt:t2:db10g2', description: 'DB·10G②（TF2）下行 · 一卡通数据库一体机', peer: '一卡通数据库一体机 · TF2/0/26（10G）', geometry: 'hci-down', speed: 10000, row: 1, order: 1 },
  { a: 'dn_db', b: 'ykts1', port: 'down:ykt:t1:db1g1', description: 'DB·1G①（TF1）下行 · 一卡通数据库一体机', peer: '一卡通数据库一体机 · TF1/0/36（1G 光转电，台账误标 10G）', geometry: 'hci-down', speed: 1000, row: 1, order: 2 },
  { a: 'dn_db', b: 'ykts2', port: 'down:ykt:t2:db1g2', description: 'DB·1G②（TF2）下行 · 一卡通数据库一体机', peer: '一卡通数据库一体机 · TF2/0/36（1G 光转电，台账误标 10G）', geometry: 'hci-down', speed: 1000, row: 1, order: 3 },
  { a: 'dn_fw', b: 'ykts1', port: 'down:ykt:t1:fw', description: 'FW1（TF1）下行 · 原防火墙接口', peer: '原防火墙 FW1 · TF1/0/46（alias FW1，已停用 DOWN）', geometry: 'hci-down', speed: 10000, row: 2, order: 0 },
  { a: 'dn_fw', b: 'ykts2', port: 'down:ykt:t2:fw', description: 'FW2（TF2）下行 · 原防火墙接口', peer: '原防火墙 FW2 · TF2/0/46（alias FW2，已停用 DOWN）', geometry: 'hci-down', speed: 10000, row: 2, order: 1 },
];

export const yktView: TopoView = {
  id: 'ykt',
  title: '图书馆一卡通业务',
  description: 'Yndx_YKT（锐捷 S6150 两台堆叠 · 10.10.251.4，堆叠成员 TF1/TF2 分示）双 10G 上联核心（Ag4 跨成员 LACP）· 下挂深信服虚拟化平台（Ag1/2/3 各 20G）、一卡通数据库一体机（2×10G + 2×1G）与已停用防火墙接口 · 堆叠互联与 VLAN 划分见文档',
  deviceIds: ['core', 'ykt'],
  canvasWidth: 1280,
  canvasHeight: 620,
  nodeStylePreset: 'ykt',
  nodeOrder: ['core1', 'core2', 'ykts1', 'ykts2', 'dn_sxf', 'dn_db', 'dn_fw'],
  nodes: yktNodes,
  links: yktLinks,
};

// =====================================================================
// 图书馆分布式存储业务视图（宏杉 m-lag 4 台 H3C S6530X，依据《图书馆分布式存储业务.md》）
// =====================================================================

/** H3C S6530X 25G 物理口 ifName */
const HSC = (n: number) => `Twenty-FiveGigE1/0/${n}`;
/** H3C S6530X 聚合口 ifName */
const HAGG = (n: number) => `Bridge-Aggregation${n}`;

/** m-lag 配对（对1：st26↔st28；对2：st27↔st25），同号口接同一台宏杉/节点 */
const STORAGE_PAIR_PEER: Record<string, string> = {
  st25: 'st27', st26: 'st28', st27: 'st25', st28: 'st26',
};
/** 宏杉接入平面：对1 = 上核心 + 数据，对2 = 数据交换 */
const STORAGE_PLANE: Record<string, string> = {
  st25: '对2', st26: '对1', st27: '对2', st28: '对1',
};

/** 交换机展示名与 IP（明细表 switchLabel 列用） */
export const storageSwitchMeta: Record<string, { label: string; name: string }> = {
  st25: { label: '.25', name: 'YD_TSG_B10_25U_SW1' },
  st26: { label: '.26', name: 'YD_TSG_B10_23U_SW2' },
  st27: { label: '.27', name: 'YD_TSG_B09_25U_SW1' },
  st28: { label: '.28', name: 'YD_TSG_B09_23U_SW2' },
};

/** 宏杉分布式存储 25G 端口号（每台交换机 12 口，同号口 = 同一台服务器的一路） */
export const STORAGE_HS_PORTS = Array.from({ length: 12 }, (_, i) => i + 1);
/** 云大学堂 10G 端口号（仅对1两台 .26/.28 实配） */
export const STORAGE_YDX_PORTS = [25, 26, 27, 28, 29, 30];

/**
 * 4 台存储交换机逻辑端口定义（collector 按此发现）：
 * - 上联核心（仅对1两台）：BAGG45 = eth0-43 + eth0-45（20G），核心侧 BAGG118（Te1|2/0/0/21+22）；
 * - m-lag 互联：BAGG1024 = eth0-47/48（peer-link）+ eth0-46（keepalive），LLDP 双向互指实测；
 * - 宏杉 ×12：每口 25G（同号 BAGG(n) 存在则优先，否则物理口兜底）；
 * - 云大学堂 ×6（VLAN144）：仅 .26/.28，.28 实接 UP，.26 已配置未接线 Down 属实。
 */
export function storagePortDefs(swId: string): LogicalPortDef[] {
  const isDui1 = swId === 'st26' || swId === 'st28';
  const defs: LogicalPortDef[] = [];
  if (isDui1) {
    defs.push({
      key: `uplink:${swId}`,
      agg: [HAGG(45)],
      members: [{ name: HSC(43) }, { name: HSC(45) }],
    });
  }
  defs.push({
    key: `peerlink:${swId}`,
    agg: [HAGG(1024)],
    members: [{ name: HSC(46) }, { name: HSC(47) }, { name: HSC(48) }],
  });
  const hsMembers = STORAGE_HS_PORTS.map((n) => ({ name: HSC(n), agg: [HAGG(n)] }));
  defs.push({ key: `down:${swId}:hs`, members: hsMembers });
  hsMembers.forEach((m, i) => defs.push({ key: `down:${swId}:hs#${i + 1}`, members: [m] }));
  if (isDui1) {
    const ydxMembers = STORAGE_YDX_PORTS.map((n) => ({ name: HSC(n), agg: [HAGG(n)] }));
    defs.push({ key: `down:${swId}:ydx`, members: ydxMembers });
    ydxMembers.forEach((m) => {
      const n = parseInt(/(\d+)$/.exec(m.name)![1], 10);
      defs.push({ key: `down:${swId}:ydx#${n}`, members: [m] });
    });
  }
  return defs;
}

/** 逐端口对端文案（链路明细表「对端」列用） */
export function storagePortPeer(swId: string, catKey: string, port: number): string {
  const other = STORAGE_PAIR_PEER[swId] ?? '';
  const plane = STORAGE_PLANE[swId] ?? '';
  if (catKey === 'hs') {
    return `宏杉分布式存储 ${plane} 平面 · 第 ${port} 路（25G，同号口另一路接 ${other}）`;
  }
  if (catKey === 'ydx') {
    return swId === 'st28'
      ? `云大学堂节点 VLAN144 · [${port}]（另一归 ${other} 已配置未接线）`
      : `云大学堂节点 VLAN144 · [${port}]（单挂 .28 侧，本侧已配置未接线 Down 属实）`;
  }
  return '';
}

const storageNodes: TopoNode[] = [
  { id: 'mgmt21', name: 'cg-tsg-b08-daiwai2', description: '管理汇聚（带外）· 4 台交换机与宏杉管理口经此上核心（VLAN248）', x: 375, y: 64, width: 300, height: 56, kind: 'zone' },
  { id: 'core1', name: 'CG-TSG-S12510', description: '图书馆 TSG · 接口前缀 1/x/x/x', x: 375, y: 210, width: 300, height: 66, kind: 'core', href: '/itc-weathermap' },
  { id: 'core2', name: 'CG-XZL-S12510', description: '礼贤楼 LXL · 接口前缀 2/x/x/x', x: 915, y: 210, width: 300, height: 66, kind: 'core', href: '/itc-weathermap' },
  { id: 'st28', name: 'YD_TSG_B09_23U_SW2', description: '对1 上联核心 · 10.10.251.28', x: 250, y: 400, width: 240, height: 64, kind: 'sw' },
  { id: 'st26', name: 'YD_TSG_B10_23U_SW2', description: '对1 上联核心 · 10.10.251.26', x: 520, y: 400, width: 240, height: 64, kind: 'sw' },
  { id: 'st27', name: 'YD_TSG_B09_25U_SW1', description: '对2 数据交换 · 10.10.251.27', x: 800, y: 400, width: 240, height: 64, kind: 'sw' },
  { id: 'st25', name: 'YD_TSG_B10_25U_SW1', description: '对2 数据交换 · 10.10.251.25', x: 1060, y: 400, width: 240, height: 64, kind: 'sw' },
  { id: 'dn_ydx', name: '云大学堂', description: '6 台（VLAN144，单挂 .28 侧）', x: 385, y: 578, width: 210, height: 54, kind: 'zone' },
  { id: 'dn_hs', name: '宏杉分布式存储', description: '12 台（每台 4 路 25G）', x: 800, y: 578, width: 210, height: 54, kind: 'zone' },
];

const storageLinks: TopoLink[] = [
  // 管理汇聚带外 → 核心（数据取核心侧物理口 Te1/0/0/25；LLDP 无邻居属正常）
  { a: 'mgmt21', b: 'core1', port: '1/0/0/25', description: 'cg-tsg-b08-daiwai2 → CG-TSG-S12510', peer: 'CG-TSG-S12510 · Te1/0/0/25（alias LangChao-DaiWai-Swith-B08，Swith 为原文拼写）', geometry: 'uplink', speed: 0, row: 0, order: 0 },
  // 对1 两台上联核心（数据取交换机侧 BAGG45 = eth0-43+45）
  { a: 'st28', b: 'core1', port: 'uplink:st28', description: 'YD_TSG_B09_23U_SW2 → CG-TSG-S12510', peer: 'CG-TSG-S12510 · BAGG118（Te1/0/0/21+22）', geometry: 'hci-up', speed: 20000, row: 0, order: 0 },
  { a: 'st26', b: 'core2', port: 'uplink:st26', description: 'YD_TSG_B10_23U_SW2 → CG-XZL-S12510', peer: 'CG-XZL-S12510 · BAGG118（Te2/0/0/21+22）', geometry: 'hci-up', speed: 20000, row: 0, order: 0 },
  // 宏杉 ×12（每台交换机 12 口 25G，逐口行见明细表）
  ...(['st28', 'st26', 'st27', 'st25'] as const).map((swId, i) => ({
    a: 'dn_hs',
    b: swId,
    port: `down:${swId}:hs`,
    description: `${storageSwitchMeta[swId].label} 下行 · 宏杉分布式存储 ×12（[1]–[12]）`,
    peer: `宏杉分布式存储 ×12 · ${STORAGE_PLANE[swId]} 平面 25G（同号口与 ${STORAGE_PAIR_PEER[swId]} 同卡）`,
    geometry: 'hci-down' as const,
    speed: 300000,
    row: 0,
    order: i,
  })),
  // 云大学堂 ×6（VLAN144，.28 实接；.26 已配置未接线 Down 属实）
  { a: 'dn_ydx', b: 'st28', port: 'down:st28:ydx', description: '.28 下行 · 云大学堂 ×6（[25]–[30]）', peer: '云大学堂节点 VLAN144 ×6（另一归 .26 已配置未接线）', geometry: 'hci-down', speed: 60000, row: 1, order: 0 },
  { a: 'dn_ydx', b: 'st26', port: 'down:st26:ydx', description: '.26 下行 · 云大学堂 ×6（[25]–[30]）', peer: '云大学堂节点 VLAN144 ×6（实测 Down 属实：单挂 .28 侧）', geometry: 'hci-down', speed: 60000, row: 1, order: 1 },
  // m-lag 互联（BAGG1024 = eth0-47/48 peer-link + eth0-46 keepalive，LLDP 双向互指实测）
  { a: 'st26', b: 'st28', port: 'peerlink:st26', description: 'YD_TSG_B10_23U_SW2 ↔ YD_TSG_B09_23U_SW2（对1 m-lag）', peer: 'BAGG1024（eth0-47/48 peer-link + eth0-46 keepalive）', geometry: 'hci-peer', speed: 30000, row: 0, order: 0 },
  { a: 'st27', b: 'st25', port: 'peerlink:st27', description: 'YD_TSG_B09_25U_SW1 ↔ YD_TSG_B10_25U_SW1（对2 m-lag）', peer: 'BAGG1024（eth0-47/48 peer-link + eth0-46 keepalive）', geometry: 'hci-peer', speed: 30000, row: 0, order: 0 },
];

export const storageView: TopoView = {
  id: 'storage',
  title: '图书馆分布式存储',
  description: '4 台 H3C S6530X（10.10.251.25-28）m-lag 双平面（对1 上核心 / 对2 数据交换）· 宏杉分布式存储 ×12 每台 4 路 25G 接入 · 云大学堂 ×6 VLAN144 单挂 .28 侧 · 管理面经带外汇聚独立上核心（VLAN248）',
  deviceIds: ['core', 'st25', 'st26', 'st27', 'st28'],
  canvasWidth: 1280,
  canvasHeight: 660,
  nodeStylePreset: 'storage',
  nodeOrder: ['mgmt21', 'core1', 'core2', 'st28', 'st26', 'st27', 'st25', 'dn_ydx', 'dn_hs'],
  nodes: storageNodes,
  links: storageLinks,
};

// =====================================================================
// 图书馆灾备业务视图（图书馆灾备10G业务交换机，依据《图书馆灾备业务.md》）
// =====================================================================

/**
 * 图书馆灾备10G业务交换机（锐捷 S6150 两台堆叠 · TF1/TF2）下行逻辑端口定义。
 * 上联 40G×2（核心 FortyGigE1|2/0/0/33 → 灾备侧 Hu1|2/0/49，数据取核心侧实测；
 * 早期资料标 10G 为笔误，实测 ifHighSpeed=40000）。
 * 端口号 eth0-N 为堆叠口号：同一编号在 TF1/TF2 各有一个物理口；双归设备按成员拆两条链路。
 */
export function zabPortDefs(): LogicalPortDef[] {
  return [
    // 堆叠互联（eth0-47/48 = TF1|2/0/47、48；取 TF1 侧两口求和，避免对端双算）
    { key: 'link:zab:stack', members: [{ name: '1/0/47' }, { name: '1/0/48' }] },
    // 浪潮3节点2路超融合 ×3：每台 4 路 10G（TF1|2/0/5~7 + TF1|2/0/8~10，LLDP sysName 实测），
    // 按堆叠成员拆两条（各 2×10G）
    { key: 'down:zab:t1:3n1', members: [{ name: '1/0/5' }, { name: '1/0/8' }] },
    { key: 'down:zab:t2:3n1', members: [{ name: '2/0/5' }, { name: '2/0/8' }] },
    { key: 'down:zab:t1:3n2', members: [{ name: '1/0/6' }, { name: '1/0/9' }] },
    { key: 'down:zab:t2:3n2', members: [{ name: '2/0/6' }, { name: '2/0/9' }] },
    { key: 'down:zab:t1:3n3', members: [{ name: '1/0/7' }, { name: '1/0/10' }] },
    { key: 'down:zab:t2:3n3', members: [{ name: '2/0/7' }, { name: '2/0/10' }] },
    // 数据中心主数据库一体机：[11][12]（Dell + H3C 双厂商网卡）+ [13]（未登记，TF1/0/13 UP 有流量）
    { key: 'down:zab:t1:db', members: [{ name: '1/0/11' }, { name: '1/0/12' }, { name: '1/0/13' }] },
    { key: 'down:zab:t2:db', members: [{ name: '2/0/11' }, { name: '2/0/12' }] },
    // 浪潮4节点测试超融合 ×4：每台 TF1+TF2 各 1 路（LLDP 邻居实测）
    { key: 'down:zab:t1:4n1', members: [{ name: '1/0/26' }] },
    { key: 'down:zab:t2:4n1', members: [{ name: '2/0/26' }] },
    { key: 'down:zab:t1:4n2', members: [{ name: '1/0/27' }] },
    { key: 'down:zab:t2:4n2', members: [{ name: '2/0/27' }] },
    { key: 'down:zab:t1:4n3', members: [{ name: '1/0/28' }] },
    { key: 'down:zab:t2:4n3', members: [{ name: '2/0/28' }] },
    { key: 'down:zab:t1:4n4', members: [{ name: '1/0/29' }] },
    { key: 'down:zab:t2:4n4', members: [{ name: '2/0/29' }] },
    // 爱数灾备 ×9：跨堆叠双归聚合 Ag35~43 按成员物理口拆两条（各 10G；
    // 35~40 xFusion 机身、41~43 Intel 网卡批次）
    ...([35, 36, 37, 38, 39, 40, 41, 42, 43] as const).flatMap((n) => [
      { key: `down:zab:t1:as${n}`, members: [{ name: `1/0/${n}` }] },
      { key: `down:zab:t2:as${n}`, members: [{ name: `2/0/${n}` }] },
    ]),
  ];
}

/** 交换机展示名（明细表 switchLabel 列用；zabs1/zabs2 为堆叠成员 TF1/TF2） */
export const zabSwitchMeta: Record<string, { label: string }> = {
  zabs1: { label: '灾备SW·TF1' },
  zabs2: { label: '灾备SW·TF2' },
};

const zabNodes: TopoNode[] = [
  { id: 'core1', name: 'CG-TSG-S12510', description: '图书馆 TSG · 接口前缀 1/x/x/x', x: 375, y: 92, width: 300, height: 66, kind: 'core', href: '/itc-weathermap' },
  { id: 'core2', name: 'CG-XZL-S12510', description: '礼贤楼 LXL · 接口前缀 2/x/x/x', x: 915, y: 92, width: 300, height: 66, kind: 'core', href: '/itc-weathermap' },
  { id: 'zabs1', name: '灾备SW · TF1', description: '灾备10G业务交换机 · 堆叠成员 1 · 10.10.251.2', x: 375, y: 300, width: 290, height: 76, kind: 'sw' },
  { id: 'zabs2', name: '灾备SW · TF2', description: '灾备10G业务交换机 · 堆叠成员 2 · 10.10.251.2', x: 915, y: 300, width: 290, height: 76, kind: 'sw' },
  { id: 'dn_3node', name: '浪潮3节点2路超融合', description: '3 台（allinone-01/02、node-57760）', x: 160, y: 510, width: 230, height: 64, kind: 'zone' },
  { id: 'dn_db', name: '主数据库一体机', description: '双网卡 [11][12] 与未登记 [13]', x: 455, y: 510, width: 215, height: 64, kind: 'zone' },
  { id: 'dn_4node', name: '浪潮4节点测试超融合', description: '4 台（allinone-101/102、node-103/104）', x: 740, y: 510, width: 235, height: 64, kind: 'zone' },
  { id: 'dn_aishu', name: '爱数灾备服务器', description: '9 台（Ag35~43 双归聚合 2×10G）', x: 1060, y: 510, width: 215, height: 64, kind: 'zone' },
];

const zabLinks: TopoLink[] = [
  // 上联 40G×2（数据取核心侧物理口；两核心 33 口双归同一台堆叠设备的两个成员，见文档 §6-1）
  { a: 'zabs1', b: 'core1', port: '1/0/0/33', description: '灾备SW·TF1 → CG-TSG-S12510', peer: 'CG-TSG-S12510 · FortyGigE1/0/0/33（灾备侧 Hu1/0/49）', geometry: 'hci-up', speed: 40000, row: 0, order: 0 },
  { a: 'zabs2', b: 'core2', port: '2/0/0/33', description: '灾备SW·TF2 → CG-XZL-S12510', peer: 'CG-XZL-S12510 · FortyGigE2/0/0/33（灾备侧 Hu2/0/49）', geometry: 'hci-up', speed: 40000, row: 0, order: 1 },
  // 堆叠互联（TF1/0/47/48 + TF2/0/47/48，实测有跨堆叠同步流量；取 TF1 侧两口求和）
  { a: 'zabs1', b: 'zabs2', port: 'link:zab:stack', description: '灾备交换机堆叠互联', peer: 'TF1/0/47/48 + TF2/0/47/48（各 10G，本线取 TF1 侧求和 20G，两侧方向互补）', geometry: 'hci-peer', speed: 20000, row: 0, order: 2 },
  // 下行（description 以「标签（TFx） 下行」开头，节点悬停按标签展示分支；
  // 双归设备按堆叠成员拆两条，同一标签 TF1/TF2 各一条）
  { a: 'dn_3node', b: 'zabs1', port: 'down:zab:t1:3n1', description: 'allinone-01（TF1）下行 · 浪潮3节点2路超融合', peer: 'allinone-01-93420 · TF1/0/5 + TF1/0/8（该机 4×10G 之 TF1 侧）', geometry: 'hci-down', speed: 20000, row: 0, order: 0 },
  { a: 'dn_3node', b: 'zabs2', port: 'down:zab:t2:3n1', description: 'allinone-01（TF2）下行 · 浪潮3节点2路超融合', peer: 'allinone-01-93420 · TF2/0/5 + TF2/0/8（该机 4×10G 之 TF2 侧）', geometry: 'hci-down', speed: 20000, row: 0, order: 1 },
  { a: 'dn_3node', b: 'zabs1', port: 'down:zab:t1:3n2', description: 'allinone-02（TF1）下行 · 浪潮3节点2路超融合', peer: 'allinone-02-45560 · TF1/0/6 + TF1/0/9（该机 4×10G 之 TF1 侧）', geometry: 'hci-down', speed: 20000, row: 0, order: 2 },
  { a: 'dn_3node', b: 'zabs2', port: 'down:zab:t2:3n2', description: 'allinone-02（TF2）下行 · 浪潮3节点2路超融合', peer: 'allinone-02-45560 · TF2/0/6 + TF2/0/9（该机 4×10G 之 TF2 侧）', geometry: 'hci-down', speed: 20000, row: 0, order: 3 },
  { a: 'dn_3node', b: 'zabs1', port: 'down:zab:t1:3n3', description: 'node-57760（TF1）下行 · 浪潮3节点2路超融合', peer: 'node-57760-41958 · TF1/0/7 + TF1/0/10（该机 4×10G 之 TF1 侧）', geometry: 'hci-down', speed: 20000, row: 0, order: 4 },
  { a: 'dn_3node', b: 'zabs2', port: 'down:zab:t2:3n3', description: 'node-57760（TF2）下行 · 浪潮3节点2路超融合', peer: 'node-57760-41958 · TF2/0/7 + TF2/0/10（该机 4×10G 之 TF2 侧）', geometry: 'hci-down', speed: 20000, row: 0, order: 5 },
  { a: 'dn_db', b: 'zabs1', port: 'down:zab:t1:db', description: 'DB一体机（TF1）下行 · 主数据库一体机', peer: '数据中心主数据库一体机 · TF1/0/11 + TF1/0/12 + TF1/0/13（[13] 未登记 UP 有流量）', geometry: 'hci-down', speed: 30000, row: 1, order: 0 },
  { a: 'dn_db', b: 'zabs2', port: 'down:zab:t2:db', description: 'DB一体机（TF2）下行 · 主数据库一体机', peer: '数据中心主数据库一体机 · TF2/0/11 + TF2/0/12（Dell + H3C 双网卡）', geometry: 'hci-down', speed: 20000, row: 1, order: 1 },
  { a: 'dn_4node', b: 'zabs1', port: 'down:zab:t1:4n1', description: 'allinone-101（TF1）下行 · 浪潮4节点测试超融合', peer: 'allinone-101 · TF1/0/26（双归之 TF1 侧）', geometry: 'hci-down', speed: 10000, row: 2, order: 0 },
  { a: 'dn_4node', b: 'zabs2', port: 'down:zab:t2:4n1', description: 'allinone-101（TF2）下行 · 浪潮4节点测试超融合', peer: 'allinone-101 · TF2/0/26（双归之 TF2 侧）', geometry: 'hci-down', speed: 10000, row: 2, order: 1 },
  { a: 'dn_4node', b: 'zabs1', port: 'down:zab:t1:4n2', description: 'allinone-102（TF1）下行 · 浪潮4节点测试超融合', peer: 'allinone-102 · TF1/0/27（双归之 TF1 侧）', geometry: 'hci-down', speed: 10000, row: 2, order: 2 },
  { a: 'dn_4node', b: 'zabs2', port: 'down:zab:t2:4n2', description: 'allinone-102（TF2）下行 · 浪潮4节点测试超融合', peer: 'allinone-102 · TF2/0/27（双归之 TF2 侧）', geometry: 'hci-down', speed: 10000, row: 2, order: 3 },
  { a: 'dn_4node', b: 'zabs1', port: 'down:zab:t1:4n3', description: 'node-103（TF1）下行 · 浪潮4节点测试超融合', peer: 'node-103 · TF1/0/28（双归之 TF1 侧）', geometry: 'hci-down', speed: 10000, row: 2, order: 4 },
  { a: 'dn_4node', b: 'zabs2', port: 'down:zab:t2:4n3', description: 'node-103（TF2）下行 · 浪潮4节点测试超融合', peer: 'node-103 · TF2/0/28（双归之 TF2 侧）', geometry: 'hci-down', speed: 10000, row: 2, order: 5 },
  { a: 'dn_4node', b: 'zabs1', port: 'down:zab:t1:4n4', description: 'node-104（TF1）下行 · 浪潮4节点测试超融合', peer: 'node-104 · TF1/0/29（双归之 TF1 侧）', geometry: 'hci-down', speed: 10000, row: 2, order: 6 },
  { a: 'dn_4node', b: 'zabs2', port: 'down:zab:t2:4n4', description: 'node-104（TF2）下行 · 浪潮4节点测试超融合', peer: 'node-104 · TF2/0/29（双归之 TF2 侧）', geometry: 'hci-down', speed: 10000, row: 2, order: 7 },
  ...([35, 36, 37, 38, 39, 40, 41, 42, 43] as const).flatMap((n) => [
    {
      a: 'dn_aishu',
      b: 'zabs1',
      port: `down:zab:t1:as${n}`,
      description: `Ag${n}（TF1）下行 · 爱数灾备`,
      peer: `爱数灾备服务器 · Ag${n} 成员 TF1/0/${n}（跨堆叠 2×10G 之 TF1 侧，${n <= 40 ? 'xFusion 机身' : 'Intel 网卡'}批次）`,
      geometry: 'hci-down' as const,
      speed: 10000,
      row: 3,
      order: (n - 35) * 2,
    },
    {
      a: 'dn_aishu',
      b: 'zabs2',
      port: `down:zab:t2:as${n}`,
      description: `Ag${n}（TF2）下行 · 爱数灾备`,
      peer: `爱数灾备服务器 · Ag${n} 成员 TF2/0/${n}（跨堆叠 2×10G 之 TF2 侧，${n <= 40 ? 'xFusion 机身' : 'Intel 网卡'}批次）`,
      geometry: 'hci-down' as const,
      speed: 10000,
      row: 3,
      order: (n - 35) * 2 + 1,
    },
  ]),
];

export const zabView: TopoView = {
  id: 'zab',
  title: '图书馆灾备业务',
  description: '灾备10G业务交换机（锐捷 S6150 两台堆叠 · 10.10.251.2，堆叠成员 TF1/TF2 分示，原图书馆超融合）双 40G 上联核心（33 口，双归同一堆叠设备）· 下挂浪潮3节点2路超融合 ×3、主数据库一体机、浪潮4节点测试超融合 ×4、爱数灾备 ×9（Ag35~43 双归聚合）',
  deviceIds: ['core', 'zab'],
  canvasWidth: 1280,
  canvasHeight: 620,
  nodeStylePreset: 'zab',
  nodeOrder: ['core1', 'core2', 'zabs1', 'zabs2', 'dn_3node', 'dn_db', 'dn_4node', 'dn_aishu'],
  nodes: zabNodes,
  links: zabLinks,
};

// =====================================================================
// 视图索引
// =====================================================================

const ALL_VIEWS: Record<string, TopoView> = {
  core: coreView,
  hyperconverged: hyperconvergedView,
  loadbalancer: loadbalancerView,
  ykt: yktView,
  storage: storageView,
  zab: zabView,
};

export function getTopoView(viewId: string): TopoView | undefined {
  return ALL_VIEWS[viewId];
}

export function getAllViewIds(): string[] {
  return Object.keys(ALL_VIEWS);
}
