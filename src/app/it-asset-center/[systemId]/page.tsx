'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Card,
  Descriptions,
  Table,
  Typography,
  App,
  Spin,
  Empty,
  Tag,
  Badge,
  Space,
} from 'antd';
import {
  DatabaseOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import FriendlyTime from '@/components/FriendlyTime';
import type { InformationSystem, ITAsset, SystemAssetStats, AssetType, AssetCategory } from '@/lib/services/it-asset-center';
import { ASSET_TYPE_META, CATEGORY_LABELS } from '@/lib/services/it-asset-center';

const { Title } = Typography;

const STATUS_LABELS: Record<string, string> = {
  active: '活跃',
  inactive: '停用',
  faulty: '故障',
  idle: '闲置',
  planning: '规划中',
  unknown: '未知',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'success',
  inactive: 'default',
  faulty: 'error',
  idle: 'warning',
  planning: 'processing',
  unknown: 'default',
};

const CATEGORY_COLORS: Record<AssetCategory, string> = {
  infrastructure: 'geekblue',
  network: 'cyan',
  data: 'green',
  application: 'purple',
  software: 'magenta',
  operations: 'gold',
  external: 'lime',
};

export default function SystemDetailPage() {
  const params = useParams();
  const systemId = params.systemId as string;
  const { message } = App.useApp();

  const [loading, setLoading] = useState(true);
  const [system, setSystem] = useState<InformationSystem | null>(null);
  const [stats, setStats] = useState<SystemAssetStats | null>(null);
  const [assets, setAssets] = useState<ITAsset[]>([]);
  const [assetsTotal, setAssetsTotal] = useState(0);
  const [assetsPage, setAssetsPage] = useState(1);
  const [assetsPageSize, setAssetsPageSize] = useState(10);
  const [assetsLoading, setAssetsLoading] = useState(false);

  const fetchSystem = useCallback(async () => {
    try {
      const response = await fetch(`/api/it-asset-center?action=system-detail&id=${systemId}`);
      const result = await response.json();
      if (result.success) {
        setSystem(result.data.system);
      } else {
        message.error(result.error || '获取系统详情失败');
      }
    } catch {
      message.error('获取系统详情失败');
    }
  }, [systemId, message]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/it-asset-center?action=system-stats&system_id=${systemId}`);
      const result = await response.json();
      if (result.success) {
        setStats(result.data);
      }
    } catch {
      // 静默失败
    }
  }, [systemId]);

  const fetchAssets = useCallback(async () => {
    setAssetsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('action', 'system-assets');
      params.append('system_id', systemId);
      params.append('page', assetsPage.toString());
      params.append('per_page', assetsPageSize.toString());

      const response = await fetch(`/api/it-asset-center?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        const filtered = (result.data.data || []).filter((a: ITAsset) => a.asset_type !== 'dns_record');
        setAssets(filtered);
        setAssetsTotal(filtered.length);
      }
    } catch {
      message.error('获取关联资产列表失败');
    } finally {
      setAssetsLoading(false);
    }
  }, [systemId, assetsPage, assetsPageSize, message]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSystem(), fetchStats()]).finally(() => {
      setLoading(false);
    });
  }, [fetchSystem, fetchStats]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const assetColumns = [
    {
      title: '资产名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: ITAsset) => (
        <Space orientation="horizontal" size={4}>
          <Badge status={(STATUS_COLORS[record.status] as any) || 'default'} />
          <Link href={`/it-asset-center/assets/${record.asset_type}/${encodeURIComponent(record.id)}`}>{text}</Link>
        </Space>
      ),
    },
    {
      title: '资产类型',
      dataIndex: 'asset_type',
      key: 'asset_type',
      width: 140,
      render: (type: AssetType) => <Tag>{ASSET_TYPE_META[type]?.label || type}</Tag>,
    },
    {
      title: '分层',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: AssetCategory) => (
        <Tag color={CATEGORY_COLORS[category]}>{CATEGORY_LABELS[category]}</Tag>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>
          {system?.name || '系统详情'}
        </Title>
      </div>

      <Spin spinning={loading} description="加载中...">
        {!loading && !system ? (
          <Empty description="系统不存在" />
        ) : (
          <div>
            <Card title="基本信息" style={{ marginBottom: 16 }}>
              {system && (
                <Descriptions bordered column={isMobile() ? 1 : 2}>
                  <Descriptions.Item label="系统编码">{system.code}</Descriptions.Item>
                  <Descriptions.Item label="系统名称">{system.name}</Descriptions.Item>
                  <Descriptions.Item label="运行状态">
                    <Badge status={STATUS_COLORS[system.status] as any} text={STATUS_LABELS[system.status]} />
                  </Descriptions.Item>
                  <Descriptions.Item label="负责人">{system.owner || '-'}</Descriptions.Item>
                  <Descriptions.Item label="负责部门">{system.owner_department || '-'}</Descriptions.Item>
                  <Descriptions.Item label="上级系统">
                    {system.parent_id ? (
                      <Link href={`/it-asset-center/${system.parent_id}`}>{system.parent_name || system.parent_id}</Link>
                    ) : (
                      '-'
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="创建时间">
                    {system.created_at ? <FriendlyTime date={system.created_at} /> : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="更新时间">
                    {system.updated_at ? <FriendlyTime date={system.updated_at} /> : '-'}
                  </Descriptions.Item>
                  {system.description && (
                    <Descriptions.Item label="系统描述" span={isMobile() ? 1 : 2}>
                      {system.description}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              )}
            </Card>

            {system?.custom_fields && Object.keys(system.custom_fields).length > 0 && (
              <Card title="扩展信息" style={{ marginBottom: 16 }}>
                <Descriptions bordered column={isMobile() ? 1 : 2}>
                  {Object.entries(system.custom_fields).map(([label, value]) => (
                    <Descriptions.Item key={label} label={label}>
                      {value || '-'}
                    </Descriptions.Item>
                  ))}
                </Descriptions>
              </Card>
            )}

            <Card title="关联资产" style={{ marginBottom: 16 }}>
              <Table
                columns={assetColumns}
                dataSource={assets}
                rowKey="id"
                loading={assetsLoading}
                pagination={{
                  current: assetsPage,
                  pageSize: assetsPageSize,
                  total: assetsTotal,
                  showTotal: (total) => `共 ${total} 个关联资产`,
                  onChange: (page, pageSize) => {
                    setAssetsPage(page);
                    setAssetsPageSize(pageSize || 10);
                  },
                }}
                locale={{ emptyText: <Empty description="暂无关联资产" /> }}
              />
            </Card>
          </div>
        )}
      </Spin>
    </div>
  );
}

function isMobile() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}
