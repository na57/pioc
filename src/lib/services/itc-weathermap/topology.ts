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
  nodeStylePreset: 'core' | 'hci';
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
  { id: 'hci25', name: '超融合业务组', description: '1|2/0/0/16·17', x: 128, y: 550, width: 190, height: 60, kind: 'biz' },
  { id: 'store25', name: '图书馆分布式存储', description: '1|2/0/0/22', x: 384, y: 550, width: 190, height: 60, kind: 'biz' },
  { id: 'ykt10', name: '图书馆一卡通超融合', description: '1|2/0/0/20', x: 640, y: 550, width: 190, height: 60, kind: 'biz' },
  { id: 'db40', name: '图书馆超融合', description: '1|2/0/0/33', x: 896, y: 550, width: 190, height: 60, kind: 'biz' },
  // 业务 row 2
  { id: 'lb', name: '负载均衡', description: '1|2/0/0/31', x: 256, y: 712, width: 190, height: 60, kind: 'biz' },
  { id: 'dns_r', name: '递归 DNS', description: '1|2/1/0/7', x: 512, y: 712, width: 190, height: 60, kind: 'biz' },
  { id: 'dns_a', name: '权威 DNS', description: '1|2/1/0/8', x: 768, y: 712, width: 190, height: 60, kind: 'biz' },
  { id: 'm6k', name: '下联接入 M6K', description: '1|2/0/0/7', x: 1024, y: 712, width: 190, height: 60, kind: 'biz' },
  // 外部/专线
  { id: 'idc', name: 'IDC 医保专线', description: '1/0/0/27', x: 132, y: 96, width: 216, height: 56, kind: 'ext', peer: 'CG_S12500F-AF_CORE_BG' },
  { id: 'cloud', name: '腾讯云', description: '1/0/0/15', x: 132, y: 164, width: 216, height: 56, kind: 'ext', peer: 'GC-1' },
  { id: 'sec', name: '对外安全设备', description: '1/1/0/11', x: 132, y: 232, width: 216, height: 56, kind: 'ext', peer: 'CG-TSG-AnQuanSheBei-DaiWai' },
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
  { a: 'dns_r', b: 'core1', port: '1/1/0/7', description: '递归 DNS → CG-TSG-S12510', geometry: 'row2', speed: 1000, row: 2, order: 1 },
  { a: 'dns_a', b: 'core1', port: '1/1/0/8', description: '权威 DNS → CG-TSG-S12510', geometry: 'row2', speed: 1000, row: 2, order: 2 },
  { a: 'm6k', b: 'core1', port: '1/0/0/7', description: 'M6K 接入 → CG-TSG-S12510', geometry: 'row2', speed: 10000, row: 2, order: 3 },
  // Row 2 → core2
  { a: 'lb', b: 'core2', port: '2/0/0/31', description: '负载均衡 → CG-XZL-S12510', peer: 'H3C-LXL-LB2', geometry: 'row2', speed: 10000, row: 2, order: 4 },
  { a: 'dns_r', b: 'core2', port: '2/1/0/7', description: '递归 DNS → CG-XZL-S12510', geometry: 'row2', speed: 1000, row: 2, order: 5 },
  { a: 'dns_a', b: 'core2', port: '2/1/0/8', description: '权威 DNS → CG-XZL-S12510', geometry: 'row2', speed: 1000, row: 2, order: 6 },
  { a: 'm6k', b: 'core2', port: '2/0/0/7', description: 'M6K 接入 → CG-XZL-S12510', geometry: 'row2', speed: 10000, row: 2, order: 7 },
  // 外部/专线
  { a: 'idc', b: 'core1', port: '1/0/0/27', description: 'IDC 医保专线 → CG-TSG-S12510', peer: 'CG_S12500F-AF_CORE_BG', geometry: 'ext', speed: 10000, row: 0, order: 0 },
  { a: 'cloud', b: 'core1', port: '1/0/0/15', description: '腾讯云 → CG-TSG-S12510', peer: 'GC-1', geometry: 'ext', speed: 10000, row: 0, order: 1 },
  { a: 'sec', b: 'core1', port: '1/1/0/11', description: '对外安全设备 → CG-TSG-S12510', peer: 'CG-TSG-AnQuanSheBei-DaiWai', geometry: 'ext', speed: 1000, row: 0, order: 2 },
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
    'lb', 'dns_r', 'dns_a', 'm6k',
    'idc', 'cloud', 'sec',
  ],
  nodes: coreNodes,
  links: coreLinks,
};

// =====================================================================
// 超融合视图
// =====================================================================

const hciNodes: TopoNode[] = [
  { id: 'core1', name: 'CG-TSG-S12510', description: '图书馆 TSG · 接口前缀 1/x/x/x', x: 375, y: 92, width: 300, height: 66, kind: 'core' },
  { id: 'core2', name: 'CG-XZL-S12510', description: '礼贤楼 LXL · 接口前缀 2/x/x/x', x: 915, y: 92, width: 300, height: 66, kind: 'core' },
  { id: 'sw10', name: 'cg-tsg-d06-yewu1', description: '10.10.251.10', x: 250, y: 322, width: 212, height: 64, kind: 'sw' },
  { id: 'sw14', name: 'cg-lxl2-b02-yewu3', description: '10.10.251.14', x: 500, y: 322, width: 212, height: 64, kind: 'sw' },
  { id: 'sw13', name: 'cg-tsg-d07-yewu2', description: '10.10.251.13', x: 790, y: 322, width: 212, height: 64, kind: 'sw' },
  { id: 'sw15', name: 'cg-lxl2-b03-yewu4', description: '10.10.251.15', x: 1040, y: 322, width: 212, height: 64, kind: 'sw' },
  { id: 'zone10', name: '服务器区 d06', description: '超融合节点', x: 250, y: 566, width: 212, height: 58, kind: 'zone' },
  { id: 'zone14', name: '服务器区 b02', description: '超融合节点', x: 500, y: 566, width: 212, height: 58, kind: 'zone' },
  { id: 'zone13', name: '服务器区 d07', description: '超融合节点', x: 790, y: 566, width: 212, height: 58, kind: 'zone' },
  { id: 'zone15', name: '服务器区 b03', description: '超融合节点', x: 1040, y: 566, width: 212, height: 58, kind: 'zone' },
];

const hciLinks: TopoLink[] = [
  // 上联 sw → core
  { a: 'sw10', b: 'core1', port: 'uplink:sw10', description: 'cg-tsg-d06-yewu1 → CG-TSG-S12510', geometry: 'hci-up', speed: 10000, row: 0, order: 0 },
  { a: 'sw14', b: 'core1', port: 'uplink:sw14', description: 'cg-lxl2-b02-yewu3 → CG-TSG-S12510', geometry: 'hci-up', speed: 10000, row: 1, order: 0 },
  { a: 'sw13', b: 'core2', port: 'uplink:sw13', description: 'cg-tsg-d07-yewu2 → CG-XZL-S12510', geometry: 'hci-up', speed: 10000, row: 0, order: 0 },
  { a: 'sw15', b: 'core2', port: 'uplink:sw15', description: 'cg-lxl2-b03-yewu4 → CG-XZL-S12510', geometry: 'hci-up', speed: 10000, row: 1, order: 0 },
  // 下行 zone → sw
  { a: 'zone10', b: 'sw10', port: 'down:sw10', description: '下行 → 服务器区（d06）', geometry: 'hci-down', speed: 0, row: 0, order: 0 },
  { a: 'zone14', b: 'sw14', port: 'down:sw14', description: '下行 → 服务器区（b02）', geometry: 'hci-down', speed: 0, row: 0, order: 0 },
  { a: 'zone13', b: 'sw13', port: 'down:sw13', description: '下行 → 服务器区（d07）', geometry: 'hci-down', speed: 0, row: 0, order: 0 },
  { a: 'zone15', b: 'sw15', port: 'down:sw15', description: '下行 → 服务器区（b03）', geometry: 'hci-down', speed: 0, row: 0, order: 0 },
  // 交换机间跨核心互联
  { a: 'sw10', b: 'sw13', port: 'peerlink:sw10', description: 'cg-tsg-d06-yewu1 ↔ cg-tsg-d07-yewu2', geometry: 'hci-peer', speed: 80000, row: 0, order: 0 },
  { a: 'sw14', b: 'sw15', port: 'peerlink:sw14', description: 'cg-lxl2-b02-yewu3 ↔ cg-lxl2-b03-yewu4', geometry: 'hci-peer', speed: 80000, row: 0, order: 0 },
];

export const hyperconvergedView: TopoView = {
  id: 'hyperconverged',
  title: '超融合业务',
  description: '4 台浪潮 CN9300H-48Y8C 双归上联核心 · 下行超融合服务器区 · 交换机间集群互联',
  deviceIds: ['sw10', 'sw14', 'sw13', 'sw15'],
  canvasWidth: 1280,
  canvasHeight: 700,
  nodeStylePreset: 'hci',
  nodeOrder: ['core1', 'core2', 'sw10', 'sw14', 'sw13', 'sw15', 'zone10', 'zone14', 'zone13', 'zone15'],
  nodes: hciNodes,
  links: hciLinks,
};

// =====================================================================
// 视图索引
// =====================================================================

const ALL_VIEWS: Record<string, TopoView> = {
  core: coreView,
  hyperconverged: hyperconvergedView,
};

export function getTopoView(viewId: string): TopoView | undefined {
  return ALL_VIEWS[viewId];
}

export function getAllViewIds(): string[] {
  return Object.keys(ALL_VIEWS);
}
