'use client';

import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Space, Spin, Select, Tag, Typography, App } from 'antd';
import { PlusOutlined, DeleteOutlined, ArrowLeftOutlined, ShareAltOutlined } from '@ant-design/icons';
import { useParams, useRouter } from 'next/navigation';

const { Title, Text } = Typography;

interface ShareRecord {
  id: number;
  shared_to: number;
  shared_to_name: string;
  shared_to_username: string;
}

interface User {
  id: number;
  username: string;
  name: string;
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
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (dataObjectId) {
      fetchDataObject();
      fetchShares();
      fetchUsers();
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

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (data.success) {
        setUsers(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleAddShare = async () => {
    if (!selectedUserId) {
      message.warning('请选择用户');
      return;
    }

    setAdding(true);
    try {
      const response = await fetch(`/api/data-objects/${dataObjectId}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: selectedUserId }),
      });
      const data = await response.json();
      if (data.success) {
        message.success('添加分享成功');
        setSelectedUserId(null);
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

  const availableUsers = users.filter(
    user => user.id !== dataObject?.created_by && !shares.some(s => s.shared_to === user.id)
  );

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
            <Select
              style={{ width: 300 }}
              placeholder="选择用户进行分享"
              value={selectedUserId}
              onChange={setSelectedUserId}
              options={availableUsers.map(user => ({
                label: `${user.name || user.username} (${user.username})`,
                value: user.id,
              }))}
              showSearch
              filterOption={(input, option) =>
                String(option?.label || '').toLowerCase().includes(input.toLowerCase())
              }
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddShare}
              loading={adding}
              disabled={!selectedUserId}
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
