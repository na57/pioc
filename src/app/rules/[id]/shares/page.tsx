'use client';

import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Spin, Input, Tag, Typography, App } from 'antd';
import { PlusOutlined, DeleteOutlined, ArrowLeftOutlined, ShareAltOutlined } from '@ant-design/icons';
import { useParams, useRouter } from 'next/navigation';
import ActionButton from '@/app/tags/components/ActionButton';

const { Text } = Typography;

interface ShareRecord {
  id: number;
  shared_to: number;
  shared_to_name: string;
  shared_to_username: string;
}

interface Rule {
  id: number;
  name: string;
  created_by: number;
  creator_name?: string;
}

export default function SharesPage() {
  const params = useParams();
  const router = useRouter();
  const { message } = App.useApp();
  const ruleId = Number(params.id);

  const [rule, setRule] = useState<Rule | null>(null);
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (ruleId) {
      fetchRule();
      fetchShares();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruleId]);

  const fetchRule = async () => {
    try {
      const response = await fetch(`/api/rules/${ruleId}`);
      const data = await response.json();
      if (data.success) {
        setRule(data.data);
      }
    } catch {
      // 忽略错误
    }
  };

  const fetchShares = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/rules/${ruleId}/shares`);
      const data = await response.json();
      if (data.success) {
        setShares(data.data);
      }
    } catch {
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
      const response = await fetch(`/api/rules/${ruleId}/shares`, {
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
    } catch {
      message.error('添加失败');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveShare = async (userId: number) => {
    try {
      const response = await fetch(`/api/rules/${ruleId}/shares/${userId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        message.success('取消分享成功');
        fetchShares();
      } else {
        message.error(data.message || '取消失败');
      }
    } catch {
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
        <ActionButton
          icon={<DeleteOutlined />}
          tooltip="移除"
          danger
          confirmTitle="确认移除"
          confirmDescription="确定要取消对该用户的分享吗？"
          onConfirm={() => handleRemoveShare(record.shared_to)}
        />
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
    <div>
      {/* 标题行 + 操作：白色画布上不套卡片 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <Space>
          <ShareAltOutlined />
          <span>管理分享</span>
          {rule && (
            <Tag color="blue">{rule.name}</Tag>
          )}
        </Space>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/rules')}>
            返回
          </Button>
        </Space>
      </div>

      {rule && (
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            创建者：<Tag color="green">{rule.creator_name}</Tag>
          </Text>
        </div>
      )}

      {/* 操作工具栏：白色画布上不套卡片，控件自身边框即结构 */}
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
      <Table
        columns={columns}
        dataSource={shares}
        rowKey="id"
        pagination={false}
        locale={{ emptyText: '暂无分享记录' }}
      />
    </div>
  );
}
