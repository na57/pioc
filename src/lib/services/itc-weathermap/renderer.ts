/**
 * ITC 网络天气图 SVG 渲染器
 * 渲染逻辑与 docs/weathermap-go/render.go + render_hci.go 保持一致。
 * 即使 snapshot 为 null（SNMP 未连接），也能渲染完整的拓扑框架。
 */

import { Snapshot, PortData } from './collector';
import {
  getNodesForView,
  getLinksForView,
  getCanvasSizeForView,
  getNodeOrderForView,
  getNodeStylePresetForView,
  getViewMeta,
} from './config-loader';
import { TopoNode, TopoLink } from './topology';

// ========== 利用率颜色插值（5 段线性，与 Go 程序 utilColor 一致） ==========
interface Stop { p: number; r: number; g: number; b: number }
const STOPS: Stop[] = [
  { p: 0,   r: 63,  g: 169, b: 107 },
  { p: 30,  r: 140, g: 198, b: 63 },
  { p: 60,  r: 240, g: 180, b: 41 },
  { p: 85,  r: 232, g: 99,  b: 42 },
  { p: 100, r: 198, g: 35,  b: 31 },
];

function utilColor(pct: number): string {
  pct = Math.max(0, Math.min(100, pct));
  for (let i = 0; i < STOPS.length - 1; i++) {
    const s0 = STOPS[i], s1 = STOPS[i + 1];
    if (pct >= s0.p && pct <= s1.p) {
      const r = (pct - s0.p) / (s1.p - s0.p);
      const R = Math.round(s0.r + (s1.r - s0.r) * r);
      const G = Math.round(s0.g + (s1.g - s0.g) * r);
      const B = Math.round(s0.b + (s1.b - s0.b) * r);
      return `#${R.toString(16).padStart(2, '0')}${G.toString(16).padStart(2, '0')}${B.toString(16).padStart(2, '0')}`;
    }
  }
  return '#C6231F';
}

function widthFor(speed: number): number {
  switch (speed) {
    case 1000:  return 3;
    case 10000: return 5;
    case 25000: return 8;
    case 40000: return 11;
  }
  if (speed === 0) return 3;
  return Math.max(2, Math.min(12, 2 + (speed / 40000.0) * 9.0));
}

function fmtBps(v: number): string {
  if (v >= 1e9) return (v / 1e9).toFixed(2) + ' G';
  if (v >= 1e6) return (v / 1e6).toFixed(1) + ' M';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + ' K';
  return v.toFixed(0);
}

function fmtSpeed(speed: number): string {
  if (speed === 0) return '未知';
  if (speed >= 1000) return Math.round(speed / 1000) + 'G';
  return speed + 'M';
}

function esc(s: string): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ========== 节点样式预设 ==========
// [bg, border, textBold, textSub]
const nodeStylePresets: Record<string, Record<string, [string, string, string, string]>> = {
  core: {
    fw:   ['#FAECE7', '#993C1D', '#712B13', '#993C1D'],
    core: ['#CECBF6', '#534AB7', '#26215C', '#534AB7'],
    biz:  ['#EAF3F0', '#1D9E75', '#085041', '#0F6E56'],
    ext:  ['#F1EFE8', '#888780', '#2C2C2A', '#5F5E5A'],
    sw:   ['#EAF3F0', '#1D9E75', '#085041', '#0F6E56'],
    zone: ['#F1EFE8', '#888780', '#2C2C2A', '#5F5E5A'],
  },
  hci: {
    core: ['#CECBF6', '#534AB7', '#26215C', '#534AB7'],
    sw:   ['#EAF3F0', '#1D9E75', '#085041', '#0F6E56'],
    zone: ['#F1EFE8', '#888780', '#2C2C2A', '#5F5E5A'],
  },
};

function getNodeStyle(preset: string, kind: string): [string, string, string, string] {
  const styles = nodeStylePresets[preset] || nodeStylePresets.core;
  return styles[kind] || styles.biz;
}

// ========== 链路走线（优雅曲线方案） ==========
//
// 参考 React Flow / d3-sankey / yFiles 的分层图走线惯例：
//  1. 层级汇聚（业务→核心、交换机→核心）用「垂直切线三次贝塞尔」：
//     从源节点顶边垂直升起、垂直接入核心边缘，中段平滑弯曲，fan-in 不交叉；
//  2. 跨层互联（hci-peer）用交换机上方的二次贝塞尔拱弧，多条拱弧错高，
//     唯一交叉点像地铁跨线一样自然；
//  3. 同层水平（IRF）、垂直上下行（fw 上联 / sw→zone）保持直线；
//  4. 左侧专线接入用「水平切线三次贝塞尔」优雅弯入核心顶部。

interface Pt { x: number; y: number }

const linkKey = (l: TopoLink) => `${l.a}|${l.b}|${l.port}`;

const f1 = (n: number) => n.toFixed(1);

/** 直线 path */
function linePath(p0: Pt, p1: Pt): string {
  return `M${f1(p0.x)} ${f1(p0.y)} L${f1(p1.x)} ${f1(p1.y)}`;
}

/**
 * 垂直切线三次贝塞尔：两端均垂直出入。
 * (sx, sy) 为源点（通常是源节点顶边中心），(tx, ty) 为核心边缘落点。
 */
function vCurvePath(sx: number, sy: number, tx: number, ty: number): string {
  const k = Math.max(60, Math.min(190, Math.abs(ty - sy) * 0.55));
  // 源点在下（sy > ty，向上汇聚）
  if (sy > ty) {
    return `M${f1(sx)} ${f1(sy)} C${f1(sx)} ${f1(sy - k)} ${f1(tx)} ${f1(ty + k)} ${f1(tx)} ${f1(ty)}`;
  }
  // 反向
  return `M${f1(sx)} ${f1(sy)} C${f1(sx)} ${f1(sy + k)} ${f1(tx)} ${f1(ty - k)} ${f1(tx)} ${f1(ty)}`;
}

/** 水平出发、垂直接入的三次贝塞尔（左侧专线 → 核心顶边） */
function extCurvePath(sx: number, sy: number, tx: number, ty: number): string {
  const kx = 72;
  const ky = 48;
  return `M${f1(sx)} ${f1(sy)} C${f1(sx + kx)} ${f1(sy)} ${f1(tx)} ${f1(ty - ky)} ${f1(tx)} ${f1(ty)}`;
}

/** 二次贝塞尔拱弧 */
function arcPath(p0: Pt, ctrl: Pt, p1: Pt): string {
  return `M${f1(p0.x)} ${f1(p0.y)} Q${f1(ctrl.x)} ${f1(ctrl.y)} ${f1(p1.x)} ${f1(p1.y)}`;
}

/**
 * 为每台核心边缘的汇聚链路分配落点：
 * 按源节点 x 排序后在核心边缘上等距开槽（同源多条线自然分到相邻槽位）。
 */
function buildLinkPaths(
  nodesList: TopoNode[],
  nodes: Map<string, TopoNode>,
  links: TopoLink[],
): Map<string, string> {
  const paths = new Map<string, string>();
  const PAD = 18;

  // ---- 汇聚类：row1 / row2 → core 底边；hci-up → core 底边 ----
  for (const core of nodesList) {
    if (core.kind !== 'core') continue;
    const incoming = links.filter(
      (l) =>
        (l.geometry === 'row1' || l.geometry === 'row2' || l.geometry === 'hci-up') &&
        l.b === core.id,
    );
    if (incoming.length === 0) continue;

    const edgeY = core.y + core.height / 2; // hci-up 在几何上也是从下方汇聚到核心
    const lo = core.x - core.width / 2 + PAD;
    const hi = core.x + core.width / 2 - PAD;
    const span = hi - lo;
    const n = incoming.length;

    // 按源节点水平位置排序；同源多链按端口排序
    const sorted = incoming
      .map((l) => ({ l, src: nodes.get(l.a)! }))
      .sort((p, q) => p.src.x - q.src.x || p.l.port.localeCompare(q.l.port));

    sorted.forEach((item, i) => {
      // 等距槽位
      const landX = lo + (span * (i + 0.5)) / n;
      const src = item.src;
      const sx = src.x;
      const sy = src.y - src.height / 2;
      if (item.l.geometry === 'row2') {
        // 第二排：先竖直上升穿过第一排节点间隙，再平滑弯入核心底边
        const RISE_Y = 488;
        const k = 66;
        paths.set(
          linkKey(item.l),
          `M${f1(sx)} ${f1(sy)} L${f1(sx)} ${f1(RISE_Y)} C${f1(sx)} ${f1(RISE_Y - k)} ${f1(landX)} ${f1(edgeY + k)} ${f1(landX)} ${f1(edgeY)}`,
        );
      } else {
        paths.set(linkKey(item.l), vCurvePath(sx, sy, landX, edgeY));
      }
    });
  }

  // ---- hci-peer：交换机上方拱弧，逐对错开高度 ----
  links
    .filter((l) => l.geometry === 'hci-peer')
    .forEach((l, i) => {
      const na = nodes.get(l.a)!;
      const nb = nodes.get(l.b)!;
      const left = na.x < nb.x ? na : nb;
      const right = na.x < nb.x ? nb : na;
      const topY = Math.min(na.y, nb.y) - Math.max(na.height, nb.height) / 2;
      const p0: Pt = { x: left.x + left.width / 2 - 24, y: topY };
      const p1: Pt = { x: right.x - right.width / 2 + 24, y: topY };
      const ctrl: Pt = { x: (left.x + right.x) / 2, y: topY - 52 - i * 30 };
      paths.set(linkKey(l), arcPath(p0, ctrl, p1));
    });

  // ---- 直线/专线类 ----
  for (const l of links) {
    const key = linkKey(l);
    if (paths.has(key)) continue;
    const na = nodes.get(l.a);
    const nb = nodes.get(l.b);
    if (!na || !nb) continue;

    switch (l.geometry) {
      case 'uplink':
        // fw 底边中心 → core 顶边中心（垂直直线）
        paths.set(
          key,
          linePath(
            { x: na.x, y: na.y + na.height / 2 },
            { x: nb.x, y: nb.y - nb.height / 2 },
          ),
        );
        break;
      case 'irf': {
        // core1 右边 → core2 左边，多条水平错开
        const y = na.y - 24 + l.row * 22;
        paths.set(
          key,
          linePath(
            { x: na.x + na.width / 2, y },
            { x: nb.x - nb.width / 2, y },
          ),
        );
        break;
      }
      case 'ext': {
        // 左侧专线：右边中心水平出发，垂直接入 core 顶边
        const landX = nb.x - nb.width / 2 + 40 + l.order * 40;
        paths.set(
          key,
          extCurvePath(
            na.x + na.width / 2,
            na.y,
            landX,
            nb.y - nb.height / 2,
          ),
        );
        break;
      }
      case 'hci-down':
        // a=zone(下), b=sw(上)：sw 底边 → zone 顶边（垂直直线）
        paths.set(
          key,
          linePath(
            { x: nb.x, y: nb.y + nb.height / 2 },
            { x: na.x, y: na.y - na.height / 2 },
          ),
        );
        break;
      default:
        paths.set(key, linePath({ x: na.x, y: na.y }, { x: nb.x, y: nb.y }));
    }
  }

  return paths;
}

// ========== 主渲染函数 ==========

export interface RenderOptions {
  viewId?: string;
}

export function renderSVG(
  snapshot: Snapshot | null,
  options: RenderOptions = {}
): string {
  const viewId = options.viewId || 'core';
  const preset = getNodeStylePresetForView(viewId);
  const canvas = getCanvasSizeForView(viewId);
  const nodesList = getNodesForView(viewId);
  const links = getLinksForView(viewId);
  const nodeOrder = getNodeOrderForView(viewId) || nodesList.map((n) => n.id);

  const nodes = new Map<string, TopoNode>();
  for (const n of nodesList) nodes.set(n.id, n);

  const viewMeta = getViewMeta(viewId);
  const viewTitle = viewMeta?.title || '网络拓扑';
  const viewDesc = viewMeta?.description || '';

  // 构建端口数据 map
  const data = new Map<string, PortData>();
  if (snapshot?.data) {
    for (const [k, v] of snapshot.data) data.set(k, v);
  }

  // ========== 开始构建 SVG ==========
  let svg = `<svg viewBox="0 0 ${canvas.width} ${canvas.height}" role="img" xmlns="http://www.w3.org/2000/svg" style="font-family: system-ui,-apple-system,sans-serif;background:#fff">
<title>${viewTitle}</title>
<desc>${viewDesc}</desc>
<style>
  @keyframes fl { to { stroke-dashoffset: -40 } }
  @keyframes fr { to { stroke-dashoffset: 40 } }
  .f { animation: fl 1.2s linear infinite }
  @media (prefers-reduced-motion: reduce) { .f { animation: none } }
</style>
`;

  interface Flow { d: string; w: number; bps: number; fwd: boolean }
  const flows: Flow[] = [];

  // 预计算所有链路的 path（贝塞尔曲线 / 直线 / 拱弧）
  const linkPaths = buildLinkPaths(nodesList, nodes, links);

  // ========== 先画链路 ==========
  for (const l of links) {
    const d = data.get(l.port);
    const dPath = linkPaths.get(linkKey(l));
    if (!dPath) continue;

    let speed = l.speed;
    let oper = -1;
    if (d) {
      if (d.speed > 0) speed = d.speed;
      oper = d.oper;
    }

    let util = 0.0;
    if (d) {
      const maxBps = Math.max(d.inBps, d.outBps);
      if (speed > 0) util = maxBps / (speed * 1e6) * 100;
    }

    const unreach = oper === -2;
    const down = oper >= 0 && oper !== 1;
    let color = '#B0B0B0';
    if (!down && !unreach) color = utilColor(util);
    const w = widthFor(speed);

    let dash = '';
    if (l.geometry === 'irf' && l.row === 2) {
      dash = ' stroke-dasharray="7 5"';
    }
    if (l.geometry === 'hci-peer') {
      // 线宽较粗，间隙必须大于线帽半径才能看出虚线
      dash = ' stroke-dasharray="10 12"';
    }

    // tooltip
    let inBps = 0, outBps = 0;
    let ifaceName = l.port;
    if (d) {
      inBps = d.inBps; outBps = d.outBps;
      if (d.name) ifaceName = d.name;
    }
    let tip = `${l.description}\n`;
    if (unreach) {
      tip += '设备未达（community 不对或不可达）';
    } else {
      const dir = outBps > inBps ? '核心 → 对端（出为主）' : '对端 → 核心（入为主）';
      tip += `${ifaceName}\n入 ${fmtBps(inBps)} ／ 出 ${fmtBps(outBps)} · 合计 ${fmtBps(inBps + outBps)}\n协商 ${fmtSpeed(speed)} · 主流量方向：${dir}\n利用率 ${util.toFixed(2)}%`;
      if (down) tip += '\n端口 Down';
    }

    svg += `<path d="${dPath}" fill="none" stroke="${color}" stroke-width="${w.toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"${dash} opacity="0.92"><title>${esc(tip)}</title></path>\n`;

    if (!down && !unreach && d && Math.max(d.inBps, d.outBps) > 1e5) {
      flows.push({ d: dPath, w, bps: Math.max(d.inBps, d.outBps), fwd: d.inBps >= d.outBps });
    }
  }

  // ========== 光点流动（沿相同曲线路径） ==========
  for (const f of flows) {
    const dur = Math.max(0.4, Math.min(2.4, 2.4 - Math.log10(Math.max(f.bps, 1e5) / 1e5) * 0.45));
    const anim = f.fwd ? 'fl' : 'fr';
    const fw = Math.max(2.0, f.w * 0.4);
    const style = `animation:${anim} ${dur.toFixed(2)}s linear infinite`;
    svg += `<path class="f" d="${f.d}" fill="none" stroke="#FFFFFF" stroke-width="${fw.toFixed(1)}" stroke-linecap="round" stroke-dasharray="4 16" opacity="0.6" pointer-events="none" style="${style}"/>\n`;
  }

  // ========== IRF 标注（core 视图） ==========
  if (preset === 'core') {
    const core1 = nodes.get('core1');
    if (core1) {
      svg += `<text x="650" y="${(core1.y - 34).toFixed(0)}" text-anchor="middle" font-size="12" fill="#534AB7">IRF 堆叠互联</text>\n`;
    }
  }

  // ========== 画节点 ==========
  for (const id of nodeOrder) {
    const n = nodes.get(id);
    if (!n) continue;
    const st = getNodeStyle(preset, n.kind);

    const nx = n.x - n.width / 2;
    const ny = n.y - n.height / 2;
    svg += `<rect x="${nx.toFixed(1)}" y="${ny.toFixed(1)}" width="${n.width}" height="${n.height}" rx="9" fill="${st[0]}" stroke="${st[1]}" stroke-width="0.8"/>\n`;

    let sub = n.description;

    // core 视图：业务/外部节点补充协商速率
    if (preset === 'core' && (n.kind === 'biz' || n.kind === 'ext')) {
      for (const l of links) {
        if (l.a === id || l.b === id) {
          const dd = data.get(l.port);
          if (dd && dd.speed > 0) {
            sub = `${sub} · ${fmtSpeed(dd.speed)}`;
          }
          break;
        }
      }
    }

    // core 视图：核心交换机显示下联总吞吐
    if (preset === 'core' && n.kind === 'core') {
      let tot = 0;
      for (const l of links) {
        if (l.b === id && (l.geometry === 'row1' || l.geometry === 'row2' || l.geometry === 'ext')) {
          const dd = data.get(l.port);
          if (dd) tot += dd.inBps + dd.outBps;
        }
      }
      svg += `<text x="${n.x}" y="${(n.y + 29).toFixed(0)}" text-anchor="middle" font-size="12" fill="${st[3]}">下联总吞吐 ${fmtBps(tot)}bps</text>\n`;
    }

    // hci 视图：交换机显示上联吞吐，zone 显示下行吞吐
    if (preset === 'hci' && n.kind === 'sw') {
      const uplinkKey = `uplink:${id}`;
      const d = data.get(uplinkKey);
      if (d && d.oper !== -2) {
        const tot = d.inBps + d.outBps;
        sub = `上联 ${fmtBps(tot)}bps`;
      } else {
        sub = '设备未达';
      }
    }
    if (preset === 'hci' && n.kind === 'zone') {
      const swID = id.replace('zone', '');
      const d = data.get(`down:${swID}`);
      if (d && d.oper !== -2) {
        const tot = d.inBps + d.outBps;
        sub = `下行 ${fmtBps(tot)}bps`;
      } else {
        sub = '设备未达';
      }
    }

    // 绘制文字：name (bold) + sub
    if (n.kind === 'ext') {
      svg += `<text x="${n.x}" y="${(n.y - 13).toFixed(0)}" text-anchor="middle" font-size="14" font-weight="500" fill="${st[2]}">${esc(n.name)}</text>\n`;
      svg += `<text x="${n.x}" y="${(n.y + 4).toFixed(0)}" text-anchor="middle" font-size="12" fill="${st[3]}">${esc(sub)}</text>\n`;
      if (n.peer) {
        svg += `<text x="${n.x}" y="${(n.y + 20).toFixed(0)}" text-anchor="middle" font-size="11" fill="#888780">${esc(n.peer)}</text>\n`;
      }
    } else if (preset === 'hci') {
      // HCI 用更小的 sub 字体
      svg += `<text x="${n.x}" y="${(n.y - 10).toFixed(0)}" text-anchor="middle" font-size="14" font-weight="500" fill="${st[2]}">${esc(n.name)}</text>\n`;
      svg += `<text x="${n.x}" y="${(n.y + 11).toFixed(0)}" text-anchor="middle" font-size="11.5" fill="${st[3]}">${esc(sub)}</text>\n`;
    } else {
      svg += `<text x="${n.x}" y="${(n.y - 10).toFixed(0)}" text-anchor="middle" font-size="14" font-weight="500" fill="${st[2]}">${esc(n.name)}</text>\n`;
      svg += `<text x="${n.x}" y="${(n.y + 11).toFixed(0)}" text-anchor="middle" font-size="12" fill="${st[3]}">${esc(sub)}</text>\n`;
    }
  }

  svg += '</svg>';
  return svg;
}

// ========== 端口明细渲染 ==========

export interface PortTableRow {
  port: string;
  description: string;
  peer: string;
  speed: number;
  oper: number;
  inBps: number;
  outBps: number;
  ifName: string;
  utilization: number;
  linkGeometry: string;
  row: number;
  order: number;
}

export function buildPortTableRows(
  snapshot: Snapshot | null,
  viewId = 'core'
): PortTableRow[] {
  const links = getLinksForView(viewId);
  const data = new Map<string, PortData>();
  if (snapshot?.data) {
    for (const [k, v] of snapshot.data) data.set(k, v);
  }

  const rows: PortTableRow[] = [];
  for (const l of links) {
    const d = data.get(l.port);
    let speed = l.speed;
    let oper = -1;
    let inBps = 0, outBps = 0;
    let ifName = '';
    if (d) {
      if (d.speed > 0) speed = d.speed;
      oper = d.oper;
      inBps = d.inBps;
      outBps = d.outBps;
      ifName = d.name;
    }
    let util = 0;
    if (speed > 0 && oper !== -2) util = Math.max(inBps, outBps) / (speed * 1e6) * 100;

    // HCI 视图：推断对端
    let peer = l.peer || '';
    if (!peer) {
      switch (l.geometry) {
        case 'hci-up': peer = 'S12510-S-IRF'; break;
        case 'hci-down': peer = '超融合服务器'; break;
        case 'hci-peer': peer = '同组交换机'; break;
      }
    }

    rows.push({
      port: l.port,
      description: l.description,
      peer,
      speed,
      oper,
      inBps,
      outBps,
      ifName,
      utilization: util,
      linkGeometry: l.geometry,
      row: l.row,
      order: l.order,
    });
  }
  // 排序：未达沉底，其余按利用率降序
  rows.sort((a, b) => {
    if (a.oper === -2 && b.oper !== -2) return 1;
    if (a.oper !== -2 && b.oper === -2) return -1;
    return b.utilization - a.utilization;
  });
  return rows;
}

export default { renderSVG, buildPortTableRows };
