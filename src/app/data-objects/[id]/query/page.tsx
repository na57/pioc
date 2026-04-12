'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  List,
  Tag,
  Drawer,
  Descriptions,
  Spin,
  Alert,
  Pagination,
  Empty,
  App,
} from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import ActionButton from '@/app/tags/components/ActionButton';
import FriendlyTime from '@/components/FriendlyTime';

interface DataObject {
  id: number;
  name: string;
  display_template: string;
  primary_key: string;
}

interface QueryResult {
  display_template: string;
  primary_key: string;
  list: Record<string, unknown>[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
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

  useEffect(() => {
    fetchDataObject();
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

  const fetchQueryData = async (page: number, size: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/data-objects/${dataObjectId}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page, pageSize: size }),
      });

      const data = await response.json();
      if (data.success) {
        setQueryResult(data.data);
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

  if (!dataObject) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={dataObject.name}
        extra={
          <ActionButton
            icon={<EyeOutlined />}
            tooltip="返回列表"
            onClick={() => router.push('/data-objects')}
          />
        }
      >
        <Alert
          title={`显示模板: ${dataObject.display_template} | 主键字段: ${dataObject.primary_key}`}
          type="info"
          style={{ marginBottom: 16 }}
        />

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
          </div>
        ) : queryResult?.list && queryResult.list.length > 0 ? (
          <>
            <List
              grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 3, xl: 4, xxl: 4 }}
              dataSource={queryResult.list}
              renderItem={(item) => {
                const pkValue = item[dataObject.primary_key];
                return (
                  <List.Item>
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
                  </List.Item>
                );
              }}
            />
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

      <Drawer
        title="数据详情"
        placement="right"
        width={600}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        {selectedRecord && (
          <Descriptions bordered column={1}>
            {Object.entries(selectedRecord)
              .filter(([key]) => !key.startsWith('_'))
              .map(([key, value]) => (
                <Descriptions.Item key={key} label={key}>
                  {typeof value === 'object' ? (
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {JSON.stringify(value, null, 2)}
                    </pre>
                  ) : (
                    String(value)
                  )}
                </Descriptions.Item>
              ))}
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
}
