'use client';

import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Spin, Input, Tag, Typography, App } from 'antd';
import { PlusOutlined, DeleteOutlined, ArrowLeftOutlined, ShareAltOutlined } from '@ant-design/icons';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';

const { Title, Text } = Typography;

interface ShareRecord {
  id: number;
  shared_to: number;
  shared_to_name: string;
  shared_to_username: string;
}

interface DataSource {
  id: string;
  name: string;
  type: 'mysql' | 'mongodb';
  created_by: number;
  creator_name?: string;
}

// Database icon component
const DbIcon = ({ type }: { type: string }) => {
  const iconSrc = type === 'mongodb' ? '/mongodb.svg' : '/mysql.svg';
  const alt = type === 'mongodb' ? 'MongoDB' : 'MySQL';
  return (
    <Image
      src={iconSrc}
      alt={alt}
      width={20}
      height={20}
      style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }}
    />
  );
};

export default function SharesPage() {
  const params = useParams();
  const router = useRouter();
  const { message } = App.useApp();
  const dataSourceId = params.id as string;

  const [dataSource, setDataSource] = useState<DataSource | null>(null);
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (dataSourceId) {
      fetchDataSource();
      fetchShares();
    }
  }, [dataSourceId]);

  const fetchDataSource = async () => {
    try {
      const response = await fetch(`/api/data-sources/${dataSourceId}`);
      const data = await response.json();
      if (data.success) {
        setDataSource(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch data source:', error);
    }
  };

  const fetchShares = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/data-sources/${dataSourceId}/shares`);
      const data = await response.json();
      if (data.success) {
        setShares(data.data);
      }
    } catch (error) {
      message.error('获取分享列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddShare = async () => {
    if (!targetUserId.trim()) {
      message.warning('请输入用户ID或用户名');
      return;
    }

    setAdding(true);
    try {
      const response = await fetch(`/api/data-sources/${dataSourceId}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_identifier: targetUserId.trim() }),
      });
      const data = await response.json();
      if (data.success) {
        message.success('添加分享成功');
        setTargetUserId('');
        fetchShares();
      } else {
        message.error(data.message || '添加失败');
      }
    } catch (error) {
      message.error('添加失败');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveShare = async (userId: number) => {
    try {
      const response = await fetch(`/api/data-sources/${dataSourceId}/shares/${userId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        message.success('取消分享成功');
        fetchShares();
      } else {
        message.error(data.message || '取消失败');
      }
    } catch (error) {
      message.error('取消失败');
    }
  };

  const columns = [
    {
      title: '用户名',
      dataIndex: 'shared_to_username',
      key: 'shared_to_username',
    },
    {
      title: '姓名',
      dataIndex: 'shared_to_name',
      key: 'shared_to_name',
      render: (text: string) => text || '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: ShareRecord) => (
        <Button
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveShare(record.shared_to)}
        >
          移除
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* 标题行：白色画布上不套卡片 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <Space>
          <ShareAltOutlined />
          <Text strong style={{ fontSize: 16 }}>管理分享</Text>
          {dataSource && (
            <Tag color="blue">
              <DbIcon type={dataSource.type} />
              {dataSource.name}
            </Tag>
          )}
        </Space>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/data-sources')}>
            返回
          </Button>
        </Space>
      </div>

      {dataSource && (
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            创建者：<Tag color="green">{dataSource.creator_name}</Tag>
          </Text>
        </div>
      )}

      {/* 添加分享控件行：白色画布上不套卡片 */}
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Input
            style={{ width: 300 }}
            placeholder="输入用户ID或用户名进行分享"
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            onPressEnter={handleAddShare}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddShare}
            loading={adding}
            disabled={!targetUserId}
          >
            添加
          </Button>
        </Space>
      </div>

      {/* 表格直接置于白色画布：表头底色 + 行分隔线已足够，不再套卡片外框 */}
      <div className="table-responsive">
        <Table
          columns={columns}
          dataSource={shares}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: '暂无分享记录' }}
        />
      </div>
    </div>
  );
}
