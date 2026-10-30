'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  App,
  Alert,
  Badge,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import {
  ApiOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
  ReloadOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import ActionButton from '@/app/tags/components/ActionButton';
import FriendlyTime from '@/components/FriendlyTime';
import type {
  DeviceDiagnosis,
  DiagnosisReport,
  DiagnosisStep,
  DiagnosisStepStatus,
} from '@/lib/services/itc-weathermap/diagnosis';

const { Title, Text } = Typography;

const statusMeta: Record<
  DiagnosisStepStatus,
  { icon: React.ReactNode; color: string; label: string }
> = {
  ok: { icon: <CheckCircleOutlined />, color: '#52c41a', label: '通过' },
  warn: { icon: <WarningOutlined />, color: '#faad14', label: '警告' },
  fail: { icon: <CloseCircleOutlined />, color: '#ff4d4f', label: '失败' },
  skipped: { icon: <MinusCircleOutlined />, color: '#bfbfbf', label: '跳过' },
};

function deviceLevel(dev: DeviceDiagnosis): 'success' | 'warning' | 'error' {
  if (dev.steps.some((s) => s.status === 'fail')) return 'error';
  if (dev.steps.some((s) => s.status === 'warn')) return 'warning';
  return 'success';
}

function StepItem({ step }: { step: DiagnosisStep }) {
  const meta = statusMeta[step.status];
  return (
    <div
      style={{
        padding: '10px 0',
        marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ color: meta.color, fontSize: 16 }}>{meta.icon}</span>
        <Text strong={step.status !== 'skipped'}>{step.name}</Text>
        <Tag>{meta.label}</Tag>
        {step.ms > 0 && <Tag>{step.ms} ms</Tag>}
      </div>
      {step.detail && (
        <div style={{ marginTop: 4, paddingLeft: 24 }}>
          <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>
            {step.detail}
          </Text>
        </div>
      )}
      {step.error && (
        <div style={{ marginTop: 4, paddingLeft: 24 }}>
          <Text type="danger" style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>
            {step.error}
          </Text>
        </div>
      )}
      {step.suggestion && (
        <Alert
          title={step.suggestion}
          type={step.status === 'fail' ? 'error' : 'warning'}
          style={{ marginTop: 8, marginLeft: 24 }}
          showIcon
        />
      )}
    </div>
  );
}

function DeviceCard({
  dev,
  retesting,
  onRetest,
}: {
  dev: DeviceDiagnosis;
  retesting: boolean;
  onRetest: (deviceId: string) => void;
}) {
  const level = deviceLevel(dev);
  const levelText = level === 'error' ? '异常' : level === 'warning' ? '有警告' : '正常';
  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid #EBEAE6' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        <Space size={8} wrap>
          <Badge status={level} text={<Text strong>{dev.name}</Text>} />
          <Text type="secondary" code>{dev.ip}</Text>
          <Tag color={level === 'error' ? 'red' : level === 'warning' ? 'orange' : 'green'}>
            {levelText}
          </Tag>
        </Space>
        <Space size={8} wrap>
          {dev.views.map((v) => (
            <Tag key={v.id} color="blue">{v.title}</Tag>
          ))}
          <Tag>{dev.totalMs} ms</Tag>
          <ActionButton
            icon={<ReloadOutlined />}
            tooltip="重新诊断该设备"
            onClick={() => onRetest(dev.id)}
            disabled={retesting}
          />
        </Space>
      </div>
      <Spin spinning={retesting} description="正在重新诊断...">
        {dev.steps.map((s) => (
          <StepItem key={s.key} step={s} />
        ))}
      </Spin>
    </div>
  );
}

export default function SnmpDiagnosisPage() {
  const { message } = App.useApp();
  const [report, setReport] = useState<DiagnosisReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [retestingIds, setRetestingIds] = useState<Record<string, boolean>>({});

  const runAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/itc-weathermap/snmp-diagnosis', { cache: 'no-store' });
      const json = await res.json();
      if (json?.success) {
        setReport(json.data as DiagnosisReport);
      } else {
        message.error(json?.userMessage || json?.error || '诊断请求失败');
      }
    } catch (e) {
      message.error(`诊断请求失败：${String(e)}`);
    } finally {
      setLoading(false);
    }
  }, [message]);

  const retestOne = useCallback(
    async (deviceId: string) => {
      setRetestingIds((prev) => ({ ...prev, [deviceId]: true }));
      try {
        const res = await fetch('/api/itc-weathermap/snmp-diagnosis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId }),
        });
        const json = await res.json();
        if (json?.success) {
          const single = json.data as DiagnosisReport;
          setReport((prev) => {
            if (!prev) return single;
            const devices = prev.devices.map((d) =>
              d.id === deviceId ? single.devices[0] : d,
            );
            return {
              ...prev,
              devices,
              okCount: devices.filter((d) => d.ok).length,
            };
          });
          message.success(`设备 ${deviceId} 诊断完成`);
        } else {
          message.error(json?.userMessage || json?.error || '单台诊断失败');
        }
      } catch (e) {
        message.error(`单台诊断失败：${String(e)}`);
      } finally {
        setRetestingIds((prev) => ({ ...prev, [deviceId]: false }));
      }
    },
    [message],
  );

  useEffect(() => {
    runAll();
  }, [runAll]);

  const failCount = report ? report.totalCount - report.devices.filter((d) => deviceLevel(d) === 'success').length : 0;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Space size={12}>
          <ApiOutlined style={{ fontSize: 24, color: '#1677ff' }} />
          <div>
            <Title level={4} style={{ margin: 0 }}>SNMP 诊断</Title>
            <Text type="secondary">
              对网络天气图所有采集设备的 SNMP 连通性与视图采集能力逐项体检，帮助定位「SNMP 未连接」问题。
            </Text>
          </div>
        </Space>
        <ActionButton
          icon={<ReloadOutlined />}
          tooltip="重新诊断全部设备"
          onClick={runAll}
          disabled={loading}
        />
      </div>

      <div style={{ marginBottom: 16, fontSize: 13, lineHeight: 1.8, color: '#5F5E5A' }}>
        诊断为旁路只读操作：对每台设备独立发起新的 SNMP 会话，不影响正在运行的采集进程。步骤包括连通性（sysDescr）、设备名称、运行时长、接口表遍历，以及按视图复刻采集发现规则的采集验证。
      </div>

      {/* 统计（扁平排版，无卡片） */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 56px', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: '#5F5E5A' }}>设备总数</div>
          <div style={{ fontSize: 30, fontWeight: 500, lineHeight: 1.3, color: '#2C2C2A' }}>{report?.totalCount ?? '-'} 台</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#5F5E5A' }}>SNMP 正常</div>
          <div style={{ fontSize: 30, fontWeight: 500, lineHeight: 1.3, color: '#52c41a' }}>{report?.okCount ?? '-'} 台</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#5F5E5A' }}>异常/警告</div>
          <div style={{ fontSize: 30, fontWeight: 500, lineHeight: 1.3, color: failCount > 0 ? '#ff4d4f' : '#2C2C2A' }}>{report ? failCount : '-'} 台</div>
        </div>
      </div>

      {loading && !report ? (
        <Spin spinning description="正在逐台诊断所有设备的 SNMP 连接情况，请稍候（每台设备最长约 5 秒）...">
          <div style={{ minHeight: 200 }} />
        </Spin>
      ) : report ? (
        <>
          <div style={{ marginBottom: 12 }}>
            <Text type="secondary">
              诊断时间：<FriendlyTime date={report.ts} />
            </Text>
          </div>
          <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            {report.devices.map((dev) => (
              <DeviceCard
                key={dev.id}
                dev={dev}
                retesting={!!retestingIds[dev.id]}
                onRetest={retestOne}
              />
            ))}
          </Space>
        </>
      ) : null}
    </div>
  );
}
