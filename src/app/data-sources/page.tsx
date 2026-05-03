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
  InputNumber,
  Select,
  App,
  Switch,
  Card,
  Typography,
  Descriptions,
  Tooltip,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  ApiOutlined,
  LinkOutlined,
  CopyOutlined,
  ShareAltOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import Image from 'next/image';
import type { TableProps } from 'antd';
import ActionButton from '@/app/tags/components/ActionButton';

const { Title } = Typography;
const { Option } = Select;

interface DataSource {
  id: string;
  name: string;
  type: 'mysql' | 'mongodb';
  host: string;
  port: number;
  username: string;
  db_name: string;
  description: string;
  status: number;
  created_at: string;
  created_by?: number;
  is_shared?: boolean;
  shared_by?: number;
  shared_by_name?: string;
}

interface DataSourceFormData {
  name: string;
  type: 'mysql' | 'mongodb';
  host: string;
  port: number;
  username: string;
  password: string;
  db_name: string;
  description?: string;
  status?: boolean;
}

// Database icon component
const DbIcon = ({ type }: { type: string }) => {
  const iconSrc = type === 'mongodb' ? '/mongodb.svg' : '/mysql.svg';
  const alt = type === 'mongodb' ? 'MongoDB' : 'MySQL';
  return (
    <Image
      src={iconSrc}
      alt={alt}
      width={20}
      height={20}
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    />
  );
};

export default function DataSourcesPage() {
  const router = useRouter();
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDataSource, setEditingDataSource] = useState<DataSource | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedDataSource, setSelectedDataSource] = useState<DataSource | null>(null);
  const [form] = Form.useForm();
  const { message } = App.useApp();

  useEffect(() => {
    fetchDataSources();
  }, []);

  const fetchDataSources = async () => {
    try {
      const response = await fetch('/api/data-sources');
      const data = await response.json();
      if (data.success) {
        setDataSources(data.data);
      } else if (response.status === 403) {
        message.error('您没有权限访问数据源管理');
      } else {
        message.error('获取数据源列表失败');
      }
    } catch {
      message.error('获取数据源列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingDataSource(null);
    form.resetFields();
    form.setFieldsValue({
      type: 'mysql',
      port: 3306,
      status: true,
    });
    setModalVisible(true);
  };

  const handleEdit = (dataSource: DataSource) => {
    setEditingDataSource(dataSource);
    form.setFieldsValue({
      name: dataSource.name,
      type: dataSource.type,
      host: dataSource.host,
      port: dataSource.port,
      username: dataSource.username,
      db_name: dataSource.db_name,
      description: dataSource.description,
      status: dataSource.status === 1,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/data-sources/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        message.success('删除数据源成功');
        fetchDataSources();
      } else {
        message.error(data.message || '删除数据源失败');
      }
    } catch {
      message.error('删除数据源失败');
    }
  };

  const handleTestConnection = async (id: string) => {
    try {
      const response = await fetch(`/api/data-sources/${id}/test`, { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        message.success(data.message);
      } else {
        message.error(data.message || '连接测试失败');
      }
    } catch {
      message.error('连接测试失败');
    }
  };

  const handleShowDetail = (dataSource: DataSource) => {
    setSelectedDataSource(dataSource);
    setDetailModalVisible(true);
  };

  const handleShare = (id: string) => {
    router.push(`/data-sources/${id}/shares`);
  };

  const handleSubmit = async (values: DataSourceFormData) => {
    try {
      const submitData = {
        ...values,
        status: values.status ? 1 : 0,
      };

      if (editingDataSource) {
        // 编辑模式：如果没有输入密码，则不更新密码
        const updateData = { ...submitData };
        if (!updateData.password) {
          delete (updateData as { password?: string }).password;
        }

        const response = await fetch(`/api/data-sources/${editingDataSource.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });

        const data = await response.json();
        if (data.success) {
          message.success('更新数据源成功');
          setModalVisible(false);
          fetchDataSources();
        } else {
          message.error(data.message || '更新数据源失败');
        }
      } else {
        // 新增模式
        const response = await fetch('/api/data-sources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData),
        });

        const data = await response.json();
        if (data.success) {
          message.success('创建数据源成功');
          setModalVisible(false);
          fetchDataSources();
        } else {
          message.error(data.message || '创建数据源失败');
        }
      }
    } catch {
      message.error('操作失败');
    }
  };

  const handleTypeChange = (value: string) => {
    const defaultPorts: Record<string, number> = {
      mysql: 3306,
      mongodb: 27017,
    };
    form.setFieldsValue({ port: defaultPorts[value] });
  };

  const columns: TableProps<DataSource>['columns'] = [
    {
      title: '数据源名称',
      dataIndex: 'name',
      key: 'name',
      width: 240,
      render: (name: string, record: DataSource) => (
        <Space>
          <Button
            type="link"
            icon={<LinkOutlined />}
            onClick={() => handleShowDetail(record)}
            style={{ padding: 0 }}
          >
            {name}
          </Button>
          {record.is_shared && (
            <Tooltip title={`由 ${record.shared_by_name} 分享`}>
              <Tag color="blue" style={{ fontSize: 12 }}>共享</Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: '主机:端口',
      key: 'host_port',
      width: 180,
      render: (_, record: DataSource) => (
        <span>{record.host}:{record.port}</span>
      ),
    },
    {
      title: '数据库',
      key: 'db_name',
      width: 180,
      render: (_, record: DataSource) => (
        <Space>
          <DbIcon type={record.type} />
          <span>{record.db_name}</span>
        </Space>
      ),
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
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {!record.is_shared ? (
            <>
              <ActionButton
                icon={<ApiOutlined />}
                tooltip="测试连接"
                onClick={() => handleTestConnection(record.id)}
              />
              <ActionButton
                icon={<ShareAltOutlined />}
                tooltip="分享"
                onClick={() => handleShare(record.id)}
              />
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
                confirmDescription="确定要删除此数据源吗？"
                onConfirm={() => handleDelete(record.id)}
              />
            </>
          ) : (
            <>
              <ActionButton
                icon={<EyeOutlined />}
                tooltip="查看详情"
                onClick={() => handleShowDetail(record)}
              />
              <Tag color="default" style={{ fontSize: 12 }}>只读</Tag>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={<Title level={4} style={{ margin: 0 }}>数据源管理</Title>}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增数据源
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={dataSources}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 700 }}
        />
      </Card>

      {/* 新增/编辑数据源弹窗 */}
      <Modal
        title={editingDataSource ? '编辑数据源' : '新增数据源'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ type: 'mysql', port: 3306, status: true }}
        >
          <Form.Item
            name="name"
            label="数据源名称"
            rules={[{ required: true, message: '请输入数据源名称' }]}
          >
            <Input placeholder="请输入数据源名称" />
          </Form.Item>

          <Form.Item
            name="type"
            label="数据源类型"
            rules={[{ required: true, message: '请选择数据源类型' }]}
          >
            <Select placeholder="请选择数据源类型" onChange={handleTypeChange}>
              <Option value="mysql">MySQL</Option>
              <Option value="mongodb">MongoDB</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="host"
            label="主机地址"
            rules={[{ required: true, message: '请输入主机地址' }]}
          >
            <Input placeholder="例如：localhost 或 192.168.1.100" />
          </Form.Item>

          <Form.Item
            name="port"
            label="端口号"
            rules={[{ required: true, message: '请输入端口号' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="请输入端口号"
              min={1}
              max={65535}
            />
          </Form.Item>

          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>

          <Form.Item
            name="password"
            label={editingDataSource ? '密码（留空则不修改）' : '密码'}
            rules={editingDataSource ? [] : [{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>

          <Form.Item
            name="db_name"
            label="数据库名称"
            rules={[{ required: true, message: '请输入数据库名称' }]}
          >
            <Input placeholder="请输入数据库名称" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="请输入数据源描述" rows={3} />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            valuePropName="checked"
          >
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                {editingDataSource ? '更新' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 数据源详情弹窗 */}
      <Modal
        title={
          <Space>
            <span>数据源详情</span>
            {selectedDataSource?.is_shared && (
              <Tag color="blue">由 {selectedDataSource.shared_by_name} 分享</Tag>
            )}
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={600}
      >
        {selectedDataSource && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="ID">
              <Space>
                <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{selectedDataSource.id}</span>
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => {
                    navigator.clipboard.writeText(selectedDataSource.id);
                    message.success('ID 已复制到剪贴板');
                  }}
                />
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="数据源名称">
              {selectedDataSource.name}
            </Descriptions.Item>
            <Descriptions.Item label="数据源类型">
              <Space>
                <DbIcon type={selectedDataSource.type} />
                <span>{selectedDataSource.type === 'mysql' ? 'MySQL' : 'MongoDB'}</span>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="主机地址">
                {selectedDataSource.host}:{selectedDataSource.port}
            </Descriptions.Item>
            <Descriptions.Item label="用户名">
              {selectedDataSource.username}
            </Descriptions.Item>
            <Descriptions.Item label="数据库名称">
              {selectedDataSource.db_name}
            </Descriptions.Item>
            <Descriptions.Item label="描述">
              {selectedDataSource.description || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={selectedDataSource.status === 1 ? 'green' : 'red'}>
                {selectedDataSource.status === 1 ? '启用' : '禁用'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {new Date(selectedDataSource.created_at).toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
              })}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
