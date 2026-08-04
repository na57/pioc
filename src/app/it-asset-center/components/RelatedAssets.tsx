'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Empty,
  Table,
  Tag,
  Badge,
  Space,
} from 'antd';
import Link from 'next/link';
import type { ITAsset, WebApp } from '@/lib/services/it-asset-center';
import { STATUS_LABELS } from '@/lib/services/it-asset-center';

// ============================================
// Types
// ============================================

export type RelatedAssetsType =
  | 'web_apps_by_server'
  | 'dns_records_by_domain'
  | 'web_servers_by_ip'
  | 'ops_access_control_by_ip';

export interface RelatedAssetsConfig {
  type: RelatedAssetsType;
}

// ============================================
// Type metadata: label + asset type for URL construction
// ============================================

const TYPE_INFO: Record<RelatedAssetsType, { label: string; assetType: string }> = {
  web_apps_by_server: { label: 'Web应用', assetType: 'web_app' },
  dns_records_by_domain: { label: 'DNS记录', assetType: 'dns_record' },
  web_servers_by_ip: { label: 'Web服务器', assetType: 'web_server' },
  ops_access_control_by_ip: { label: '运维访问控制', assetType: 'ops_access_control' },
};

// ============================================
// Status badge helper
// ============================================

const STATUS_COLORS: Record<string, 'success' | 'default' | 'error' | 'warning' | 'processing'> = {
  active: 'success',
  inactive: 'default',
  faulty: 'error',
  idle: 'warning',
  planning: 'processing',
  unknown: 'default',
};

function renderStatusBadge(status?: string) {
  if (!status) return '-';
  const badgeStatus = STATUS_COLORS[status] || 'default';
  const label = STATUS_LABELS[status] || status || '未知';
  return <Badge status={badgeStatus} text={label} />;
}

// ============================================
// Unified columns
// ============================================

function getItemName(record: any): string {
  return record.app_name || record.name || record.domain || record.hostname || '-';
}

function getItemLink(record: any, assetType: string): string {
  return `/it-asset-center/assets/${assetType}/${encodeURIComponent(record.id)}`;
}

function getItemIp(record: any): string {
  return record.ip_address || record.ip || '-';
}

const unifiedColumns = [
  {
    title: '名称',
    key: 'name',
    render: (_: any, record: any) => {
      const name = getItemName(record);
      return (
        <Space orientation="horizontal" size={4}>
          {record.status && <Badge status={STATUS_COLORS[record.status] || 'default'} />}
          <Link href={getItemLink(record, record._assetType)}>{name}</Link>
        </Space>
      );
    },
  },
  {
    title: '资产类型',
    key: 'asset_type',
    width: 120,
    render: (_: any, record: any) => <Tag>{record._typeLabel}</Tag>,
  },
  {
    title: 'IP地址',
    key: 'ip',
    width: 140,
    render: (_: any, record: any) => getItemIp(record),
  },
];

// ============================================
// Fetch logic
// ============================================

async function fetchRelatedData(type: RelatedAssetsType, asset: ITAsset): Promise<any[]> {
  if (type === 'web_apps_by_server') {
    const ws = asset as any;
    if (ws.ip_address && ws.server_type) {
      const res = await fetch(
        `/api/it-asset-center?action=web-apps-by-server&ip=${encodeURIComponent(ws.ip_address)}&server_type=${encodeURIComponent(ws.server_type)}`
      );
      const result = await res.json();
      return result.success ? (result.data.data || []) : [];
    }
  } else if (type === 'dns_records_by_domain') {
    const domain = (asset as any).domain;
    if (domain) {
      const res = await fetch(`/api/it-asset-center?action=dns-records&domain=${encodeURIComponent(domain)}`);
      const result = await res.json();
      return result.success ? (result.data.data || []) : [];
    }
  } else if (type === 'web_servers_by_ip') {
    const ip = (asset as any).ip || (asset as any).ip_address;
    if (ip) {
      const res = await fetch(
        `/api/it-asset-center?action=assets&asset_type=web_server&keyword=${encodeURIComponent(ip)}&per_page=100`
      );
      const result = await res.json();
      return result.success ? (result.data.data || []) : [];
    }
  } else if (type === 'ops_access_control_by_ip') {
    const ip = (asset as any).ip || (asset as any).ip_address;
    if (ip) {
      const res = await fetch(
        `/api/it-asset-center?action=assets&asset_type=ops_access_control&keyword=${encodeURIComponent(ip)}&per_page=100`
      );
      const result = await res.json();
      return result.success ? (result.data.data || []) : [];
    }
  }
  return [];
}

// ============================================
// Component
// ============================================

interface RelatedAssetsSectionProps {
  asset: ITAsset;
  configs: RelatedAssetsConfig[];
}

export function RelatedAssetsSection({ asset, configs }: RelatedAssetsSectionProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!configs || configs.length === 0) return;
    setLoading(true);
    try {
      const results = await Promise.all(
        configs.map(async (ra) => {
          const info = TYPE_INFO[ra.type];
          const items = await fetchRelatedData(ra.type, asset);
          // Tag each item with type label and asset type for unified rendering
          return items.map((item) => ({
            ...item,
            _typeLabel: info.label,
            _assetType: info.assetType,
          }));
        })
      );
      setData(results.flat());
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [asset, configs]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (!configs || configs.length === 0) return null;

  return (
    <Card title="关联资产" style={{ marginBottom: 16 }} loading={loading}>
      {data.length > 0 ? (
        <Table
          columns={unifiedColumns}
          dataSource={data}
          rowKey={(record) => `${record._assetType}-${record.id}`}
          pagination={false}
          scroll={{ x: 600 }}
          locale={{ emptyText: <Empty description="暂无关联资产" /> }}
        />
      ) : (
        !loading && <Empty description="暂无关联资产" />
      )}
    </Card>
  );
}
