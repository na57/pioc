'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Card,
  Table,
  Input,
  Button,
  Space,
  Typography,
  App,
  Spin,
  Empty,
  Grid,
  Badge,
  Tag,
  Row,
  Col,
  Tabs,
} from 'antd';
import { SearchOutlined, DatabaseOutlined, AppstoreOutlined, RobotOutlined, BarChartOutlined, ApartmentOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import FriendlyTime from '@/components/FriendlyTime';
import AssetStatCard from './components/AssetStatCard';
import FilterSelect from './components/FilterSelect';
import AssetListPanel from './components/AssetListPanel';
import ResourceGraph from './components/ResourceGraph';
import ActionButton from '@/app/tags/components/ActionButton';
import { AIChatPanel } from '@/components/ai-chat';
import type { InformationSystem, AssetCategory } from '@/lib/services/it-asset-center';
import { CATEGORY_LABELS } from '@/lib/services/it-asset-center';

const { Title } = Typography;
const { useBreakpoint } = Grid;

const STATUS_OPTIONS = [
  { value: 'active', label: '活跃' },
  { value: 'inactive', label: '停用' },
  { value: 'planning', label: '规划中' },
];

const STATUS_COLORS: Record<string, string> = {
  active: 'success',
  inactive: 'default',
  planning: 'processing',
};

export default function ItAssetCenterPage() {
  const { message } = App.useApp();
  // 用 ref 持有 message，避免其引用变化导致 useCallback/useEffect 无限重跑
  // （React Compiler 下 App.useApp() 返回的 message 引用可能不稳定）
  const messageRef = useRef(message);
  messageRef.current = message;
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const initialKeyword = searchParams.get('keyword') || '';
  const initialStatus = searchParams.get('status') || '';
  const initialDepartment = searchParams.get('department') || '';
  const initialParent = searchParams.get('parent') || '';
  const initialPage = parseInt(searchParams.get('page') || '1', 10);
  const initialPageSize = parseInt(searchParams.get('pageSize') || '10', 10);

  const [loading, setLoading] = useState(false);
  const [systems, setSystems] = useState<InformationSystem[]>([]);
  const [pagination, setPagination] = useState({
    current: initialPage,
    pageSize: initialPageSize,
    total: 0,
  });
  const [searchKeyword, setSearchKeyword] = useState(initialKeyword);
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatus);
  const [selectedDepartment, setSelectedDepartment] = useState<string>(initialDepartment);
  const [departments, setDepartments] = useState<string[]>([]);
  const [departmentLoading, setDepartmentLoading] = useState(false);
  const [selectedParent, setSelectedParent] = useState<string>(initialParent);
  const [parents, setParents] = useState<{ id: string; name: string }[]>([]);
  const [parentLoading, setParentLoading] = useState(false);
  const initialTab = searchParams.get('tab');
  const hasAssetFilters =
    searchParams.get('asset_type') || searchParams.get('category') || searchParams.get('system_id');
  const [activeTab, setActiveTab] = useState<string>(
    initialTab || (hasAssetFilters ? 'assets' : 'management')
  );
  // 资源图谱聚焦系统：从系统列表"查看图谱"跳转时设置
  const [graphFocusSystem, setGraphFocusSystem] = useState<{
    id: string;
    name: string;
    status?: string;
  } | null>(null);
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;
  // 跳转到资源图谱并聚焦指定系统
  const handleViewGraph = useCallback(
    (record: InformationSystem) => {
      setGraphFocusSystem({ id: record.id, name: record.name, status: record.status });
      setActiveTab('graph');
      const newParams = new URLSearchParams(searchParamsRef.current.toString());
      newParams.set('tab', 'graph');
      routerRef.current.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
    },
    [pathname]
  );
  const [categoryStats, setCategoryStats] = useState<Record<AssetCategory, number>>({
    infrastructure: 0,
    network: 0,
    data: 0,
    application: 0,
    software: 0,
    operations: 0,
    external: 0,
    governance: 0,
  });
  const [categoryRunningStats, setCategoryRunningStats] = useState<Record<AssetCategory, number>>({
    infrastructure: 0,
    network: 0,
    data: 0,
    application: 0,
    software: 0,
    operations: 0,
    external: 0,
    governance: 0,
  });
  const [totalRunningSystemsCount, setTotalRunningSystemsCount] = useState(0);

  const fetchSystems = useCallback(
    async (page: number, pageSize: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          action: 'systems',
          page: page.toString(),
          per_page: pageSize.toString(),
        });
        if (searchKeyword) params.append('keyword', searchKeyword);
        if (selectedStatus) params.append('status', selectedStatus);
        if (selectedDepartment) params.append('department', selectedDepartment);
        if (selectedParent) params.append('parent', selectedParent);

        const response = await fetch(`/api/it-asset-center?${params.toString()}`);
        const result = await response.json();

        if (result.success) {
          setSystems(result.data.data);
          setPagination({
            current: result.data.page,
            pageSize: result.data.per_page,
            total: result.data.total,
          });
        } else {
          messageRef.current.error(result.error || '获取信息系统列表失败');
        }
      } catch {
        messageRef.current.error('获取信息系统列表失败');
      } finally {
        setLoading(false);
      }
    },
    [searchKeyword, selectedStatus, selectedDepartment, selectedParent]
  );

  const fetchCategoryStats = useCallback(async () => {
    try {
      const response = await fetch('/api/it-asset-center?action=assets&per_page=10000');
      const result = await response.json();
      if (result.success) {
        const stats: Record<AssetCategory, number> = {
          infrastructure: 0,
          network: 0,
          data: 0,
          application: 0,
          software: 0,
          operations: 0,
          external: 0,
          governance: 0,
        };
        const runningStats: Record<AssetCategory, number> = {
          infrastructure: 0,
          network: 0,
          data: 0,
          application: 0,
          software: 0,
          operations: 0,
          external: 0,
          governance: 0,
        };
        result.data.data.forEach((asset: { category: AssetCategory; status: string }) => {
          stats[asset.category] = (stats[asset.category] || 0) + 1;
          if (asset.status === 'active') {
            runningStats[asset.category] = (runningStats[asset.category] || 0) + 1;
          }
        });
        setCategoryStats(stats);
        setCategoryRunningStats(runningStats);
      }
    } catch {
      // 静默失败
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    setDepartmentLoading(true);
    try {
      const response = await fetch('/api/it-asset-center?action=departments');
      const result = await response.json();
      if (result.success) {
        setDepartments(result.data.departments || []);
      }
    } catch {
      // 静默失败
    } finally {
      setDepartmentLoading(false);
    }
  }, []);

  const fetchParents = useCallback(async () => {
    setParentLoading(true);
    try {
      const response = await fetch('/api/it-asset-center?action=systems&per_page=1000');
      const result = await response.json();
      if (result.success) {
        const seen = new Set<string>();
        const parentOptions: { id: string; name: string }[] = [];
        result.data.data.forEach((system: InformationSystem) => {
          // 去重：同一上级系统可能被多个系统引用
          if (system.parent_id && system.parent_name && !seen.has(system.parent_id)) {
            seen.add(system.parent_id);
            parentOptions.push({ id: system.parent_id, name: system.parent_name });
          }
        });
        setParents(parentOptions);
      }
    } catch {
      // 静默失败
    } finally {
      setParentLoading(false);
    }
  }, []);

  const fetchTotalRunningSystemsCount = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        action: 'systems',
        page: '1',
        per_page: '1000',
      });
      const response = await fetch(`/api/it-asset-center?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        setTotalRunningSystemsCount(result.data.data.filter((s: InformationSystem) => s.status === 'active').length);
      }
    } catch {
      // 静默失败
    }
  }, []);

  // 挂载时只执行一次的静态数据加载（部门、上级系统、分类统计、运行中系统计数）
  useEffect(() => {
    fetchCategoryStats();
    fetchDepartments();
    fetchParents();
    fetchTotalRunningSystemsCount();
  }, [fetchCategoryStats, fetchDepartments, fetchParents, fetchTotalRunningSystemsCount]);

  // 系统列表随筛选条件变化重新加载（不再连带触发上面四个请求）
  useEffect(() => {
    fetchSystems(pagination.current, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchSystems]);

  // 将筛选状态同步到 URL（仅当 URL 确实变化时才 router.replace，避免不必要的导航 Promise）
  useEffect(() => {
    const newSearchParams = new URLSearchParams(searchParamsRef.current.toString());
    if (searchKeyword) newSearchParams.set('keyword', searchKeyword);
    else newSearchParams.delete('keyword');
    if (selectedStatus) newSearchParams.set('status', selectedStatus);
    else newSearchParams.delete('status');
    if (selectedDepartment) newSearchParams.set('department', selectedDepartment);
    else newSearchParams.delete('department');
    if (selectedParent) newSearchParams.set('parent', selectedParent);
    else newSearchParams.delete('parent');
    if (pagination.current !== 1) newSearchParams.set('page', pagination.current.toString());
    else newSearchParams.delete('page');
    if (pagination.pageSize !== 10) newSearchParams.set('pageSize', pagination.pageSize.toString());
    else newSearchParams.delete('pageSize');

    const queryString = newSearchParams.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    // 避免与当前 URL 相同时仍触发导航（每次导航会在 Turbopack dev 下创建大量 Promise）
    const currentPath = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '';
    if (newUrl !== currentPath) {
      routerRef.current.replace(newUrl, { scroll: false });
    }
  }, [
    searchKeyword,
    selectedStatus,
    selectedDepartment,
    selectedParent,
    pagination.current,
    pagination.pageSize,
    pathname,
  ]);

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, current: 1 }));
    fetchSystems(1, pagination.pageSize);
  };

  const handleReset = () => {
    setSearchKeyword('');
    setSelectedStatus('');
    setSelectedDepartment('');
    setSelectedParent('');
    setPagination((prev) => ({ ...prev, current: 1 }));
    fetchSystems(1, pagination.pageSize);
  };

  const columns = useMemo(
    () => [
      {
        title: '系统名称',
        dataIndex: 'name',
        key: 'name',
        render: (text: string, record: InformationSystem) => (
          <Space orientation="horizontal" size={4}>
            <Badge status={STATUS_COLORS[record.status] as any} />
            <Link href={`/it-asset-center/${record.id}`}>{text}</Link>
          </Space>
        ),
      },
      {
        title: '所属部门',
        dataIndex: 'owner_department',
        key: 'owner_department',
        width: 180,
        ellipsis: true,
        responsive: ['md' as const],
      },
      {
        title: '上级系统',
        dataIndex: 'parent_name',
        key: 'parent_name',
        width: 160,
        ellipsis: true,
        responsive: ['md' as const],
        render: (text: string, record: InformationSystem) =>
          text ? (
            <Link href={`/it-asset-center/${record.parent_id}`}>{text}</Link>
          ) : (
            '-'
          ),
      },
      {
        title: '负责人',
        dataIndex: 'owner',
        key: 'owner',
        width: isMobile ? 100 : 120,
        responsive: ['md' as const],
      },
      {
        title: '更新时间',
        dataIndex: 'updated_at',
        key: 'updated_at',
        width: 150,
        responsive: ['md' as const],
        render: (text: string) => <FriendlyTime date={text} />,
      },
      {
        title: '操作',
        key: 'actions',
        width: 90,
        render: (_: unknown, record: InformationSystem) => (
          <ActionButton
            icon={<ApartmentOutlined />}
            tooltip="查看图谱"
            onClick={() => handleViewGraph(record)}
          />
        ),
      },
    ],
    [isMobile, handleViewGraph]
  );

  const categoryOrder: AssetCategory[] = ['infrastructure', 'network', 'data', 'application', 'software', 'operations', 'external', 'governance'];

  // AI问答初始建议
  const aiInitialSuggestions = [
    '有多少个信息系统？',
    '运行中的系统有多少个？',
    '核心系统有哪些？',
    '统计所有域名资产',
    '查询DNS记录',
    '各部门有多少系统？',
  ];

  // 数据统计面板
  const statsPanel = (
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      <Col xs={12} sm={12} md={8} lg={4}>
        <AssetStatCard
          title="信息系统"
          value={totalRunningSystemsCount}
          total={pagination.total}
          icon={<AppstoreOutlined />}
          color="#52c41a"
          onClick={() => {
            setActiveTab('management');
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.delete('tab');
            router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
          }}
        />
      </Col>
      {categoryOrder.map((category) => (
        <Col xs={12} sm={12} md={8} lg={4} key={category}>
          <AssetStatCard
            title={CATEGORY_LABELS[category]}
            value={categoryRunningStats[category] || 0}
            total={categoryStats[category] || 0}
            icon={<DatabaseOutlined />}
            color="#52c41a"
            onClick={() => {
              setActiveTab('assets');
              const newParams = new URLSearchParams(searchParams.toString());
              newParams.set('tab', 'assets');
              newParams.set('category', category);
              router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
            }}
          />
        </Col>
      ))}
    </Row>
  );

  // 信息系统面板
  const managementPanel = (
    <>
      <Card style={{ marginBottom: 16 }}>
        <Space orientation={isMobile ? 'vertical' : 'horizontal'} style={{ width: '100%' }}>
          <FilterSelect
            value={selectedStatus}
            onChange={setSelectedStatus}
            placeholder="全部状态"
            options={STATUS_OPTIONS}
            width={isMobile ? '100%' : 120}
            size={isMobile ? 'small' : 'middle'}
          />
          <FilterSelect
            value={selectedDepartment}
            onChange={(value) => {
              setSelectedDepartment(value);
              setPagination((prev) => ({ ...prev, current: 1 }));
            }}
            placeholder="全部部门"
            options={departments.map((dept) => ({ label: dept, value: dept }))}
            loading={departmentLoading}
            showSearch
            width={isMobile ? '100%' : 180}
            size={isMobile ? 'small' : 'middle'}
          />
          <FilterSelect
            value={selectedParent}
            onChange={(value) => {
              setSelectedParent(value);
              setPagination((prev) => ({ ...prev, current: 1 }));
            }}
            placeholder="全部上级系统"
            options={parents.map((p) => ({ label: p.name, value: p.id }))}
            loading={parentLoading}
            showSearch
            width={isMobile ? '100%' : 180}
            size={isMobile ? 'small' : 'middle'}
          />
          <Input
            placeholder="请输入系统名称、部门或负责人搜索"
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
              dataSource={systems}
              rowKey="id"
              loading={loading}
              size={isMobile ? 'small' : 'middle'}
              scroll={{ x: isMobile ? 400 : undefined }}
              pagination={{
                ...pagination,
                size: isMobile ? 'small' : undefined,
                showSizeChanger: !isMobile,
                showQuickJumper: !isMobile,
                showTotal: isMobile ? undefined : (total) => `共 ${total} 个系统`,
                onChange: (page, pageSize) => {
                  setPagination((prev) => ({ ...prev, current: page, pageSize: pageSize || 10 }));
                  fetchSystems(page, pageSize || 10);
                },
              }}
              locale={{ emptyText: <Empty description="暂无信息系统" /> }}
            />
          </div>
        </Spin>
      </Card>
    </>
  );

  // AI问答面板
  const aiChatPanel = (
    <AIChatPanel
      apiEndpoint="/api/it-asset-center/ai/query"
      title="IT资产AI智能问答"
      description="我是IT资产中心AI智能问答助手，可以帮您查询信息系统、域名资产、DNS记录等相关信息"
      initialSuggestions={aiInitialSuggestions}
      storageKey="it_asset_center_ai_chat"
      enableTypingEffect={true}
      enableMarkdown={true}
      enableThinkCollapse={true}
      enableEntityConfirm={false}
      enableLocalStorage={true}
      enableChart={true}
      chartConfig={{
        height: 300,
        showSummary: true,
      }}
    />
  );

  return (
    <div>
      <Title level={isMobile ? 4 : 2}>IT 资产中心</Title>

      <Tabs
        defaultActiveKey="management"
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key);
          const newParams = new URLSearchParams(searchParams.toString());
          if (key === 'assets' || key === 'graph') {
            newParams.set('tab', key);
          } else {
            newParams.delete('tab');
          }
          router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
        }}
        items={[
          {
            key: 'management',
            label: '信息系统',
            children: managementPanel,
          },
          {
            key: 'stats',
            label: (
              <span>
                <BarChartOutlined style={{ marginRight: 4 }} />
                数据统计
              </span>
            ),
            children: statsPanel,
          },
          {
            key: 'assets',
            label: (
              <span>
                <DatabaseOutlined style={{ marginRight: 4 }} />
                资产清单
              </span>
            ),
            children: (
              <AssetListPanel
                key="assets-panel"
                initialFilters={{
                  keyword: searchParams.get('keyword') || undefined,
                  system_id: searchParams.get('system_id') || undefined,
                  asset_type: searchParams.get('asset_type') || undefined,
                  category: searchParams.get('category') || undefined,
                  status: searchParams.get('status') || undefined,
                  page: parseInt(searchParams.get('page') || '1', 10),
                  pageSize: parseInt(searchParams.get('pageSize') || '10', 10),
                }}
              />
            ),
          },
          {
            key: 'ai-chat',
            label: (
              <span>
                <RobotOutlined style={{ marginRight: 4 }} />
                AI智能问答
              </span>
            ),
            children: aiChatPanel,
          },
          {
            key: 'graph',
            label: (
              <span>
                <ApartmentOutlined style={{ marginRight: 4 }} />
                资源图谱
              </span>
            ),
            children: <ResourceGraph focusSystem={graphFocusSystem} />,
          },
        ]}
      />
    </div>
  );
}
