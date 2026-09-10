'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  App,
  Row,
  Col,
  Spin,
  Empty,
  Pagination,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  TableOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import WecomAppModal from './components/WecomAppModal';
import ActionButton from '@/app/tags/components/ActionButton';
import FriendlyTime from '@/components/FriendlyTime';

const { Text } = Typography;
const { Option } = Select;

interface WecomAccount {
  id: number;
  name: string;
}

interface WecomAppItem {
  id: number;
  account_id: number;
  account_name?: string;
  name: string;
  agent_id: string;
  secret: string | null;
  description: string | null;
  status: number;
  created_at: string;
}

interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export default function WecomAppsPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const [apps, setApps] = useState<WecomAppItem[]>([]);
  const [accounts, setAccounts] = useState<WecomAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState({
    account_id: undefined as number | undefined,
    name: '',
    agent_id: '',
    status: undefined as number | undefined,
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('新建应用');
  const [editingApp, setEditingApp] = useState<WecomAppItem | null>(null);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });
      if (filters.account_id) params.append('account_id', filters.account_id.toString());
      if (filters.name) params.append('name', filters.name);
      if (filters.agent_id) params.append('agent_id', filters.agent_id);
      if (filters.status !== undefined) params.append('status', filters.status.toString());

      const response = await fetch(`/api/wecom-apps?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setApps(data.data.list);
        setPagination(prev => ({ ...prev, total: data.data.pagination.total }));
      } else {
        message.error(data.message || '获取应用列表失败');
      }
    } catch {
      message.error('获取应用列表失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, filters, message]);

  const fetchAccounts = useCallback(async () => {
    try {
      const response = await fetch('/api/wecom-accounts?all=true');
      const data = await response.json();
      if (data.success) {
        setAccounts(data.data.list);
      }
    } catch (error) {
      console.error('获取账号列表失败:', error);
    }
  }, []);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleDeleteApp = async (id: number) => {
    try {
      const response = await fetch(`/api/wecom-apps/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        message.success('应用删除成功');
        fetchApps();
      } else {
        message.error(data.message || '删除应用失败');
      }
    } catch {
      message.error('删除应用失败');
    }
  };

  const handleAddApp = () => {
    setEditingApp(null);
    setModalTitle('新建应用');
    setModalVisible(true);
  };

  const handleEditApp = (app: WecomAppItem) => {
    setEditingApp(app);
    setModalTitle('编辑应用');
    setModalVisible(true);
  };

  const handleModalSuccess = () => {
    setModalVisible(false);
    fetchApps();
  };

  const handlePageChange = (page: number, pageSize?: number) => {
    setPagination(prev => ({ ...prev, page, pageSize: pageSize || prev.pageSize }));
  };

  return (
    <div>
      {/* 筛选栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            placeholder="所属账号"
            value={filters.account_id}
            onChange={value => {
              setFilters(prev => ({ ...prev, account_id: value }));
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            style={{ width: 200 }}
            allowClear
          >
            {accounts.map(account => (
              <Option key={account.id} value={account.id}>
                {account.name}
              </Option>
            ))}
          </Select>
          <Input
            placeholder="搜索应用名称"
            value={filters.name}
            onChange={e => {
              setFilters(prev => ({ ...prev, name: e.target.value }));
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
            allowClear
          />
          <Input
            placeholder="搜索AgentId"
            value={filters.agent_id}
            onChange={e => {
              setFilters(prev => ({ ...prev, agent_id: e.target.value }));
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
            allowClear
          />
          <Select
            placeholder="状态"
            value={filters.status}
            onChange={value => {
              setFilters(prev => ({ ...prev, status: value }));
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            style={{ width: 100 }}
            allowClear
          >
            <Option value={1}>启用</Option>
            <Option value={0}>禁用</Option>
          </Select>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddApp}>
            新建应用
          </Button>
        </Space>
      </Card>

      {/* 应用卡片列表 */}
      <Spin spinning={loading}>
        {apps.length === 0 && !loading ? (
          <Empty description="暂无企微应用" style={{ marginTop: 64 }} />
        ) : (
          <>
            <Row gutter={[16, 16]}>
              {apps.map(app => (
                <Col key={app.id} xs={24} sm={24} md={12} lg={12} xl={12}>
                  <Card
                    hoverable
                    size="small"
                    styles={{ body: { padding: 16 } }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      {/* 左侧图标 */}
                      <div style={{ flexShrink: 0 }}>
                        <div
                          style={{
                            width: 64,
                            height: 64,
                            borderRadius: 12,
                            background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <AppstoreOutlined style={{ fontSize: 32, color: '#fff' }} />
                        </div>
                      </div>

                      {/* 中间内容 */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <Text strong style={{ fontSize: 16 }}>{app.name}</Text>
                          <Tag color={app.status === 1 ? 'success' : 'default'}>
                            {app.status === 1 ? '启用' : '禁用'}
                          </Tag>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {app.account_name && (
                            <Text type="secondary" style={{ fontSize: 13 }}>
                              {app.account_name}
                            </Text>
                          )}
                          <Text code style={{ fontSize: 12 }}>{app.agent_id}</Text>
                          {app.description && (
                            <Text type="secondary" style={{ fontSize: 13 }} ellipsis>
                              {app.description}
                            </Text>
                          )}
                        </div>
                      </div>

                      {/* 右侧操作和时间 */}
                      <div style={{ flexShrink: 0, textAlign: 'right' }}>
                        <Space size="small" style={{ marginBottom: 8 }}>
                          <ActionButton
                            icon={<TableOutlined />}
                            tooltip="管理表格"
                            onClick={() => router.push(`/wecom-apps/${app.id}/smart-sheets`)}
                          />
                          <ActionButton
                            icon={<EditOutlined />}
                            tooltip="编辑"
                            onClick={() => handleEditApp(app)}
                          />
                          <ActionButton
                            icon={<DeleteOutlined />}
                            tooltip="删除"
                            danger
                            confirmTitle="确认删除"
                            confirmDescription={`确定要删除应用 "${app.name}" 吗？`}
                            onConfirm={() => handleDeleteApp(app.id)}
                          />
                        </Space>
                        <div>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            <FriendlyTime date={app.created_at} />
                          </Text>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>

            {/* 分页 */}
            {pagination.total > 0 && (
              <div style={{ marginTop: 24, textAlign: 'center' }}>
                <Pagination
                  current={pagination.page}
                  pageSize={pagination.pageSize}
                  total={pagination.total}
                  showSizeChanger
                  showTotal={total => `共 ${total} 条`}
                  onChange={handlePageChange}
                  pageSizeOptions={['10', '20', '30', '50']}
                />
              </div>
            )}
          </>
        )}
      </Spin>

      {/* 应用弹窗 */}
      <WecomAppModal
        title={modalTitle}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onSuccess={handleModalSuccess}
        initialValues={editingApp}
      />
    </div>
  );
}
