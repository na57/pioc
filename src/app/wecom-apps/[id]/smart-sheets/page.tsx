'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Button,
  Input,
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
  DeleteOutlined,
  TableOutlined,
  ArrowLeftOutlined,
  FileOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useParams, useRouter } from 'next/navigation';
import SmartSheetModal from './components/SmartSheetModal';
import ActionButton from '@/app/tags/components/ActionButton';
import FriendlyTime from '@/components/FriendlyTime';

const { Title, Text } = Typography;

interface WecomApp {
  id: number;
  name: string;
  account_name?: string;
}

interface SmartSheetItem {
  id: number;
  app_id: number;
  docid: string;
  name: string;
  url: string | null;
  description: string | null;
  sheets_json: string | null;
  status: number;
  created_at: string;
}

interface SheetInfo {
  sheet_id: string;
  name: string;
  type: string;
}

interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export default function SmartSheetsPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const params = useParams();
  const appId = parseInt(params.id as string, 10);

  const [app, setApp] = useState<WecomApp | null>(null);
  const [sheets, setSheets] = useState<SmartSheetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState({
    name: '',
    docid: '',
    status: undefined as number | undefined,
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('添加表格');
  const [activeTab, setActiveTab] = useState('existing');
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchApp = useCallback(async () => {
    try {
      const response = await fetch(`/api/wecom-apps/${appId}`);
      const data = await response.json();
      if (data.success) {
        setApp(data.data);
      }
    } catch (error) {
      console.error('获取应用信息失败:', error);
    }
  }, [appId]);

  const fetchSheets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });
      if (filters.name) params.append('name', filters.name);
      if (filters.docid) params.append('docid', filters.docid);
      if (filters.status !== undefined) params.append('status', filters.status.toString());

      const response = await fetch(`/api/wecom-apps/${appId}/smart-sheets?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setSheets(data.data.list);
        setPagination(prev => ({ ...prev, total: data.data.pagination.total }));
      } else {
        message.error(data.message || '获取智能表格列表失败');
      }
    } catch {
      message.error('获取智能表格列表失败');
    } finally {
      setLoading(false);
    }
  }, [appId, pagination.page, pagination.pageSize, filters, message]);

  useEffect(() => {
    fetchApp();
  }, [fetchApp]);

  useEffect(() => {
    fetchSheets();
  }, [fetchSheets]);

  const handleDeleteSheet = async (id: number) => {
    try {
      const response = await fetch(`/api/wecom-apps/${appId}/smart-sheets/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        message.success('智能表格删除成功');
        fetchSheets();
      } else {
        message.error(data.message || '删除智能表格失败');
      }
    } catch {
      message.error('删除智能表格失败');
    }
  };

  const handleAddSheet = (type: 'existing' | 'create') => {
    setActiveTab(type);
    setModalTitle(type === 'existing' ? '添加现有表格' : '创建新表格');
    setModalVisible(true);
  };

  const handleModalSubmit = async (values: { docid?: string; doc_name?: string; admin_users?: string[]; create_new?: boolean }) => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/wecom-apps/${appId}/smart-sheets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (data.success) {
        message.success(values.create_new ? '智能表格创建成功' : '表格添加成功');
        setModalVisible(false);
        fetchSheets();
      } else {
        message.error(data.message || '添加失败');
      }
    } catch {
      message.error('操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSyncSheet = async (sheet: SmartSheetItem) => {
    setSyncingId(sheet.id);
    try {
      const response = await fetch(`/api/wecom-apps/${appId}/smart-sheets/${sheet.id}`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        message.success('表格信息已同步');
        fetchSheets();
      } else {
        message.error(data.message || '同步失败');
      }
    } catch {
      message.error('同步表格信息失败');
    } finally {
      setSyncingId(null);
    }
  };

  const handlePageChange = (page: number, pageSize?: number) => {
    setPagination(prev => ({ ...prev, page, pageSize: pageSize || prev.pageSize }));
  };

  const getSheetCount = (sheet: SmartSheetItem): number => {
    if (!sheet.sheets_json) return 0;
    try {
      const sheets: SheetInfo[] = JSON.parse(sheet.sheets_json);
      return sheets.length;
    } catch {
      return 0;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/wecom-apps')}>
          返回
        </Button>
        <Title level={2} style={{ margin: 0 }}>
          <TableOutlined /> {app?.name || '应用'} - 智能表格管理
        </Title>
      </div>

      {/* 筛选栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="搜索表格名称"
            value={filters.name}
            onChange={e => {
              setFilters(prev => ({ ...prev, name: e.target.value }));
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
            allowClear
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAddSheet('existing')}>
            添加现有表格
          </Button>
          <Button icon={<PlusOutlined />} onClick={() => handleAddSheet('create')}>
            创建新表格
          </Button>
        </Space>
      </Card>

      {/* 智能表格卡片列表 */}
      <Spin spinning={loading}>
        {sheets.length === 0 && !loading ? (
          <Empty description="暂无智能表格" style={{ marginTop: 64 }} />
        ) : (
          <>
            <Row gutter={[16, 16]}>
              {sheets.map(sheet => (
                <Col key={sheet.id} xs={24} sm={24} md={12} lg={12} xl={12}>
                  <Card
                    hoverable
                    size="small"
                    styles={{ body: { padding: 16 } }}
                    onClick={() => router.push(`/wecom-apps/${appId}/smart-sheets/${sheet.id}/sheets`)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      {/* 左侧图标 */}
                      <div style={{ flexShrink: 0 }}>
                        <div
                          style={{
                            width: 64,
                            height: 64,
                            borderRadius: 12,
                            background: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <TableOutlined style={{ fontSize: 32, color: '#fff' }} />
                        </div>
                      </div>

                      {/* 中间内容 */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <Text strong style={{ fontSize: 16 }}>{sheet.name}</Text>
                          <Tag color={sheet.status === 1 ? 'success' : 'default'}>
                            {sheet.status === 1 ? '启用' : '禁用'}
                          </Tag>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <Text type="secondary" style={{ fontSize: 13 }}>
                            <FileOutlined /> {getSheetCount(sheet)} 个工作表
                          </Text>
                          {sheet.description && (
                            <Text type="secondary" style={{ fontSize: 13 }} ellipsis>
                              {sheet.description}
                            </Text>
                          )}
                        </div>
                      </div>

                      {/* 右侧操作和时间 */}
                      <div style={{ flexShrink: 0, textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <Space size="small" style={{ marginBottom: 8 }}>
                          <ActionButton
                            icon={<ReloadOutlined spin={syncingId === sheet.id} />}
                            tooltip="同步信息"
                            onClick={() => handleSyncSheet(sheet)}
                          />
                          <ActionButton
                            icon={<DeleteOutlined />}
                            tooltip="删除"
                            danger
                            confirmTitle="确认删除"
                            confirmDescription={`确定要删除表格 "${sheet.name}" 吗？`}
                            onConfirm={() => handleDeleteSheet(sheet.id)}
                          />
                        </Space>
                        <div>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            <FriendlyTime date={sheet.created_at} />
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

      {/* 智能表格弹窗 */}
      <SmartSheetModal
        title={modalTitle}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onSubmit={handleModalSubmit}
        type={activeTab as 'existing' | 'create'}
        submitting={submitting}
      />
    </div>
  );
}
