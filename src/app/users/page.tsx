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
  App,
  Popconfirm,
  Switch,
  Select,
  theme,
  Grid,
  Card,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { TableProps } from 'antd';
import ActionButton from '@/app/tags/components/ActionButton';
import FriendlyTime from '@/components/FriendlyTime';

interface Role {
  id: number;
  name: string;
  description: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  status: number;
  created_at: string;
  roles: { id: number; name: string }[];
}

interface UserFormData {
  username: string;
  email: string;
  password?: string;
  name: string;
  status?: number;
  roleIds?: number[];
}

const { useBreakpoint } = Grid;

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/roles');
      const data = await response.json();
      if (data.success) {
        setRoles(data.data);
      }
    } catch {
      message.error('获取角色列表失败');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
      } else {
        message.error('获取用户列表失败');
      }
    } catch {
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingUser(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      username: user.username,
      email: user.email,
      name: user.name,
      status: user.status,
      roleIds: user.roles?.map(r => r.id) || [],
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        message.success('删除用户成功');
        fetchUsers();
      } else {
        message.error(data.message || '删除用户失败');
      }
    } catch {
      message.error('删除用户失败');
    }
  };

  const handleSubmit = async (values: UserFormData) => {
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      // 转换状态值为 number 类型
      const submitData = {
        ...values,
        status: values.status ? 1 : 0,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();
      if (data.success) {
        message.success(editingUser ? '更新用户成功' : '创建用户成功');
        setModalVisible(false);
        fetchUsers();
      } else {
        message.error(data.message || '操作失败');
      }
    } catch {
      message.error('操作失败');
    }
  };

  const columns: TableProps<User>['columns'] = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '角色',
      dataIndex: 'roles',
      key: 'roles',
      render: (userRoles: { id: number; name: string }[]) => (
        <Space size="small">
          {userRoles?.map((role) => (
            <Tag key={role.id} color="blue">
              {role.name}
            </Tag>
          ))}
        </Space>
      ),
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
      width: 120,
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
          <ActionButton
            icon={<DeleteOutlined />}
            tooltip="删除"
            danger
            confirmTitle="确认删除"
            confirmDescription={`确定要删除用户 "${record.name || record.username}" 吗？`}
            onConfirm={() => handleDelete(record.id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={<span style={{ fontSize: isMobile ? 18 : 24 }}>用户管理</span>}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} size={isMobile ? 'small' : 'middle'}>
            {isMobile ? '添加' : '添加用户'}
          </Button>
        }
        styles={{ body: { padding: isMobile ? 12 : 24 } }}
      >
        <div className="table-responsive">
          <Table
            columns={columns}
            dataSource={users}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              size: isMobile ? 'small' : undefined,
              showSizeChanger: !isMobile,
              showTotal: isMobile ? undefined : (total) => `共 ${total} 条`,
            }}
            scroll={{ x: isMobile ? 800 : undefined }}
            size={isMobile ? 'small' : 'middle'}
          />
        </div>
      </Card>
      <Modal
        title={editingUser ? '编辑用户' : '添加用户'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ status: 1 }}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' },
            ]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: !editingUser, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' },
            ]}
          >
            <Input.Password placeholder={editingUser ? '留空则不修改密码' : '请输入密码'} />
          </Form.Item>
          <Form.Item name="name" label="姓名">
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item name="roleIds" label="角色">
            <Select
              mode="multiple"
              placeholder="请选择角色"
              options={roles.map(role => ({
                label: role.name,
                value: role.id,
              }))}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item name="status" label="状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                {editingUser ? '更新' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
