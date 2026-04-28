'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Button,
  Space,
  Tag,
  Typography,
  App,
  Spin,
  Empty,
  Table,
} from 'antd';
import {
  PlusOutlined,
  ArrowLeftOutlined,
  FileOutlined,
  DashboardOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useParams, useRouter } from 'next/navigation';
import type { ColumnsType } from 'antd/es/table';
import CreateSheetModal from './components/CreateSheetModal';

const { Title, Text } = Typography;

interface SmartSheetDetail {
  id: number;
  app_id: number;
  docid: string;
  name: string;
  description: string | null;
  status: number;
  sheets_json: string | null;
  created_at: string;
}

interface SheetItem {
  sheet_id: string;
  name: string;
  type: string;
}

export default function SheetManagementPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const params = useParams();
  const appId = parseInt(params.id as string, 10);
  const sheetId = parseInt(params.sheetId as string, 10);

  const [smartSheet, setSmartSheet] = useState<SmartSheetDetail | null>(null);
  const [sheets, setSheets] = useState<SheetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchSmartSheet = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/wecom-apps/${appId}/smart-sheets/${sheetId}`);
      const data = await response.json();
      if (data.success) {
        setSmartSheet(data.data);
        // 解析工作表列表
        if (data.data.sheets_json) {
          try {
            const parsedSheets: SheetItem[] = JSON.parse(data.data.sheets_json);
            setSheets(parsedSheets);
          } catch {
            setSheets([]);
          }
        }
      } else {
        message.error(data.message || '获取智能表格信息失败');
      }
    } catch {
      message.error('获取智能表格信息失败');
    } finally {
      setLoading(false);
    }
  }, [appId, sheetId, message]);

  useEffect(() => {
    fetchSmartSheet();
  }, [fetchSmartSheet]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'dashboard':
        return <DashboardOutlined style={{ color: '#faad14' }} />;
      case 'external':
        return <FileTextOutlined style={{ color: '#52c41a' }} />;
      case 'smartsheet':
      default:
        return <FileOutlined style={{ color: '#1890ff' }} />;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'dashboard':
        return '仪表盘';
      case 'external':
        return '说明页';
      case 'smartsheet':
      default:
        return '智能表';
    }
  };

  const columns: ColumnsType<SheetItem> = [
    {
      title: '工作表名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: SheetItem) => (
        <Space>
          {getTypeIcon(record.type)}
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => (
        <Tag color={type === 'smartsheet' ? 'blue' : type === 'dashboard' ? 'orange' : 'green'}>
          {getTypeText(type)}
        </Tag>
      ),
    },
    {
      title: 'Sheet ID',
      dataIndex: 'sheet_id',
      key: 'sheet_id',
      width: 200,
      render: (text: string) => <Text code style={{ fontSize: 12 }}>{text}</Text>,
    },
  ];

  const handleModalSubmit = async (values: { title: string }) => {
    if (!smartSheet?.docid) {
      message.error('智能表格信息不完整');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/wecom-apps/${appId}/smart-sheets/${sheetId}/sheets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docid: smartSheet.docid,
          title: values.title,
        }),
      });

      const data = await response.json();

      if (data.success) {
        message.success('工作表创建成功');
        setModalVisible(false);
        fetchSmartSheet();
      } else {
        message.error(data.message || '创建工作表失败');
      }
    } catch {
      message.error('创建工作表失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push(`/wecom-apps/${appId}/smart-sheets`)}>
          返回
        </Button>
        <Title level={2} style={{ margin: 0 }}>
          {smartSheet?.name || '智能表格'} - 工作表管理
        </Title>
      </div>

      {/* 操作栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
            新建工作表
          </Button>
        </Space>
      </Card>

      {/* 工作表列表 */}
      <Spin spinning={loading}>
        {sheets.length === 0 && !loading ? (
          <Empty description="暂无工作表" style={{ marginTop: 64 }} />
        ) : (
          <Table
            columns={columns}
            dataSource={sheets}
            rowKey="sheet_id"
            pagination={false}
          />
        )}
      </Spin>

      {/* 新建工作表弹窗 */}
      <CreateSheetModal
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onSubmit={handleModalSubmit}
        submitting={submitting}
      />
    </div>
  );
}
