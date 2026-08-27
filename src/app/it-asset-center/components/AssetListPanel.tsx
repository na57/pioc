'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Card,
  Table,
  Input,
  Button,
  Space,
  App,
  Spin,
  Empty,
  Tag,
  Badge,
  Grid,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import FilterSelect from './FilterSelect';
import type { ITAsset, AssetType, AssetCategory } from '@/lib/services/it-asset-center';
import { ASSET_TYPE_META, CATEGORY_LABELS } from '@/lib/services/it-asset-center';

const { useBreakpoint } = Grid;

const CATEGORY_COLORS: Record<AssetCategory, string> = {
  infrastructure: 'geekblue',
  network: 'cyan',
  data: 'green',
  application: 'purple',
  software: 'magenta',
  operations: 'gold',
  external: 'lime',
  governance: 'volcano',
};

const STATUS_COLORS: Record<string, 'success' | 'default' | 'error' | 'warning' | 'processing'> = {
  active: 'success',
  inactive: 'default',
  faulty: 'error',
  idle: 'warning',
  planning: 'processing',
  unknown: 'default',
};

const STATUS_OPTIONS = [
  { value: 'active', label: '活跃' },
  { value: 'inactive', label: '停用' },
  { value: 'faulty', label: '故障' },
  { value: 'idle', label: '闲置' },
  { value: 'planning', label: '规划中' },
  { value: 'unknown', label: '未知' },
];

const CATEGORY_OPTIONS = [
  ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
];

export interface AssetListPanelFilters {
  keyword?: string;
  system_id?: string;
  asset_type?: string;
  category?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

interface AssetListPanelProps {
  initialFilters?: AssetListPanelFilters;
  showTitle?: boolean;
}

function readFiltersFromUrl(searchParams: URLSearchParams): AssetListPanelFilters {
  return {
    keyword: searchParams.get('keyword') || '',
    system_id: searchParams.get('system_id') || '',
    asset_type: searchParams.get('asset_type') || '',
    category: searchParams.get('category') || '',
    status: searchParams.get('status') || '',
    page: parseInt(searchParams.get('page') || '1', 10),
    pageSize: parseInt(searchParams.get('per_page') || '10', 10),
  };
}

function buildQueryString(filters: AssetListPanelFilters): string {
  const params = new URLSearchParams();
  if (filters.keyword) params.set('keyword', filters.keyword);
  if (filters.system_id) params.set('system_id', filters.system_id);
  if (filters.asset_type) params.set('asset_type', filters.asset_type);
  if (filters.category) params.set('category', filters.category);
  if (filters.status) params.set('status', filters.status);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize && filters.pageSize !== 10) params.set('per_page', String(filters.pageSize));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export default function AssetListPanel({ initialFilters, showTitle = false }: AssetListPanelProps) {
  const { message } = App.useApp();
  // 用 ref 持有 message / router，避免其引用变化导致 useCallback/useEffect 无限重跑
  const messageRef = useRef(message);
  messageRef.current = message;
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const searchParams = useSearchParams();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  // 从URL读取初始筛选条件
  const urlFilters = useMemo(() => readFiltersFromUrl(searchParams), [searchParams]);
  const effectiveInitial = { ...initialFilters, ...urlFilters };

  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<ITAsset[]>([]);
  const [pagination, setPagination] = useState({
    current: effectiveInitial.page || 1,
    pageSize: effectiveInitial.pageSize || 10,
    total: 0,
  });
  const [searchKeyword, setSearchKeyword] = useState(effectiveInitial.keyword || '');
  const [selectedSystemId, setSelectedSystemId] = useState<string>(effectiveInitial.system_id || '');
  const [selectedAssetType, setSelectedAssetType] = useState<string>(effectiveInitial.asset_type || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(effectiveInitial.category || '');
  const [selectedStatus, setSelectedStatus] = useState<string>(effectiveInitial.status || '');
  const [assetTypes, setAssetTypes] = useState<{ type: AssetType; category: AssetCategory; label: string }[]>([]);
  const [systems, setSystems] = useState<{ id: string; name: string }[]>([]);

  const handleUnauthorized = useCallback(() => {
    routerRef.current.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
  }, []);

  const fetchAssetTypes = useCallback(async () => {
    try {
      const response = await fetch('/api/it-asset-center?action=asset-types');
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      const result = await response.json();
      if (result.success) {
        setAssetTypes(result.data.types);
      }
    } catch {
      // 静默失败
    }
  }, [handleUnauthorized]);

  const fetchSystems = useCallback(async () => {
    try {
      const response = await fetch('/api/it-asset-center?action=systems&per_page=1000');
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      const result = await response.json();
      if (result.success) {
        setSystems(result.data.data.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })));
      }
    } catch {
      // 静默失败
    }
  }, [handleUnauthorized]);

  const fetchAssets = useCallback(
    async (page: number, pageSize: number) => {
      setLoading(true);
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
      const url = `/api/it-asset-center?${params.toString()}`;
      try {
        const response = await fetch(url);

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        const result = await response.json();

        if (result.success) {
          setAssets(result.data.data);
          setPagination({
            current: result.data.page,
            pageSize: result.data.per_page,
            total: result.data.total,
          });
        } else {
          console.error('[AssetListPanel] 获取资产列表失败:', {
            url,
            status: response.status,
            error: result.error,
            userMessage: result.userMessage,
          });
          messageRef.current.error(result.error || '获取资产列表失败');
        }
      } catch (err) {
        console.error('[AssetListPanel] 获取资产列表异常:', {
          url,
          error: err,
        });
        messageRef.current.error('获取资产列表失败');
      } finally {
        setLoading(false);
      }
    },
    [searchKeyword, selectedSystemId, selectedAssetType, selectedCategory, selectedStatus]
  );

  // 同步URL - 当筛选条件或分页变化时更新URL
  const syncUrl = useCallback(
    (overrides?: Partial<AssetListPanelFilters>) => {
      const filters: AssetListPanelFilters = {
        keyword: overrides?.keyword ?? searchKeyword,
        system_id: overrides?.system_id ?? selectedSystemId,
        asset_type: overrides?.asset_type ?? selectedAssetType,
        category: overrides?.category ?? selectedCategory,
        status: overrides?.status ?? selectedStatus,
        page: overrides?.page ?? pagination.current,
        pageSize: overrides?.pageSize ?? pagination.pageSize,
      };
      const qs = buildQueryString(filters);
      // 仅当 URL 确实变化时才 router.replace，避免不必要的导航 Promise
      const currentPath = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '';
      if (qs !== currentPath) {
        routerRef.current.replace(`${qs}`, { scroll: false });
      }
    },
    [searchKeyword, selectedSystemId, selectedAssetType, selectedCategory, selectedStatus, pagination]
  );

  useEffect(() => {
    fetchAssetTypes();
    fetchSystems();
  }, [fetchAssetTypes, fetchSystems]);

  useEffect(() => {
    if (selectedAssetType && assetTypes.length > 0) {
      const valid = assetTypes.some(
        (t) =>
          t.type === selectedAssetType &&
          (!selectedCategory || t.category === selectedCategory)
      );
      if (!valid) {
        setSelectedAssetType('');
      }
    }
  }, [selectedCategory, assetTypes, selectedAssetType]);

  useEffect(() => {
    fetchAssets(pagination.current, pagination.pageSize);
  }, [fetchAssets, pagination.current, pagination.pageSize]);

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, current: 1 }));
    syncUrl({ page: 1 });
  };

  const handleReset = () => {
    setSearchKeyword('');
    setSelectedSystemId('');
    setSelectedAssetType('');
    setSelectedCategory('');
    setSelectedStatus('');
    setPagination((prev) => ({ ...prev, current: 1 }));
    syncUrl({
      keyword: '',
      system_id: '',
      asset_type: '',
      category: '',
      status: '',
      page: 1,
    });
  };

  const systemOptions = useMemo(
    () => systems.map((s) => ({ value: s.id, label: s.name })),
    [systems]
  );

  const filteredAssetTypeOptions = useMemo(
    () => [
      ...assetTypes
        .filter((t) => !selectedCategory || t.category === selectedCategory)
        .map((t) => ({ value: t.type, label: t.label })),
    ],
    [assetTypes, selectedCategory]
  );

  const columns = useMemo(
    () => [
      {
        title: '资产名称',
        dataIndex: 'name',
        key: 'name',
        render: (text: string, record: ITAsset) => (
          <Space orientation="horizontal" size={4}>
            <Badge status={STATUS_COLORS[record.status] || 'default'} />
            <Link href={`/it-asset-center/assets/${record.asset_type}/${encodeURIComponent(record.id)}`}>{text}</Link>
          </Space>
        ),
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
        responsive: ['md' as const],
        render: (category: AssetCategory) => (
          <Tag color={CATEGORY_COLORS[category]}>{CATEGORY_LABELS[category]}</Tag>
        ),
      },
    ],
    [systems]
  );

  return (
    <div>
      {showTitle && null}

      <Card style={{ marginBottom: 16 }}>
        <Space orientation={isMobile ? 'vertical' : 'horizontal'} style={{ width: '100%' }} wrap>
          <FilterSelect
            value={selectedSystemId}
            onChange={(value) => {
              setSelectedSystemId(value);
              setPagination((prev) => ({ ...prev, current: 1 }));
              syncUrl({ system_id: value || '', page: 1 });
            }}
            placeholder="所属系统"
            options={systemOptions}
            showSearch
            width={isMobile ? '100%' : 180}
            size={isMobile ? 'small' : 'middle'}
          />
          <FilterSelect
            value={selectedCategory}
            onChange={(value) => {
              setSelectedCategory(value);
              setSelectedAssetType('');
              setPagination((prev) => ({ ...prev, current: 1 }));
              syncUrl({ category: value || '', asset_type: '', page: 1 });
            }}
            placeholder="分层"
            options={CATEGORY_OPTIONS}
            width={isMobile ? '100%' : 140}
            size={isMobile ? 'small' : 'middle'}
          />
          <FilterSelect
            value={selectedAssetType}
            onChange={(value) => {
              setSelectedAssetType(value);
              setPagination((prev) => ({ ...prev, current: 1 }));
              syncUrl({ asset_type: value || '', page: 1 });
            }}
            placeholder="资产类型"
            options={filteredAssetTypeOptions}
            width={isMobile ? '100%' : 160}
            size={isMobile ? 'small' : 'middle'}
          />
          <FilterSelect
            value={selectedStatus}
            onChange={(value) => {
              setSelectedStatus(value);
              setPagination((prev) => ({ ...prev, current: 1 }));
              syncUrl({ status: value || '', page: 1 });
            }}
            placeholder="状态"
            options={STATUS_OPTIONS}
            width={isMobile ? '100%' : 120}
            size={isMobile ? 'small' : 'middle'}
          />
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
                  syncUrl({ page, pageSize: pageSize || 10 });
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
