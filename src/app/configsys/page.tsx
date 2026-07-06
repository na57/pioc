'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, Button, Input, Table, Tag, Space, App, Modal, Form, Select } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, ShareAltOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import ActionButton from '@/app/tags/components/ActionButton';
import FriendlyTime from '@/components/FriendlyTime';

const { Search } = Input;
const { TextArea } = Input;
const { Option } = Select;

interface Rule {
  id: number;
  name: string;
  description: string | null;
  isShared?: boolean;
  sharedByName?: string;
}

interface Config {
  id: string;
  name: string;
  description: string;
  compliance_rule_id?: number;
  compliance_rule_name?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  version_count: number;
}

export default function ConfigSysPage() {
  const router = useRouter();
  const [configs, setConfigs] = useState<Config[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [editingConfig, setEditingConfig] = useState<Config | null>(null);
  const [sharingConfig, setSharingConfig] = useState<Config | null>(null);
  const [shareTargetUserId, setShareTargetUserId] = useState('');
  const [shares, setShares] = useState<any[]>([]);
  const [accessibleRules, setAccessibleRules] = useState<Rule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (keyword) params.append('keyword', keyword);

      const response = await fetch(`/api/configsys/configs?${params}`);
      const data = await response.json();

      if (data.success) {
        setConfigs(data.data);
        setTotal(data.total);
      } else {
        message.error(data.message || '获取配置列表失败');
      }
    } catch (error) {
      message.error('网络错误');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, message]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/configsys/configs/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        message.success('删除成功');
        fetchConfigs();
      } else {
        message.error(data.message || '删除失败');
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 获取可访问的规则列表
  const fetchAccessibleRules = useCallback(async () => {
    setRulesLoading(true);
    try {
      const response = await fetch('/api/rules/accessible');
      const data = await response.json();
      if (data.success) {
        setAccessibleRules(data.data);
      } else {
        message.error(data.message || '获取规则列表失败');
      }
    } catch (error) {
      console.error('获取规则列表失败:', error);
    } finally {
      setRulesLoading(false);
    }
  }, [message]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    form.resetFields();
    fetchAccessibleRules();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    form.resetFields();
  };

  const handleSubmit = async (values: any) => {
    setFormLoading(true);
    try {
      const response = await fetch('/api/configsys/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (data.success) {
        message.success('配置创建成功');
        handleCloseModal();
        fetchConfigs();
      } else {
        message.error(data.message || '创建失败');
      }
    } catch (error) {
      message.error('创建失败');
    } finally {
      setFormLoading(false);
    }
  };

  const handleOpenEditModal = (record: Config) => {
    setEditingConfig(record);
    setIsEditModalOpen(true);
    fetchAccessibleRules();
    editForm.setFieldsValue({
      name: record.name,
      description: record.description,
      complianceRuleId: record.compliance_rule_id || undefined,
    });
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingConfig(null);
    editForm.resetFields();
  };

  const handleEditSubmit = async (values: any) => {
    if (!editingConfig) return;
    setFormLoading(true);
    try {
      const response = await fetch(`/api/configsys/configs/${editingConfig.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (data.success) {
        message.success('配置更新成功');
        handleCloseEditModal();
        fetchConfigs();
      } else {
        message.error(data.message || '更新失败');
      }
    } catch (error) {
      message.error('更新失败');
    } finally {
      setFormLoading(false);
    }
  };

  const handleOpenShareModal = async (record: Config) => {
    setSharingConfig(record);
    setIsShareModalOpen(true);
    setShareTargetUserId('');
    await fetchShares(record.id);
  };

  const handleCloseShareModal = () => {
    setIsShareModalOpen(false);
    setSharingConfig(null);
    setShareTargetUserId('');
    setShares([]);
  };

  const fetchShares = async (configId: string) => {
    try {
      const response = await fetch(`/api/configsys/configs/${configId}/share`);
      const data = await response.json();
      if (data.success) {
        setShares(data.data || []);
      }
    } catch (error) {
      console.error('获取共享列表失败:', error);
    }
  };

  const handleAddShare = async () => {
    if (!sharingConfig || !shareTargetUserId.trim()) {
      message.warning('请输入用户ID');
      return;
    }

    setShareLoading(true);
    try {
      const response = await fetch(`/api/configsys/configs/${sharingConfig.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: shareTargetUserId.trim() }),
      });
      const data = await response.json();
      if (data.success) {
        message.success('共享成功');
        setShareTargetUserId('');
        fetchShares(sharingConfig.id);
      } else {
        message.error(data.message || '共享失败');
      }
    } catch (error) {
      message.error('共享失败');
    } finally {
      setShareLoading(false);
    }
  };

  const handleRemoveShare = async (userId: string) => {
    if (!sharingConfig) return;
    try {
      const response = await fetch(`/api/configsys/configs/${sharingConfig.id}/share/${userId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        message.success('取消共享成功');
        fetchShares(sharingConfig.id);
      } else {
        message.error(data.message || '取消失败');
      }
    } catch (error) {
      message.error('取消失败');
    }
  };

  const columns = [
    {
      title: '配置名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Config) => (
        <a onClick={() => router.push(`/configsys/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '版本数',
      dataIndex: 'version_count',
      key: 'version_count',
      width: 80,
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 150,
      render: (text: string) => <FriendlyTime date={text} />,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: Config) => (
        <Space size="small">
          <ActionButton
            icon={<EditOutlined />}
            tooltip="编辑"
            onClick={() => handleOpenEditModal(record)}
          />
          <ActionButton
            icon={<ShareAltOutlined />}
            tooltip="共享"
            onClick={() => handleOpenShareModal(record)}
          />
          <ActionButton
            icon={<DeleteOutlined />}
            tooltip="删除"
            danger
            confirmTitle="确认删除"
            confirmDescription="确定要删除此配置吗？删除后无法恢复。"
            onConfirm={() => handleDelete(record.id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="配置管理"
      extra={
        <Space>
          <Search
            placeholder="搜索配置名称"
            allowClear
            onSearch={(value) => {
              setKeyword(value);
              setPage(1);
            }}
            style={{ width: 250 }}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenModal}
          >
            新建配置
          </Button>
        </Space>
      }
    >
      <Table
        dataSource={configs}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: (p) => setPage(p),
        }}
      />

      <Modal
        title="新建配置"
        open={isModalOpen}
        onCancel={handleCloseModal}
        width={700}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label="配置名称"
            rules={[{ required: true, message: '请输入配置名称' }]}
          >
            <Input placeholder="例如：生产环境Nginx配置" />
          </Form.Item>

          <Form.Item
            name="description"
            label="配置描述"
            rules={[{ required: true, message: '请描述这是什么配置' }]}
          >
            <TextArea
              rows={3}
              placeholder="请描述这是什么配置，例如：这是生产环境Nginx反向代理配置，用于负载均衡..."
            />
          </Form.Item>

          <Form.Item
            name="complianceRuleId"
            label="合规规则（可选）"
          >
            <Select
              placeholder="请选择合规规则"
              allowClear
              loading={rulesLoading}
              showSearch
              optionFilterProp="children"
            >
              {accessibleRules.map((rule) => (
                <Option key={rule.id} value={rule.id}>
                  <Space>
                    {rule.name}
                    {rule.isShared && (
                      <Tag color="blue" style={{ fontSize: 12 }}>由 {rule.sharedByName} 共享</Tag>
                    )}
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={formLoading}>
                创建配置
              </Button>
              <Button onClick={handleCloseModal}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑配置"
        open={isEditModalOpen}
        onCancel={handleCloseEditModal}
        width={700}
        footer={null}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditSubmit}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label="配置名称"
            rules={[{ required: true, message: '请输入配置名称' }]}
          >
            <Input placeholder="例如：生产环境Nginx配置" />
          </Form.Item>

          <Form.Item
            name="description"
            label="配置描述"
            rules={[{ required: true, message: '请描述这是什么配置' }]}
          >
            <TextArea
              rows={3}
              placeholder="请描述这是什么配置，例如：这是生产环境Nginx反向代理配置，用于负载均衡..."
            />
          </Form.Item>

          <Form.Item
            name="complianceRuleId"
            label="合规规则（可选）"
          >
            <Select
              placeholder="请选择合规规则"
              allowClear
              loading={rulesLoading}
              showSearch
              optionFilterProp="children"
            >
              {accessibleRules.map((rule) => (
                <Option key={rule.id} value={rule.id}>
                  <Space>
                    {rule.name}
                    {rule.isShared && (
                      <Tag color="blue" style={{ fontSize: 12 }}>由 {rule.sharedByName} 共享</Tag>
                    )}
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={formLoading}>
                保存修改
              </Button>
              <Button onClick={handleCloseEditModal}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <Space>
            <ShareAltOutlined />
            <span>管理共享</span>
            {sharingConfig && <Tag color="blue">{sharingConfig.name}</Tag>}
          </Space>
        }
        open={isShareModalOpen}
        onCancel={handleCloseShareModal}
        width={600}
        footer={null}
      >
        <div style={{ marginTop: 16 }}>
          <Space style={{ marginBottom: 24 }}>
            <Input
              style={{ width: 300 }}
              placeholder="输入用户ID进行共享"
              value={shareTargetUserId}
              onChange={(e) => setShareTargetUserId(e.target.value)}
              onPressEnter={handleAddShare}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddShare}
              loading={shareLoading}
              disabled={!shareTargetUserId}
            >
              添加
            </Button>
          </Space>

          <Table
            columns={[
              {
                title: '用户ID',
                dataIndex: 'shared_with_user_id',
                key: 'shared_with_user_id',
              },
              {
                title: '姓名',
                dataIndex: 'shared_with_name',
                key: 'shared_with_name',
                render: (text: string) => text || '-',
              },
              {
                title: '共享时间',
                dataIndex: 'shared_at',
                key: 'shared_at',
                render: (text: string) => <FriendlyTime date={text} />,
              },
              {
                title: '操作',
                key: 'action',
                render: (_: any, record: any) => (
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemoveShare(record.shared_with_user_id)}
                  >
                    移除
                  </Button>
                ),
              },
            ]}
            dataSource={shares}
            rowKey="id"
            pagination={false}
            locale={{ emptyText: '暂无共享记录' }}
          />
        </div>
      </Modal>
    </Card>
  );
}
