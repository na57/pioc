'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Tag, Space, Tooltip, DatePicker, Switch, App } from 'antd';
import { PlusOutlined, CopyOutlined, DeleteOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import FriendlyTime from '@/components/FriendlyTime';
import ActionButton from '@/app/tags/components/ActionButton';
import { copyToClipboard } from '@/lib/utils/clipboard';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

interface ApiKeyRecord {
  id: number;
  name: string;
  api_key: string;
  api_secret: string;
  user_id: number;
  username: string;
  user_name: string;
  permissions: string[];
  allowed_ips: string[] | null;
  rate_limit: number;
  status: number;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

interface NewKeyInfo {
  key: string;
  secret: string;
}

export default function ApiKeysPage() {
  const { message } = App.useApp();
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newKeyInfo, setNewKeyInfo] = useState<NewKeyInfo | null>(null);
  const [form] = Form.useForm();
  const [showSecrets, setShowSecrets] = useState<Record<number, boolean>>({});

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/api-keys');
      const data = await response.json();
      if (data.success) {
        setKeys(data.data);
      } else {
        message.error(data.message || '加载失败');
      }
    } catch (error) {
      message.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (values: any) => {
    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          allowed_ips: values.allowed_ips?.split('\n').filter((ip: string) => ip.trim()) || [],
          expires_at: values.expires_at?.toISOString(),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setNewKeyInfo(data.data);
        setModalVisible(false);
        form.resetFields();
        loadKeys();
      } else {
        message.error(data.message || '创建失败');
      }
    } catch (error) {
      message.error('网络错误');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/api-keys/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        message.success('删除成功');
        loadKeys();
      } else {
        message.error(data.message || '删除失败');
      }
    } catch (error) {
      message.error('网络错误');
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: number) => {
    try {
      const response = await fetch(`/api/api-keys/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: currentStatus === 1 ? 0 : 1 }),
      });

      const data = await response.json();
      if (data.success) {
        message.success(currentStatus === 1 ? '已禁用' : '已启用');
        loadKeys();
      } else {
        message.error(data.message || '操作失败');
      }
    } catch (error) {
      message.error('网络错误');
    }
  };

  const toggleSecretVisibility = (id: number) => {
    setShowSecrets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = async (text: string) => {
    try {
      await copyToClipboard(text);
      message.success('已复制到剪贴板');
    } catch {
      message.error('复制失败');
    }
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: 'API Key',
      dataIndex: 'api_key',
      key: 'api_key',
      width: 200,
      render: (text: string) => (
        <Space>
          <code>{text.substring(0, 12)}...{text.substring(text.length - 4)}</code>
          <Tooltip title="复制">
            <CopyOutlined
              style={{ cursor: 'pointer', color: '#1890ff' }}
              onClick={() => handleCopy(text)}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: 'API Secret',
      dataIndex: 'api_secret',
      key: 'api_secret',
      width: 200,
      render: (text: string, record: ApiKeyRecord) => (
        <Space>
          <code>
            {showSecrets[record.id]
              ? `${text.substring(0, 16)}...${text.substring(text.length - 8)}`
              : '••••••••••••••••••••••••••••'
            }
          </code>
          <ActionButton
            icon={showSecrets[record.id] ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            tooltip={showSecrets[record.id] ? '隐藏' : '显示'}
            onClick={() => toggleSecretVisibility(record.id)}
          />
          <ActionButton
            icon={<CopyOutlined />}
            tooltip="复制"
            onClick={() => handleCopy(text)}
          />
        </Space>
      ),
    },
    {
      title: '权限',
      dataIndex: 'permissions',
      key: 'permissions',
      width: 120,
      render: (perms: string[]) => (
        <Space>
          {perms?.map(p => (
            <Tag key={p} color={p === 'write' ? 'red' : 'blue'}>{p}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '创建者',
      dataIndex: 'user_name',
      key: 'user_name',
      width: 100,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: number) => (
        <Tag color={status === 1 ? 'green' : 'red'}>
          {status === 1 ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '最后使用',
      dataIndex: 'last_used_at',
      key: 'last_used_at',
      width: 150,
      render: (text: string | null) => text ? <FriendlyTime date={text} /> : '-',
    },
    {
      title: '过期时间',
      dataIndex: 'expires_at',
      key: 'expires_at',
      width: 150,
      render: (text: string | null) => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '永不过期',
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: ApiKeyRecord) => (
        <Space>
          <Switch
            checked={record.status === 1}
            onChange={() => handleToggleStatus(record.id, record.status)}
            size="small"
          />
          <ActionButton
            icon={<DeleteOutlined />}
            tooltip="删除"
            danger
            confirmTitle="确认删除"
            confirmDescription="确定要删除这个API密钥吗？此操作不可恢复。"
            onConfirm={() => handleDelete(record.id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="API密钥管理"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalVisible(true)}
          >
            创建API密钥
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={keys}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1400 }}
        />
      </Card>

      {/* 创建密钥弹窗 */}
      <Modal
        title="创建API密钥"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{
            permissions: ['read'],
            rate_limit: 1000,
          }}
        >
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入密钥名称' }]}
          >
            <Input placeholder="例如：第三方系统集成" />
          </Form.Item>

          <Form.Item
            name="permissions"
            label="权限"
            rules={[{ required: true, message: '请选择权限' }]}
          >
            <Select
              mode="multiple"
              placeholder="选择权限"
              options={[
                { label: '读取数据', value: 'read' },
                { label: '写入数据', value: 'write' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="rate_limit"
            label="请求限制（次/分钟）"
            rules={[{ required: true, message: '请输入请求限制' }]}
          >
            <Input type="number" min={1} max={10000} />
          </Form.Item>

          <Form.Item
            name="allowed_ips"
            label="IP白名单（可选）"
            extra="每行一个IP地址，留空表示允许所有IP"
          >
            <TextArea
              rows={3}
              placeholder="192.168.1.1\n10.0.0.1"
            />
          </Form.Item>

          <Form.Item
            name="expires_at"
            label="过期时间（可选）"
          >
            <DatePicker
              showTime
              style={{ width: '100%' }}
              placeholder="选择过期时间，留空表示永不过期"
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                创建
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 显示新创建的密钥 */}
      <Modal
        title="API密钥已创建"
        open={!!newKeyInfo}
        onOk={() => setNewKeyInfo(null)}
        onCancel={() => setNewKeyInfo(null)}
        closable={false}
        mask={{ closable: false }}
        okText="我已保存"
        cancelButtonProps={{ style: { display: 'none' } }}
      >
        <div style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 16, padding: 12, background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 4 }}>
            <strong style={{ color: '#cf1322' }}>⚠️ 重要提示</strong>
            <p style={{ margin: '8px 0 0', color: '#cf1322' }}>
              API Secret 只会显示一次，请立即复制并妥善保存。关闭此窗口后将无法再次查看！
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>API Key:</label>
            <Input
              value={newKeyInfo?.key}
              readOnly
              suffix={
                <CopyOutlined
                  style={{ cursor: 'pointer', color: '#1890ff' }}
                  onClick={() => handleCopy(newKeyInfo?.key || '')}
                />
              }
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>API Secret:</label>
            <Input
              value={newKeyInfo?.secret}
              readOnly
              suffix={
                <CopyOutlined
                  style={{ cursor: 'pointer', color: '#1890ff' }}
                  onClick={() => handleCopy(newKeyInfo?.secret || '')}
                />
              }
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
