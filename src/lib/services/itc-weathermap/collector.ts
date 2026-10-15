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

import { SNMPClient, VarBind, OID_IF_NAME, OID_HC_IN, OID_HC_OUT, OID_HIGH_SPEED, OID_OPER_STATUS } from './snmp';
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

// HCI（浪潮 CN9300H）聚合口按协商速率归类的阈值（Mbps）
const HCI_PEER_SPEED_MIN = 80000; // ≥80G：交换机间集群互联（agg55）
const HCI_UPLINK_SPEED_MIN = 10000; // 10G：上联核心（agg48）
const HCI_DOWN_SPEED_MIN = 10000; // 其余 ≥10G：下行服务器（25G agg）

/** Counter64 差分异常上限（超过视为计数器回绕/重置，该轮速率记 0） */
const COUNTER_DELTA_MAX = BigInt('4600000000000000000');

/** 取 VarBind 的 64 位无符号计数器值；缺失返回 null */
function counterOf(vb: VarBind | undefined): bigint | null {
  if (!vb || vb.missing) return null;
  return vb.big ?? BigInt(vb.num);
}

/** 两次采样的字节差分转 bps（number），回绕/负值/异常跳变归零 */
function deltaToBps(cur: bigint, prev: bigint, dt: number): number {
  const d = cur - prev;
  if (d < BigInt(0) || d > COUNTER_DELTA_MAX) return 0;
  return (Number(d) * 8) / dt;
}

// ========== 运行时状态（按视图隔离） ==========

/**
 * HCI 视图逻辑链路 → 真实聚合口（aggN）的映射。
 * 一条逻辑链路可能由多个聚合口承载（下行 = 多个 25G agg 之和）。
 */
interface LogicalPort {
  key: string; // 对应 topology.ts 中的逻辑键，如 uplink:sw10 / down:sw10 / peerlink:sw10
  name: string; // 展示名（参与的 agg 名）
  ifIndices: number[]; // 承载该逻辑链路的聚合口 ifIndex
  speed: number; // 协商速率之和（Mbps），用于利用率分母
}

interface DeviceRuntime {
  config: DeviceConfig;
  client: SNMPClient;
  connected: boolean;
  discovered: boolean;
  ifIndexMap: Map<string, number>; // core 视图：端口key -> ifIndex
  ifNameMap: Map<string, string>; // core 视图：端口key -> ifName
  prevCounters: Map<string, { in: bigint; out: bigint }>;
  logicalPorts: LogicalPort[]; // HCI 视图：逻辑链路映射
  aggPrev: Map<number, { in: bigint; out: bigint }>; // HCI 视图：聚合口计数器基线
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
        logicalPorts: [],
        aggPrev: new Map(),
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

  // 没有任何可用端口数据时不标记 ready（等待下一轮发现/恢复）
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
  const isHci = viewId === 'hyperconverged';
  try {
    if (isHci) {
      await discoverHciPorts(d, opts);
    } else {
      await discoverCorePorts(d, links, opts);
      if (d.ifIndexMap.size === 0) throw new Error('未发现任何目标端口');
    }
    d.connected = true;
    d.discovered = true;
    const found = isHci
      ? d.logicalPorts.map((lp) => `${lp.key}(${lp.ifIndices.length}口)`)
      : [...d.ifIndexMap.keys()];
    console.log(`[ITCWeathermap:${viewId}] 设备已连接: ${d.config.ip} (${d.config.name})，发现 ${found.length} 条链路: ${found.join(', ')}`);
    return true;
  } catch (err) {
    d.connected = false;
    d.discovered = false;
    d.ifIndexMap.clear();
    d.ifNameMap.clear();
    d.logicalPorts = [];
    d.aggPrev.clear();
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
  viewId: string,
  d: DeviceRuntime,
  links: ReturnType<typeof getLinksForView>,
  dt: number,
): Promise<DeviceCollectResult> {
  if (!d.discovered) {
    if (viewId === 'hyperconverged') await discoverHciPorts(d);
    else await discoverCorePorts(d, links);
    d.discovered = true;
  }
  return viewId === 'hyperconverged'
    ? collectHciDevice(d, dt)
    : collectCoreDevice(d, links, dt);
}

/**
 * HCI 设备采集：对每条逻辑链路的成员聚合口批量取 HC 计数器，
 * 先逐口与上一轮基线差分、再求和，避免成员口上下线导致的差分跳变。
 */
async function collectHciDevice(d: DeviceRuntime, dt: number): Promise<DeviceCollectResult> {
  const portData = new Map<string, PortData>();
  const missing: string[] = [];

  if (d.logicalPorts.length === 0) {
    return { deviceId: d.config.id, portData, missing };
  }

  // 全部逻辑链路口的并集，一次批量取数
  const allIndices = [...new Set(d.logicalPorts.flatMap((lp) => lp.ifIndices))].sort((a, b) => a - b);
  const [inResult, outResult, operResult] = await Promise.all([
    d.client.get(allIndices.map((i) => `${OID_HC_IN}.${i}`)),
    d.client.get(allIndices.map((i) => `${OID_HC_OUT}.${i}`)),
    d.client.get(allIndices.map((i) => `${OID_OPER_STATUS}.${i}`)),
  ]);

  const nextPrev = new Map<number, { in: bigint; out: bigint }>();

  for (const lp of d.logicalPorts) {
    let inBps = 0;
    let outBps = 0;
    let anyUp = false;
    let gotCounter = false;

    for (const ifIndex of lp.ifIndices) {
      const inCur = counterOf(inResult.get(`${OID_HC_IN}.${ifIndex}`));
      const outCur = counterOf(outResult.get(`${OID_HC_OUT}.${ifIndex}`));
      const operVB = operResult.get(`${OID_OPER_STATUS}.${ifIndex}`);
      if (operVB && !operVB.missing && operVB.num === 1) anyUp = true;
      if (inCur === null || outCur === null) continue;

      gotCounter = true;
      nextPrev.set(ifIndex, { in: inCur, out: outCur });
      const prev = d.aggPrev.get(ifIndex);
      if (prev && dt > 0) {
        inBps += deltaToBps(inCur, prev.in, dt);
        outBps += deltaToBps(outCur, prev.out, dt);
      }
    }

    if (!gotCounter) {
      missing.push(`${d.config.id}:${lp.key}`);
      continue;
    }

    portData.set(lp.key, {
      port: lp.key,
      name: lp.name,
      inBps,
      outBps,
      speed: lp.speed,
      oper: anyUp ? 1 : 2,
    });
  }

  d.aggPrev = nextPrev;
  return { deviceId: d.config.id, portData, missing };
}

/**
 * core 设备采集：物理口逐一取数并与上一轮基线差分
 */
async function collectCoreDevice(
  d: DeviceRuntime,
  links: ReturnType<typeof getLinksForView>,
  dt: number,
): Promise<DeviceCollectResult> {
  const portData = new Map<string, PortData>();
  const missing: string[] = [];
  const currentCounters = new Map<string, { in: bigint; out: bigint }>();

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
    const inCur = counterOf(inResult.get(`${OID_HC_IN}.${ifIndex}`));
    const outCur = counterOf(outResult.get(`${OID_HC_OUT}.${ifIndex}`));
    const speedVB = speedResult.get(`${OID_HIGH_SPEED}.${ifIndex}`);
    const operVB = operResult.get(`${OID_OPER_STATUS}.${ifIndex}`);

    if (inCur === null || outCur === null) {
      missing.push(`${d.config.id}:${key}`);
      continue;
    }

    currentCounters.set(key, { in: inCur, out: outCur });

    const speed = speedVB && !speedVB.missing ? speedVB.num : 0;
    const oper = operVB && !operVB.missing ? operVB.num : 0;
    const linkConfig = links.find((l) => l.port === key);

    // 与本设备上一轮基线差分（Counter64 精确 bigint 运算）
    let inBps = 0;
    let outBps = 0;
    const prev = d.prevCounters.get(key);
    if (prev && dt > 0) {
      inBps = deltaToBps(inCur, prev.in, dt);
      outBps = deltaToBps(outCur, prev.out, dt);
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
 * core 视图端口发现：WALK ifName，匹配本视图链路中声明的物理口（x/x/x/x）
 * walk 整体失败（超时/不支持）时抛错，由调用方判定设备不可达
 */
async function discoverCorePorts(
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
 * HCI 视图端口发现（浪潮 CN9300H）：
 * 只取聚合口 aggN（不碰成员物理口，避免流量双算），按协商速率归类到
 * topology.ts 声明的逻辑链路：
 *   ≥80G agg            → peerlink:<id>（交换机间集群互联）
 *   10G~25G 之间的 agg  → uplink:<id>  （上联核心）
 *   其余 ≥10G 的 agg    → down:<id>    （下行服务器，多口求和）
 * walk 失败（无任何 ifName）才判定不可达；分类不到某类链路时该类缺省。
 */
async function discoverHciPorts(
  d: DeviceRuntime,
  opts?: { timeout?: number; retries?: number; noFallback?: boolean },
): Promise<void> {
  const vbs = await d.client.walk(OID_IF_NAME, 4000, opts);
  if (vbs.length === 0) throw new Error('ifName WALK 无结果');

  // 收集所有聚合口 aggN 的 ifIndex
  const aggEntries: { ifIndex: number; name: string }[] = [];
  for (const vb of vbs) {
    if (!vb.isStr || !/^agg\d+$/.test(vb.str)) continue;
    const oidParts = vb.oid.split('.');
    const ifIndex = parseInt(oidParts[oidParts.length - 1], 10);
    if (Number.isFinite(ifIndex)) aggEntries.push({ ifIndex, name: vb.str });
  }
  if (aggEntries.length === 0) throw new Error('未发现任何聚合口(agg)');

  // 批量读取协商速率
  const speedResult = await d.client.get(
    aggEntries.map((e) => `${OID_HIGH_SPEED}.${e.ifIndex}`),
  );
  const groups: Record<'peer' | 'uplink' | 'down', { ifIndex: number; name: string; speed: number }[]> = {
    peer: [], uplink: [], down: [],
  };
  for (const e of aggEntries) {
    const vb = speedResult.get(`${OID_HIGH_SPEED}.${e.ifIndex}`);
    const speed = vb && !vb.missing ? vb.num : 0;
    if (speed >= HCI_PEER_SPEED_MIN) groups.peer.push({ ...e, speed });
    else if (speed >= HCI_UPLINK_SPEED_MIN && speed < 25000) groups.uplink.push({ ...e, speed });
    else if (speed >= HCI_DOWN_SPEED_MIN) groups.down.push({ ...e, speed });
  }

  const id = d.config.id;
  const logical: LogicalPort[] = [];
  if (groups.uplink.length > 0) {
    logical.push({
      key: `uplink:${id}`,
      name: `${groups.uplink.map((g) => g.name).join('、')}（上联核心）`,
      ifIndices: groups.uplink.map((g) => g.ifIndex),
      speed: groups.uplink.reduce((s, g) => s + g.speed, 0),
    });
  }
  if (groups.peer.length > 0) {
    logical.push({
      key: `peerlink:${id}`,
      name: `${groups.peer.map((g) => g.name).join('、')}（集群互联）`,
      ifIndices: groups.peer.map((g) => g.ifIndex),
      speed: groups.peer.reduce((s, g) => s + g.speed, 0),
    });
  }
  if (groups.down.length > 0) {
    const totalSpeed = groups.down.reduce((s, g) => s + g.speed, 0);
    logical.push({
      key: `down:${id}`,
      name: `${groups.down.length} 个 25G 聚合（下行服务器）：${groups.down.map((g) => g.name).join('、')}`,
      ifIndices: groups.down.map((g) => g.ifIndex),
      speed: totalSpeed,
    });
  }

  d.logicalPorts = logical;
  d.aggPrev.clear();
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

