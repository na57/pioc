'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import type { Key } from 'react';
import {
  App,
  Space,
  Typography,
  Badge,
  Tooltip,
  Table,
  Tag,
  Result,
  Popover,
} from 'antd';
import {
  ReloadOutlined,
  ClockCircleOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { formatFriendlyTime } from '@/components/FriendlyTime';
import ActionButton from '@/app/tags/components/ActionButton';
import SnmpStatusBadge from '../components/SnmpStatusBadge';
import { useSvgFlowAnimation } from '../components/useSvgFlowAnimation';

const { Title, Text } = Typography;

interface PortTableRow {
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
  switchLabel: string;
  category: string;
  portNo: number;
}

interface DeviceState {
  id: string;
  name: string;
  ip: string;
  connected: boolean;
}

interface ApiResp {
  success: boolean;
  viewId: string;
  viewName: string;
  connected: boolean;
  deviceTotal?: number;
  deviceConnected?: number;
  devices?: DeviceState[];
  warm: boolean;
  ready: boolean;
  updateTime: number | null;
  svg: string;
  ports: PortTableRow[];
  error: string;
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

function statusBadge(oper: number) {
  if (oper === -2) return { color: '#A32D2D', text: '未达' };
  if (oper >= 0 && oper !== 1) return { color: '#A32D2D', text: 'Down' };
  if (oper === 1) return { color: '#3B6D11', text: 'Up' };
  return { color: '#888', text: '未知' };
}

function YktWeathermapContent() {
  const { message } = App.useApp();

  const [loading, setLoading] = useState(true);
  const [apiData, setApiData] = useState<ApiResp | null>(null);
  const [forbidden, setForbidden] = useState(false);
  // SVG 在隐藏页面插入时光点动画会卡在 paused（首屏不动、点刷新才动），用 hook 兜底
  const svgWrapRef = useSvgFlowAnimation<HTMLDivElement>(apiData?.svg);

  const fetchSnapshot = useCallback(async (): Promise<ApiResp | null> => {
    try {
      setLoading(true);
      const resp = await fetch('/api/itc-weathermap/snapshot?view=ykt');
      if (resp.status === 403) {
        setForbidden(true);
        setApiData(null);
        return null;
      }
      const data: ApiResp = await resp.json();
      setApiData(data);
      return data;
    } catch (err) {
      console.error('[YktWeathermap] 网络错误:', err);
      message.error('网络请求失败');
      return null;
    } finally {
      setLoading(false);
    }
  }, [message]);

  // 自适应轮询：首轮「就绪」仅代表基线已建立，真实速率要等采集器 5 秒后的预热轮才有；
  // 拿到真实速率（warm=true）前保持 5 秒快轮询，避免干等一个 30 秒刷新周期
  useEffect(() => {
    if (forbidden) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const loop = async () => {
      const data = await fetchSnapshot();
      if (stopped) return;
      timer = setTimeout(loop, data?.warm ? 30000 : 5000);
    };
    void loop();
    return () => { stopped = true; clearTimeout(timer); };
  }, [fetchSnapshot, forbidden]);

  if (forbidden) {
    return (
      <Result
        status="403"
        title="403"
        subTitle="抱歉，您当前的角色无权访问「图书馆一卡通业务」网络天气图。"
      />
    );
  }

  const ports = apiData?.ports ?? [];
  const total = ports.length;
  const upCount = ports.filter((p) => p.oper === 1).length;
  const downCount = ports.filter((p) => p.oper >= 0 && p.oper !== 1).length;
  const hotCount = ports.filter((p) => p.utilization >= 30 && p.oper === 1).length;

  const switchFilters = [...new Set(ports.map((p) => p.switchLabel).filter(Boolean))]
    .map((v) => ({ text: v, value: v }));
  const categoryFilters = [...new Set(ports.map((p) => p.category).filter(Boolean))]
    .map((v) => ({ text: v, value: v }));

  const portColumns = [
    {
      title: '交换机',
      dataIndex: 'switchLabel',
      key: 'switchLabel',
      width: 96,
      filters: switchFilters,
      onFilter: (value: Key | boolean, r: PortTableRow) => r.switchLabel === value,
      render: (v: string) => <Text style={{ fontSize: 12 }}>{v || '—'}</Text>,
    },
    {
      title: '业务分类',
      dataIndex: 'category',
      key: 'category',
      width: 116,
      filters: categoryFilters,
      onFilter: (value: Key | boolean, r: PortTableRow) => r.category === value,
      render: (v: string) => v ? <Tag style={{ marginInlineEnd: 0, fontSize: 12 }}>{v}</Tag> : '—',
    },
    {
      title: '链路',
      dataIndex: 'description',
      key: 'description',
      width: 250,
      ellipsis: true,
      render: (v: string, r: PortTableRow) => {
        const b = statusBadge(r.oper);
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span
              title={b.text}
              style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: b.color, flexShrink: 0 }}
            />
            <Text style={{ fontSize: 12.5 }}>{v}</Text>
          </span>
        );
      },
    },
    {
      title: '接口',
      dataIndex: 'ifName',
      key: 'ifName',
      width: 110,
      ellipsis: true,
      render: (v: string) => (
        <Text style={{ fontSize: 12, color: '#5F5E5A' }}>
          {v || '—'}
        </Text>
      ),
    },
    {
      title: '对端',
      dataIndex: 'peer',
      key: 'peer',
      width: 240,
      ellipsis: true,
      render: (v: string) => <Text style={{ fontSize: 12 }}>{v || '—'}</Text>,
    },
    {
      title: '带宽',
      dataIndex: 'speed',
      key: 'speed',
      width: 70,
      render: (v: number) => fmtSpeed(v),
    },
    {
      title: '入',
      dataIndex: 'inBps',
      key: 'inBps',
      width: 100,
      align: 'right' as const,
      render: (v: number) => <Text code style={{ fontSize: 12 }}>{v > 0 ? fmtBps(v) : '—'}</Text>,
    },
    {
      title: '出',
      dataIndex: 'outBps',
      key: 'outBps',
      width: 100,
      align: 'right' as const,
      render: (v: number) => <Text code style={{ fontSize: 12 }}>{v > 0 ? fmtBps(v) : '—'}</Text>,
    },
    {
      title: '利用率',
      dataIndex: 'utilization',
      key: 'utilization',
      width: 110,
      align: 'right' as const,
      render: (util: number, r: PortTableRow) => {
        const bad = r.oper !== 1;
        const color = bad ? '#B0B0B0' : `hsl(${120 - util * 1.2}, 60%, 45%)`;
        return (
          <Tooltip title={`入 ${fmtBps(r.inBps)} / 出 ${fmtBps(r.outBps)}`}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
              <span style={{ display: 'inline-block', width: 34, height: 9, borderRadius: 3, background: color }} />
              <Text code style={{ fontSize: 12 }}>{bad ? '—' : util.toFixed(2) + '%'}</Text>
            </div>
          </Tooltip>
        );
      },
    },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* 标题 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>图书馆一卡通业务</Title>
          <Text type="secondary">Yndx_YKT（锐捷 S6150 两台堆叠 · 10.10.251.4，TF1/TF2 分示）· 双 10G 上联核心（Ag4 跨成员 LACP）· 下挂深信服虚拟化平台 / 一卡通数据库一体机 / 原防火墙接口（已停用）</Text>
        </div>
        <Space wrap size="middle" style={{ justifyContent: 'flex-end' }}>
          <SnmpStatusBadge
            connected={!!apiData?.connected}
            deviceTotal={apiData?.deviceTotal}
            deviceConnected={apiData?.deviceConnected}
            devices={apiData?.devices}
            loading={loading && !apiData}
          />
          {apiData?.connected && (
            <Badge
              status={apiData.ready ? 'success' : 'processing'}
              text={apiData.ready ? '就绪' : '首次采样中...'}
            />
          )}
          {apiData?.updateTime && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              {formatFriendlyTime(new Date(apiData.updateTime))}
            </Text>
          )}
          {hotCount > 0 && <Badge status="error" text={`${hotCount} 条链路利用率 ≥ 30%`} />}
          {downCount > 0 && <Badge status="error" text={`${downCount} 条链路 Down`} />}
          <ActionButton
            icon={<ReloadOutlined spin={loading} />}
            tooltip="刷新"
            onClick={fetchSnapshot}
          />
          <Popover
            title="看图说明"
            trigger="hover"
            placement="bottomRight"
            content={
              <ul style={{ paddingLeft: 18, margin: 0, maxWidth: 480, fontSize: 12.5, color: '#5F5E5A', lineHeight: 1.9 }}>
                <li>一卡通业务交换机 <b>Yndx_YKT</b>（锐捷 S6150 <b>两台堆叠</b> · 10.10.251.4）按堆叠成员 <b>TF1 / TF2</b> 两台分示，两台之间上方虚线拱弧为堆叠互联（TF1/0/47/48 + TF2/0/47/48，取 TF1 侧求和）。</li>
                <li>向上各 10G 上联一台核心（YKT 侧 Ag4 = TF1/0/45 + TF2/0/45 跨堆叠 LACP 20G，图中按成员拆为两条 10G；流量取<b>核心侧 Te1/0/0/20、Te2/0/0/20 实测</b>）。</li>
                <li>向下三组业务（悬停链路可见端口号，同一业务经 TF1/TF2 各一条线）：<b>深信服虚拟化平台</b> Ag1/Ag2/Ag3（各 2×10G 跨堆叠成员 TF1|2/0/4~6，聚合与端口的精确对应待核实）；<b>一卡通数据库一体机</b>（TF2/0/25·26 两路 10G + TF1/0/36、TF2/0/36 两路 1G 光转电，台账误标 10G）；<b>FW1/FW2 原防火墙接口</b>（TF1/0/46、TF2/0/46，已停用，Down 属实）。</li>
                <li>同一下行业务合并为一个节点，悬停节点可查看各分支（Ag1/Ag2/Ag3、DB·10G①…）逐条流量；每条逻辑链路一行，见下方<b>链路明细表</b>。</li>
                <li>所有流量均为 SNMP 直连实测：两次采样计数器差值 ÷ 采样窗口，是瞬时值，会随业务波动。</li>
                <li>堆叠互联、VLAN 划分等静态信息见《图书馆一卡通业务.md》。</li>
              </ul>
            }
          >
            <ActionButton icon={<QuestionCircleOutlined />} tooltip="看图说明" />
          </Popover>
        </Space>
      </div>

      {/* SNMP 未连接提示 */}
      {apiData && !apiData.connected && (
        <div style={{ marginBottom: 16, fontSize: 13, lineHeight: 1.8, color: '#5F5E5A' }}>
          <span style={{ color: '#D46B08', fontWeight: 500 }}>SNMP 未连接</span>
          ：当前显示拓扑框架（节点/链路/带宽），尚未采集到实时流量数据。已配置 {apiData.deviceTotal ?? 2} 台设备（核心 IRF + Yndx_YKT），其中 {apiData.deviceConnected ?? 0} 台可达；设备恢复可达后将自动刷新。
        </div>
      )}

      {loading && !apiData?.svg && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <ReloadOutlined spin /> 正在加载...
        </div>
      )}

      {apiData?.svg && (
        <>
          {/* 统计（扁平排版，无卡片） */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 56px', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: '#5F5E5A' }}>链路总数（逻辑链路）</div>
              <div style={{ fontSize: 30, fontWeight: 500, lineHeight: 1.3, color: '#2C2C2A' }}>{total}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#5F5E5A' }}>Up</div>
              <div style={{ fontSize: 30, fontWeight: 500, lineHeight: 1.3, color: '#3B6D11' }}>{upCount}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#5F5E5A' }}>Down / 未达</div>
              <div style={{ fontSize: 30, fontWeight: 500, lineHeight: 1.3, color: '#A32D2D' }}>{downCount}</div>
            </div>
          </div>

          {/* SVG 拓扑图 */}
          <div
            ref={svgWrapRef}
            dangerouslySetInnerHTML={{ __html: apiData.svg }}
            style={{ width: '100%', overflowX: 'auto', marginBottom: 16 }}
          />

          {/* 图例 */}
          <div
            dangerouslySetInnerHTML={{
              __html: `
                <div style="display:flex;flex-wrap:wrap;gap:26px;align-items:flex-start;margin-bottom:16px;font-size:12px;color:#5F5E5A">
                  <div>
                    <div style="font-size:12px;color:#5F5E5A;margin-bottom:6px;font-weight:500">链路粗细 = 带宽</div>
                    <svg width="260" height="20">
                      <line x1="2" y1="10" x2="32" y2="10" stroke="#888780" stroke-width="3" stroke-linecap="round"/>
                      <text x="40" y="13" font-size="12" fill="#444">1G</text>
                      <line x1="82" y1="10" x2="118" y2="10" stroke="#888780" stroke-width="5" stroke-linecap="round"/>
                      <text x="126" y="13" font-size="12" fill="#444">10G</text>
                      <line x1="176" y1="10" x2="214" y2="10" stroke="#888780" stroke-width="6.5" stroke-linecap="round"/>
                      <text x="222" y="13" font-size="12" fill="#444">20G</text>
                    </svg>
                  </div>
                  <div>
                    <div style="font-size:12px;color:#5F5E5A;margin-bottom:6px;font-weight:500">链路颜色 = 利用率</div>
                    <svg width="260" height="20">
                      <rect x="2" y="6" width="20" height="9" fill="#3FA96B"/><text x="26" y="14" font-size="12" fill="#444">0%</text>
                      <rect x="60" y="6" width="20" height="9" fill="#8CC63F"/><text x="84" y="14" font-size="12" fill="#444">15%</text>
                      <rect x="120" y="6" width="20" height="9" fill="#C6B54A"/><text x="144" y="14" font-size="12" fill="#444">40%</text>
                      <rect x="180" y="6" width="20" height="9" fill="#DF9B4B"/><text x="204" y="14" font-size="12" fill="#444">70%</text>
                    </svg>
                  </div>
                  <div>
                    <div style="font-size:12px;color:#5F5E5A;margin-bottom:6px;font-weight:500">其它</div>
                    <div style="font-size:12px;color:#444;line-height:1.8">
                      白色光点流动 = 有流量，静止 = 空载<br/>
                      同一下行业务合并为一个节点；分支粗细 = UP 口容量，逐链路流量见明细表
                    </div>
                  </div>
                </div>
              `,
            }}
          />

          {/* ========== 链路明细 ========== */}
          <div style={{ marginTop: 20, marginBottom: 12 }}>
            <Text strong style={{ color: '#2C2C2A' }}>
              链路明细（{total} 行 · 上联为核心侧物理口、下行为逻辑链路 · 默认按利用率降序，可用列头按业务分类筛选）
            </Text>
          </div>
          <Table
            dataSource={ports}
            columns={portColumns}
            rowKey="port"
            size="small"
            pagination={false}
            scroll={{ x: 1200 }}
          />
        </>
      )}
    </div>
  );
}

export default function YktWeathermapPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, textAlign: 'center' }}>加载中...</div>}>
      <YktWeathermapContent />
    </Suspense>
  );
}
