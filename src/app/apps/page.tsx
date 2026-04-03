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
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  LockOutlined,
  BookOutlined,
  CalendarOutlined,
  CameraOutlined,
  CloudOutlined,
  DashboardOutlined,
  FileTextOutlined,
  MailOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
  AppstoreOutlined,
  MenuOutlined,
  DatabaseOutlined,
  KeyOutlined,
  ReadOutlined,
} from '@ant-design/icons';
import type { TableProps } from 'antd';

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

// 图标映射
const iconMapping: Record<string, React.ReactNode> = {
  BookOutlined: <BookOutlined />,
  CalendarOutlined: <CalendarOutlined />,
  CameraOutlined: <CameraOutlined />,
  CloudOutlined: <CloudOutlined />,
  DashboardOutlined: <DashboardOutlined />,
  FileTextOutlined: <FileTextOutlined />,
  MailOutlined: <MailOutlined />,
  SettingOutlined: <SettingOutlined />,
  TeamOutlined: <TeamOutlined />,
  UserOutlined: <UserOutlined />,
  AppstoreOutlined: <AppstoreOutlined />,
  MenuOutlined: <MenuOutlined />,
  DatabaseOutlined: <DatabaseOutlined />,
  KeyOutlined: <KeyOutlined />,
  ReadOutlined: <ReadOutlined />,
};

const iconOptions = [
  { value: 'BookOutlined', label: '笔记' },
  { value: 'CalendarOutlined', label: '日历' },
  { value: 'CameraOutlined', label: '相机' },
  { value: 'CloudOutlined', label: '云存储' },
  { value: 'DashboardOutlined', label: '仪表盘' },
  { value: 'DatabaseOutlined', label: '数据库' },
  { value: 'FileTextOutlined', label: '文档' },
  { value: 'KeyOutlined', label: '密钥' },
  { value: 'MailOutlined', label: '邮件' },
  { value: 'ReadOutlined', label: '阅读' },
  { value: 'SettingOutlined', label: '设置' },
  { value: 'TeamOutlined', label: '团队' },
  { value: 'UserOutlined', label: '用户' },
  { value: 'AppstoreOutlined', label: '应用' },
  { value: 'MenuOutlined', label: '菜单' },
];

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
      width: 80,
      sorter: (a, b) => a.id - b.id,
      defaultSortOrder: 'ascend',
    },
    {
      title: '应用名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string, record: App) => (
        <Space>
          {record.icon && iconMapping[record.icon]}
          {name}
          {isBuiltinApp(record.id) && (
            <Tooltip title="内置应用，不允许删除，URL不可修改">
              <Tag icon={<LockOutlined />} color="blue" />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '访问地址',
      dataIndex: 'url',
      key: 'url',
      render: (url: string) => url || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: number) => (
        <Tag color={status === 1 ? 'green' : 'red'}>
          {status === 1 ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => {
        const date = new Date(text);
        // 转换为北京时间 (UTC+8)
        const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
        return beijingTime.toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          {!isBuiltinApp(record.id) && (
            <Popconfirm
              title="确定删除此应用？"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>应用管理</h1>
      </div>
      <Table
        columns={columns}
        dataSource={apps}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
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
