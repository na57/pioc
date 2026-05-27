'use client';

import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Switch,
  Select,
  theme,
  Tooltip,
  Grid,
  Card,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  LockOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { iconMapping, iconOptions, useIcons } from '@/lib/icons';
import type { TableProps } from 'antd';
import FriendlyTime from '@/components/FriendlyTime';
import ActionButton from '@/app/tags/components/ActionButton';

const { useBreakpoint } = Grid;

interface App {
  id: number;
  name: string;
  description: string;
  icon: string;
  url: string;
  status: number;
  created_at: string;
}

interface AppFormData {
  name: string;
  description?: string;
  icon?: string;
  url?: string;
  status?: number;
}

// 内置应用ID（包含菜单管理、我的应用）
const BUILTIN_APP_IDS = [1, 2, 3, 4, 5];

// 图标选择器选项渲染
const iconSelectOptions = iconOptions.map(option => ({
  value: option.value,
  label: (
    <Space>
      {iconMapping[option.value]}
      <span>{option.label}</span>
    </Space>
  ),
}));

export default function AppsPage() {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingApp, setEditingApp] = useState<App | null>(null);
  const [form] = Form.useForm();
  const { token } = theme.useToken();
  const { getIcon } = useIcons();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    try {
      const response = await fetch('/api/apps');
      const data = await response.json();
      if (data.success) {
        setApps(data.data);
      } else if (response.status === 403) {
        message.error('您没有权限访问应用管理');
      } else {
        message.error('获取应用列表失败');
      }
    } catch {
      message.error('获取应用列表失败');
    } finally {
      setLoading(false);
    }
  };

  const isBuiltinApp = (id: number) => BUILTIN_APP_IDS.includes(id);

  const handleEdit = (app: App) => {
    setEditingApp(app);
    form.setFieldsValue({
      name: app.name,
      description: app.description,
      icon: app.icon,
      url: app.url,
      status: app.status === 1,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/apps/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        message.success('删除应用成功');
        fetchApps();
      } else {
        message.error(data.message || '删除应用失败');
      }
    } catch {
      message.error('删除应用失败');
    }
  };

  const handleSubmit = async (values: AppFormData) => {
    try {
      if (!editingApp) return;
      
      const response = await fetch(`/api/apps/${editingApp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          status: values.status ? 1 : 0,
        }),
      });

      const data = await response.json();
      if (data.success) {
        message.success('更新应用成功');
        setModalVisible(false);
        fetchApps();
      } else {
        message.error(data.message || '操作失败');
      }
    } catch {
      message.error('操作失败');
    }
  };

  const columns: TableProps<App>['columns'] = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
      sorter: (a, b) => a.id - b.id,
      defaultSortOrder: 'ascend',
    },
    {
      title: '应用名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (name: string, record: App) => (
        <Space size="small">
          {getIcon(record.icon)}
          <span style={{ fontSize: isMobile ? 13 : 14 }}>{name}</span>
          {isBuiltinApp(record.id) && (
            <Tooltip title="内置应用，不允许删除，URL不可修改">
              <Tag icon={<LockOutlined />} color="blue" style={{ fontSize: isMobile ? 10 : 12 }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 150,
      responsive: ['md' as const],
    },
    {
      title: '访问地址',
      dataIndex: 'url',
      key: 'url',
      width: 150,
      responsive: ['lg' as const],
      render: (url: string) => url || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: number) => (
        <Tag color={status === 1 ? 'green' : 'red'} style={{ fontSize: isMobile ? 10 : 12 }}>
          {status === 1 ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      responsive: ['md' as const],
      render: (text: string) => <FriendlyTime date={text} />,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Space size="small">
          <ActionButton
            icon={<EditOutlined />}
            tooltip="编辑"
            onClick={() => handleEdit(record)}
          />
          {!isBuiltinApp(record.id) && (
            <ActionButton
              icon={<DeleteOutlined />}
              tooltip="删除"
              danger
              confirmTitle="确认删除"
              confirmDescription="确定要删除此应用吗？"
              onConfirm={() => handleDelete(record.id)}
            />
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={<span style={{ fontSize: isMobile ? 18 : 24 }}>应用管理</span>}
        styles={{ body: { padding: isMobile ? 0 : 24 } }}
      >
        <div className="table-responsive" style={{ margin: isMobile ? '-12px 0' : 0 }}>
          <Table
            columns={columns}
            dataSource={apps}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              size: isMobile ? 'small' : undefined,
              showSizeChanger: !isMobile,
              showTotal: isMobile ? undefined : (total) => `共 ${total} 条`,
            }}
            scroll={{ x: isMobile ? 400 : undefined }}
            size={isMobile ? 'small' : 'middle'}
          />
        </div>
      </Card>
      <Modal
        title="编辑应用"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ status: true }}>
          <Form.Item
            name="name"
            label="应用名称"
            rules={[{ required: true, message: '请输入应用名称' }]}
          >
            <Input placeholder="请输入应用名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="请输入应用描述" rows={3} />
          </Form.Item>
          <Form.Item name="icon" label="图标">
            <Select
              placeholder="请选择图标"
              options={iconSelectOptions}
              optionLabelProp="value"
            />
          </Form.Item>
          <Form.Item name="url" label="访问地址">
            <Input 
              placeholder="请输入应用访问地址" 
              disabled={true}
            />
          </Form.Item>
          <Form.Item name="status" label="状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
          {editingApp && isBuiltinApp(editingApp.id) && (
            <div style={{ marginBottom: 16, color: token.colorWarning }}>
              <LockOutlined /> 内置应用的访问地址不可修改
            </div>
          )}
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                更新
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
