'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Card,
  Descriptions,
  Typography,
  App,
  Spin,
  Empty,
  Tag,
  Badge,
  Table,
  Row,
  Col,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import Link from 'next/link';
import FriendlyTime from '@/components/FriendlyTime';
import ActionButton from '@/app/tags/components/ActionButton';
import type { ITAsset, AssetRelationship, AssetCategory } from '@/lib/services/it-asset-center';
import { ASSET_TYPE_META, CATEGORY_LABELS } from '@/lib/services/it-asset-center';

const { Title } = Typography;

const CATEGORY_COLORS: Record<AssetCategory, string> = {
  infrastructure: 'geekblue',
  network: 'cyan',
  data: 'green',
  application: 'purple',
  software: 'magenta',
  operations: 'gold',
  external: 'lime',
};

export default function AssetDetailPage() {
  const params = useParams();
  const assetId = params.assetId as string;
  const { message } = App.useApp();

  const [loading, setLoading] = useState(true);
  const [asset, setAsset] = useState<ITAsset | null>(null);
  const [relationships, setRelationships] = useState<AssetRelationship[]>([]);

  const fetchAsset = useCallback(async () => {
    try {
      const response = await fetch(`/api/it-asset-center?action=asset-detail&id=${assetId}`);
      const result = await response.json();
      if (result.success) {
        setAsset(result.data.asset);
      } else {
        message.error(result.error || '获取资产详情失败');
      }
    } catch {
      message.error('获取资产详情失败');
    }
  }, [assetId, message]);

  const fetchRelationships = useCallback(async () => {
    try {
      const response = await fetch(`/api/it-asset-center?action=asset-relationships&id=${assetId}`);
      const result = await response.json();
      if (result.success) {
        setRelationships(result.data.relationships);
      }
    } catch {
      // 静默失败
    }
  }, [assetId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchAsset(), fetchRelationships()]).finally(() => {
      setLoading(false);
    });
  }, [fetchAsset, fetchRelationships]);

  const relationshipColumns = [
    {
      title: '关系类型',
      dataIndex: 'relation_type',
      key: 'relation_type',
      render: (type: string) => {
        const labels: Record<string, string> = {
          depends_on: '依赖',
          serves: '服务',
          runs_on: '运行于',
          belongs_to: '属于',
        };
        return labels[type] || type;
      },
    },
    {
      title: '目标资产类型',
      dataIndex: 'target_type',
      key: 'target_type',
      render: (type: string) => <Tag>{ASSET_TYPE_META[type as keyof typeof ASSET_TYPE_META]?.label || type}</Tag>,
    },
    {
      title: '目标资产ID',
      dataIndex: 'target_id',
      key: 'target_id',
      render: (id: string, record: AssetRelationship) => (
        <Link href={`/it-asset-center/assets/${record.target_type}/${id}`}>{id}</Link>
      ),
    },
  ];

  const renderAssetDetails = () => {
    if (!asset) return null;

    const entries = Object.entries(asset).filter(
      ([key]) => !['id', 'system_id', 'asset_type', 'category', 'name', 'status', 'metadata', 'tags'].includes(key)
    );

    return (
      <Descriptions bordered column={isMobile() ? 1 : 2}>
        <Descriptions.Item label="资产编码">{asset.code || '-'}</Descriptions.Item>
        <Descriptions.Item label="资产类型">
          <Tag>{ASSET_TYPE_META[asset.asset_type]?.label || asset.asset_type}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="所属分层">
          <Tag color={CATEGORY_COLORS[asset.category]}>{CATEGORY_LABELS[asset.category]}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="运行状态">
          <Badge status={asset.status === 'active' ? 'success' : 'default'} text={asset.status === 'active' ? '活跃' : '停用'} />
        </Descriptions.Item>
        {entries.map(([key, value]) => (
          <Descriptions.Item key={key} label={key}>
            {formatValue(value)}
          </Descriptions.Item>
        ))}
        <Descriptions.Item label="创建时间">
          <FriendlyTime date={asset.created_at} />
        </Descriptions.Item>
        <Descriptions.Item label="更新时间">
          <FriendlyTime date={asset.updated_at} />
        </Descriptions.Item>
      </Descriptions>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/it-asset-center/assets">
          <ActionButton icon={<ArrowLeftOutlined />} tooltip="返回资产列表" />
        </Link>
        <Title level={3} style={{ margin: 0 }}>
          {asset?.name || '资产详情'}
        </Title>
      </div>

      <Spin spinning={loading} description="加载中...">
        {!loading && !asset ? (
          <Empty description="资产不存在" />
        ) : (
          <div>
            <Card title="基本信息" style={{ marginBottom: 16 }}>
              {renderAssetDetails()}
            </Card>

            <Card title="关联关系">
              <Table
                columns={relationshipColumns}
                dataSource={relationships}
                rowKey="id"
                pagination={false}
                locale={{ emptyText: <Empty description="暂无关联关系" /> }}
              />
            </Card>
          </div>
        )}
      </Spin>
    </div>
  );
}

function formatValue(value: unknown): React.ReactNode {
  if (value === undefined || value === null) return '-';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function isMobile() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}
