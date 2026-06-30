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
  Select,
  App,
  Popconfirm,
  Card,
  Typography,
  Tooltip,
  Descriptions,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  KeyOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import type { TableProps } from 'antd';
import { copyToClipboard } from '@/lib/utils/clipboard';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface KeyPair {
  id: string;
  name: string;
  type: 'RSA' | 'ECC' | 'EdDSA';
  key_size?: number;
  curve?: string;
  public_key: string;
  private_key: string;
  description?: string;
  user_id: number;
  created_at: string;
  updated_at: string;
}

interface KeyFormData {
  name: string;
  type: 'RSA' | 'ECC' | 'EdDSA';
  key_size?: number;
  curve?: string;
  description?: string;
}

const keyTypeOptions = [
  { value: 'RSA', label: 'RSA', description: 'RSA非对称加密算法' },
  { value: 'ECC', label: 'ECC', description: '椭圆曲线加密算法' },
  { value: 'EdDSA', label: 'EdDSA', description: 'Edwards曲线数字签名算法' },
];

const rsaKeySizes = [1024, 2048, 3072, 4096];
const eccCurves = ['secp256k1', 'secp256r1', 'secp384r1', 'secp521r1'];
const eddsaCurves = ['ed25519', 'ed448'];

export default function KeyManagementPage() {
  const [keys, setKeys] = useState<KeyPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editingKey, setEditingKey] = useState<KeyPair | null>(null);
  const [viewingKey, setViewingKey] = useState<KeyPair | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [form] = Form.useForm();
  const { message } = App.useApp();

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const response = await fetch('/api/keys');
      const data = await response.json();
      if (data.success) {
        setKeys(data.data);
      } else if (response.status === 403) {
        message.error('您没有权限访问密钥管理');
      } else {
        message.error('获取密钥列表失败');
      }
    } catch {
      message.error('获取密钥列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingKey(null);
    form.resetFields();
    form.setFieldsValue({
      type: 'RSA',
      key_size: 2048,
    });
    setModalVisible(true);
  };

  const handleEdit = (key: KeyPair) => {
    setEditingKey(key);
    form.setFieldsValue({
      name: key.name,
      description: key.description,
    });
    setModalVisible(true);
  };

  const handleView = (key: KeyPair) => {
    setViewingKey(key);
    setShowPrivateKey(false);
    setViewModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/keys/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        message.success('删除密钥成功');
        fetchKeys();
      } else {
        message.error(data.message || '删除密钥失败');
      }
    } catch {
      message.error('删除密钥失败');
    }
  };

  const handleSubmit = async (values: KeyFormData) => {
    try {
      if (editingKey) {
        // 编辑模式：只更新名称和描述
        const response = await fetch(`/api/keys/${editingKey.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: values.name,
            description: values.description,
          }),
        });

        const data = await response.json();
        if (data.success) {
          message.success('更新密钥成功');
          setModalVisible(false);
          fetchKeys();
        } else {
          message.error(data.message || '更新密钥失败');
        }
      } else {
        // 新增模式
        const response = await fetch('/api/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });

        const data = await response.json();
        if (data.success) {
          message.success('创建密钥成功');
          setModalVisible(false);
          fetchKeys();
        } else {
          message.error(data.message || '创建密钥失败');
        }
      }
    } catch {
      message.error('操作失败');
    }
  };

  const handleTypeChange = (value: 'RSA' | 'ECC' | 'EdDSA') => {
    if (value === 'RSA') {
      form.setFieldsValue({ key_size: 2048, curve: undefined });
    } else if (value === 'ECC') {
      form.setFieldsValue({ curve: 'secp256k1', key_size: undefined });
    } else if (value === 'EdDSA') {
      form.setFieldsValue({ curve: 'ed25519', key_size: undefined });
    }
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await copyToClipboard(text);
      message.success(`${label}已复制到剪贴板`);
    } catch {
      message.error('复制失败');
    }
  };

  const getKeyTypeTag = (type: string) => {
    const colors: Record<string, string> = {
      RSA: 'blue',
      ECC: 'green',
      EdDSA: 'purple',
    };
    return <Tag color={colors[type] || 'default'}>{type}</Tag>;
  };

  const columns: TableProps<KeyPair>['columns'] = [
    {
      title: '密钥名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string, record: KeyPair) => (
        <Space>
          <KeyOutlined />
          <Button type="link" onClick={() => handleView(record)} style={{ padding: 0 }}>
            {name}
          </Button>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => getKeyTypeTag(type),
    },
    {
      title: '密钥规格',
      key: 'spec',
      width: 120,
      render: (_, record: KeyPair) => {
        if (record.type === 'RSA') {
          return `${record.key_size} bit`;
        } else {
          return record.curve;
        }
      },
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (text: string) => {
        const date = new Date(text);
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
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除此密钥？"
            description="删除后无法恢复，请谨慎操作！"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={<Title level={4} style={{ margin: 0 }}>密钥管理</Title>}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增密钥
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={keys}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 800 }}
        />
      </Card>

      {/* 创建/编辑密钥模态框 */}
      <Modal
        title={editingKey ? '编辑密钥' : '新增密钥'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ type: 'RSA', key_size: 2048 }}
        >
          <Form.Item
            name="name"
            label="密钥名称"
            rules={[{ required: true, message: '请输入密钥名称' }]}
          >
            <Input placeholder="请输入密钥名称" />
          </Form.Item>

          {!editingKey && (
            <>
              <Form.Item
                name="type"
                label="密钥类型"
                rules={[{ required: true, message: '请选择密钥类型' }]}
              >
                <Select placeholder="请选择密钥类型" onChange={handleTypeChange}>
                  {keyTypeOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      <Tooltip title={option.description}>
                        <span>{option.label}</span>
                      </Tooltip>
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) => prevValues.type !== currentValues.type}
              >
                {({ getFieldValue }) => {
                  const type = getFieldValue('type');
                  if (type === 'RSA') {
                    return (
                      <Form.Item
                        name="key_size"
                        label="密钥长度"
                        rules={[{ required: true, message: '请选择密钥长度' }]}
                      >
                        <Select placeholder="请选择密钥长度">
                          {rsaKeySizes.map(size => (
                            <Option key={size} value={size}>{size} bit</Option>
                          ))}
                        </Select>
                      </Form.Item>
                    );
                  } else if (type === 'ECC') {
                    return (
                      <Form.Item
                        name="curve"
                        label="椭圆曲线"
                        rules={[{ required: true, message: '请选择椭圆曲线' }]}
                      >
                        <Select placeholder="请选择椭圆曲线">
                          {eccCurves.map(curve => (
                            <Option key={curve} value={curve}>{curve}</Option>
                          ))}
                        </Select>
                      </Form.Item>
                    );
                  } else if (type === 'EdDSA') {
                    return (
                      <Form.Item
                        name="curve"
                        label="Edwards曲线"
                        rules={[{ required: true, message: '请选择Edwards曲线' }]}
                      >
                        <Select placeholder="请选择Edwards曲线">
                          {eddsaCurves.map(curve => (
                            <Option key={curve} value={curve}>{curve}</Option>
                          ))}
                        </Select>
                      </Form.Item>
                    );
                  }
                  return null;
                }}
              </Form.Item>
            </>
          )}

          <Form.Item name="description" label="描述">
            <TextArea placeholder="请输入密钥描述" rows={3} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                {editingKey ? '更新' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 查看密钥详情模态框 */}
      <Modal
        title="密钥详情"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={
          <Button onClick={() => setViewModalVisible(false)}>关闭</Button>
        }
        width={800}
      >
        {viewingKey && (
          <>
            <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="密钥名称">{viewingKey.name}</Descriptions.Item>
              <Descriptions.Item label="密钥类型">{getKeyTypeTag(viewingKey.type)}</Descriptions.Item>
              <Descriptions.Item label="密钥规格">
                {viewingKey.type === 'RSA' ? `${viewingKey.key_size} bit` : viewingKey.curve}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {new Date(new Date(viewingKey.created_at).getTime() + 8 * 60 * 60 * 1000).toLocaleString('zh-CN')}
              </Descriptions.Item>
              <Descriptions.Item label="描述" span={2}>
                {viewingKey.description || '-'}
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text strong>公钥</Text>
                <Button
                  type="link"
                  icon={<CopyOutlined />}
                  onClick={() => handleCopy(viewingKey.public_key, '公钥')}
                >
                  复制
                </Button>
              </div>
              <TextArea
                value={viewingKey.public_key}
                readOnly
                rows={4}
                style={{ fontFamily: 'monospace', fontSize: 12 }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text strong>私钥</Text>
                <Space>
                  <Button
                    type="link"
                    icon={showPrivateKey ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                  >
                    {showPrivateKey ? '隐藏' : '显示'}
                  </Button>
                  {showPrivateKey && (
                    <Button
                      type="link"
                      icon={<CopyOutlined />}
                      onClick={() => handleCopy(viewingKey.private_key, '私钥')}
                    >
                      复制
                    </Button>
                  )}
                </Space>
              </div>
              <TextArea
                value={showPrivateKey ? viewingKey.private_key : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                readOnly
                rows={6}
                style={{ fontFamily: 'monospace', fontSize: 12 }}
              />
              {!showPrivateKey && (
                <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                  点击&quot;显示&quot;按钮查看私钥内容（请妥善保管，不要泄露）
                </Text>
              )}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
