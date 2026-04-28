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
  WechatOutlined,
} from '@ant-design/icons';
import WecomAccountModal from './components/WecomAccountModal';
import ActionButton from '@/app/tags/components/ActionButton';
import FriendlyTime from '@/components/FriendlyTime';

const { Title, Text } = Typography;
const { Option } = Select;

interface WecomAccountItem {
  id: number;
  name: string;
  corp_id: string;
  corp_secret: string | null;
  description: string | null;
  status: number;
  created_at: string;
}

interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export default function WecomAccountsPage() {
  const { message } = App.useApp();
  const [accounts, setAccounts] = useState<WecomAccountItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState({
    name: '',
    corp_id: '',
    status: undefined as number | undefined,
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('新建账号');
  const [editingAccount, setEditingAccount] = useState<WecomAccountItem | null>(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });
      if (filters.name) params.append('name', filters.name);
      if (filters.corp_id) params.append('corp_id', filters.corp_id);
      if (filters.status !== undefined) params.append('status', filters.status.toString());

      const response = await fetch(`/api/wecom-accounts?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setAccounts(data.data.list);
        setPagination(prev => ({ ...prev, total: data.data.pagination.total }));
      } else {
        message.error(data.message || '获取账号列表失败');
      }
    } catch {
      message.error('获取账号列表失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, filters, message]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleDeleteAccount = async (id: number) => {
    try {
      const response = await fetch(`/api/wecom-accounts/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        message.success('账号删除成功');
        fetchAccounts();
      } else {
        message.error(data.message || '删除账号失败');
      }
    } catch {
      message.error('删除账号失败');
    }
  };

  const handleAddAccount = () => {
    setEditingAccount(null);
    setModalTitle('新建账号');
    setModalVisible(true);
  };

  const handleEditAccount = (account: WecomAccountItem) => {
    setEditingAccount(account);
    setModalTitle('编辑账号');
    setModalVisible(true);
  };

  const handleModalSuccess = () => {
    setModalVisible(false);
    fetchAccounts();
  };

  const handlePageChange = (page: number, pageSize?: number) => {
    setPagination(prev => ({ ...prev, page, pageSize: pageSize || prev.pageSize }));
  };

  return (
    <div>
      <Title level={2}>
        <WechatOutlined /> 企微账号管理
      </Title>

      {/* 筛选栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="搜索账号名称"
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
            placeholder="搜索CorpId"
            value={filters.corp_id}
            onChange={e => {
              setFilters(prev => ({ ...prev, corp_id: e.target.value }));
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
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddAccount}>
            新建账号
          </Button>
        </Space>
      </Card>

      {/* 账号卡片列表 */}
      <Spin spinning={loading}>
        {accounts.length === 0 && !loading ? (
          <Empty description="暂无企微账号" style={{ marginTop: 64 }} />
        ) : (
          <>
            <Row gutter={[16, 16]}>
              {accounts.map(account => (
                <Col key={account.id} xs={24} sm={24} md={12} lg={12} xl={12}>
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
                            background: 'linear-gradient(135deg, #07c160 0%, #05a050 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <WechatOutlined style={{ fontSize: 32, color: '#fff' }} />
                        </div>
                      </div>

                      {/* 中间内容 */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <Text strong style={{ fontSize: 16 }}>{account.name}</Text>
                          <Tag color={account.status === 1 ? 'success' : 'default'}>
                            {account.status === 1 ? '启用' : '禁用'}
                          </Tag>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <Text code style={{ fontSize: 12 }}>{account.corp_id}</Text>
                          {account.description && (
                            <Text type="secondary" style={{ fontSize: 13 }} ellipsis>
                              {account.description}
                            </Text>
                          )}
                        </div>
                      </div>

                      {/* 右侧操作和时间 */}
                      <div style={{ flexShrink: 0, textAlign: 'right' }}>
                        <Space size="small" style={{ marginBottom: 8 }}>
                          <ActionButton
                            icon={<EditOutlined />}
                            tooltip="编辑"
                            onClick={() => handleEditAccount(account)}
                          />
                          <ActionButton
                            icon={<DeleteOutlined />}
                            tooltip="删除"
                            danger
                            confirmTitle="确认删除"
                            confirmDescription={`确定要删除账号 "${account.name}" 吗？`}
                            onConfirm={() => handleDeleteAccount(account.id)}
                          />
                        </Space>
                        <div>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            <FriendlyTime date={account.created_at} />
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

      {/* 账号弹窗 */}
      <WecomAccountModal
        title={modalTitle}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onSuccess={handleModalSuccess}
        initialValues={editingAccount}
      />
    </div>
  );
}
