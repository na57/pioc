'use client';

import React from 'react';
import {
  Card,
  Descriptions,
  Tag,
  Badge,
} from 'antd';
import Link from 'next/link';
import FriendlyTime from '@/components/FriendlyTime';
import type {
  ITAsset,
  AssetType,
  AssetCategory,
} from '@/lib/services/it-asset-center';
import {
  ASSET_TYPE_META,
  CATEGORY_LABELS,
  STATUS_LABELS,
  WEB_SERVER_METADATA_LABELS,
  WEB_APP_METADATA_LABELS,
  THIRD_PARTY_SERVICE_METADATA_LABELS,
  OPS_ACCESS_CONTROL_METADATA_LABELS,
  VIRTUAL_MACHINE_METADATA_LABELS,
} from '@/lib/services/it-asset-center';
import {
  RelatedAssetsSection,
  type RelatedAssetsConfig,
} from './RelatedAssets';

// ============================================
// Types
// ============================================

type FieldType = 'text' | 'tag' | 'time' | 'status' | 'systemLink' | 'typeTag' | 'categoryTag' | 'custom';

interface FieldDef {
  label: string;
  field?: string;
  type?: FieldType;
  span?: number | 'column';
  fallback?: string;
  labelMap?: Record<string, string>;
  render?: (asset: ITAsset, ctx: RenderContext) => React.ReactNode;
  showIf?: (asset: ITAsset) => boolean;
}

interface RenderContext {
  systemInfo: { id: string; name: string; code?: string } | null;
  renderStatusBadge: (status?: string) => React.ReactNode;
}

interface AssetTypeConfig {
  fields: FieldDef[];
  metadataLabels?: Record<string, string>;
  renderMetadataValue?: (key: string, value: unknown) => React.ReactNode;
  relatedAssets?: RelatedAssetsConfig[];
}

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
  const badgeStatus = STATUS_COLORS[status || ''] || 'default';
  const label = STATUS_LABELS[status || ''] || status || '未知';
  return <Badge status={badgeStatus} text={label} />;
}

// ============================================
// Per-type configurations
// ============================================

const CATEGORY_COLORS: Record<AssetCategory, string> = {
  infrastructure: 'geekblue',
  network: 'cyan',
  data: 'green',
  application: 'purple',
  software: 'magenta',
  operations: 'gold',
  external: 'lime',
};

const SOURCE_LABELS: Record<string, string> = {
  bastion: '堡垒机',
  database_gateway: '数据库访问网关',
  other: '其他',
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  virtual_machine: '虚拟机',
  physical_device: '物理设备',
  network_device: '网络设备',
  database: '数据库',
  application: '应用',
  other: '其他',
};

const ASSET_DETAIL_CONFIGS: Partial<Record<AssetType, AssetTypeConfig>> = {
  physical_device: {
    fields: [
      { label: '设备名称', field: 'name' },
      { label: '设备类型', field: 'device_type', type: 'tag' },
      { label: '设备唯一标识', field: 'code', fallback: 'sn' },
      { label: '运行状态', type: 'status' },
      { label: '所属信息系统', type: 'systemLink' },
      { label: 'IP地址', field: 'ip_address' },
      { label: '带外管理地址', field: 'management_ip' },
      { label: '生产厂家', field: 'manufacturer', fallback: 'brand' },
      { label: '规格型号', field: 'model' },
      { label: '设备序列号', field: 'sn' },
      { label: '维保到期时间', field: 'warranty_expiry' },
      { label: '所属单位', field: 'department' },
      { label: '负责人', field: 'owner' },
      { label: '负责人工号', field: 'owner_employee_id' },
      { label: '备注', field: 'description', span: 'column', showIf: (a) => !!a.description },
      { label: '创建时间', field: 'created_at', type: 'time' },
      { label: '更新时间', field: 'updated_at', type: 'time' },
    ],
    relatedAssets: [
      { type: 'web_servers_by_ip' },
      { type: 'ops_access_control_by_ip' },
    ],
  },

  virtual_machine: {
    fields: [
      { label: '虚拟机名称', field: 'name' },
      { label: '虚拟机唯一标识', field: 'host' },
      { label: 'IP地址', field: 'ip' },
      { label: '操作系统', field: 'os' },
      { label: '虚拟化平台', field: 'hypervisor' },
      { label: '运行状态', type: 'status' },
      { label: '所属信息系统', type: 'systemLink' },
      { label: '创建时间', field: 'created_at', type: 'time' },
      { label: '更新时间', field: 'updated_at', type: 'time' },
    ],
    metadataLabels: VIRTUAL_MACHINE_METADATA_LABELS,
    relatedAssets: [
      { type: 'web_servers_by_ip' },
      { type: 'ops_access_control_by_ip' },
    ],
  },

  web_server: {
    fields: [
      { label: 'Web服务器类型', field: 'server_type', type: 'tag' },
      { label: 'IP地址', field: 'ip_address' },
      { label: '用途', field: 'purpose' },
      { label: '运行状态', type: 'status' },
      { label: '所属信息系统', type: 'systemLink' },
      { label: '创建时间', field: 'created_at', type: 'time' },
      { label: '更新时间', field: 'updated_at', type: 'time' },
    ],
    metadataLabels: WEB_SERVER_METADATA_LABELS,
    renderMetadataValue: (key, value) => {
      if (key === 'listen_ports' && Array.isArray(value)) return value.join(', ');
      return String(value);
    },
    relatedAssets: [{ type: 'web_apps_by_server' }],
  },

  web_app: {
    fields: [
      { label: '应用名称', field: 'app_name', fallback: 'name' },
      { label: 'IP地址', field: 'ip_address' },
      { label: 'Web服务器类型', field: 'server_type', type: 'tag' },
      {
        label: '所属Web服务器',
        type: 'custom',
        render: (asset) => {
          const app = asset as any;
          if (!app.ip_address || !app.server_type) return '-';
          return (
            <Link href={`/it-asset-center/assets/web_server/${encodeURIComponent(`${app.ip_address}@@${app.server_type}`)}`}>
              {app.ip_address} 上的 {app.server_type}
            </Link>
          );
        },
      },
      { label: '应用版本', field: 'app_version' },
      { label: '运行状态', type: 'status' },
      { label: '创建时间', field: 'created_at', type: 'time' },
      { label: '更新时间', field: 'updated_at', type: 'time' },
    ],
    metadataLabels: WEB_APP_METADATA_LABELS,
  },

  third_party_service: {
    fields: [
      { label: '服务名称', field: 'name' },
      { label: '服务类型', field: 'service_type', type: 'tag' },
      { label: '提供方', field: 'provider' },
      { label: '运行状态', type: 'status' },
      { label: '所属信息系统', type: 'systemLink' },
      { label: '接口地址', field: 'endpoint' },
      { label: '到期时间', field: 'expiry_date', type: 'time' },
      { label: '创建时间', field: 'created_at', type: 'time' },
      { label: '更新时间', field: 'updated_at', type: 'time' },
    ],
    metadataLabels: THIRD_PARTY_SERVICE_METADATA_LABELS,
  },

  ops_access_control: {
    fields: [
      { label: '名称', field: 'name' },
      { label: '数据来源', field: 'source', type: 'tag', labelMap: SOURCE_LABELS },
      { label: '管控系统类型', field: 'controller_type', type: 'tag', labelMap: SOURCE_LABELS },
      { label: '被管控目标类型', field: 'target_type', type: 'tag', labelMap: TARGET_TYPE_LABELS },
      { label: '被管控目标IP地址', field: 'ip_address' },
      { label: '被管控目标主机名', field: 'hostname' },
      { label: '访问协议', field: 'access_protocol', type: 'tag' },
      { label: '运行状态', type: 'status' },
      { label: '所属信息系统', type: 'systemLink' },
      { label: '创建时间', field: 'created_at', type: 'time' },
      { label: '更新时间', field: 'updated_at', type: 'time' },
    ],
    metadataLabels: OPS_ACCESS_CONTROL_METADATA_LABELS,
    renderMetadataValue: (key, value) => {
      if (key === 'last_login_time') return <FriendlyTime date={String(value)} />;
      return String(value);
    },
  },

  domain: {
    fields: [
      { label: '所属信息系统', type: 'systemLink' },
      { label: '资产编码', field: 'code' },
      { label: '资产类型', type: 'typeTag' },
      { label: '所属分层', type: 'categoryTag' },
      { label: '运行状态', type: 'status' },
      { label: '所属部门', field: 'department' },
      { label: '负责人', field: 'owner' },
      { label: '用途', field: 'description', span: 'column' },
      { label: '创建时间', field: 'created_at', type: 'time' },
      { label: '更新时间', field: 'updated_at', type: 'time' },
    ],
    relatedAssets: [{ type: 'dns_records_by_domain' }],
  },
};

// ============================================
// Generic fallback config builder
// ============================================

const HIDDEN_KEYS = ['id', 'system_id', 'asset_type', 'category', 'name', 'status', 'metadata', 'tags', 'created_at', 'updated_at', 'department', 'owner', 'description', 'code'];

function buildFallbackConfig(asset: ITAsset): AssetTypeConfig {
  const entries = Object.entries(asset).filter(([key]) => !HIDDEN_KEYS.includes(key));
  return {
    fields: [
      { label: '所属信息系统', type: 'systemLink' },
      { label: '资产编码', field: 'code' },
      { label: '资产类型', type: 'typeTag' },
      { label: '所属分层', type: 'categoryTag' },
      { label: '运行状态', type: 'status' },
      ...entries.map(([key]) => ({ label: key, field: key }) as FieldDef),
      { label: '创建时间', field: 'created_at', type: 'time' as FieldType },
      { label: '更新时间', field: 'updated_at', type: 'time' as FieldType },
    ],
  };
}

// ============================================
// fixSpan utility
// ============================================

function fixSpan(items: Array<{ label: string; value: React.ReactNode; span?: number }>, column: number) {
  let rowSpan = 0;
  for (let i = 0; i < items.length; i++) {
    const span = items[i].span ?? 1;
    if (rowSpan + span > column && rowSpan > 0) {
      if (rowSpan < column) {
        const lastIdxOfPrevRow = i - 1;
        const cur = items[lastIdxOfPrevRow].span ?? 1;
        items[lastIdxOfPrevRow].span = cur + (column - rowSpan);
      }
      rowSpan = span;
    } else if (rowSpan + span === column) {
      rowSpan = 0;
    } else {
      rowSpan += span;
    }
  }
  if (rowSpan > 0 && rowSpan < column) {
    const lastIdx = items.length - 1;
    const cur = items[lastIdx].span ?? 1;
    items[lastIdx].span = cur + (column - rowSpan);
  }
}

// ============================================
// Build basic items from config
// ============================================

function buildBasicItems(
  asset: ITAsset,
  config: AssetTypeConfig,
  ctx: RenderContext,
  column: number
): Array<{ label: string; value: React.ReactNode; span?: number }> {
  const items: Array<{ label: string; value: React.ReactNode; span?: number }> = [];

  for (const field of config.fields) {
    if (field.showIf && !field.showIf(asset)) continue;

    const span = field.span === 'column' ? column : field.span;
    let value: React.ReactNode = '-';

    switch (field.type) {
      case 'status':
        value = ctx.renderStatusBadge(asset.status);
        break;
      case 'systemLink':
        value = ctx.systemInfo ? (
          <Link href={`/it-asset-center/${ctx.systemInfo.id}`}>
            {ctx.systemInfo.name}
            {ctx.systemInfo.code ? ` (${ctx.systemInfo.code})` : ''}
          </Link>
        ) : asset.system_id && asset.system_id !== 'unknown' ? (
          <Link href={`/it-asset-center/${asset.system_id}`}>{asset.system_id}</Link>
        ) : (asset.metadata as Record<string, unknown>)?.system_name ? (
          String((asset.metadata as Record<string, unknown>).system_name)
        ) : '-';
        break;
      case 'typeTag':
        value = <Tag>{ASSET_TYPE_META[asset.asset_type]?.label || asset.asset_type}</Tag>;
        break;
      case 'categoryTag':
        value = <Tag color={CATEGORY_COLORS[asset.category]}>{CATEGORY_LABELS[asset.category]}</Tag>;
        break;
      case 'time':
        value = field.field && asset[field.field as keyof ITAsset]
          ? <FriendlyTime date={asset[field.field as keyof ITAsset] as string} />
          : '-';
        break;
      case 'tag': {
        const raw = field.field ? (asset as any)[field.field] : undefined;
        if (!raw) { value = '-'; break; }
        const label = field.labelMap?.[raw] || raw;
        value = <Tag>{label}</Tag>;
        break;
      }
      case 'custom':
        value = field.render ? field.render(asset, ctx) : '-';
        break;
      default: {
        let raw = field.field ? (asset as any)[field.field] : undefined;
        if ((raw === undefined || raw === null || raw === '') && field.fallback) {
          raw = (asset as any)[field.fallback];
        }
        value = raw !== undefined && raw !== null && raw !== '' ? String(raw) : '-';
        break;
      }
    }

    items.push({ label: field.label, value, span });
  }

  fixSpan(items, column);
  return items;
}

// ============================================
// Build metadata items
// ============================================

function buildMetadataItems(
  asset: ITAsset,
  config: AssetTypeConfig,
  column: number
): Array<{ label: string; value: React.ReactNode; span?: number }> {
  if (!config.metadataLabels) return [];

  const metadata = (asset.metadata || {}) as Record<string, unknown>;
  const items: Array<{ label: string; value: React.ReactNode; span?: number }> = [];

  for (const [key, label] of Object.entries(config.metadataLabels)) {
    const value = metadata[key];
    if (value === undefined || value === null || value === '') continue;
    const rendered = config.renderMetadataValue
      ? config.renderMetadataValue(key, value)
      : String(value);
    items.push({ label, value: rendered });
  }

  if (items.length > 0) fixSpan(items, column);
  return items;
}

// ============================================
// Main Component
// ============================================

interface AssetDetailViewProps {
  asset: ITAsset;
  systemInfo: { id: string; name: string; code?: string } | null;
}

export function AssetDetailView({ asset, systemInfo }: AssetDetailViewProps) {
  const column = typeof window !== 'undefined' && window.innerWidth < 768 ? 1 : 2;

  const config = ASSET_DETAIL_CONFIGS[asset.asset_type] || buildFallbackConfig(asset);
  const ctx: RenderContext = { systemInfo, renderStatusBadge };

  const basicItems = buildBasicItems(asset, config, ctx, column);
  const metadataItems = buildMetadataItems(asset, config, column);

  return (
    <>
      <Card title="基本信息" style={{ marginBottom: 16 }}>
        <Descriptions bordered column={column}>
          {basicItems.map((it, idx) => (
            <Descriptions.Item key={`basic-${it.label}-${idx}`} label={it.label} span={it.span}>
              {it.value}
            </Descriptions.Item>
          ))}
        </Descriptions>
      </Card>

      {metadataItems.length > 0 && (
        <Card title="扩展信息" style={{ marginBottom: 16 }}>
          <Descriptions bordered column={column}>
            {metadataItems.map((it, idx) => (
              <Descriptions.Item key={`ext-${it.label}-${idx}`} label={it.label} span={it.span}>
                {it.value}
              </Descriptions.Item>
            ))}
          </Descriptions>
        </Card>
      )}

      {config.relatedAssets && config.relatedAssets.length > 0 && (
        <RelatedAssetsSection asset={asset} configs={config.relatedAssets} />
      )}
    </>
  );
}
