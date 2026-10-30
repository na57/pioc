'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import type { Key } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  App,
  Space,
  Spin,
  Typography,
  Badge,
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
  GlobalOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  TableOutlined,
  CloudServerOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { formatFriendlyTime } from '@/components/FriendlyTime';
import ActionButton from '@/app/tags/components/ActionButton';
import SnmpStatusBadge from './components/SnmpStatusBadge';
import { useSvgFlowAnimation } from './components/useSvgFlowAnimation';

const { Title, Text } = Typography;

// ========== 接口（对齐后端 renderPortTableRows 的返回） ==========
interface PortTableRow {
  port: string;
  description: string;
  peer: string;
  speed: number;
  oper: number;       // -1 未知, -2 未达, 1 Up, 2 Down
  inBps: number;
  outBps: number;
  ifName: string;
  utilization: number;
  linkGeometry: string;
  row: number;
  order: number;
  category: string;   // 业务分组（链路 a 端拓扑节点名）
}

interface ApiResp {
  success: boolean;
  viewId: string;
  viewName: string;
  connected: boolean;      // 至少一台设备连通
  deviceTotal?: number;
  deviceConnected?: number;
  devices?: { id: string; name: string; ip: string; connected: boolean }[];
  warm: boolean;           // 已有基线数据
  ready: boolean;          // 首次采样完成
  updateTime: number | null;
  svg: string;
  ports: PortTableRow[];
  error: string;           // 提示信息（SNMP 未连接等）
}

// ========== 工具函数 ==========
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

// ========== 内容组件 ==========
function ITCWeathermapContent() {
  const { message } = App.useApp();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [apiData, setApiData] = useState<ApiResp | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [activeTab, setActiveTab] = useState('topology');
  // SVG 在隐藏页面/Tab 中插入时光点动画会卡在 paused，用 hook 兜底启动
  const svgWrapRef = useSvgFlowAnimation<HTMLDivElement>(apiData?.svg);

  // 从 URL 参数初始化
  useEffect(() => {
    const tab = searchParams.get('tab');
    setActiveTab(tab === 'ports' ? 'ports' : 'topology');
  }, [searchParams]);

  const handleTabChange = useCallback((key: string) => {
    setActiveTab(key);
    const p = new URLSearchParams(searchParams.toString());
    if (key === 'ports') p.set('tab', 'ports'); else p.delete('tab');
    router.push(`/itc-weathermap?${p.toString()}`);
  }, [router, searchParams]);

  const fetchSnapshot = useCallback(async (): Promise<ApiResp | null> => {
    try {
      setLoading(true);
      const resp = await fetch('/api/itc-weathermap/snapshot?view=core');
      if (resp.status === 403) {
        setForbidden(true);
        setApiData(null);
        return null;
      }
      const data: ApiResp = await resp.json();
      setApiData(data);

      if (!data.success && data.connected) {
        message.warning(data.error || '采集告警');
      }
      return data;
    } catch (err) {
      console.error('[ITCWeathermap] 网络错误:', err);
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
        subTitle="抱歉，您当前的角色无权访问「数据中心核心链路」网络天气图。"
      />
    );
  }

  // 统计数据
  const ports = apiData?.ports ?? [];
  const total = ports.length;
  const upCount = ports.filter((p) => p.oper === 1).length;
  const downCount = ports.filter((p) => p.oper >= 0 && p.oper !== 1).length;
  const hotCount = ports.filter((p) => p.utilization >= 30 && p.oper === 1).length;
  const categoryFilters = [...new Set(ports.map((p) => p.category).filter(Boolean))]
    .map((v) => ({ text: v, value: v }));

  // ========== 端口表格列 ==========
  const portColumns = [
    {
      title: '业务分组',
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
      width: 240,
      ellipsis: true,
      render: (v: string, r: PortTableRow) => {
        const b = statusBadge(r.oper);
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span
              title={b.text}
              style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: b.color, flexShrink: 0 }}
            />
            <Text>{v}</Text>
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
      title: '对端 (LLDP)',
      dataIndex: 'peer',
      key: 'peer',
      width: 180,
      ellipsis: true,
      render: (v: string) => <Text code style={{ fontSize: 12 }}>{v || '—'}</Text>,
    },
    {
      title: '带宽',
      dataIndex: 'speed',
      key: 'speed',
      width: 70,
      render: (_: number, r: PortTableRow) => fmtSpeed(r.speed),
    },
    {
      title: '入 (对端→核心)',
      dataIndex: 'inBps',
      key: 'inBps',
      width: 120,
      align: 'right' as const,
      render: (v: number) => <Text code style={{ fontSize: 12 }}>{v > 0 ? fmtBps(v) : '—'}</Text>,
    },
    {
      title: '出 (核心→对端)',
      dataIndex: 'outBps',
      key: 'outBps',
      width: 120,
      align: 'right' as const,
      render: (v: number) => <Text code style={{ fontSize: 12 }}>{v > 0 ? fmtBps(v) : '—'}</Text>,
    },
    {
      title: '利用率',
      dataIndex: 'utilization',
      key: 'utilization',
      width: 120,
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

  // ========== 渲染 ==========
  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* 标题 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>数据中心核心链路</Title>
          <Text type="secondary">H3C S12510-S IRF 堆叠 + 防火墙上联 + 各业务下联</Text>
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
          {hotCount > 0 && (
            <Badge status="error" text={`${hotCount} 条链路利用率 ≥ 30%`} />
          )}
          {downCount > 0 && (
            <Badge status="error" text={`${downCount} 条链路端口 Down`} />
          )}
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
              <ul style={{ paddingLeft: 18, margin: 0, maxWidth: 420, fontSize: 12.5, color: '#5F5E5A', lineHeight: 1.9 }}>
                <li>利用率 = 双向速率取大值 ÷ 端口协商速率；采样窗口约 20~35 秒，是瞬时值，会随业务波动。</li>
                <li>白色光点沿 <b>速率较大的那一方</b> 流动。<code>入</code> = 核心端口 <b>收到</b> 的流量（<code>ifHCInOctets</code>），方向是 <b>对端 → 核心</b>；<code>出</code> = 核心端口 <b>发出</b> 的流量（<code>ifHCOutOctets</code>），方向是 <b>核心 → 对端</b>。</li>
                <li>所有业务按设计单边承载：<code>CG-TSG-S12510</code> 侧为主用，<code>CG-XZL-S12510</code> 侧为备用，空载属预期。</li>
              </ul>
            }
          >
            <ActionButton icon={<QuestionCircleOutlined />} tooltip="看图说明" />
          </Popover>
        </Space>
      </div>

      {/* SNMP 未连接提示（无框文字） */}
      {apiData && !apiData.connected && (
        <div style={{ marginBottom: 16, fontSize: 13, lineHeight: 1.8, color: '#5F5E5A' }}>
          <span style={{ color: '#D46B08', fontWeight: 500 }}>SNMP 未连接</span>
          ：当前显示拓扑框架（节点/链路/带宽/标称速率），尚未采集到实时流量数据。检查 SNMP community 或网络连通后自动刷新。
        </div>
      )}
      {apiData?.error && apiData.connected && (
        <Alert
          type="warning"
          showIcon
          title={apiData.error}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 加载中但有旧数据时仍展示 */}
      {loading && !apiData?.svg && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" description="正在加载拓扑数据..." />
        </div>
      )}

      {/* ========== 主图 ========== */}
      {apiData?.svg && (
        <>
          {/* ========== 统计（扁平排版，无卡片） ========== */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 56px', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: '#5F5E5A' }}>总链路</div>
              <div style={{ fontSize: 30, fontWeight: 500, lineHeight: 1.3, color: '#2C2C2A' }}>{total}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#5F5E5A' }}>Up</div>
              <div style={{ fontSize: 30, fontWeight: 500, lineHeight: 1.3, color: '#3B6D11' }}>{upCount}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#5F5E5A' }}>Down</div>
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
                      <line x1="176" y1="10" x2="214" y2="10" stroke="#888780" stroke-width="11" stroke-linecap="round"/>
                      <text x="222" y="13" font-size="12" fill="#444">40G</text>
                    </svg>
                  </div>
                  <div>
                    <div style="font-size:12px;color:#5F5E5A;margin-bottom:6px;font-weight:500">链路颜色 = 利用率</div>
                    <svg width="260" height="20">
                      <rect x="2" y="6" width="20" height="9" fill="#3FA96B"/>
                      <text x="26" y="14" font-size="12" fill="#444">0%</text>
                      <rect x="60" y="6" width="20" height="9" fill="#8CC63F"/>
                      <text x="84" y="14" font-size="12" fill="#444">15%</text>
                      <rect x="120" y="6" width="20" height="9" fill="#C6B54A"/>
                      <text x="144" y="14" font-size="12" fill="#444">40%</text>
                      <rect x="180" y="6" width="20" height="9" fill="#DF9B4B"/>
                      <text x="204" y="14" font-size="12" fill="#444">70%</text>
                    </svg>
                  </div>
                  <div>
                    <div style="font-size:12px;color:#5F5E5A;margin-bottom:6px;font-weight:500">其它</div>
                    <div style="font-size:12px;color:#444;line-height:1.8">
                      白色光点流动 = 有流量，静止 = 空载<br/>
                      CG-XZL-S12510 侧为备用链路，空载属正常
                    </div>
                  </div>
                </div>
              `,
            }}
          />

          {/* ========== 链路明细 ========== */}
          <div style={{ marginTop: 20, marginBottom: 12 }}>
            <Text strong style={{ color: '#2C2C2A' }}>链路明细（按利用率降序）</Text>
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

export default function ITCWeathermapPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, textAlign: 'center' }}>加载中...</div>}>
      <ITCWeathermapContent />
    </Suspense>
  );
}
