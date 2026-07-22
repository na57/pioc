'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Input,
  Select,
  Button,
  Space,
  Typography,
  App,
  Spin,
  Empty,
  Tag,
  Badge,
  Grid,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { ITAsset, AssetType, AssetCategory } from '@/lib/services/it-asset-center';
import { ASSET_TYPE_META, CATEGORY_LABELS } from '@/lib/services/it-asset-center';

const { Title } = Typography;
const { Option } = Select;
const { useBreakpoint } = Grid;

const CATEGORY_COLORS: Record<AssetCategory, string> = {
  infrastructure: 'geekblue',
  network: 'cyan',
  data: 'green',
  application: 'purple',
  software: 'magenta',
  operations: 'gold',
  external: 'lime',
};

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'active', label: '活跃' },
  { value: 'inactive', label: '停用' },
  { value: 'unknown', label: '未知' },
];

export default function AssetListPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const initialKeyword = searchParams.get('keyword') || '';
  const initialSystemId = searchParams.get('system_id') || '';
  const initialAssetType = searchParams.get('asset_type') || '';
  const initialCategory = searchParams.get('category') || '';
  const initialStatus = searchParams.get('status') || '';
  const initialPage = parseInt(searchParams.get('page') || '1', 10);
  const initialPageSize = parseInt(searchParams.get('pageSize') || '10', 10);

  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<ITAsset[]>([]);
  const [pagination, setPagination] = useState({
    current: initialPage,
    pageSize: initialPageSize,
    total: 0,
  });
  const [searchKeyword, setSearchKeyword] = useState(initialKeyword);
  const [selectedSystemId, setSelectedSystemId] = useState<string>(initialSystemId);
  const [selectedAssetType, setSelectedAssetType] = useState<string>(initialAssetType);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatus);
  const [assetTypes, setAssetTypes] = useState<{ type: AssetType; category: AssetCategory; label: string }[]>([]);
  const [systems, setSystems] = useState<{ id: string; name: string }[]>([]);

  const fetchAssetTypes = useCallback(async () => {
    try {
      const response = await fetch('/api/it-asset-center?action=asset-types');
      const result = await response.json();
      if (result.success) {
        setAssetTypes(result.data.types);
      }
    } catch {
      // 静默失败
    }
  }, []);

  const fetchSystems = useCallback(async () => {
    try {
      const response = await fetch('/api/it-asset-center?action=systems&per_page=1000');
      const result = await response.json();
      if (result.success) {
        setSystems(result.data.data.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })));
      }
    } catch {
      // 静默失败
    }
  }, []);

  const fetchAssets = useCallback(
    async (page: number, pageSize: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          action: 'assets',
          page: page.toString(),
          per_page: pageSize.toString(),
        });
        if (searchKeyword) params.append('keyword', searchKeyword);
        if (selectedSystemId) params.append('system_id', selectedSystemId);
        if (selectedAssetType) params.append('asset_type', selectedAssetType);
        if (selectedCategory) params.append('category', selectedCategory);
        if (selectedStatus) params.append('status', selectedStatus);

        const response = await fetch(`/api/it-asset-center?${params.toString()}`);
        const result = await response.json();

        if (result.success) {
          setAssets(result.data.data);
          setPagination({
            current: result.data.page,
            pageSize: result.data.per_page,
            total: result.data.total,
          });
        } else {
          message.error(result.error || '获取资产列表失败');
        }
      } catch {
        message.error('获取资产列表失败');
      } finally {
        setLoading(false);
      }
    },
    [searchKeyword, selectedSystemId, selectedAssetType, selectedCategory, selectedStatus, message]
  );

  useEffect(() => {
    fetchAssetTypes();
    fetchSystems();
  }, [fetchAssetTypes, fetchSystems]);

  useEffect(() => {
    fetchAssets(pagination.current, pagination.pageSize);
  }, [fetchAssets, pagination.current, pagination.pageSize]);

  useEffect(() => {
    const newSearchParams = new URLSearchParams();
    if (searchKeyword) newSearchParams.set('keyword', searchKeyword);
    if (selectedSystemId) newSearchParams.set('system_id', selectedSystemId);
    if (selectedAssetType) newSearchParams.set('asset_type', selectedAssetType);
    if (selectedCategory) newSearchParams.set('category', selectedCategory);
    if (selectedStatus) newSearchParams.set('status', selectedStatus);
    if (pagination.current !== 1) newSearchParams.set('page', pagination.current.toString());
    if (pagination.pageSize !== 10) newSearchParams.set('pageSize', pagination.pageSize.toString());

    const queryString = newSearchParams.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [
    searchKeyword,
    selectedSystemId,
    selectedAssetType,
    selectedCategory,
    selectedStatus,
    pagination.current,
    pagination.pageSize,
    pathname,
    router,
  ]);

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, current: 1 }));
    fetchAssets(1, pagination.pageSize);
  };

  const handleReset = () => {
    setSearchKeyword('');
    setSelectedSystemId('');
    setSelectedAssetType('');
    setSelectedCategory('');
    setSelectedStatus('');
    setPagination((prev) => ({ ...prev, current: 1 }));
    fetchAssets(1, pagination.pageSize);
  };

  const categoryOptions = [
    { value: '', label: '全部分层' },
    ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
  ];

  const columns = [
    {
      title: '资产名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: ITAsset) => (
        <Link href={`/it-asset-center/assets/${record.asset_type}/${record.id}`}>{text}</Link>
      ),
    },
    {
      title: '所属系统',
      dataIndex: 'system_id',
      key: 'system_id',
      width: 180,
      render: (systemId: string) => {
        const system = systems.find((s) => s.id === systemId);
        return system ? (
          <Link href={`/it-asset-center/${systemId}`}>{system.name}</Link>
        ) : (
          systemId
        );
      },
    },
    {
      title: '资产类型',
      dataIndex: 'asset_type',
      key: 'asset_type',
      width: 140,
      render: (type: AssetType) => <Tag>{ASSET_TYPE_META[type]?.label || type}</Tag>,
    },
    {
      title: '分层',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: AssetCategory) => (
        <Tag color={CATEGORY_COLORS[category]}>{CATEGORY_LABELS[category]}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Badge status={status === 'active' ? 'success' : 'default'} text={status === 'active' ? '活跃' : '停用'} />
      ),
    },
  ];

  return (
    <div>
      <Title level={isMobile ? 4 : 2}>资产清单</Title>

      <Card style={{ marginBottom: 16 }}>
        <Space orientation={isMobile ? 'vertical' : 'horizontal'} style={{ width: '100%' }} wrap>
          <Select
            value={selectedSystemId}
            onChange={setSelectedSystemId}
            style={{ width: isMobile ? '100%' : 180 }}
            size={isMobile ? 'small' : 'middle'}
            placeholder="所属系统"
            allowClear
          >
            {systems.map((s) => (
              <Option key={s.id} value={s.id}>
                {s.name}
              </Option>
            ))}
          </Select>
          <Select
            value={selectedCategory}
            onChange={setSelectedCategory}
            style={{ width: isMobile ? '100%' : 140 }}
            size={isMobile ? 'small' : 'middle'}
            placeholder="分层"
            allowClear
          >
            {categoryOptions.map((opt) => (
              <Option key={opt.value} value={opt.value}>
                {opt.label}
              </Option>
            ))}
          </Select>
          <Select
            value={selectedAssetType}
            onChange={setSelectedAssetType}
            style={{ width: isMobile ? '100%' : 160 }}
            size={isMobile ? 'small' : 'middle'}
            placeholder="资产类型"
            allowClear
          >
            {assetTypes.map((t) => (
              <Option key={t.type} value={t.type}>
                {t.label}
              </Option>
            ))}
          </Select>
          <Select
            value={selectedStatus}
            onChange={setSelectedStatus}
            style={{ width: isMobile ? '100%' : 120 }}
            size={isMobile ? 'small' : 'middle'}
            placeholder="状态"
            allowClear
          >
            {STATUS_OPTIONS.map((opt) => (
              <Option key={opt.value} value={opt.value}>
                {opt.label}
              </Option>
            ))}
          </Select>
          <Input
            placeholder="请输入资产名称或编码搜索"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined />}
            allowClear
            size={isMobile ? 'small' : 'middle'}
            style={{ width: isMobile ? '100%' : 240 }}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch} size={isMobile ? 'small' : 'middle'}>
            查询
          </Button>
          <Button onClick={handleReset} size={isMobile ? 'small' : 'middle'}>
            重置
          </Button>
        </Space>
      </Card>

      <Card styles={{ body: { padding: isMobile ? 0 : 24 } }}>
        <Spin spinning={loading} description="加载中...">
          <div className="table-responsive" style={{ margin: isMobile ? '-12px 0' : 0 }}>
            <Table
              columns={columns}
              dataSource={assets}
              rowKey="id"
              loading={loading}
              size={isMobile ? 'small' : 'middle'}
              scroll={{ x: isMobile ? 500 : undefined }}
              pagination={{
                ...pagination,
                size: isMobile ? 'small' : undefined,
                showSizeChanger: !isMobile,
                showQuickJumper: !isMobile,
                showTotal: isMobile ? undefined : (total) => `共 ${total} 个资产`,
                onChange: (page, pageSize) => {
                  setPagination((prev) => ({ ...prev, current: page, pageSize: pageSize || 10 }));
                  fetchAssets(page, pageSize || 10);
                },
              }}
              locale={{ emptyText: <Empty description="暂无资产" /> }}
            />
          </div>
        </Spin>
      </Card>
    </div>
  );
}
