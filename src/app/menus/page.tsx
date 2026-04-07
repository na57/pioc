'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  App,
  Popconfirm,
  Switch,
  Select,
  TreeSelect,
  theme,
  Card,
  Typography,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LockOutlined,
  MenuOutlined,
  AppstoreOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { iconMapping, iconOptions, useIcons } from '@/lib/icons';
import type { TableProps } from 'antd';

const { Title, Text } = Typography;

interface Menu {
  id: number;
  name: string;
  path: string;
  icon?: string;
  parent_id: number | null;
  sort_order: number;
  status: number;
  app_id?: number | null;
  app_icon?: string;
  created_at: string;
  children?: Menu[];
}

interface App {
  id: number;
  name: string;
  url: string;
  icon?: string;
}

interface MenuFormData {
  name: string;
  icon?: string;
  parent_id?: number | null;
  sort_order?: number;
  status?: boolean;
}

// 内置菜单ID（不允许删除）- 只保留系统级菜单
const BUILTIN_MENU_IDS = [1]; // 1: 系统（根菜单）

export default function MenusPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [appModalVisible, setAppModalVisible] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [parentMenuForApp, setParentMenuForApp] = useState<Menu | null>(null);
  const [form] = Form.useForm();
  const [appForm] = Form.useForm();
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const { getIcon } = useIcons();

  useEffect(() => {
    fetchMenus();
    fetchApps();
  }, []);

  const fetchMenus = async () => {
    try {
      const response = await fetch('/api/menus?tree=true&includeDisabled=true');
      const data = await response.json();
      if (data.success) {
        setMenus(data.data);
      } else if (response.status === 403) {
        message.error('您没有权限访问菜单管理');
      } else {
        message.error('获取菜单列表失败');
      }
    } catch {
      message.error('获取菜单列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchApps = async () => {
    try {
      const response = await fetch('/api/apps');
      const data = await response.json();
      if (data.success) {
        setApps(data.data);
      }
    } catch {
      // 静默处理
    }
  };

  const isBuiltinMenu = (id: number) => BUILTIN_MENU_IDS.includes(id);

  // 构建 TreeSelect 选项（只显示菜单组，不显示应用）
  const buildTreeOptions = (menus: Menu[], excludeId?: number): { value: number; title: string; children?: any[] }[] => {
    return menus
      .filter(menu => menu.id !== excludeId)
      .map(menu => ({
        value: menu.id,
        title: menu.name,
        children: menu.children ? buildTreeOptions(menu.children, excludeId) : undefined,
      }));
  };

  const handleAdd = () => {
    setEditingMenu(null);
    form.resetFields();
    form.setFieldsValue({ status: true, sort_order: 0 });
    setModalVisible(true);
  };

  const handleAddSubMenu = (parentMenu: Menu) => {
    setEditingMenu(null);
    form.resetFields();
    form.setFieldsValue({
      status: true,
      sort_order: 0,
      parent_id: parentMenu.id,
    });
    setModalVisible(true);
  };

  const handleAddApp = (parentMenu: Menu) => {
    setEditingMenu(null);
    setParentMenuForApp(parentMenu);
    appForm.resetFields();
    appForm.setFieldsValue({
      app_id: undefined,
    });
    setAppModalVisible(true);
  };

  const handleEdit = (menu: Menu) => {
    setEditingMenu(menu);
    form.setFieldsValue({
      name: menu.name,
      icon: menu.icon,
      parent_id: menu.parent_id,
      sort_order: menu.sort_order,
      status: menu.status === 1,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number, hasChildren: boolean) => {
    try {
      const url = hasChildren
        ? `/api/menus/${id}?recursive=true`
        : `/api/menus/${id}`;
      const response = await fetch(url, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        message.success('删除菜单成功');
        fetchMenus();
      } else {
        message.error(data.message || '删除菜单失败');
      }
    } catch {
      message.error('删除菜单失败');
    }
  };

  const handleSubmit = async (values: MenuFormData) => {
    try {
      const url = editingMenu ? `/api/menus/${editingMenu.id}` : '/api/menus';
      const method = editingMenu ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          icon: values.icon,
          parent_id: values.parent_id === undefined ? null : values.parent_id,
          sort_order: values.sort_order,
          status: values.status ? 1 : 0,
          app_id: null,
        }),
      });

      const data = await response.json();
      if (data.success) {
        message.success(editingMenu ? '更新菜单成功' : '创建菜单成功');
        setModalVisible(false);
        fetchMenus();
      } else {
        message.error(data.message || '操作失败');
      }
    } catch {
      message.error('操作失败');
    }
  };

  const handleAppSubmit = async (values: { app_id: number }) => {
    try {
      const selectedApp = apps.find(a => a.id === values.app_id);
      if (!selectedApp) {
        message.error('请选择应用');
        return;
      }

      const response = await fetch('/api/menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedApp.name,
          icon: null,
          parent_id: parentMenuForApp?.id || null,
          sort_order: 0,
          status: 1,
          app_id: values.app_id,
        }),
      });

      const data = await response.json();
      if (data.success) {
        message.success('添加应用成功');
        setAppModalVisible(false);
        fetchMenus();
      } else {
        message.error(data.message || '操作失败');
      }
    } catch {
      message.error('操作失败');
    }
  };

  const getMenuIcon = (iconName?: string, appIconName?: string) => {
    // 如果有应用图标，优先使用应用图标
    if (appIconName) {
      return getIcon(appIconName, <LinkOutlined />);
    }
    // 否则使用菜单图标
    return getIcon(iconName || '', <MenuOutlined />);
  };

  // 为树形表格准备数据，添加 key 属性
  const treeData = useMemo(() => {
    const addKey = (items: Menu[]): (Menu & { key: string })[] => {
      return items.map(item => ({
        ...item,
        key: String(item.id),
        children: item.children ? addKey(item.children) : undefined,
      }));
    };
    return addKey(menus);
  }, [menus]);

  const columns: TableProps<Menu & { key: string }>['columns'] = [
    {
      title: '菜单名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <Space key={`name-${record.key}`}>
          {getMenuIcon(record.icon, record.app_icon)}
          <span>{name}</span>
          {isBuiltinMenu(record.id) && (
            <Tooltip title="内置菜单，不允许删除">
              <Tag icon={<LockOutlined />} color="orange">内置</Tag>
            </Tooltip>
          )}
          {record.status === 0 && <Tag color="red">已禁用</Tag>}
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'app_id',
      key: 'type',
      width: 100,
      render: (appId: number | null) => (
        <Tag color={appId ? 'blue' : 'green'}>
          {appId ? '应用' : '菜单组'}
        </Tag>
      ),
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 80,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: number) => (
        <Tag color={status === 1 ? 'green' : 'red'}>
          {status === 1 ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      render: (_, record) => {
        const isApp = !!record.app_id;
        const hasChildren = record.children && record.children.length > 0;
        return (
          <Space key={`action-${record.key}`}>
            <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
              编辑
            </Button>
            {!isApp && (
              <>
                <Button type="link" icon={<PlusOutlined />} onClick={() => handleAddSubMenu(record)}>
                  添加子菜单
                </Button>
                <Button type="link" icon={<LinkOutlined />} onClick={() => handleAddApp(record)}>
                  添加应用
                </Button>
              </>
            )}
            {!isBuiltinMenu(record.id) && (
              <Popconfirm
                title={hasChildren ? '确定删除此菜单及其所有子菜单？' : '确定删除此菜单？'}
                onConfirm={() => handleDelete(record.id, !!hasChildren)}
                okText="确定"
                cancelText="取消"
              >
                <Button type="link" danger icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  const treeOptions = buildTreeOptions(menus, editingMenu?.id);

  return (
    <div>
      <Card
        title={<Title level={4} style={{ margin: 0 }}>菜单管理</Title>}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加菜单组
          </Button>
        }
        variant="borderless"
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          菜单组用于组织菜单结构，可以包含子菜单组或应用。应用是从应用管理中选择的已有应用。
        </Text>
        <Table
          columns={columns}
          dataSource={treeData}
          rowKey="key"
          loading={loading}
          pagination={false}
          size="middle"
          defaultExpandAllRows
        />
      </Card>

      {/* 菜单组弹窗 */}
      <Modal
        title={editingMenu ? '编辑菜单' : '添加菜单组'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ status: true, sort_order: 0 }}
        >
          <Form.Item
            name="name"
            label="菜单组名称"
            rules={[{ required: true, message: '请输入菜单组名称' }]}
          >
            <Input placeholder="请输入菜单组名称" />
          </Form.Item>

          <Form.Item name="parent_id" label="父菜单">
            <TreeSelect
              placeholder="请选择父菜单（不选则为顶级菜单）"
              treeData={treeOptions}
              allowClear
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item name="icon" label="图标">
            <Select
              placeholder="请选择图标"
              allowClear
              style={{ width: '100%' }}
            >
              {iconOptions.map(option => (
                <Select.Option key={option.value} value={option.value}>
                  <Space>
                    {iconMapping[option.value]}
                    <span>{option.label}</span>
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="sort_order" label="排序">
            <Input type="number" placeholder="请输入排序值，数值越小越靠前" />
          </Form.Item>

          <Form.Item name="status" label="状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                {editingMenu ? '更新' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 添加应用弹窗 */}
      <Modal
        title={`添加应用到「${parentMenuForApp?.name || ''}」`}
        open={appModalVisible}
        onCancel={() => setAppModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={appForm}
          layout="vertical"
          onFinish={handleAppSubmit}
        >
          <Form.Item
            name="app_id"
            label="选择应用"
            rules={[{ required: true, message: '请选择应用' }]}
          >
            <Select
              placeholder="请从应用管理中选择应用"
              allowClear
              optionLabelProp="label"
              style={{ width: '100%' }}
            >
              {apps.map(app => (
                <Select.Option key={app.id} value={app.id} label={app.name}>
                  <Space>
                    {app.icon ? iconMapping[app.icon] || <AppstoreOutlined /> : <AppstoreOutlined />}
                    <span>{app.name}</span>
                    <Text type="secondary" style={{ fontSize: 12 }}>{app.url}</Text>
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            应用名称、路径等信息将从应用管理中自动获取
          </Text>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setAppModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                添加
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
