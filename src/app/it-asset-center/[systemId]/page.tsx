'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  governance: 'volcano',
};

export default function SystemDetailPage() {
  const params = useParams();
  const systemId = params.systemId as string;
  const { message } = App.useApp();
  const messageRef = useRef(message);
  messageRef.current = message;
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  const handleUnauthorized = useCallback(() => {
    routerRef.current.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
  }, []);

  const [loading, setLoading] = useState(true);
  const [system, setSystem] = useState<InformationSystem | null>(null);
  const [stats, setStats] = useState<SystemAssetStats | null>(null);
  const [allAssets, setAllAssets] = useState<any[]>([]);
  const [assetsPage, setAssetsPage] = useState(1);
  const [assetsPageSize, setAssetsPageSize] = useState(10);
  const [assetsLoading, setAssetsLoading] = useState(false);

  const fetchSystem = useCallback(async () => {
    try {
      const response = await fetch(`/api/it-asset-center?action=system-detail&id=${systemId}`);
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      const result = await response.json();
      if (result.success) {
        setSystem(result.data.system);
      } else {
        messageRef.current.error(result.error || '获取系统详情失败');
      }
    } catch {
      messageRef.current.error('获取系统详情失败');
    }
  }, [systemId, handleUnauthorized]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/it-asset-center?action=system-stats&system_id=${systemId}`);
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      const result = await response.json();
      if (result.success) {
        setStats(result.data);
      }
    } catch {
      // 静默失败
    }
  }, [systemId, handleUnauthorized]);

  const fetchChildSystems = useCallback(async (sys: InformationSystem): Promise<any[]> => {
    const items: any[] = [];

    // Fetch child systems (parent_id 反向查询子应用)
    try {
      const response = await fetch(`/api/it-asset-center?action=systems&parent=${encodeURIComponent(sys.id)}&per_page=1000`);
      if (response.status === 401) { handleUnauthorized(); return items; }
      const result = await response.json();
      if (result.success && result.data.data) {
        for (const child of result.data.data) {
          items.push({
            ...child,
            _isSystem: true,
            _relationLabel: '子应用',
          });
        }
      }
    } catch { /* silent */ }

    return items;
  }, [handleUnauthorized]);

  const fetchAssets = useCallback(async () => {
    setAssetsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('action', 'system-assets');
      params.append('system_id', systemId);
      params.append('page', '1');
      params.append('per_page', '1000');

      const [assetResponse, childSystems] = await Promise.all([
        fetch(`/api/it-asset-center?${params.toString()}`),
        system ? fetchChildSystems(system) : Promise.resolve([]),
      ]);

      if (assetResponse.status === 401) {
        handleUnauthorized();
        return;
      }
      const result = await assetResponse.json();
      if (result.success) {
        // DNS 记录属于间接关联（通过域名间接归属系统），不在系统详情页关联资产中展示
        const filtered = (result.data.data || []).filter((a: ITAsset) => a.asset_type !== 'dns_record');
        setAllAssets([...childSystems, ...filtered]);
      }
    } catch {
      messageRef.current.error('获取关联资产列表失败');
    } finally {
      setAssetsLoading(false);
    }
  }, [systemId, system, fetchChildSystems, handleUnauthorized]);

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
      render: (text: string, record: any) => (
        <Space orientation="horizontal" size={4}>
          <Badge status={(STATUS_COLORS[record.status] as any) || 'default'} />
          {record._isSystem ? (
            <Link href={`/it-asset-center/${encodeURIComponent(record.id)}`}>{text}</Link>
          ) : (
            <Link href={`/it-asset-center/assets/${record.asset_type}/${encodeURIComponent(record.id)}`}>{text}</Link>
          )}
        </Space>
      ),
    },
    {
      title: '资产类型',
      dataIndex: 'asset_type',
      key: 'asset_type',
      width: 140,
      render: (type: any, record: any) => {
        if (record._isSystem) return <Tag color="purple">信息系统</Tag>;
        return <Tag>{ASSET_TYPE_META[type as AssetType]?.label || type}</Tag>;
      },
    },
    {
      title: '分层',
      key: 'category',
      width: 120,
      render: (_: any, record: any) => {
        if (record._isSystem) {
          // 子应用：蓝色标签
          return <Tag color="blue">子应用</Tag>;
        }
        return <Tag color={CATEGORY_COLORS[record.category as AssetCategory]}>{CATEGORY_LABELS[record.category as AssetCategory]}</Tag>;
      },
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
                  <Descriptions.Item label="父应用">
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
                dataSource={allAssets}
                rowKey={(record: any) => record._isSystem ? `sys-${record.id}` : record.id}
                loading={assetsLoading}
                pagination={{
                  current: assetsPage,
                  pageSize: assetsPageSize,
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
