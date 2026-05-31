'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  Tag,
  Drawer,
  Descriptions,
  Spin,
  Alert,
  Pagination,
  Empty,
  App,
  Row,
  Col,
  Input,
  Button,
  Space,
  Tooltip,
  Badge,
  Tabs,
} from 'antd';
import {
  EyeOutlined,
  SearchOutlined,
  DownloadOutlined,
  FilterOutlined,
  ClearOutlined,
  RobotOutlined,
  FileTextOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import ActionButton from '@/app/tags/components/ActionButton';
import FriendlyTime from '@/components/FriendlyTime';
import AIChatPanel from '@/app/data-objects/components/AIChatPanel';
import SchemaEditor from '@/app/data-objects/components/SchemaEditor';

interface DataObject {
  id: number;
  name: string;
  display_template: string;
  primary_key: string;
  created_by: number;
}

interface QueryResult {
  display_template: string;
  primary_key: string;
  list: Record<string, unknown>[];
  fieldComments?: { name: string; comment: string }[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

interface FilterConfig {
  field: string;
  label: string;
  value: string;
}

export default function DataObjectQueryPage() {
  const params = useParams();
  const router = useRouter();
  const { message } = App.useApp();
  const dataObjectId = params.id as string;

  const [dataObject, setDataObject] = useState<DataObject | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<Record<string, unknown> | null>(null);
  const [fieldCommentsMap, setFieldCommentsMap] = useState<Record<string, string>>({});
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // 筛选状态
  const [filters, setFilters] = useState<FilterConfig[]>([]);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [filterVisible, setFilterVisible] = useState(false);

  // 导出状态
  const [exporting, setExporting] = useState(false);

  // 获取当前用户
  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      if (data.success && data.data) {
        setCurrentUserId(data.data.userId);
      }
    } catch (error) {
      console.error('获取当前用户失败:', error);
    }
  };

  useEffect(() => {
    fetchDataObject();
    fetchCurrentUser();
  }, [dataObjectId]);

  useEffect(() => {
    if (dataObject) {
      fetchQueryData(currentPage, pageSize);
    }
  }, [dataObject, currentPage, pageSize]);

  const fetchDataObject = async () => {
    try {
      const response = await fetch(`/api/data-objects/${dataObjectId}`);
      const data = await response.json();
      if (data.success) {
        setDataObject(data.data);
      } else {
        message.error('获取数据对象信息失败');
      }
    } catch {
      message.error('获取数据对象信息失败');
    }
  };

  const fetchQueryData = async (page: number, size: number, currentFilters?: Record<string, string>) => {
    setLoading(true);
    try {
      const filterData = currentFilters || activeFilters;
      const response = await fetch(`/api/data-objects/${dataObjectId}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page,
          pageSize: size,
          filters: filterData,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setQueryResult(data.data);
        // 保存字段注释映射
        if (data.data.fieldComments) {
          const commentsMap: Record<string, string> = {};
          data.data.fieldComments.forEach((field: { name: string; comment: string }) => {
            commentsMap[field.name] = field.comment;
          });
          setFieldCommentsMap(commentsMap);

          // 初始化筛选配置（仅在第一次获取数据时）
          if (filters.length === 0) {
            const initialFilters = data.data.fieldComments
              .filter((field: { name: string }) => !field.name.startsWith('_'))
              .map((field: { name: string; comment: string }) => ({
                field: field.name,
                label: field.comment || field.name,
                value: '',
              }));
            setFilters(initialFilters);
          }
        }
      } else {
        message.error(data.message || '查询失败');
      }
    } catch {
      message.error('查询失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
  };

  const handleShowDetail = (record: Record<string, unknown>) => {
    setSelectedRecord(record);
    setDrawerVisible(true);
  };

  const renderDisplayContent = (record: Record<string, unknown>) => {
    if (!dataObject) return '';

    let display = dataObject.display_template;
    Object.keys(record).forEach((key) => {
      display = display.replace(new RegExp(`{{${key}}}`, 'g'), String(record[key] ?? ''));
    });
    return display;
  };

  // 处理筛选变化
  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) =>
      prev.map((f) => (f.field === field ? { ...f, value } : f))
    );
  };

  // 应用筛选
  const applyFilters = () => {
    const newActiveFilters: Record<string, string> = {};
    filters.forEach((f) => {
      if (f.value.trim()) {
        newActiveFilters[f.field] = f.value.trim();
      }
    });
    setActiveFilters(newActiveFilters);
    setCurrentPage(1);
    fetchQueryData(1, pageSize, newActiveFilters);
  };

  // 清除筛选
  const clearFilters = () => {
    setFilters((prev) => prev.map((f) => ({ ...f, value: '' })));
    setActiveFilters({});
    setCurrentPage(1);
    fetchQueryData(1, pageSize, {});
  };

  // 获取激活的筛选数量
  const getActiveFilterCount = () => {
    return Object.keys(activeFilters).length;
  };

  // 导出数据
  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await fetch(`/api/data-objects/${dataObjectId}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          export: true,
          filters: activeFilters,
        }),
      });

      const data = await response.json();
      if (data.success) {
        const list = data.data.list as Record<string, unknown>[];
        const fieldComments = data.data.fieldComments as { name: string; comment: string }[] || [];

        if (list.length === 0) {
          message.warning('没有数据可导出');
          return;
        }

        // 构建CSV内容
        const headers = Object.keys(list[0]).filter((key) => !key.startsWith('_'));
        const headerLabels = headers.map((h) => {
          const comment = fieldComments.find((f) => f.name === h);
          return comment ? `${comment.comment}(${h})` : h;
        });

        const csvContent = [
          // BOM for UTF-8
          '\uFEFF' + headerLabels.join(','),
          ...list.map((row) =>
            headers
              .map((header) => {
                const value = row[header];
                const cellValue = value === null || value === undefined ? '' : String(value);
                // 处理包含逗号、换行符或双引号的单元格
                if (cellValue.includes(',') || cellValue.includes('\n') || cellValue.includes('"')) {
                  return `"${cellValue.replace(/"/g, '""')}"`;
                }
                return cellValue;
              })
              .join(',')
          ),
        ].join('\n');

        // 创建下载链接
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `${dataObject?.name || '数据导出'}_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        message.success(`成功导出 ${list.length} 条数据`);
      } else {
        message.error(data.message || '导出失败');
      }
    } catch {
      message.error('导出失败');
    } finally {
      setExporting(false);
    }
  };

  if (!dataObject) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  const isCreator = currentUserId !== null && Number(currentUserId) === Number(dataObject.created_by);

  const items = [
    {
      key: 'data',
      label: (
        <Space>
          <DatabaseOutlined />
          <span>数据查询</span>
        </Space>
      ),
      children: (
        <Card
          title={dataObject.name}
          extra={
            <Space>
              <Tooltip title="筛选">
                <Badge count={getActiveFilterCount()} size="small">
                  <Button
                    icon={<FilterOutlined />}
                    onClick={() => setFilterVisible(!filterVisible)}
                    type={filterVisible ? 'primary' : 'default'}
                  />
                </Badge>
              </Tooltip>
              <Button
                icon={<DownloadOutlined />}
                loading={exporting}
                onClick={handleExport}
              >
                导出
              </Button>
              <ActionButton
                icon={<EyeOutlined />}
                tooltip="返回列表"
                onClick={() => router.push('/data-objects')}
              />
            </Space>
          }
        >
          <Alert
            title={`显示模板: ${dataObject.display_template} | 主键字段: ${dataObject.primary_key}`}
            type="info"
            style={{ marginBottom: 16 }}
          />

          {/* 筛选区域 */}
          {filterVisible && (
            <Card
              size="small"
              title={
                <Space>
                  <FilterOutlined />
                  <span>数据筛选</span>
                  {getActiveFilterCount() > 0 && (
                    <Tag color="blue">{getActiveFilterCount()} 个条件</Tag>
                  )}
                </Space>
              }
              extra={
                <Space>
                  <Button
                    icon={<ClearOutlined />}
                    size="small"
                    onClick={clearFilters}
                    disabled={getActiveFilterCount() === 0}
                  >
                    清除
                  </Button>
                  <Button
                    icon={<SearchOutlined />}
                    type="primary"
                    size="small"
                    onClick={applyFilters}
                  >
                    查询
                  </Button>
                </Space>
              }
              style={{ marginBottom: 16 }}
            >
              <Row gutter={[16, 16]}>
                {filters.map((filter) => (
                  <Col key={filter.field} xs={24} sm={12} md={8} lg={6} xl={6}>
                    <Input
                      placeholder={`筛选: ${filter.label}`}
                      value={filter.value}
                      onChange={(e) => handleFilterChange(filter.field, e.target.value)}
                      onPressEnter={applyFilters}
                      allowClear
                      prefix={<SearchOutlined />}
                    />
                  </Col>
                ))}
              </Row>
            </Card>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin size="large" />
            </div>
          ) : queryResult?.list && queryResult.list.length > 0 ? (
            <>
              <Row gutter={[16, 16]}>
                {queryResult.list.map((item, index) => {
                  const pkValue = item[dataObject.primary_key];
                  return (
                    <Col key={index} xs={24} sm={12} md={8} lg={8} xl={6} xxl={6}>
                      <Card
                        size="small"
                        hoverable
                        onClick={() => handleShowDetail(item)}
                        title={
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Tag color="blue">ID: {String(pkValue)}</Tag>
                          </div>
                        }
                      >
                        <div style={{ fontSize: 14, color: '#333' }}>
                          {renderDisplayContent(item)}
                        </div>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
              <div style={{ marginTop: 24, textAlign: 'right' }}>
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={queryResult.pagination.total}
                  onChange={handlePageChange}
                  showSizeChanger
                  showTotal={(total) => `共 ${total} 条`}
                />
              </div>
            </>
          ) : (
            <Empty description="暂无数据" />
          )}
        </Card>
      ),
    },
    {
      key: 'ai-chat',
      label: (
        <Space>
          <RobotOutlined />
          <span>AI 问答</span>
        </Space>
      ),
      children: (
        <AIChatPanel
          dataObjectId={dataObject.id}
          dataObjectName={dataObject.name}
        />
      ),
    },
    {
      key: 'schema',
      label: (
        <Space>
          <FileTextOutlined />
          <span>Schema 管理</span>
        </Space>
      ),
      children: (
        <SchemaEditor
          dataObjectId={dataObject.id}
          dataObjectName={dataObject.name}
          isCreator={isCreator}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Tabs
        items={items}
      />

      <Drawer
        title="数据详情"
        placement="right"
        size="large"
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        {selectedRecord && (
          <Descriptions bordered column={1}>
            {Object.entries(selectedRecord)
              .filter(([key]) => !key.startsWith('_'))
              .map(([key, value]) => {
                // 获取字段标签：如果有注释则显示 注释(字段名)，否则只显示字段名
                const comment = fieldCommentsMap[key];
                const label = comment ? `${comment}(${key})` : key;
                return (
                  <Descriptions.Item key={key} label={label}>
                    {typeof value === 'object' ? (
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    ) : (
                      String(value)
                    )}
                  </Descriptions.Item>
                );
              })}
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
}
