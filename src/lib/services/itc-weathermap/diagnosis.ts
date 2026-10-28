/**
 * SNMP 诊断服务（运维排障用）。
 *
 * 与 collector 的差异：本服务为**只读旁路诊断**——对每台设备新建临时
 * SNMPClient 逐项探测（设备间并行），不触碰运行中的 viewRuntimes，
 * 结束后立即 close。诊断步骤刻意复刻 collector 的三种视图发现规则，
 * 以便区分「SNMP 完全不通」与「SNMP 通但采集判定不可达」两类故障：
 *
 *   1. basic   SNMP 连通性（GET sysDescr）
 *   2. sysName 设备名称（GET sysName）
 *   3. uptime  运行时长（GET sysUpTime）
 *   4. ifTable 接口表遍历（WALK ifName）
 *   5. view:*  视图采集验证（按设备归属视图，复刻 collector 发现规则）
 */
import {
  SNMPClient,
  OID_IF_NAME,
  OID_HIGH_SPEED,
  OID_SYS_DESCR,
  type VarBind,
} from './snmp';
import {
  getAllDeviceConfigs,
  getLinksForView,
  getAllViews,
  type DeviceConfig,
} from './config-loader';
import { hciDownCategories, lbVlanGroups } from './topology';

// ── 与 collector 保持一致的常量（collector 未导出，此处复刻） ──
const LB_TRUNK_IFNAME = 'Ten-GigabitEthernet1/2/4';
const LB_HA_IFNAME = 'Ten-GigabitEthernet1/2/0';
const HCI_UPLINK_SPEED_MIN = 10000;
const HCI_PEER_SPEED_MIN = 80000;

const OID_SYS_NAME = '1.3.6.1.2.1.1.5.0'; // sysName
const OID_SYS_UPTIME = '1.3.6.1.2.1.1.3.0'; // sysUpTime

export type DiagnosisStepStatus = 'ok' | 'warn' | 'fail' | 'skipped';

export interface DiagnosisStep {
  key: string;
  name: string;
  status: DiagnosisStepStatus;
  /** 该步耗时（毫秒） */
  ms: number;
  detail?: string;
  error?: string;
  suggestion?: string;
}

export interface DeviceDiagnosis {
  id: string;
  name: string;
  ip: string;
  /** 归属视图（设备在哪些视图中被采集） */
  views: { id: string; title: string }[];
  /** 无 fail 步骤即视为正常（warn 不算失败） */
  ok: boolean;
  totalMs: number;
  steps: DiagnosisStep[];
}

export interface DiagnosisReport {
  ts: string;
  totalCount: number;
  okCount: number;
  devices: DeviceDiagnosis[];
}

/** 生成 SNMP 不通时的排查建议（含目标 IP） */
function buildUnreachableSuggestion(ip: string): string {
  return [
    `排查建议：`,
    `1. 在部署本系统的服务器上执行 ping ${ip}，确认三层可达；`,
    `2. 检查设备/中间防火墙是否放行 UDP 161（snmp-agent 服务是否开启）；`,
    `3. 核对设备上 SNMP community 配置（v2c）与 config/itc-weathermap.yaml 是否一致；`,
    `4. 若为 HA 双机（如负载均衡），确认管理地址当前是否落在 active 成员上——standby 成员可能不对 SNMP 应答。`,
  ].join('\n');
}

/** sysUpTime（TimeTicks，1/100 秒）换算为可读时长 */
function formatUptime(ticks: number): string {
  const totalSec = Math.floor(ticks / 100);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d} 天 ${h} 小时 ${m} 分`;
  if (h > 0) return `${h} 小时 ${m} 分 ${s} 秒`;
  return `${m} 分 ${s} 秒`;
}

function truncate(s: string, max = 160): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

// ── 视图采集验证：core ────────────────────────────────────────

/** core：校验 links 声明的物理口（x/x/x/x）在 ifName 表中是否可发现 */
function verifyCoreView(
  client: SNMPClient,
  vbs: VarBind[],
  devId: string,
): DiagnosisStep {
  const wantedPorts = new Set<string>();
  for (const link of getLinksForView('core')) {
    if (/^\d+\/\d+\/\d+\/\d+$/.test(link.port)) wantedPorts.add(link.port);
  }
  if (wantedPorts.size === 0) {
    return { key: `view:core`, name: '视图采集验证：数据中心核心链路', status: 'warn', ms: 0, detail: 'core 视图未声明物理口链路，无法校验' };
  }

  const found = new Set<string>();
  const portKeyRe = /(\d+\/\d+\/\d+\/\d+)$/;
  for (const vb of vbs) {
    if (!vb.isStr) continue;
    const m = portKeyRe.exec(vb.str);
    if (m && wantedPorts.has(m[1])) found.add(m[1]);
  }

  const missing = [...wantedPorts].filter((p) => !found.has(p)).sort();
  const ms = 0; // 复用 ifTable walk 结果，无额外请求
  if (missing.length === 0) {
    return {
      key: `view:core`, name: '视图采集验证：数据中心核心链路', status: 'ok', ms,
      detail: `核心视图所需 ${wantedPorts.size} 个物理口全部发现：${[...found].sort().join('、')}`,
    };
  }
  const allMissing = missing.length === wantedPorts.size;
  return {
    key: `view:core`, name: '视图采集验证：数据中心核心链路',
    status: allMissing ? 'fail' : 'warn',
    ms,
    detail: `发现 ${found.size}/${wantedPorts.size} 个物理口`,
    error: allMissing
      ? `所有核心链路物理口均未发现（${[...wantedPorts].sort().join('、')}），该设备将无法参与核心视图流量采集（设备 ${devId}）`
      : `缺失端口：${missing.join('、')}（对应链路将无流量数据）`,
    suggestion: allMissing
      ? '核对端口命名是否与拓扑声明一致（如 GE1/0/1 与 x/x/x/x 格式），或设备实际角色是否变化。'
      : '确认缺失端口是否已 up 并加入 VLAN/聚合（未创建的端口不会出现在 ifName 表中）。若属正常未启用端口，可调整 topology 声明。',
  };
}

// ── 视图采集验证：hyperconverged ─────────────────────────────

/** HCI：复刻 discoverHciPorts——aggN/eth-0-N 发现 + 速率归类 + 下行端口表校验 */
async function verifyHciView(
  client: SNMPClient,
  vbs: VarBind[],
  dev: DeviceConfig,
): Promise<DiagnosisStep> {
  const name = `视图采集验证：超融合业务`;
  const aggIfIndex = new Map<number, number>();
  const ethIfIndex = new Map<number, number>();
  for (const vb of vbs) {
    if (!vb.isStr) continue;
    const oidParts = vb.oid.split('.');
    const ifIndex = parseInt(oidParts[oidParts.length - 1], 10);
    if (!Number.isFinite(ifIndex)) continue;
    const mAgg = /^agg(\d+)$/.exec(vb.str);
    if (mAgg) { aggIfIndex.set(parseInt(mAgg[1], 10), ifIndex); continue; }
    const mEth = /^eth-0-(\d+)$/.exec(vb.str);
    if (mEth) ethIfIndex.set(parseInt(mEth[1], 10), ifIndex);
  }

  if (aggIfIndex.size === 0) {
    return {
      key: `view:hyperconverged`, name, status: 'fail', ms: 0,
      error: '未发现任何聚合口（agg*）——HCI 视图发现必然失败',
      suggestion: '该设备若非超融合交换机，请从 config/itc-weathermap.yaml 的 hyperconverged 视图设备中移除；若是，请确认聚合口命名（aggN）。',
    };
  }

  // 下行分类端口：agg 优先、eth 兜底（与 collector 一致）
  const cats = hciDownCategories[dev.id] ?? [];
  const downMissing: string[] = [];
  const downOk: string[] = [];
  for (const cat of cats) {
    const miss = cat.ports.filter((p) => !aggIfIndex.has(p) && !ethIfIndex.has(p));
    if (miss.length > 0) downMissing.push(`${cat.name}(${cat.key})：端口 ${miss.join('/')} 未发现`);
    else downOk.push(cat.name);
  }

  // 批量读取 agg 协商速率，归类 uplink / peerlink（与 collector 一致）
  const aggList = [...aggIfIndex.entries()].map(([port, ifIndex]) => ({ port, ifIndex }));
  let uplinkPorts: string[] = [];
  let peerPorts: string[] = [];
  let speedErr = '';
  try {
    const speedResult = await client.get(aggList.map((e) => `${OID_HIGH_SPEED}.${e.ifIndex}`));
    for (const e of aggList) {
      const vb = speedResult.get(`${OID_HIGH_SPEED}.${e.ifIndex}`);
      const s = vb && !vb.missing ? vb.num : 0;
      if (s >= HCI_UPLINK_SPEED_MIN && s < 25000) uplinkPorts.push(`agg${e.port}(${s}M)`);
      if (s >= HCI_PEER_SPEED_MIN) peerPorts.push(`agg${e.port}(${s}M)`);
    }
  } catch (e) {
    speedErr = `ifHighSpeed 批量读取失败：${String(e)}`;
  }

  const parts: string[] = [
    `聚合口 ${aggIfIndex.size} 个、物理口(eth) ${ethIfIndex.size} 个`,
    uplinkPorts.length > 0 ? `上联核心：${uplinkPorts.join('、')}` : '上联核心：未发现（10G–25G 的 agg）',
    peerPorts.length > 0 ? `集群互联：${peerPorts.join('、')}` : '集群互联：未发现（≥80G 的 agg）',
    downOk.length > 0 ? `下行业务分类正常：${downOk.join('、')}` : '',
    downMissing.length > 0 ? `下行缺失：${downMissing.join('；')}` : '',
  ].filter(Boolean);

  if (speedErr) {
    return { key: `view:hyperconverged`, name, status: 'warn', ms: 0, detail: parts.join('；'), error: speedErr, suggestion: '速率读取失败会导致 uplink/peerlink 归类失败，请重试。' };
  }
  if (uplinkPorts.length === 0 && peerPorts.length === 0) {
    return { key: `view:hyperconverged`, name, status: 'warn', ms: 0, detail: parts.join('；'), error: '未发现上联核心或集群互联聚合口，HCI 视图仅有下行链路', suggestion: '确认上联核心（10G–25G）与集群互联（≥80G）聚合口是否存在且速率协商正常。' };
  }
  if (downMissing.length > 0) {
    return { key: `view:hyperconverged`, name, status: 'warn', ms: 0, detail: parts.join('；'), error: `部分下行业务端口缺失：${downMissing.join('；')}`, suggestion: '缺失端口若属正常（未启用/未创建），无需处理；否则检查端口配置。' };
  }
  return { key: `view:hyperconverged`, name, status: 'ok', ms: 0, detail: parts.join('；') };
}

// ── 视图采集验证：loadbalancer ───────────────────────────────

/** LB：复刻 discoverLbPorts——trunk/HA/8 个 VLAN 子接口逐项检查 */
function verifyLbView(
  vbs: VarBind[],
): DiagnosisStep {
  const name = `视图采集验证：负载均衡业务`;
  const ifNameSet = new Set<string>();
  for (const vb of vbs) if (vb.isStr) ifNameSet.add(vb.str);

  const hasTrunk = ifNameSet.has(LB_TRUNK_IFNAME);
  const hasHa = ifNameSet.has(LB_HA_IFNAME);
  const subVlans = new Set<number>();
  const subRe = /^Ten-GigabitEthernet1\/2\/4\.(\d+)$/;
  for (const n of ifNameSet) {
    const m = subRe.exec(n);
    if (m) subVlans.add(parseInt(m[1], 10));
  }

  const allNeededVlans = lbVlanGroups.flatMap((g) => g.vlans);
  const missingVlans = allNeededVlans.filter((v) => !subVlans.has(v));
  const foundVlans = allNeededVlans.filter((v) => subVlans.has(v));

  const parts: string[] = [
    `trunk(${LB_TRUNK_IFNAME})：${hasTrunk ? '发现' : '未发现'}`,
    `HA 心跳口(${LB_HA_IFNAME})：${hasHa ? '发现' : '未发现'}`,
    `业务子接口：${foundVlans.length > 0 ? foundVlans.map((v) => `${LB_TRUNK_IFNAME}.${v}`).join('、') : '无'}`,
  ];

  if (!hasTrunk || subVlans.size === 0) {
    // 与 collector 的判定一致：此时 discoverLbPorts 抛错，设备被判「不可达」
    return {
      key: `view:loadbalancer`, name, status: 'fail', ms: 0,
      detail: parts.join('；'),
      error: !hasTrunk && subVlans.size === 0
        ? `trunk 与全部 VLAN 子接口均未发现——采集器将把该设备判定为「不可达」（即使 SNMP 本身连通）`
        : hasTrunk
          ? 'trunk 存在但无任何 VLAN 子接口——采集器将判定「不可达」'
          : 'trunk 未发现（存在子接口）——采集器将判定「不可达」',
      suggestion: '最常见原因：该 IP 为 HA 双机的 standby 成员或管理 VRRP 地址当前漂移到 standby——H3C LB 的 SNMP 通常仅在 active 成员上应答业务接口视图。请登录设备确认主备状态（display vrrp / display failover），或改用 active 成员的管理地址。其次核对设备型号/端口命名（Ten-GigabitEthernet1/2/4）。',
    };
  }
  if (missingVlans.length > 0) {
    return {
      key: `view:loadbalancer`, name, status: 'warn', ms: 0,
      detail: parts.join('；'),
      error: `缺失子接口：${missingVlans.map((v) => `${LB_TRUNK_IFNAME}.${v}`).join('、')}（对应 VLAN 链路无流量数据）`,
      suggestion: '确认这些 VLAN 子接口是否已在设备上创建；若属正常未启用，可调整 topology.lbVlanGroups。',
    };
  }
  return { key: `view:loadbalancer`, name, status: 'ok', ms: 0, detail: parts.join('；') };
}

// ── 单台设备诊断主流程 ───────────────────────────────────────

async function diagnoseDevice(
  dev: DeviceConfig,
  views: { id: string; title: string }[],
): Promise<DeviceDiagnosis> {
  const started = Date.now();
  const steps: DiagnosisStep[] = [];
  const step = (s: DiagnosisStep) => steps.push(s);

  const client = new SNMPClient({
    host: dev.ip,
    community: dev.snmpCommunity,
    timeout: 2000,
    retries: 1,
  });

  let snmpOk = false;
  let vbs: VarBind[] = [];

  try {
    // 步骤 1：SNMP 连通性（sysDescr）
    {
      const t = Date.now();
      try {
        const res = await client.get([OID_SYS_DESCR], { timeout: 2500, retries: 0 });
        const vb = res.get(OID_SYS_DESCR);
        snmpOk = !!vb && !vb.missing;
        step({
          key: 'basic', name: 'SNMP 连通性（sysDescr）',
          status: snmpOk ? 'ok' : 'fail', ms: Date.now() - t,
          detail: snmpOk ? truncate(vb!.str) : '设备应答中缺少 sysDescr 值',
          error: snmpOk ? undefined : 'SNMP 响应异常（无 sysDescr）',
          suggestion: snmpOk ? undefined : buildUnreachableSuggestion(dev.ip),
        });
      } catch (e) {
        step({
          key: 'basic', name: 'SNMP 连通性（sysDescr）',
          status: 'fail', ms: Date.now() - t,
          error: String(e),
          suggestion: buildUnreachableSuggestion(dev.ip),
        });
      }
    }

    if (!snmpOk) {
      step({ key: 'sysName', name: '设备名称（sysName）', status: 'skipped', ms: 0, detail: 'SNMP 不通，跳过' });
      step({ key: 'uptime', name: '运行时长（sysUpTime）', status: 'skipped', ms: 0, detail: 'SNMP 不通，跳过' });
      step({ key: 'ifTable', name: '接口表遍历（WALK ifName）', status: 'skipped', ms: 0, detail: 'SNMP 不通，跳过' });
      for (const v of views) {
        step({ key: `view:${v.id}`, name: `视图采集验证：${v.title}`, status: 'skipped', ms: 0, detail: 'SNMP 不通，跳过' });
      }
      return {
        id: dev.id, name: dev.name, ip: dev.ip, views,
        ok: false, totalMs: Date.now() - started, steps,
      };
    }

    // 步骤 2：sysName
    {
      const t = Date.now();
      try {
        const res = await client.get([OID_SYS_NAME]);
        const vb = res.get(OID_SYS_NAME);
        const ok = !!vb && !vb.missing;
        step({
          key: 'sysName', name: '设备名称（sysName）', status: ok ? 'ok' : 'warn', ms: Date.now() - t,
          detail: ok ? vb!.str : '未返回 sysName（不影响采集）',
        });
      } catch (e) {
        step({ key: 'sysName', name: '设备名称（sysName）', status: 'warn', ms: Date.now() - t, error: String(e) });
      }
    }

    // 步骤 3：sysUpTime
    {
      const t = Date.now();
      try {
        const res = await client.get([OID_SYS_UPTIME]);
        const vb = res.get(OID_SYS_UPTIME);
        const ok = !!vb && !vb.missing;
        const ticks = vb ? (vb.big !== undefined ? Number(vb.big) : vb.num) : 0;
        step({
          key: 'uptime', name: '运行时长（sysUpTime）', status: ok ? 'ok' : 'warn', ms: Date.now() - t,
          detail: ok ? formatUptime(ticks) : '未返回 sysUpTime（不影响采集）',
        });
      } catch (e) {
        step({ key: 'uptime', name: '运行时长（sysUpTime）', status: 'warn', ms: Date.now() - t, error: String(e) });
      }
    }

    // 步骤 4：ifName WALK（后续视图验证的基础）
    {
      const t = Date.now();
      try {
        vbs = await client.walk(OID_IF_NAME, 4000);
        const ok = vbs.length > 0;
        step({
          key: 'ifTable', name: '接口表遍历（WALK ifName）',
          status: ok ? 'ok' : 'fail', ms: Date.now() - t,
          detail: ok ? `共 ${vbs.length} 个接口` : '接口表为空',
          error: ok ? undefined : 'WALK 成功但接口表为空',
        });
      } catch (e) {
        step({
          key: 'ifTable', name: '接口表遍历（WALK ifName）', status: 'fail', ms: Date.now() - t,
          error: String(e),
          suggestion: 'GET 可达但 WALK 失败通常是设备对 GETBULK/GETNEXT 限速或超时——可稍后重试；持续失败需检查设备 SNMP 视图（view）是否包含 ifMIB。',
        });
      }
    }

    // 步骤 5+：按归属视图验证
    for (const v of views) {
      if (vbs.length === 0) {
        step({ key: `view:${v.id}`, name: `视图采集验证：${v.title}`, status: 'skipped', ms: 0, detail: '接口表为空，跳过' });
        continue;
      }
      try {
        if (v.id === 'core') {
          step(verifyCoreView(client, vbs, dev.id));
        } else if (v.id === 'hyperconverged') {
          step(await verifyHciView(client, vbs, dev));
        } else if (v.id === 'loadbalancer') {
          step(verifyLbView(vbs));
        } else {
          step({ key: `view:${v.id}`, name: `视图采集验证：${v.title}`, status: 'skipped', ms: 0, detail: '暂无该视图的发现规则校验' });
        }
      } catch (e) {
        step({
          key: `view:${v.id}`, name: `视图采集验证：${v.title}`, status: 'fail', ms: 0,
          error: String(e),
        });
      }
    }

    return {
      id: dev.id, name: dev.name, ip: dev.ip, views,
      ok: !steps.some((s) => s.status === 'fail'),
      totalMs: Date.now() - started,
      steps,
    };
  } finally {
    client.close();
  }
}

/**
 * 运行诊断。
 * @param deviceId 指定设备 id 则单台诊断，否则诊断全部设备
 */
export async function runDiagnosis(deviceId?: string): Promise<DiagnosisReport> {
  const all = getAllDeviceConfigs();
  if (deviceId && !all.some((d) => d.id === deviceId)) {
    throw new Error(`未找到设备：${deviceId}`);
  }
  const devices = deviceId ? all.filter((d) => d.id === deviceId) : all;

  const allViews = getAllViews();
  const results = await Promise.all(
    devices.map((dev) => {
      const views = allViews
        .filter((v) => v.deviceIds.includes(dev.id))
        .map((v) => ({ id: v.id, title: v.title }));
      return diagnoseDevice(dev, views);
    }),
  );

  return {
    ts: new Date().toISOString(),
    totalCount: results.length,
    okCount: results.filter((r) => r.ok).length,
    devices: results,
  };
}
