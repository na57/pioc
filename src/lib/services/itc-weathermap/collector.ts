/**
 * ITC 网络天气图数据采集器
 * 按视图（view）管理多台 SNMP 设备：
 * - 每个视图独立维护设备连接状态、端口发现、基线差分和快照；
 * - 视图内多台设备并行采集，结果合并到同一份快照；
 * - 单台设备不可达不影响其他设备，连接状态逐台上报。
 */

import { SNMPClient, OID_IF_NAME, OID_HC_IN, OID_HC_OUT, OID_HIGH_SPEED, OID_OPER_STATUS, VarBind } from './snmp';
import {
  loadYamlConfig,
  getLinksForView,
  getRefreshPeriod,
  getDeviceConfigsForView,
  DeviceConfig,
} from './config-loader';

// 类型定义
export interface PortData {
  port: string; // 端口 key，如 "1/0/0/16"
  name: string; // ifName，如 "Ten-GigabitEthernet1/0/0/16"
  inBps: number; // 入口速率 (bps)
  outBps: number; // 出口速率 (bps)
  speed: number; // 端口速率 (Mbps)
  oper: number; // 操作状态 (1=up, 2=down)
}

export interface Snapshot {
  ready: boolean;
  warm: boolean;
  ts: Date;
  dt: number; // 采样窗口秒数
  data: Map<string, PortData>;
  missing: string[]; // 缺失的端口
  err: string;
  periodSec: number;
  hosts: string; // 本轮参与采集的设备 IP 列表
}

export interface DeviceStatus {
  id: string;
  name: string;
  ip: string;
  connected: boolean;
}

export interface ViewConnection {
  total: number;
  connected: number;
  devices: DeviceStatus[];
}

// ========== 运行时状态（按视图隔离） ==========

interface DeviceRuntime {
  config: DeviceConfig;
  client: SNMPClient;
  connected: boolean;
  discovered: boolean;
  ifIndexMap: Map<string, number>; // 端口key -> ifIndex
  ifNameMap: Map<string, string>; // 端口key -> ifName
  prevCounters: Map<string, { in: number; out: number }>;
}

interface ViewRuntime {
  devices: DeviceRuntime[];
  snapshot: Snapshot | null;
  prevTime: Date | null;
  interval: NodeJS.Timeout | null;
  initPromise: Promise<boolean> | null;
}

const viewRuntimes = new Map<string, ViewRuntime>();

function getViewRuntime(viewId: string): ViewRuntime {
  let rt = viewRuntimes.get(viewId);
  if (!rt) {
    rt = { devices: [], snapshot: null, prevTime: null, interval: null, initPromise: null };
    viewRuntimes.set(viewId, rt);
  }
  return rt;
}

/**
 * 初始化视图采集器：ping 视图内全部设备，逐台记录连接状态。
 * @returns 至少有一台设备可达即返回 true
 */
export async function initializeCollector(viewId: string = 'core', force: boolean = false): Promise<boolean> {
  const rt = getViewRuntime(viewId);
  if (rt.initPromise && !force) return rt.initPromise;

  rt.initPromise = (async () => {
    const deviceConfigs = getDeviceConfigsForView(viewId);
    if (deviceConfigs.length === 0) {
      console.error(`[ITCWeathermap:${viewId}] 视图未配置任何设备`);
      return false;
    }

    // 构建设备运行时（保留已有的基线数据）
    rt.devices = deviceConfigs.map((cfg) => {
      const existing = rt.devices.find((d) => d.config.id === cfg.id);
      if (existing) {
        existing.config = cfg;
        return existing;
      }
      return {
        config: cfg,
        client: new SNMPClient({
          host: cfg.ip,
          community: cfg.snmpCommunity,
          timeout: 3000,
          retries: 1,
        }),
        connected: false,
        discovered: false,
        ifIndexMap: new Map(),
        ifNameMap: new Map(),
        prevCounters: new Map(),
      };
    });

    // 并行 ping 全部设备
    const results = await Promise.all(
      rt.devices.map(async (d): Promise<boolean> => {
        try {
          const ok = await d.client.ping();
          d.connected = ok;
          if (!ok) console.warn(`[ITCWeathermap:${viewId}] 设备不可达: ${d.config.ip} (${d.config.name})`);
          else console.log(`[ITCWeathermap:${viewId}] 已连接设备: ${d.config.ip} (${d.config.name})`);
          return ok;
        } catch (err) {
          d.connected = false;
          console.warn(`[ITCWeathermap:${viewId}] SNMP ping 异常 ${d.config.ip}:`, err);
          return false;
        }
      }),
    );

    const anyReachable = results.some(Boolean);
    // 全部不可达时清空 init 缓存，允许下次请求重试
    if (!anyReachable) rt.initPromise = null;
    return anyReachable;
  })();

  return rt.initPromise;
}

/**
 * 启动视图周期性采样
 */
export function startCollecting(periodSec: number = 30, viewId: string = 'core'): void {
  const rt = getViewRuntime(viewId);
  if (rt.interval) clearInterval(rt.interval);

  collectView(viewId).catch(console.error);

  rt.interval = setInterval(() => {
    collectView(viewId).catch(console.error);
  }, periodSec * 1000);

  console.log(`[ITCWeathermap:${viewId}] 启动采样，周期:`, periodSec, '秒');
}

/**
 * 停止采集（不传 viewId 则停止全部视图）
 */
export function stopCollecting(viewId?: string): void {
  const stop = (rt: ViewRuntime, id: string) => {
    if (rt.interval) {
      clearInterval(rt.interval);
      rt.interval = null;
    }
    console.log(`[ITCWeathermap:${id}] 停止采样`);
  };
  if (viewId) {
    const rt = viewRuntimes.get(viewId);
    if (rt) stop(rt, viewId);
  } else {
    viewRuntimes.forEach(stop);
  }
}

/**
 * 执行单轮采集：所有可达设备并行 discover + get，合并到视图快照
 */
async function collectView(viewId: string): Promise<void> {
  const rt = getViewRuntime(viewId);
  if (rt.devices.length === 0) {
    const ok = await initializeCollector(viewId);
    if (!ok) return;
  }

  const config = loadYamlConfig();
  const links = getLinksForView(viewId);

  // 尝试重连此前失败的设备
  await Promise.all(
    rt.devices.filter((d) => !d.connected).map(async (d) => {
      try {
        if (await d.client.ping()) {
          d.connected = true;
          d.discovered = false;
          console.log(`[ITCWeathermap:${viewId}] 设备恢复连接: ${d.config.ip}`);
        }
      } catch { /* 保持不可达 */ }
    }),
  );

  const reachable = rt.devices.filter((d) => d.connected);

  if (reachable.length === 0) {
    rt.snapshot = {
      ready: false,
      warm: false,
      ts: new Date(),
      dt: 0,
      data: new Map(),
      missing: [],
      err: '全部设备不可达',
      periodSec: config.refreshPeriod,
      hosts: '',
    };
    return;
  }

  // 每台可达设备独立采集（内部完成差分与基线更新）
  const now = new Date();
  const dt = rt.prevTime ? (now.getTime() - rt.prevTime.getTime()) / 1000 : 0;
  const collected = await Promise.all(
    reachable.map((d) => collectDevice(viewId, d, links, dt).catch((err) => {
      console.warn(`[ITCWeathermap:${viewId}] 设备 ${d.config.ip} 采集失败:`, err);
      return null;
    })),
  );

  // 合并各设备数据
  const portData = new Map<string, PortData>();
  const missing: string[] = [];
  let warm = false;

  for (const result of collected) {
    if (!result) continue;
    for (const [key, pd] of result.portData) {
      portData.set(key, pd);
      if (pd.inBps > 0 || pd.outBps > 0) warm = true;
    }
    missing.push(...result.missing);
  }

  // 没有发现任何端口（如 HCI 视图的逻辑口尚未映射到真实 BAGG 口）不算错误
  const noPorts = portData.size === 0;
  rt.snapshot = {
    ready: !noPorts,
    warm: warm && !noPorts,
    ts: now,
    dt,
    data: portData,
    missing,
    err: '',
    periodSec: config.refreshPeriod,
    hosts: reachable.map((d) => d.config.ip).join(','),
  };
  rt.prevTime = now;
}

interface DeviceCollectResult {
  deviceId: string;
  portData: Map<string, PortData>;
  missing: string[];
}

/**
 * 单台设备的一轮采集（discover → get 指标 → 差分）
 */
async function collectDevice(
  viewId: string,
  d: DeviceRuntime,
  links: ReturnType<typeof getLinksForView>,
  dt: number,
): Promise<DeviceCollectResult> {
  void viewId;
  if (!d.discovered) {
    await discoverPorts(d, links);
    d.discovered = true;
  }

  const portData = new Map<string, PortData>();
  const missing: string[] = [];
  const currentCounters = new Map<string, { in: number; out: number }>();

  if (d.ifIndexMap.size === 0) {
    return { deviceId: d.config.id, portData, missing };
  }

  const indices = [...d.ifIndexMap.values()].sort((a, b) => a - b);
  const inOIDs = indices.map((i) => `${OID_HC_IN}.${i}`);
  const outOIDs = indices.map((i) => `${OID_HC_OUT}.${i}`);
  const speedOIDs = indices.map((i) => `${OID_HIGH_SPEED}.${i}`);
  const operOIDs = indices.map((i) => `${OID_OPER_STATUS}.${i}`);

  const [inResult, outResult, speedResult, operResult] = await Promise.all([
    d.client.get(inOIDs),
    d.client.get(outOIDs),
    d.client.get(speedOIDs),
    d.client.get(operOIDs),
  ]);

  for (const [key, ifIndex] of d.ifIndexMap) {
    const inVB = inResult.get(`${OID_HC_IN}.${ifIndex}`);
    const outVB = outResult.get(`${OID_HC_OUT}.${ifIndex}`);
    const speedVB = speedResult.get(`${OID_HIGH_SPEED}.${ifIndex}`);
    const operVB = operResult.get(`${OID_OPER_STATUS}.${ifIndex}`);

    if (!inVB || !outVB || inVB.missing || outVB.missing) {
      missing.push(`${d.config.id}:${key}`);
      continue;
    }

    currentCounters.set(key, { in: inVB.num, out: outVB.num });

    const speed = speedVB && !speedVB.missing ? speedVB.num : 0;
    const oper = operVB && !operVB.missing ? operVB.num : 0;
    const linkConfig = links.find((l) => l.port === key);

    // 与本设备上一轮基线差分
    let inBps = 0;
    let outBps = 0;
    const prev = d.prevCounters.get(key);
    if (prev && dt > 0) {
      let din = inVB.num - prev.in;
      let dout = outVB.num - prev.out;
      if (din > 4.6e18) din = 0;
      if (dout > 4.6e18) dout = 0;
      inBps = (din * 8) / dt;
      outBps = (dout * 8) / dt;
    }

    portData.set(key, {
      port: key,
      name: d.ifNameMap.get(key) || key,
      inBps,
      outBps,
      speed: linkConfig?.speed || speed,
      oper,
    });
  }

  // 更新本设备基线
  d.prevCounters = currentCounters;

  return { deviceId: d.config.id, portData, missing };
}

/**
 * 发现端口：WALK ifName，匹配本视图链路中声明的物理口（x/x/x/x）
 */
async function discoverPorts(
  d: DeviceRuntime,
  links: ReturnType<typeof getLinksForView>,
): Promise<void> {
  const wantedPorts = new Set<string>();
  for (const link of links) {
    if (/^\d+\/\d+\/\d+\/\d+$/.test(link.port)) {
      wantedPorts.add(link.port);
    }
  }
  if (wantedPorts.size === 0) return;

  const vbs = await d.client.walk(OID_IF_NAME, 4000);
  const portKeyRe = /(\d+\/\d+\/\d+\/\d+)$/;

  for (const vb of vbs) {
    if (!vb.isStr) continue;
    const match = portKeyRe.exec(vb.str);
    if (!match) continue;
    const portKey = match[1];
    if (!wantedPorts.has(portKey)) continue;

    const oidParts = vb.oid.split('.');
    const ifIndex = parseInt(oidParts[oidParts.length - 1], 10);
    d.ifIndexMap.set(portKey, ifIndex);
    d.ifNameMap.set(portKey, vb.str);
  }

  console.log(`[ITCWeathermap] 设备 ${d.config.ip} 发现端口数量:`, d.ifIndexMap.size);
}

/**
 * 获取视图当前快照
 */
export function getSnapshot(viewId: string = 'core'): Snapshot | null {
  return viewRuntimes.get(viewId)?.snapshot ?? null;
}

/**
 * 获取视图设备连接状态
 */
export function getViewConnection(viewId: string = 'core'): ViewConnection {
  const rt = viewRuntimes.get(viewId);
  const devices = (rt?.devices ?? []).map((d) => ({
    id: d.config.id,
    name: d.config.name,
    ip: d.config.ip,
    connected: d.connected,
  }));
  return {
    total: devices.length,
    connected: devices.filter((d) => d.connected).length,
    devices,
  };
}

/**
 * 获取指定端口的速率
 */
export function getPortRate(portKey: string, viewId: string = 'core'): { inBps: number; outBps: number; util: number } | null {
  const portData = getSnapshot(viewId)?.data.get(portKey);
  if (!portData) return null;

  const maxRate = portData.speed * 1000000;
  const util = maxRate > 0 ? Math.max(
    (portData.inBps / maxRate) * 100,
    (portData.outBps / maxRate) * 100,
  ) : 0;

  return { inBps: portData.inBps, outBps: portData.outBps, util };
}

export default {
  initializeCollector,
  startCollecting,
  stopCollecting,
  getSnapshot,
  getViewConnection,
  getPortRate,
};
