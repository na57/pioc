'use client';

import { Badge, Tooltip } from 'antd';

export interface SnmpDeviceState {
  id: string;
  name: string;
  ip: string;
  connected: boolean;
}

interface Props {
  connected: boolean;
  deviceTotal?: number;
  deviceConnected?: number;
  devices?: SnmpDeviceState[];
  loading?: boolean;
}

/**
 * SNMP 连接状态徽章
 * - 单设备：已连接（绿）/ 未连接（红）
 * - 多设备：x/y 已连接；全部=绿、部分=黄、0=红；hover 查看逐台状态
 */
export default function SnmpStatusBadge({
  connected,
  deviceTotal = 0,
  deviceConnected = 0,
  devices,
  loading,
}: Props) {
  if (loading) return <Badge status="default" text="SNMP 检测中" />;

  if (deviceTotal > 1) {
    const status: 'success' | 'warning' | 'error' =
      deviceConnected === deviceTotal ? 'success' : deviceConnected > 0 ? 'warning' : 'error';
    return (
      <Tooltip
        title={
          <div style={{ fontSize: 12 }}>
            {(devices ?? []).map((d) => (
              <div
                key={d.id}
                style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}
              >
                <span>{d.name} ({d.ip})</span>
                <span style={{ color: d.connected ? '#b7eb8f' : '#ffa39e' }}>
                  {d.connected ? '已连接' : '不可达'}
                </span>
              </div>
            ))}
          </div>
        }
      >
        <Badge status={status} text={`SNMP ${deviceConnected}/${deviceTotal} 已连接`} />
      </Tooltip>
    );
  }

  return (
    <Badge
      status={connected ? 'success' : 'error'}
      text={connected ? 'SNMP 已连接' : 'SNMP 未连接'}
    />
  );
}
