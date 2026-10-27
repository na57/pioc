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

export interface TopoView {
  id: string;
  title: string;
  description: string;
  deviceIds: string[];
  canvasWidth: number;
  canvasHeight: number;
  nodeStylePreset: 'core' | 'hci' | 'lb';
  nodeOrder: string[];
  nodes: TopoNode[];
  links: TopoLink[];
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
  { id: 'hci25', name: '超融合业务组', description: '1|2/0/0/16·17', x: 128, y: 550, width: 190, height: 60, kind: 'biz', href: '/itc-weathermap/hyperconverged' },
  { id: 'store25', name: '图书馆分布式存储', description: '1|2/0/0/22', x: 384, y: 550, width: 190, height: 60, kind: 'biz' },
  { id: 'ykt10', name: '图书馆一卡通超融合', description: '1|2/0/0/20', x: 640, y: 550, width: 190, height: 60, kind: 'biz' },
  { id: 'db40', name: '图书馆超融合', description: '1|2/0/0/33', x: 896, y: 550, width: 190, height: 60, kind: 'biz' },
  // 业务 row 2
  { id: 'lb', name: '负载均衡', description: '1|2/0/0/31', x: 256, y: 712, width: 190, height: 60, kind: 'biz', href: '/itc-weathermap/loadbalancer' },
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
  { a: 'hci25', b: 'core1', port: '1/0/0/16', description: '超融合业务组 → CG-TSG-S12510', peer: 'cg-tsg-d06-yewu1', geometry: 'row1', speed: 10000, row: 1, order: 0 },
  { a: 'hci25', b: 'core1', port: '1/0/0/17', description: '超融合业务组 → CG-TSG-S12510', peer: 'cg-lxl2-b02-yewu3', geometry: 'row1', speed: 10000, row: 1, order: 1 },
  { a: 'store25', b: 'core1', port: '1/0/0/22', description: '图书馆分布式存储 → CG-TSG-S12510', peer: 'YD_TSG_B09_23U_SW2', geometry: 'row1', speed: 25000, row: 1, order: 2 },
  { a: 'ykt10', b: 'core1', port: '1/0/0/20', description: '图书馆一卡通超融合 → CG-TSG-S12510', peer: 'Yndx_YKT', geometry: 'row1', speed: 10000, row: 1, order: 3 },
  { a: 'db40', b: 'core1', port: '1/0/0/33', description: '图书馆超融合 → CG-TSG-S12510', peer: 'TSG-RJ-JieRu', geometry: 'row1', speed: 10000, row: 1, order: 4 },
  // Row 1 业务下联 → core2
  { a: 'hci25', b: 'core2', port: '2/0/0/16', description: '超融合业务组 → CG-XZL-S12510', peer: 'cg-tsg-d07-yewu2', geometry: 'row1', speed: 10000, row: 1, order: 5 },
  { a: 'hci25', b: 'core2', port: '2/0/0/17', description: '超融合业务组 → CG-XZL-S12510', peer: 'cg-lxl2-b03-yewu4', geometry: 'row1', speed: 10000, row: 1, order: 6 },
  { a: 'store25', b: 'core2', port: '2/0/0/22', description: '图书馆分布式存储 → CG-XZL-S12510', peer: 'YD_TSG_B10_23U_SW2', geometry: 'row1', speed: 25000, row: 1, order: 7 },
  { a: 'ykt10', b: 'core2', port: '2/0/0/20', description: '图书馆一卡通超融合 → CG-XZL-S12510', peer: 'Yndx_YKT', geometry: 'row1', speed: 10000, row: 1, order: 8 },
  { a: 'db40', b: 'core2', port: '2/0/0/33', description: '图书馆超融合 → CG-XZL-S12510', peer: 'TSG-RJ-JieRu', geometry: 'row1', speed: 10000, row: 1, order: 9 },
  // Row 2 → core1
  { a: 'lb', b: 'core1', port: '1/0/0/31', description: '负载均衡 → CG-TSG-S12510', peer: 'H3C-TSG-LB1', geometry: 'row2', speed: 10000, row: 2, order: 0 },
  { a: 'dns', b: 'core1', port: '1/1/0/7', description: '递归 DNS → CG-TSG-S12510', geometry: 'row2', speed: 1000, row: 2, order: 1 },
  { a: 'dns', b: 'core1', port: '1/1/0/8', description: '权威 DNS → CG-TSG-S12510', geometry: 'row2', speed: 1000, row: 2, order: 2 },
  { a: 'other', b: 'core1', port: '1/0/0/7', description: 'M6K 接入 → CG-TSG-S12510', geometry: 'row2', speed: 10000, row: 2, order: 3 },
  // Row 2 → core2
  { a: 'lb', b: 'core2', port: '2/0/0/31', description: '负载均衡 → CG-XZL-S12510', peer: 'H3C-LXL-LB2', geometry: 'row2', speed: 10000, row: 2, order: 4 },
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
// 视图索引
// =====================================================================

const ALL_VIEWS: Record<string, TopoView> = {
  core: coreView,
  hyperconverged: hyperconvergedView,
  loadbalancer: loadbalancerView,
};

export function getTopoView(viewId: string): TopoView | undefined {
  return ALL_VIEWS[viewId];
}

export function getAllViewIds(): string[] {
  return Object.keys(ALL_VIEWS);
}
