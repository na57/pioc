'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  App,
  Card,
  Typography,
  Descriptions,
  Tooltip,
  Radio,
  Select,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import type { TableProps } from 'antd';
import ActionButton from '@/app/tags/components/ActionButton';
import FriendlyTime from '@/components/FriendlyTime';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface Rule {
  id: number;
  name: string;
  description: string | null;
  content: string;
  status: number;
  created_by?: number;
  created_at: string;
  updated_at: string;
  creator_name?: string;
  is_shared?: boolean;
  shared_by?: number;
  shared_by_name?: string;
}

export default function RulesPage() {
  const router = useRouter();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
  const [form] = Form.useForm();
  const { message } = App.useApp();

  // 搜索表单
  const [searchForm] = Form.useForm();

  // 分页状态
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  useEffect(() => {
    fetchRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 当编辑弹窗打开且有编辑对象时，设置表单值
  useEffect(() => {
    if (modalVisible && editingRule) {
      form.setFieldsValue({
        name: editingRule.name,
        description: editingRule.description,
        content: editingRule.content,
        status: editingRule.status,
      });
    }
  }, [modalVisible, editingRule, form]);

  const fetchRules = async (params?: { name?: string; status?: number; page?: number; pageSize?: number }) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (params?.name) queryParams.append('name', params.name);
      if (params?.status !== undefined) queryParams.append('status', String(params.status));
      queryParams.append('page', String(params?.page || pagination.current));
      queryParams.append('pageSize', String(params?.pageSize || pagination.pageSize));

      const response = await fetch(`/api/rules?${queryParams.toString()}`);
      const data = await response.json();
      if (data.success) {
        setRules(data.data.list);
        setPagination({
          current: data.data.pagination.page,
          pageSize: data.data.pagination.pageSize,
          total: data.data.pagination.total,
        });
      } else if (response.status === 403) {
        message.error('您没有权限访问规则管理');
      } else {
        message.error('获取规则列表失败');
      }
    } catch {
      message.error('获取规则列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (values: { name?: string; status?: number }) => {
    // 搜索时重置到第一页
    fetchRules({ ...values, page: 1 });
  };

  const handleReset = () => {
    searchForm.resetFields();
    fetchRules();
  };

  const handleAdd = () => {
    setEditingRule(null);
    form.resetFields();
    form.setFieldsValue({
      status: 1,
    });
    setModalVisible(true);
  };

  const handleEdit = (record: Rule) => {
    setEditingRule(record);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/rules/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        message.success('删除规则成功');
        fetchRules();
      } else {
        message.error(data.message || '删除规则失败');
      }
    } catch {
      message.error('删除规则失败');
    }
  };

  const handleShowDetail = (record: Rule) => {
    setSelectedRule(record);
    setDetailModalVisible(true);
  };

  const handleManageShares = (record: Rule) => {
    router.push(`/rules/${record.id}/shares`);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const submitData = {
        ...values,
        status: values.status ?? 1,
      };

      if (editingRule) {
        // 编辑模式
        const response = await fetch(`/api/rules/${editingRule.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData),
        });

        const data = await response.json();
        if (data.success) {
          message.success('更新规则成功');
          setModalVisible(false);
          fetchRules();
        } else {
          message.error(data.message || '更新规则失败');
        }
      } else {
        // 新增模式
        const response = await fetch('/api/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData),
        });

        const data = await response.json();
        if (data.success) {
          message.success('创建规则成功');
          setModalVisible(false);
          fetchRules();
        } else {
          message.error(data.message || '创建规则失败');
        }
      }
    } catch {
      message.error('操作失败');
    }
  };

  const columns: TableProps<Rule>['columns'] = [
    {
      title: '规则名称',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      render: (name: string, record: Rule) => (
        <Space>
          <Button type="link" onClick={() => handleShowDetail(record)} style={{ padding: 0 }}>
            {name}
          </Button>
          {record.is_shared ? (
            <Tooltip title={`由 ${record.shared_by_name} 分享`}>
              <Tag color="blue" style={{ fontSize: 12 }}>共享</Tag>
            </Tooltip>
          ) : null}
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 250,
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: '创建者',
      dataIndex: 'creator_name',
      key: 'creator_name',
      width: 120,
      render: (text: string) => text || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: number) => (
        <Tag color={status === 1 ? 'green' : 'red'}>{status === 1 ? '启用' : '禁用'}</Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (text: string) => <FriendlyTime date={text} />,
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <ActionButton
            icon={<EyeOutlined />}
            tooltip="查看详情"
            onClick={() => handleShowDetail(record)}
          />
          {!record.is_shared ? (
            <>
              <ActionButton
                icon={<EditOutlined />}
                tooltip="编辑"
                onClick={() => handleEdit(record)}
              />
              <ActionButton
                icon={<ShareAltOutlined />}
                tooltip="管理分享"
                onClick={() => handleManageShares(record)}
              />
              <ActionButton
                icon={<DeleteOutlined />}
                tooltip="删除"
                danger
                confirmTitle="确认删除"
                confirmDescription="确定要删除此规则吗？"
                onConfirm={() => handleDelete(record.id)}
              />
            </>
          ) : (
            <Tag color="default" style={{ marginLeft: 8, fontSize: 12 }}>只读</Tag>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={<Title level={4} style={{ margin: 0 }}>规则管理</Title>}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            创建规则
          </Button>
        }
      >
        {/* 搜索区域 */}
        <Form
          form={searchForm}
          layout="inline"
          onFinish={handleSearch}
          style={{ marginBottom: 24 }}
        >
          <Form.Item name="name" label="名称">
            <Input placeholder="请输入名称" allowClear prefix={<SearchOutlined />} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select placeholder="请选择状态" allowClear style={{ width: 120 }}>
              <Option value={1}>启用</Option>
              <Option value={0}>禁用</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                搜索
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </Form.Item>
        </Form>

        <Table
          columns={columns}
          dataSource={rules}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              const searchValues = searchForm.getFieldsValue();
              fetchRules({
                ...searchValues,
                page,
                pageSize,
              });
            },
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* 创建/编辑弹窗 */}
      <Modal
        title={editingRule ? '编辑规则' : '创建规则'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        width={700}
        destroyOnHidden={false}
      >
        <Form form={form} layout="vertical" preserve>
          <Form.Item
            name="name"
            label="规则名称"
            rules={[{ required: true, message: '请输入规则名称' }]}
          >
            <Input placeholder="请输入规则名称" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <TextArea placeholder="请输入规则描述" rows={2} />
          </Form.Item>

          <Form.Item
            name="content"
            label="规则内容"
            rules={[{ required: true, message: '请输入规则内容' }]}
          >
            <TextArea placeholder="请输入规则内容" rows={10} />
          </Form.Item>

          <Form.Item name="status" label="状态" initialValue={1}>
            <Radio.Group>
              <Radio value={1}>启用</Radio>
              <Radio value={0}>禁用</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title="规则详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {selectedRule && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="ID">{selectedRule.id}</Descriptions.Item>
            <Descriptions.Item label="名称">
              <Space>
                {selectedRule.name}
                {selectedRule.is_shared && (
                  <Tag color="blue">由 {selectedRule.shared_by_name} 分享</Tag>
                )}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="描述">
              {selectedRule.description || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="规则内容">
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 300, overflow: 'auto' }}>
                {selectedRule.content}
              </pre>
            </Descriptions.Item>
            <Descriptions.Item label="创建者">{selectedRule.creator_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={selectedRule.status === 1 ? 'green' : 'red'}>
                {selectedRule.status === 1 ? '启用' : '禁用'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              <FriendlyTime date={selectedRule.created_at} />
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              <FriendlyTime date={selectedRule.updated_at} />
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
