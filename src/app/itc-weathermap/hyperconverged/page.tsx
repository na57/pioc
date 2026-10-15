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
  Tabs,
  Table,
  Tag,
  Result,
  Popover,
} from 'antd';
import {
  ReloadOutlined,
  ClockCircleOutlined,
  TableOutlined,
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

/** SNMP 连接状态徽章（多设备 x/y、hover 逐台状态）见共享组件 */

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

function HCIWeathermapContent() {
  const { message } = App.useApp();

  const [loading, setLoading] = useState(true);
  const [apiData, setApiData] = useState<ApiResp | null>(null);
  const [forbidden, setForbidden] = useState(false);
  // SVG 在隐藏页面插入时光点动画会卡在 paused（首屏不动、点刷新才动），用 hook 兜底
  const svgWrapRef = useSvgFlowAnimation<HTMLDivElement>(apiData?.svg);

  const fetchSnapshot = useCallback(async (): Promise<ApiResp | null> => {
    try {
      setLoading(true);
      const resp = await fetch('/api/itc-weathermap/snapshot?view=hyperconverged');
      if (resp.status === 403) {
        setForbidden(true);
        setApiData(null);
        return null;
      }
      const data: ApiResp = await resp.json();
      setApiData(data);
      return data;
    } catch (err) {
      console.error('[HCIWeathermap] 网络错误:', err);
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
        subTitle="抱歉，您当前的角色无权访问「超融合业务」网络天气图。"
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
          <Title level={4} style={{ margin: 0 }}>超融合业务</Title>
          <Text type="secondary">4 台浪潮 CN9300H-48Y8C · 双归上联核心 · 同类下行业务合并显示（计算 / 存储 / 安全 / 测试 / 智算 / 带外），逐端口流量见链路明细 · 交换机间集群互联</Text>
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
                <li>本图以组内 4 台交换机为<b>中心</b>：向上双归上联两台核心；向下按纳总端口规划表把下联口<b>逐口归类</b>为二路 / 四路计算、RDS 存储、安全、算力测试、智算、智算存储、带外等业务（悬停链路可见端口号 [N]）。</li>
                <li><b>图上同类业务合并成一个节点</b>（例如「二路计算节点」同时承接 4 台交换机双归下挂的二路服务器），节点上的数字是各交换机分支的合计，悬停节点可逐台查看；每个物理端口的流量 / 状态 / 对端设备请看下放的<b>链路明细表（一行一个端口）</b>。</li>
                <li>所有流量均为 SNMP 直连 4 台交换机实测，两次采样取差值 ÷ 采样窗口，是瞬时值，会随业务波动。</li>
                <li>交换机上 <code>aggN</code> 与物理口 <code>eth-0-N</code> 计数器实测 <b>1:1 完全相等</b>：每个端口优先取 agg，设备上没有 agg 的口（图书馆 [21][33][34]、礼贤楼 [29]–[42]、带外 [47]）才回退取 eth，<b>不会双算</b>；分支带宽只计当前 UP 成员。</li>
                <li>上联单口 <b>10G</b>，服务器侧端口实测多为 <b>25G</b>（算力测试 [33][34] 为 10G）；交换机间互联 <b>80G</b>。显示 <b>Down</b> 的分支多为规划未连线或带外未接（如图书馆二路 1–5/7–8、礼贤楼智算存储 [42]）。</li>
                <li>虚线 = 交换机间互联，配对经 LLDP <b>双向互证实测</b>：
                  <code>cg-tsg-d06-yewu1</code>↔<code>cg-tsg-d07-yewu2</code>、
                  <code>cg-lxl2-b02-yewu3</code>↔<code>cg-lxl2-b03-yewu4</code>。
                  <b>注意它是跨核心的</b>。
                </li>
                <li>同一台服务器双网卡<b>双归</b>到配对两台交换机的同号端口（表中「另一归」即对端交换机）；如果<b>下行吞吐明显大于上联吞吐</b>，说明大量是<b>服务器之间的东西向流量</b>（HCI 存储复制 / 虚拟机迁移），在机框内就转掉了，并没有走到核心。</li>
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
          description={`当前显示拓扑框架（节点/链路/带宽），尚未采集到实时流量数据。已配置 ${apiData.deviceTotal ?? 4} 台超融合交换机，其中 ${apiData.deviceConnected ?? 0} 台可达；设备恢复可达后将自动刷新。`}
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
                <Statistic title="链路总数（逐端口）" value={total} />
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
                      <line x1="82" y1="10" x2="118" y2="10" stroke="#888780" stroke-width="8" stroke-linecap="round"/>
                      <text x="126" y="13" font-size="12" fill="#444">25G</text>
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
                      虚线 = 交换机间集群互联（80G）<br/>
                      同类下行业务合并为一个节点；分支粗细 = 该交换机该业务 UP 口容量，逐端口流量见明细表
                    </div>
                  </div>
                </div>
              `,
            }}
          />

          {/* ========== 链路明细 ========== */}
          <div style={{ marginTop: 20, marginBottom: 12 }}>
            <Text strong style={{ color: '#2C2C2A' }}>
              链路明细（{total} 行 · 下联按物理端口逐口列出 · 默认按利用率降序，可用列头按交换机/业务分类筛选）
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

export default function HyperconvergedWeathermapPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, textAlign: 'center' }}>加载中...</div>}>
      <HCIWeathermapContent />
    </Suspense>
  );
}
