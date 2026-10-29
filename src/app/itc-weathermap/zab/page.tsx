'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import type { Key } from 'react';
import {
  App,
  Row,
  Col,
  Space,
  Typography,
  Badge,
  Statistic,
  Alert,
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

function ZabWeathermapContent() {
  const { message } = App.useApp();

  const [loading, setLoading] = useState(true);
  const [apiData, setApiData] = useState<ApiResp | null>(null);
  const [forbidden, setForbidden] = useState(false);
  // SVG 在隐藏页面插入时光点动画会卡在 paused（首屏不动、点刷新才动），用 hook 兜底
  const svgWrapRef = useSvgFlowAnimation<HTMLDivElement>(apiData?.svg);

  const fetchSnapshot = useCallback(async (): Promise<ApiResp | null> => {
    try {
      setLoading(true);
      const resp = await fetch('/api/itc-weathermap/snapshot?view=zab');
      if (resp.status === 403) {
        setForbidden(true);
        setApiData(null);
        return null;
      }
      const data: ApiResp = await resp.json();
      setApiData(data);
      return data;
    } catch (err) {
      console.error('[ZabWeathermap] 网络错误:', err);
      message.error('网络请求失败');
      return null;
    } finally {
      setLoading(false);
    }
  }, [message]);

  // 自适应轮询：首轮未就绪（设备不可达/基线未建立）时 5 秒快轮，就绪后 30 秒
  useEffect(() => {
    if (forbidden) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const loop = async () => {
      const data = await fetchSnapshot();
      if (stopped) return;
      timer = setTimeout(loop, data?.ready ? 30000 : 5000);
    };
    void loop();
    return () => { stopped = true; clearTimeout(timer); };
  }, [fetchSnapshot, forbidden]);

  if (forbidden) {
    return (
      <Result
        status="403"
        title="403"
        subTitle="抱歉，您当前的角色无权访问「图书馆灾备业务」网络天气图。"
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
      width: 260,
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
          <Title level={4} style={{ margin: 0 }}>图书馆灾备业务</Title>
          <Text type="secondary">灾备10G业务交换机（锐捷 S6150 两台堆叠 · 10.10.251.2，TF1/TF2 分示，原图书馆超融合）· 双 40G 上联核心（33 口）· 下挂浪潮 3 节点 / 4 节点测试超融合、主数据库一体机、爱数灾备 ×9</Text>
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
                <li><b>灾备10G业务交换机</b>（锐捷 S6150 <b>两台堆叠</b> · 10.10.251.2，原「图书馆超融合」）按堆叠成员 <b>TF1 / TF2</b> 两台分示，两台之间上方虚线拱弧为堆叠互联（[47][48]，取 TF1 侧求和）。双 <b>40G</b> 上联两台核心（核心侧 FortyGigE1|2/0/0/33 → 灾备侧 Hu1|2/0/49，流量取核心侧实测）。速率口径：早期资料标 10G 为笔误，实测 ifHighSpeed=40000。</li>
                <li><b>浪潮3节点2路超融合 ×3</b>（allinone-01/02、node-57760，LLDP sysName 实测）：每台 4 路 10G（TF1|2/0/5~7 + TF1|2/0/8~10），经 TF1/TF2 各一条线。</li>
                <li><b>主数据库一体机</b>：[11][12] 两口 UP 有流量（Dell + H3C 双厂商网卡，是否一台设备待现场确认）；[13] 未登记但 UP 有流量，用途待确认。</li>
                <li><b>浪潮4节点测试超融合 ×4</b>（allinone-101/102、node-103/104）：每台 TF1+TF2 各 1 路（[26]~[29]）。</li>
                <li><b>爱数灾备服务器 ×9</b>：跨堆叠双归聚合 Ag35~43，每台 2×10G（Ag35~40 xFusion 机身批次、Ag41~43 Intel 网卡批次），图中按 TF1/TF2 成员各一条线；聚合与规划表 eth0-N 口的逐台对号待核对。</li>
                <li>已知事项：两核心 33 口<b>双归同一台堆叠设备</b>的两个成员（常规应为两台不同接入设备，待确认）；[44]~[46] 空闲 DOWN 未上图。</li>
                <li>所有流量均为 SNMP 直连实测：两次采样计数器差值 ÷ 采样窗口，是瞬时值，会随业务波动。</li>
              </ul>
            }
          >
            <ActionButton icon={<QuestionCircleOutlined />} tooltip="看图说明" />
          </Popover>
        </Space>
      </div>

      {/* SNMP 未连接提示 */}
      {apiData && !apiData.connected && (
        <Alert
          type="info"
          showIcon
          title="SNMP 未连接"
          description={`当前显示拓扑框架（节点/链路/带宽），尚未采集到实时流量数据。已配置 ${apiData.deviceTotal ?? 2} 台设备（核心 IRF + 灾备业务交换机），其中 ${apiData.deviceConnected ?? 0} 台可达；设备恢复可达后将自动刷新。`}
          style={{ marginBottom: 16 }}
        />
      )}

      {loading && !apiData?.svg && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <ReloadOutlined spin /> 正在加载...
        </div>
      )}

      {apiData?.svg && (
        <>
          {/* 统计卡片 */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={8}>
              <div style={{ padding: 16, background: '#fff', border: '1px solid #f0f0f0', borderRadius: 8 }}>
                <Statistic title="链路总数（逻辑链路）" value={total} />
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div style={{ padding: 16, background: '#fff', border: '1px solid #f0f0f0', borderRadius: 8 }}>
                <Statistic title="Up" value={upCount} styles={{ content: { color: '#3B6D11' } }} />
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div style={{ padding: 16, background: '#fff', border: '1px solid #f0f0f0', borderRadius: 8 }}>
                <Statistic title="Down / 未达" value={downCount} styles={{ content: { color: '#A32D2D' } }} />
              </div>
            </Col>
          </Row>

          {/* SVG 拓扑图 */}
          <div
            ref={svgWrapRef}
            dangerouslySetInnerHTML={{ __html: apiData.svg }}
            style={{
              width: '100%',
              overflowX: 'auto',
              background: '#fff',
              border: '1px solid #E8E6DF',
              borderRadius: 10,
              padding: 8,
              marginBottom: 16,
            }}
          />

          {/* 图例 */}
          <div
            dangerouslySetInnerHTML={{
              __html: `
                <div style="display:flex;flex-wrap:wrap;gap:26px;align-items:flex-start;background:#FAFAF8;border:1px solid #E8E6DF;border-radius:10px;padding:12px 18px;margin-bottom:16px;font-size:12px;color:#5F5E5A">
                  <div>
                    <div style="font-size:12px;color:#5F5E5A;margin-bottom:6px;font-weight:500">链路粗细 = 带宽</div>
                    <svg width="260" height="20">
                      <line x1="2" y1="10" x2="32" y2="10" stroke="#888780" stroke-width="5" stroke-linecap="round"/>
                      <text x="40" y="13" font-size="12" fill="#444">10G</text>
                      <line x1="82" y1="10" x2="118" y2="10" stroke="#888780" stroke-width="6.5" stroke-linecap="round"/>
                      <text x="126" y="13" font-size="12" fill="#444">20G</text>
                      <line x1="176" y1="10" x2="214" y2="10" stroke="#888780" stroke-width="11" stroke-linecap="round"/>
                      <text x="222" y="13" font-size="12" fill="#444">40G</text>
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

export default function ZabWeathermapPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, textAlign: 'center' }}>加载中...</div>}>
      <ZabWeathermapContent />
    </Suspense>
  );
}
