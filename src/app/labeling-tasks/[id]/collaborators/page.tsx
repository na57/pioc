'use client';

import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Space, Spin, Select, Tag, Typography, App } from 'antd';
import { PlusOutlined, DeleteOutlined, ArrowLeftOutlined, TeamOutlined } from '@ant-design/icons';
import { useParams, useRouter } from 'next/navigation';

const { Title, Text } = Typography;

interface Collaborator {
  id: number;
  user_id: number;
  username: string;
  name: string;
}

interface User {
  id: number;
  username: string;
  name: string;
}

interface LabelingTask {
  id: number;
  name: string;
  created_by: number;
  creator_name: string;
}

export default function CollaboratorsPage() {
  const params = useParams();
  const router = useRouter();
  const { message } = App.useApp();
  const taskId = Number(params.id);

  const [task, setTask] = useState<LabelingTask | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (taskId) {
      fetchTask();
      fetchCollaborators();
      fetchUsers();
    }
  }, [taskId]);

  const fetchTask = async () => {
    try {
      const response = await fetch(`/api/labeling-tasks/${taskId}`);
      const data = await response.json();
      if (data.success) {
        setTask(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch task:', error);
    }
  };

  const fetchCollaborators = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/labeling-tasks/${taskId}/collaborators`);
      const data = await response.json();
      if (data.success) {
        setCollaborators(data.data);
      }
    } catch (error) {
      message.error('获取协作者列表失败');
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

  const handleAddCollaborator = async () => {
    if (!selectedUserId) {
      message.warning('请选择用户');
      return;
    }

    setAdding(true);
    try {
      const response = await fetch(`/api/labeling-tasks/${taskId}/collaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: selectedUserId }),
      });
      const data = await response.json();
      if (data.success) {
        message.success('添加协作者成功');
        setSelectedUserId(null);
        fetchCollaborators();
      } else {
        message.error(data.message || '添加失败');
      }
    } catch (error) {
      message.error('添加失败');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveCollaborator = async (userId: number) => {
    try {
      const response = await fetch(`/api/labeling-tasks/${taskId}/collaborators/${userId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        message.success('移除协作者成功');
        fetchCollaborators();
      } else {
        message.error(data.message || '移除失败');
      }
    } catch (error) {
      message.error('移除失败');
    }
  };

  const availableUsers = users.filter(
    user => user.id !== task?.created_by && !collaborators.some(c => c.user_id === user.id)
  );

  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => text || '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Collaborator) => (
        <Button
          danger
          icon={<DeleteOutlined />}
          size="small"
          onClick={() => handleRemoveCollaborator(record.user_id)}
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
            <TeamOutlined />
            <span>管理协作者</span>
            {task && (
              <Tag color="blue">{task.name}</Tag>
            )}
          </Space>
        }
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/labeling-tasks')}>
            返回
          </Button>
        }
      >
        {task && (
          <div style={{ marginBottom: '24px' }}>
            <Text type="secondary">
              创建者：<Tag color="green">{task.creator_name}</Tag>
            </Text>
          </div>
        )}

        <div style={{ marginBottom: '24px' }}>
          <Space>
            <Select
              style={{ width: 300 }}
              placeholder="选择用户添加为协作者"
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
              onClick={handleAddCollaborator}
              loading={adding}
              disabled={!selectedUserId}
            >
              添加
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={collaborators}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: '暂无协作者' }}
        />
      </Card>
    </div>
  );
}
