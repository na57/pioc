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

function LBWeathermapContent() {
  const { message } = App.useApp();

  const [loading, setLoading] = useState(true);
  const [apiData, setApiData] = useState<ApiResp | null>(null);
  const [forbidden, setForbidden] = useState(false);
  // SVG 在隐藏页面插入时光点动画会卡在 paused（首屏不动、点刷新才动），用 hook 兜底
  const svgWrapRef = useSvgFlowAnimation<HTMLDivElement>(apiData?.svg);

  const fetchSnapshot = useCallback(async (): Promise<ApiResp | null> => {
    try {
      setLoading(true);
      const resp = await fetch('/api/itc-weathermap/snapshot?view=loadbalancer');
      if (resp.status === 403) {
        setForbidden(true);
        setApiData(null);
        return null;
      }
      const data: ApiResp = await resp.json();
      setApiData(data);
      return data;
    } catch (err) {
      console.error('[LBWeathermap] 网络错误:', err);
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
        subTitle="抱歉，您当前的角色无权访问「负载均衡业务」网络天气图。"
      />
    );
  }

  const ports = apiData?.ports ?? [];
  const total = ports.length;
  const upCount = ports.filter((p) => p.oper === 1).length;
  const downCount = ports.filter((p) => p.oper >= 0 && p.oper !== 1).length;
  const hotCount = ports.filter((p) => p.utilization >= 30 && p.oper === 1).length;

  const categoryFilters = [...new Set(ports.map((p) => p.category).filter(Boolean))]
    .map((v) => ({ text: v, value: v }));

  const portColumns = [
    {
      title: '业务分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      filters: categoryFilters,
      onFilter: (value: Key | boolean, r: PortTableRow) => r.category === value,
      render: (v: string) => v ? <Tag style={{ marginInlineEnd: 0, fontSize: 12 }}>{v}</Tag> : '—',
    },
    {
      title: '链路',
      dataIndex: 'description',
      key: 'description',
      width: 280,
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
      width: 200,
      ellipsis: true,
      render: (v: string) => (
        <Text style={{ fontSize: 12, color: '#5F5E5A' }}>
          {v || '—'}
        </Text>
      ),
    },
    {
      title: '对端 / VIP',
      dataIndex: 'peer',
      key: 'peer',
      width: 180,
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
          <Title level={4} style={{ margin: 0 }}>负载均衡业务</Title>
          <Text type="secondary">H3C SecPath L5060 ×2 HA 主备（LB1 Active / LB2 Standby）· 上行 trunk 单归核心 10G · trunk 承载 8 个 VLAN 子接口分三组（公网入口 / 业务服务 / 内网管理·后端），逐 VLAN 流量见链路明细</Text>
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
                <li>本图以 <b>LB 集群</b>为中心：2 台 H3C SecPath L5060 组成 HA 主备（<b>LB1 Active / LB2 Standby</b>），SNMP 管理地址 <code>10.10.88.2</code>（VLAN88 VRRP VIP）。<b>SNMP 仅暴露 Active 成员</b>，图上流量即业务实际承载流量。</li>
                <li><b>上行</b>：LB1 经 <code>Ten-GigabitEthernet1/2/4</code> trunk 单归上联核心（10G）；Standby 成员不画上行。</li>
                <li><b>下行</b>：trunk 承载 <b>8 个 VLAN 子接口</b>，按业务分三组合并显示：<b>公网入口区</b>（VLAN25/26）、<b>业务服务区</b>（VLAN27/28/29）、<b>内网管理·后端</b>（VLAN88/92/248）；悬停节点可<b>逐 VLAN</b> 查看流量，逐子接口 VIP / 流量 / 状态见下方明细表。</li>
                <li>虚线拱弧 = LB1↔LB2 <b>HA 心跳</b>（<code>Ten-GigabitEthernet1/2/0</code>），不承载业务流量。</li>
                <li>各组业务走 VRRP 虚 IP 入口（如 VLAN25 → 202.203.208.5，逐子接口 VIP 见明细表「对端 / VIP」列），经 LB NAT 后由 VLAN248 到达后端真实服务器（38 条 NAT / 180 个 server-farm / 226 台 real-server）。</li>
                <li>所有流量均为 SNMP 直连实测，两次采样取差值 ÷ 采样窗口，是瞬时值，会随业务波动；组/逐 VLAN 利用率按 trunk 物理口 <b>10G</b> 瓶颈口径计算。</li>
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
          description={`当前显示拓扑框架（节点/链路/带宽），尚未采集到实时流量数据。已配置 ${apiData.deviceTotal ?? 1} 台 LB 逻辑设备（2 台物理 HA 主备），其中 ${apiData.deviceConnected ?? 0} 台可达；设备恢复可达后将自动刷新。`}
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
                <Statistic title="链路总数（聚合 + 逐 VLAN）" value={total} />
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
                    <svg width="140" height="20">
                      <line x1="2" y1="10" x2="32" y2="10" stroke="#888780" stroke-width="5" stroke-linecap="round"/>
                      <text x="40" y="13" font-size="12" fill="#444">10G</text>
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
                      虚线拱弧 = LB1↔LB2 HA 心跳<br/>
                      下行按业务组合并节点，悬停可逐 VLAN 查看；逐子接口流量见明细表
                    </div>
                  </div>
                </div>
              `,
            }}
          />

          {/* ========== 链路明细 ========== */}
          <div style={{ marginTop: 20, marginBottom: 12 }}>
            <Text strong style={{ color: '#2C2C2A' }}>
              链路明细（{total} 行 · 上行/HA 逐物理口 + 下行逐 VLAN 子接口 · 可按业务分类筛选）
            </Text>
          </div>
          <Table
            dataSource={ports}
            columns={portColumns}
            rowKey="port"
            size="small"
            pagination={false}
            scroll={{ x: 1100 }}
          />
        </>
      )}
    </div>
  );
}

export default function LoadbalancerWeathermapPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, textAlign: 'center' }}>加载中...</div>}>
      <LBWeathermapContent />
    </Suspense>
  );
}
