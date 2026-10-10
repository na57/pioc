'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Drawer,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  App,
  Empty,
} from 'antd';
import type { TableProps } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { iconMapping, iconOptions } from '@/lib/icons';
import ActionButton from '@/app/tags/components/ActionButton';

interface AppInfo {
  id: number;
  name: string;
}

interface AppMenuItem {
  id: number;
  app_id: number;
  name: string;
  path: string;
  icon: string | null;
  sort_order: number;
  status: number;
}

interface AppMenusDrawerProps {
  open: boolean;
  app: AppInfo | null;
  onClose: () => void;
}

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

export default function AppMenusDrawer({ open, app, onClose }: AppMenusDrawerProps) {
  const [menus, setMenus] = useState<AppMenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMenu, setEditingMenu] = useState<AppMenuItem | null>(null);
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const fetchMenus = useCallback(async (appId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/apps/${appId}/menus`);
      const data = await response.json();
      if (data.success) {
        setMenus(data.data);
      } else {
        message.error(data.message || '获取应用菜单失败');
      }
    } catch {
      message.error('获取应用菜单失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    if (open && app) {
      fetchMenus(app.id);
    } else {
      setMenus([]);
    }
  }, [open, app, fetchMenus]);

  const handleAdd = () => {
    setEditingMenu(null);
    form.setFieldsValue({ name: '', path: '', icon: undefined, sort_order: 0, status: true });
    setModalVisible(true);
  };

  const handleEdit = (menu: AppMenuItem) => {
    setEditingMenu(menu);
    form.setFieldsValue({
      name: menu.name,
      path: menu.path,
      icon: menu.icon || undefined,
      sort_order: menu.sort_order,
      status: menu.status === 1,
    });
    setModalVisible(true);
  };

  const handleDelete = async (menuId: number) => {
    if (!app) return;
    try {
      const response = await fetch(`/api/apps/${app.id}/menus/${menuId}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        message.success('删除菜单成功');
        fetchMenus(app.id);
      } else {
        message.error(data.message || '删除菜单失败');
      }
    } catch {
      message.error('删除菜单失败');
    }
  };

  const handleSubmit = async (values: {
    name: string;
    path: string;
    icon?: string;
    sort_order?: number;
    status?: boolean;
  }) => {
    if (!app) return;
    try {
      const body = JSON.stringify({
        name: values.name,
        path: values.path,
        icon: values.icon || null,
        sort_order: values.sort_order ?? 0,
        status: values.status ? 1 : 0,
      });
      const response = editingMenu
        ? await fetch(`/api/apps/${app.id}/menus/${editingMenu.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body,
          })
        : await fetch(`/api/apps/${app.id}/menus`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
          });

      const data = await response.json();
      if (data.success) {
        message.success(editingMenu ? '更新菜单成功' : '新增菜单成功');
        setModalVisible(false);
        fetchMenus(app.id);
      } else {
        message.error(data.message || '操作失败');
      }
    } catch {
      message.error('操作失败');
    }
  };

  const columns: TableProps<AppMenuItem>['columns'] = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 120,
      render: (name: string, record: AppMenuItem) => (
        <Space size="small">
          {record.icon && iconMapping[record.icon]}
          <span>{name}</span>
        </Space>
      ),
    },
    {
      title: '路径',
      dataIndex: 'path',
      key: 'path',
      ellipsis: true,
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 70,
      sorter: (a, b) => a.sort_order - b.sort_order,
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
          <ActionButton
            icon={<DeleteOutlined />}
            tooltip="删除"
            danger
            confirmTitle="确认删除"
            confirmDescription={`确定要删除菜单「${record.name}」吗？`}
            onConfirm={() => handleDelete(record.id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <Drawer
      title={`应用菜单 - ${app?.name ?? ''}`}
      size="large"
      open={open}
      onClose={onClose}
    >
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>应用级菜单显示在应用页面的左侧导航中，与系统菜单（顶部导航）相互独立。</span>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增菜单
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={menus}
        rowKey="id"
        loading={loading}
        pagination={false}
        locale={{ emptyText: <Empty description="暂无应用菜单，点击右上角「新增菜单」创建" /> }}
        size="middle"
      />

      <Modal
        title={editingMenu ? '编辑菜单' : '新增菜单'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="菜单名称"
            rules={[{ required: true, message: '请输入菜单名称' }]}
          >
            <Input placeholder="请输入菜单名称" />
          </Form.Item>
          <Form.Item
            name="path"
            label="菜单路径"
            rules={[{ required: true, message: '请输入菜单路径' }]}
          >
            <Input placeholder="例如 /it-asset-center/assets" />
          </Form.Item>
          <Form.Item name="icon" label="图标">
            <Select
              placeholder="请选择图标"
              options={iconSelectOptions}
              optionLabelProp="value"
              allowClear
            />
          </Form.Item>
          <Form.Item name="sort_order" label="排序（越小越靠前）">
            <InputNumber min={0} style={{ width: '100%' }} />
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
    </Drawer>
  );
}
