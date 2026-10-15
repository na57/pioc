/**
 * ITC 网络天气图数据采集器
 * 按视图（view）管理多台 SNMP 设备：
 * - 每个视图独立维护设备连接状态、端口发现、基线差分和快照；
 * - 视图内多台设备并行采集，结果合并到同一份快照；
 * - 单台设备不可达不影响其他设备，连接状态逐台上报。
 *
 * 冷启动节奏（优化首屏出数）：
 * - 不再先 ping 再采集，首轮直接对全部设备做 discover（成功即连通）；
 *   首轮使用短超时、0 重试的「快速探测」，不可达设备约 1.2s 内放弃，不阻塞首屏；
 * - 首轮只建立计数器基线（无速率），随后在第 5/10/15/20 秒补最多 4 个预热轮，
 *   使首个真实速率在 ~5-10 秒出现（过去要干等一个 30s 周期）；
 * - 预热期结束或已有流量数据后切换到正常周期轮询，失败设备每轮继续重连。
 */

import { SNMPClient, OID_IF_NAME, OID_HC_IN, OID_HC_OUT, OID_HIGH_SPEED, OID_OPER_STATUS } from './snmp';
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

// ========== 冷启动调度参数 ==========

const WARMUP_DELAY_SEC = 5; // 基线轮之后预热轮的间隔
const MAX_WARMUP_ROUNDS = 4; // 预热轮最多次数（5/10/15/20s）
const FIRST_PROBE_TIMEOUT_MS = 1200; // 首轮快速探测：短超时、0 重试
const REQUEST_TIMEOUT_MS = 1500; // 常规请求超时（重试 1 次，最差 3s）

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
  warmupTimer: NodeJS.Timeout | null;
  initPromise: Promise<boolean> | null;
  running: boolean;
  periodSec: number;
  roundInFlight: boolean; // 防止两轮采集并发
  warmupRounds: number;
  firstRoundPromise: Promise<void> | null;
  firstRoundDone: boolean;
}

const viewRuntimes = new Map<string, ViewRuntime>();

function getViewRuntime(viewId: string): ViewRuntime {
  let rt = viewRuntimes.get(viewId);
  if (!rt) {
    rt = {
      devices: [],
      snapshot: null,
      prevTime: null,
      interval: null,
      warmupTimer: null,
      initPromise: null,
      running: false,
      periodSec: 30,
      roundInFlight: false,
      warmupRounds: 0,
      firstRoundPromise: null,
      firstRoundDone: false,
    };
    viewRuntimes.set(viewId, rt);
  }
  return rt;
}

/**
 * 初始化视图设备运行时（纯本地操作，不做网络探测；连通性在首轮 discover 时确定）。
 * force=true 时关闭并重建 SNMP 客户端、清空发现与基线，供「强制重连」使用。
 * @returns 视图是否配置了设备
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

    rt.devices = deviceConfigs.map((cfg) => {
      const existing = rt.devices.find((d) => d.config.id === cfg.id);
      if (existing && !force) {
        existing.config = cfg;
        return existing;
      }
      if (existing) {
        // force：废弃旧 socket，重新建立设备运行时
        try { existing.client.close(); } catch { /* ignore */ }
      }
      return {
        config: cfg,
        client: new SNMPClient({
          host: cfg.ip,
          community: cfg.snmpCommunity,
          timeout: REQUEST_TIMEOUT_MS,
          retries: 1,
        }),
        connected: false,
        discovered: false,
        ifIndexMap: new Map(),
        ifNameMap: new Map(),
        prevCounters: new Map(),
      };
    });

    if (force) {
      rt.snapshot = null;
      rt.prevTime = null;
      rt.warmupRounds = 0;
    }
    return true;
  })();

  return rt.initPromise;
}

/**
 * 启动视图周期性采样（幂等：已在运行时只更新周期，不重启、不清基线）
 */
export function startCollecting(periodSec: number = 30, viewId: string = 'core'): void {
  const rt = getViewRuntime(viewId);
  rt.periodSec = periodSec;
  if (rt.running) return;

  rt.running = true;
  rt.warmupRounds = 0;
  console.log(`[ITCWeathermap:${viewId}] 启动采样，周期:`, periodSec, '秒，冷启动预热间隔 5 秒');
  launchRound(viewId, true);
}

/**
 * 强制重连后重启采集循环：重建设备、立即跑一轮冷启动并重新预热
 */
export async function restartCollecting(periodSec: number = 30, viewId: string = 'core'): Promise<void> {
  const rt = getViewRuntime(viewId);
  if (rt.warmupTimer) { clearTimeout(rt.warmupTimer); rt.warmupTimer = null; }
  if (rt.interval) { clearInterval(rt.interval); rt.interval = null; }
  rt.periodSec = periodSec;
  rt.warmupRounds = 0;
  rt.running = true;
  rt.firstRoundDone = false;
  launchRound(viewId, true);
  await whenFirstRound(viewId);
}

/**
 * 等待视图首轮采集完成（供 API 首请求短等，拿得到就直接出图）
 */
export function whenFirstRound(viewId: string = 'core'): Promise<void> {
  const rt = viewRuntimes.get(viewId);
  if (!rt || rt.firstRoundDone) return Promise.resolve();
  return rt.firstRoundPromise ?? Promise.resolve();
}

/**
 * 停止采集（不传 viewId 则停止全部视图）
 */
export function stopCollecting(viewId?: string): void {
  const stop = (rt: ViewRuntime, id: string) => {
    rt.running = false;
    if (rt.warmupTimer) { clearTimeout(rt.warmupTimer); rt.warmupTimer = null; }
    if (rt.interval) { clearInterval(rt.interval); rt.interval = null; }
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
 * 发起一轮采集并安排下一轮（预热轮 → 正常周期）
 */
function launchRound(viewId: string, firstRound: boolean): void {
  const rt = viewRuntimes.get(viewId);
  if (!rt || !rt.running || rt.roundInFlight) return;
  rt.roundInFlight = true;

  if (firstRound) {
    rt.firstRoundDone = false;
    rt.firstRoundPromise = collectView(viewId, true)
      .catch((err) => console.error(`[ITCWeathermap:${viewId}] 首轮采集失败:`, err))
      .then(() => undefined);
  }

  const job = firstRound
    ? rt.firstRoundPromise!
    : collectView(viewId, false)
        .catch((err) => console.error(`[ITCWeathermap:${viewId}] 采集失败:`, err))
        .then(() => undefined);

  job.finally(() => {
    rt.roundInFlight = false;
    if (firstRound) rt.firstRoundDone = true;
    if (!rt.running) return;
    scheduleNext(viewId);
  });
}

/**
 * 调度下一轮：尚无真实速率且预热次数未用完 → 8 秒后预热；否则进入正常周期
 */
function scheduleNext(viewId: string): void {
  const rt = viewRuntimes.get(viewId)!;
  const needWarmup = !rt.snapshot?.warm && rt.warmupRounds < MAX_WARMUP_ROUNDS;

  if (needWarmup) {
    rt.warmupRounds += 1;
    rt.warmupTimer = setTimeout(() => launchRound(viewId, false), WARMUP_DELAY_SEC * 1000);
  } else if (!rt.interval) {
    rt.interval = setInterval(() => launchRound(viewId, false), rt.periodSec * 1000);
  }
}

/**
 * 执行单轮采集：
 * - 首轮快速探测全部设备（discover 成功即连通）；
 * - 后续轮只重连此前失败的设备（常规超时 + 1 次重试）；
 * - 所有可达设备并行 get 指标并差分，合并到视图快照。
 */
async function collectView(viewId: string, firstRound: boolean): Promise<void> {
  const rt = getViewRuntime(viewId);
  if (rt.devices.length === 0) {
    const ok = await initializeCollector(viewId);
    if (!ok) return;
  }

  const config = loadYamlConfig();
  const links = getLinksForView(viewId);

  const candidates = firstRound
    ? rt.devices
    : rt.devices.filter((d) => !d.connected);

  await Promise.all(
    candidates.map((d) => probeDevice(viewId, d, links, firstRound).catch(() => false)),
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
    reachable.map((d) => collectDevice(d, links, dt).catch((err) => {
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

/**
 * 探测单台设备：直接 walk ifName 做端口发现，成功即视为连通。
 * 首轮使用快速参数（短超时/0 重试），避免不可达设备拖慢首屏。
 */
async function probeDevice(
  viewId: string,
  d: DeviceRuntime,
  links: ReturnType<typeof getLinksForView>,
  fast: boolean,
): Promise<boolean> {
  const opts = fast ? { timeout: FIRST_PROBE_TIMEOUT_MS, retries: 0, noFallback: true } : undefined;
  try {
    await discoverPorts(d, links, opts);
    if (d.ifIndexMap.size === 0) throw new Error('未发现任何目标端口');
    d.connected = true;
    d.discovered = true;
    console.log(`[ITCWeathermap:${viewId}] 设备已连接: ${d.config.ip} (${d.config.name})，发现端口 ${d.ifIndexMap.size} 个`);
    return true;
  } catch (err) {
    d.connected = false;
    d.discovered = false;
    d.ifIndexMap.clear();
    d.ifNameMap.clear();
    console.warn(`[ITCWeathermap:${viewId}] 设备不可达: ${d.config.ip} (${d.config.name}) -`, (err as Error).message);
    return false;
  }
}

interface DeviceCollectResult {
  deviceId: string;
  portData: Map<string, PortData>;
  missing: string[];
}

/**
 * 单台设备的一轮采集（必要时 discover → get 指标 → 差分）
 */
async function collectDevice(
  d: DeviceRuntime,
  links: ReturnType<typeof getLinksForView>,
  dt: number,
): Promise<DeviceCollectResult> {
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
 * walk 整体失败（超时/不支持）时抛错，由调用方判定设备不可达
 */
async function discoverPorts(
  d: DeviceRuntime,
  links: ReturnType<typeof getLinksForView>,
  opts?: { timeout?: number; retries?: number; noFallback?: boolean },
): Promise<void> {
  const wantedPorts = new Set<string>();
  for (const link of links) {
    if (/^\d+\/\d+\/\d+\/\d+$/.test(link.port)) {
      wantedPorts.add(link.port);
    }
  }
  if (wantedPorts.size === 0) return;

  const vbs = await d.client.walk(OID_IF_NAME, 4000, opts);
  if (vbs.length === 0) throw new Error('ifName WALK 无结果');

  d.ifIndexMap.clear();
  d.ifNameMap.clear();

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
  restartCollecting,
  whenFirstRound,
  stopCollecting,
  getSnapshot,
  getViewConnection,
  getPortRate,
};

