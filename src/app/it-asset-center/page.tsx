'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Grid,
  Badge,
  Tag,
  Row,
  Col,
  Statistic,
} from 'antd';
import { SearchOutlined, DatabaseOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import FriendlyTime from '@/components/FriendlyTime';
import type { InformationSystem, AssetCategory } from '@/lib/services/it-asset-center';
import { CATEGORY_LABELS } from '@/lib/services/it-asset-center';

const { Title } = Typography;
const { Option } = Select;
const { useBreakpoint } = Grid;

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'running', label: '运行中' },
  { value: 'stopped', label: '已停止' },
  { value: 'deprecated', label: '已下线' },
  { value: 'planning', label: '规划中' },
];

const LEVEL_OPTIONS = [
  { value: '', label: '全部等级' },
  { value: 'core', label: '核心' },
  { value: 'important', label: '重要' },
  { value: 'general', label: '一般' },
];

const STATUS_COLORS: Record<string, string> = {
  running: 'success',
  stopped: 'default',
  deprecated: 'error',
  planning: 'processing',
};

const LEVEL_COLORS: Record<string, string> = {
  core: 'red',
  important: 'orange',
  general: 'blue',
};

export default function ItAssetCenterPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const initialKeyword = searchParams.get('keyword') || '';
  const initialStatus = searchParams.get('status') || '';
  const initialLevel = searchParams.get('level') || '';
  const initialDepartment = searchParams.get('department') || '';
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
  const [selectedLevel, setSelectedLevel] = useState<string>(initialLevel);
  const [selectedDepartment, setSelectedDepartment] = useState<string>(initialDepartment);
  const [departments, setDepartments] = useState<string[]>([]);
  const [departmentLoading, setDepartmentLoading] = useState(false);
  const [categoryStats, setCategoryStats] = useState<Record<AssetCategory, number>>({
    infrastructure: 0,
    network: 0,
    data: 0,
    application: 0,
    software: 0,
    operations: 0,
    external: 0,
  });

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
        if (selectedLevel) params.append('level', selectedLevel);
        if (selectedDepartment) params.append('department', selectedDepartment);

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
          message.error(result.error || '获取信息系统列表失败');
        }
      } catch {
        message.error('获取信息系统列表失败');
      } finally {
        setLoading(false);
      }
    },
    [searchKeyword, selectedStatus, selectedLevel, selectedDepartment, message]
  );

  const fetchCategoryStats = useCallback(async () => {
    try {
      const response = await fetch('/api/it-asset-center?action=assets&per_page=1000');
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
        };
        result.data.data.forEach((asset: { category: AssetCategory }) => {
          stats[asset.category] = (stats[asset.category] || 0) + 1;
        });
        setCategoryStats(stats);
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

  useEffect(() => {
    fetchSystems(pagination.current, pagination.pageSize);
    fetchCategoryStats();
    fetchDepartments();
  }, [fetchSystems, fetchCategoryStats, fetchDepartments]);

  useEffect(() => {
    const newSearchParams = new URLSearchParams();
    if (searchKeyword) newSearchParams.set('keyword', searchKeyword);
    if (selectedStatus) newSearchParams.set('status', selectedStatus);
    if (selectedLevel) newSearchParams.set('level', selectedLevel);
    if (selectedDepartment) newSearchParams.set('department', selectedDepartment);
    if (pagination.current !== 1) newSearchParams.set('page', pagination.current.toString());
    if (pagination.pageSize !== 10) newSearchParams.set('pageSize', pagination.pageSize.toString());

    const queryString = newSearchParams.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [searchKeyword, selectedStatus, selectedLevel, selectedDepartment, pagination.current, pagination.pageSize, pathname, router]);

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, current: 1 }));
    fetchSystems(1, pagination.pageSize);
  };

  const handleReset = () => {
    setSearchKeyword('');
    setSelectedStatus('');
    setSelectedLevel('');
    setSelectedDepartment('');
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
          <Link href={`/it-asset-center/${record.id}`}>{text}</Link>
        ),
      },
      {
        title: '所属部门',
        dataIndex: 'owner_department',
        key: 'owner_department',
        width: isMobile ? 120 : 180,
        ellipsis: true,
      },
      {
        title: '等级',
        dataIndex: 'level',
        key: 'level',
        width: 100,
        render: (level: string) =>
          level ? <Tag color={LEVEL_COLORS[level]}>{LEVEL_OPTIONS.find((o) => o.value === level)?.label}</Tag> : '-',
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (status: string) => (
          <Badge status={STATUS_COLORS[status] as any} text={STATUS_OPTIONS.find((o) => o.value === status)?.label} />
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
    ],
    [isMobile]
  );

  const categoryOrder: AssetCategory[] = ['infrastructure', 'network', 'data', 'application', 'software', 'operations', 'external'];

  return (
    <div>
      <Title level={isMobile ? 4 : 2}>IT 资产中心</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {categoryOrder.map((category) => (
          <Col xs={12} sm={12} md={8} lg={4} key={category}>
            <Card
              size="small"
              hoverable
              onClick={() => router.push(`/it-asset-center/assets?category=${category}`)}
              style={{ cursor: 'pointer' }}
            >
              <Statistic
                title={CATEGORY_LABELS[category]}
                value={categoryStats[category] || 0}
                prefix={<DatabaseOutlined />}
                styles={{ content: { fontSize: 24, color: '#1890ff' } }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Space orientation={isMobile ? 'vertical' : 'horizontal'} style={{ width: '100%' }}>
          <Select
            value={selectedStatus}
            onChange={setSelectedStatus}
            style={{ width: isMobile ? '100%' : 120 }}
            size={isMobile ? 'small' : 'middle'}
          >
            {STATUS_OPTIONS.map((opt) => (
              <Option key={opt.value} value={opt.value}>
                {opt.label}
              </Option>
            ))}
          </Select>
          <Select
            value={selectedLevel}
            onChange={setSelectedLevel}
            style={{ width: isMobile ? '100%' : 120 }}
            size={isMobile ? 'small' : 'middle'}
          >
            {LEVEL_OPTIONS.map((opt) => (
              <Option key={opt.value} value={opt.value}>
                {opt.label}
              </Option>
            ))}
          </Select>
          <Select
            value={selectedDepartment || undefined}
            onChange={(value) => {
              setSelectedDepartment(value || '');
              setPagination((prev) => ({ ...prev, current: 1 }));
            }}
            placeholder="全部部门"
            allowClear
            showSearch
            loading={departmentLoading}
            options={departments.map((dept) => ({ label: dept, value: dept }))}
            style={{ width: isMobile ? '100%' : 180 }}
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
    </div>
  );
}
