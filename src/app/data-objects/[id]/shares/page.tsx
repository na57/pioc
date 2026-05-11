'use client';

import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Space, Spin, Input, Tag, Typography, App } from 'antd';
import { PlusOutlined, DeleteOutlined, ArrowLeftOutlined, ShareAltOutlined } from '@ant-design/icons';
import { useParams, useRouter } from 'next/navigation';

const { Title, Text } = Typography;

interface ShareRecord {
  id: number;
  shared_to: number;
  shared_to_name: string;
  shared_to_username: string;
}

interface DataObject {
  id: number;
  name: string;
  created_by: number;
  creator_name?: string;
}

export default function SharesPage() {
  const params = useParams();
  const router = useRouter();
  const { message } = App.useApp();
  const dataObjectId = Number(params.id);

  const [dataObject, setDataObject] = useState<DataObject | null>(null);
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (dataObjectId) {
      fetchDataObject();
      fetchShares();
    }
  }, [dataObjectId]);

  const fetchDataObject = async () => {
    try {
      const response = await fetch(`/api/data-objects/${dataObjectId}`);
      const data = await response.json();
      if (data.success) {
        setDataObject(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch data object:', error);
    }
  };

  const fetchShares = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/data-objects/${dataObjectId}/shares`);
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
      const response = await fetch(`/api/data-objects/${dataObjectId}/shares`, {
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
      const response = await fetch(`/api/data-objects/${dataObjectId}/shares/${userId}`, {
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
      <Card
        title={
          <Space>
            <ShareAltOutlined />
            <span>管理分享</span>
            {dataObject && (
              <Tag color="blue">{dataObject.name}</Tag>
            )}
          </Space>
        }
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/data-objects')}>
            返回
          </Button>
        }
      >
        {dataObject && (
          <div style={{ marginBottom: '24px' }}>
            <Text type="secondary">
              创建者：<Tag color="green">{dataObject.creator_name}</Tag>
            </Text>
          </div>
        )}

        <div style={{ marginBottom: '24px' }}>
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

        <Table
          columns={columns}
          dataSource={shares}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: '暂无分享记录' }}
        />
      </Card>
    </div>
  );
}
