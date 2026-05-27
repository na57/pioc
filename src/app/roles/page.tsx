'use client';

import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  App,
  Popconfirm,
  Card,
  Transfer,
  theme,
  Grid,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons';
import type { TableProps } from 'antd';
import ActionButton from '@/app/tags/components/ActionButton';
import FriendlyTime from '@/components/FriendlyTime';

const { useBreakpoint } = Grid;

interface Role {
  id: number;
  name: string;
  description: string;
  is_builtin: number;
  created_at: string;
}

interface User {
  id: number;
  username: string;
  name: string;
}

interface App {
  id: number;
  name: string;
  description: string;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [assignType, setAssignType] = useState<'users' | 'apps'>('users');
  const [roleUsers, setRoleUsers] = useState<number[]>([]);
  const [roleApps, setRoleApps] = useState<number[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[] | null>(null);
  const [form] = Form.useForm();
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  useEffect(() => {
    fetchRoles();
    fetchUsers();
    fetchApps();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/roles');
      const data = await response.json();
      if (data.success) {
        setRoles(data.data);
      } else {
        message.error('获取角色列表失败');
      }
    } catch {
      message.error('获取角色列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch {
      console.error('Failed to fetch users');
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
      console.error('Failed to fetch apps');
    }
  };

  const fetchRoleData = async (roleId: number, type: 'users' | 'apps') => {
    try {
      const response = await fetch(`/api/roles/${roleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: type === 'users' ? 'getUsers' : 'getApps' }),
      });
      const data = await response.json();
      if (data.success) {
        if (type === 'users') {
          setRoleUsers(data.data);
        } else {
          setRoleApps(data.data);
        }
      }
    } catch {
      message.error(`获取角色${type === 'users' ? '用户' : '应用'}失败`);
    }
  };

  const handleAdd = () => {
    setEditingRole(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    form.setFieldsValue({
      name: role.name,
      description: role.description,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/roles/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        message.success('删除角色成功');
        fetchRoles();
      } else {
        message.error(data.message || '删除角色失败');
      }
    } catch {
      message.error('删除角色失败');
    }
  };

  const handleSubmit = async (values: { name: string; description: string }) => {
    try {
      const url = editingRole ? `/api/roles/${editingRole.id}` : '/api/roles';
      const method = editingRole ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await response.json();
      if (data.success) {
        message.success(editingRole ? '更新角色成功' : '创建角色成功');
        setModalVisible(false);
        fetchRoles();
      } else {
        message.error(data.message || '操作失败');
      }
    } catch {
      message.error('操作失败');
    }
  };

  const handleAssign = async (role: Role, type: 'users' | 'apps') => {
    setSelectedRole(role);
    setAssignType(type);
    setSelectedKeys(null);
    await fetchRoleData(role.id, type);
    setAssignModalVisible(true);
  };

  const handleAssignModalClose = () => {
    setAssignModalVisible(false);
    setSelectedKeys(null);
  };

  const handleAssignChange = (nextTargetKeys: React.Key[]) => {
    setSelectedKeys(nextTargetKeys);
  };

  const handleAssignSubmit = async () => {
    const keys = (selectedKeys ?? (assignType === 'users' ? roleUsers : roleApps)) as number[];
    if (!selectedRole) return;

    try {
      const currentKeys = assignType === 'users' ? roleUsers : roleApps;
      const toAdd = keys.filter(k => !currentKeys.includes(k));
      const toRemove = currentKeys.filter(k => !keys.includes(k));

      for (const id of toAdd) {
        await fetch(`/api/roles/${selectedRole.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: assignType === 'users' ? 'assignUser' : 'assignApp',
            [`${assignType === 'users' ? 'userId' : 'appId'}`]: id,
          }),
        });
      }

      for (const id of toRemove) {
        await fetch(`/api/roles/${selectedRole.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: assignType === 'users' ? 'removeUser' : 'removeApp',
            [`${assignType === 'users' ? 'userId' : 'appId'}`]: id,
          }),
        });
      }

      message.success('分配成功');
      if (assignType === 'users') {
        setRoleUsers(keys);
      } else {
        setRoleApps(keys);
      }
      setSelectedKeys(null);
      setAssignModalVisible(false);
    } catch {
      message.error('分配失败');
    }
  };

  const columns: TableProps<Role>['columns'] = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (text: string) => <FriendlyTime date={text} />,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => {
        const isBuiltin = record.is_builtin === 1;
        return (
          <Space size="small">
            {!isBuiltin && (
              <ActionButton
                icon={<EditOutlined />}
                tooltip="编辑"
                onClick={() => handleEdit(record)}
              />
            )}
            <ActionButton
              icon={<SettingOutlined />}
              tooltip="分配用户"
              onClick={() => handleAssign(record, 'users')}
            />
            <ActionButton
              icon={<SettingOutlined />}
              tooltip="分配应用"
              onClick={() => handleAssign(record, 'apps')}
            />
            {!isBuiltin && (
              <ActionButton
                icon={<DeleteOutlined />}
                tooltip="删除"
                danger
                confirmTitle="确认删除"
                confirmDescription="确定要删除此角色吗？"
                onConfirm={() => handleDelete(record.id)}
              />
            )}
          </Space>
        );
      },
    },
  ];

  const transferDataSource = assignType === 'users'
    ? users.map(u => ({ key: u.id, title: u.name || u.username }))
    : apps.map(a => ({ key: a.id, title: a.name }));

  const transferTargetKeys = selectedKeys !== null
    ? selectedKeys
    : (assignType === 'users' ? roleUsers : roleApps);

  return (
    <div>
      <Card
        title={<span style={{ fontSize: isMobile ? 18 : 24 }}>角色管理</span>}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} size={isMobile ? 'small' : 'middle'}>
            {isMobile ? '添加' : '添加角色'}
          </Button>
        }
        styles={{ body: { padding: isMobile ? 12 : 24 } }}
      >
        <div className="table-responsive">
          <Table
            columns={columns}
            dataSource={roles}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              size: isMobile ? 'small' : undefined,
              showSizeChanger: !isMobile,
              showTotal: isMobile ? undefined : (total) => `共 ${total} 条`,
            }}
            scroll={{ x: isMobile ? 500 : undefined }}
            size={isMobile ? 'small' : 'middle'}
          />
        </div>
      </Card>
      <Modal
        title={editingRole ? '编辑角色' : '添加角色'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="角色名称"
            rules={[{ required: true, message: '请输入角色名称' }]}
          >
            <Input placeholder="请输入角色名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="请输入角色描述" rows={3} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                {editingRole ? '更新' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={`为角色「${selectedRole?.name}」分配${assignType === 'users' ? '用户' : '应用'}`}
        open={assignModalVisible}
        onCancel={handleAssignModalClose}
        footer={(
          <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={handleAssignModalClose}>取消</Button>
            <Button type="primary" onClick={handleAssignSubmit}>
              确定
            </Button>
          </Space>
        )}
        width={600}
      >
        <Transfer
          dataSource={transferDataSource}
          targetKeys={transferTargetKeys}
          onChange={handleAssignChange}
          render={(item) => item.title || ''}
          titles={['可选', '已选']}
          styles={{ section: { width: 260, height: 400 } }}
        />
      </Modal>
    </div>
  );
}
