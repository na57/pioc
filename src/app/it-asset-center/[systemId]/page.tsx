'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Card,
  Descriptions,
  Table,
  Tabs,
  Typography,
  App,
  Spin,
  Empty,
  Tag,
  Badge,
  Row,
  Col,
  Statistic,
  Select,
  Space,
  Input,
} from 'antd';
import {
  ArrowLeftOutlined,
  DatabaseOutlined,
  AppstoreOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import FriendlyTime from '@/components/FriendlyTime';
import ActionButton from '@/app/tags/components/ActionButton';
import type { InformationSystem, ITAsset, SystemAssetStats, AssetType, AssetCategory } from '@/lib/services/it-asset-center';
import { ASSET_TYPE_META, CATEGORY_LABELS } from '@/lib/services/it-asset-center';

const { Title, Text } = Typography;

const STATUS_LABELS: Record<string, string> = {
  running: '运行中',
  stopped: '已停止',
  deprecated: '已下线',
  planning: '规划中',
};

const LEVEL_LABELS: Record<string, string> = {
  core: '核心',
  important: '重要',
  general: '一般',
};

const STATUS_COLORS: Record<string, string> = {
  running: 'success',
  stopped: 'default',
  deprecated: 'error',
  planning: 'processing',
};

const LEVEL_COLORS: Record<string, string> = {
  core: 'red',
  important: 'orange',
  general: 'blue',
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
  const [activeTab, setActiveTab] = useState('overview');

  const [assetKeyword, setAssetKeyword] = useState('');
  const [selectedAssetType, setSelectedAssetType] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedAssetStatus, setSelectedAssetStatus] = useState<string>('');
  const [assetTypes, setAssetTypes] = useState<{ type: AssetType; category: AssetCategory; label: string }[]>([]);

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
      if (assetKeyword) params.append('keyword', assetKeyword);
      if (selectedAssetType) params.append('asset_type', selectedAssetType);
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedAssetStatus) params.append('status', selectedAssetStatus);

      const response = await fetch(`/api/it-asset-center?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        setAssets(result.data.data);
        setAssetsTotal(result.data.total);
      }
    } catch {
      message.error('获取资产列表失败');
    } finally {
      setAssetsLoading(false);
    }
  }, [
    systemId,
    assetsPage,
    assetsPageSize,
    assetKeyword,
    selectedAssetType,
    selectedCategory,
    selectedAssetStatus,
    message,
  ]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSystem(), fetchStats()]).finally(() => {
      setLoading(false);
    });
  }, [fetchSystem, fetchStats]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const fetchAssetTypes = useCallback(async () => {
    try {
      const response = await fetch('/api/it-asset-center?action=asset-types');
      const result = await response.json();
      if (result.success) {
        setAssetTypes(result.data.types || []);
      }
    } catch {
      // 静默失败
    }
  }, []);

  useEffect(() => {
    fetchAssetTypes();
  }, [fetchAssetTypes]);

  const handleOpenAssetsTab = (assetType?: string) => {
    if (assetType) {
      setSelectedAssetType(assetType);
      setSelectedCategory('');
      setAssetKeyword('');
    } else {
      setSelectedAssetType('');
      setSelectedCategory('');
      setSelectedAssetStatus('');
      setAssetKeyword('');
    }
    setAssetsPage(1);
    setActiveTab('assets');
  };

  const handleResetAssetFilters = () => {
    setAssetKeyword('');
    setSelectedAssetType('');
    setSelectedCategory('');
    setSelectedAssetStatus('');
    setAssetsPage(1);
  };

  const assetColumns = [
    {
      title: '资产名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: ITAsset) => (
        <Link href={`/it-asset-center/assets/${record.asset_type}/${record.id}`}>{text}</Link>
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
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => <Badge status={status === 'active' ? 'success' : 'default'} text={status === 'active' ? '活跃' : '停用'} />,
    },
  ];

  const tabItems = [
    {
      key: 'overview',
      label: '概览',
      children: (
        <div>
          <Card title="基本信息" style={{ marginBottom: 16 }}>
            {system && (
              <Descriptions bordered column={isMobile() ? 1 : 2}>
                <Descriptions.Item label="系统编码">{system.code}</Descriptions.Item>
                <Descriptions.Item label="系统名称">{system.name}</Descriptions.Item>
                <Descriptions.Item label="系统等级">
                  <Tag color={LEVEL_COLORS[system.level || 'general']}>{LEVEL_LABELS[system.level || 'general']}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="运行状态">
                  <Badge status={STATUS_COLORS[system.status] as any} text={STATUS_LABELS[system.status]} />
                </Descriptions.Item>
                <Descriptions.Item label="负责人">{system.owner || '-'}</Descriptions.Item>
                <Descriptions.Item label="负责部门">{system.owner_department || '-'}</Descriptions.Item>
                <Descriptions.Item label="创建时间">
                  <FriendlyTime date={system.created_at} />
                </Descriptions.Item>
                <Descriptions.Item label="更新时间">
                  <FriendlyTime date={system.updated_at} />
                </Descriptions.Item>
                <Descriptions.Item label="系统描述" span={isMobile() ? 1 : 2}>
                  {system.description || '-'}
                </Descriptions.Item>
              </Descriptions>
            )}
          </Card>

          <Card title="资产统计">
            <Row gutter={[16, 16]}>
              <Col xs={12} md={6}>
                <Card
                  size="small"
                  hoverable
                  onClick={() => handleOpenAssetsTab()}
                  style={{ cursor: 'pointer' }}
                >
                  <Statistic title="资产总数" value={stats?.total || 0} prefix={<AppstoreOutlined />} />
                </Card>
              </Col>
              {stats?.by_type.map((stat) => (
                <Col xs={12} md={6} key={stat.asset_type}>
                  <Card
                    size="small"
                    hoverable
                    onClick={() => handleOpenAssetsTab(stat.asset_type)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Statistic title={stat.label} value={stat.count} prefix={<DatabaseOutlined />} />
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </div>
      ),
    },
    {
      key: 'assets',
      label: `资产清单 (${assetsTotal})`,
      children: (
        <Card>
          <Space
            orientation="horizontal"
            wrap
            style={{ marginBottom: 16 }}
            size="middle"
          >
            <Input.Search
              placeholder="搜索资产名称"
              allowClear
              value={assetKeyword}
              onChange={(e) => setAssetKeyword(e.target.value)}
              onSearch={(value) => {
                setAssetKeyword(value);
                setAssetsPage(1);
              }}
              style={{ width: 220 }}
            />
            <Select
              placeholder="资产类型"
              allowClear
              value={selectedAssetType || undefined}
              onChange={(value) => {
                setSelectedAssetType(value || '');
                setAssetsPage(1);
              }}
              options={assetTypes.map((t) => ({ label: t.label, value: t.type }))}
              style={{ width: 160 }}
            />
            <Select
              placeholder="分层"
              allowClear
              value={selectedCategory || undefined}
              onChange={(value) => {
                setSelectedCategory(value || '');
                setAssetsPage(1);
              }}
              options={Object.entries(CATEGORY_LABELS).map(([key, label]) => ({ label, value: key }))}
              style={{ width: 160 }}
            />
            <Select
              placeholder="状态"
              allowClear
              value={selectedAssetStatus || undefined}
              onChange={(value) => {
                setSelectedAssetStatus(value || '');
                setAssetsPage(1);
              }}
              options={[
                { label: '活跃', value: 'active' },
                { label: '停用', value: 'inactive' },
                { label: '未知', value: 'unknown' },
              ]}
              style={{ width: 140 }}
            />
            <ActionButton icon={<ReloadOutlined />} tooltip="重置筛选" onClick={handleResetAssetFilters}>
              重置
            </ActionButton>
          </Space>

          <Table
            columns={assetColumns}
            dataSource={assets}
            rowKey="id"
            loading={assetsLoading}
            pagination={{
              current: assetsPage,
              pageSize: assetsPageSize,
              total: assetsTotal,
              showTotal: (total) => `共 ${total} 个资产`,
              onChange: (page, pageSize) => {
                setAssetsPage(page);
                setAssetsPageSize(pageSize || 10);
              },
            }}
            locale={{ emptyText: <Empty description="暂无资产" /> }}
          />
        </Card>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/it-asset-center">
          <ActionButton icon={<ArrowLeftOutlined />} tooltip="返回列表" />
        </Link>
        <Title level={3} style={{ margin: 0 }}>
          {system?.name || '系统详情'}
        </Title>
      </div>

      <Spin spinning={loading} description="加载中...">
        {!loading && !system ? (
          <Empty description="系统不存在" />
        ) : (
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
        )}
      </Spin>
    </div>
  );
}

function isMobile() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}
