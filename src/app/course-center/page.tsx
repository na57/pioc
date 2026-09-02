'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { Course, CourseType } from '@/lib/services/course-center';

const { Title } = Typography;
const { Option } = Select;
const { useBreakpoint } = Grid;

export default function CourseCenterPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  // 从 URL 读取初始状态
  const initialCourseType = (searchParams.get('type') as CourseType) || 'undergraduate';
  const initialKeyword = searchParams.get('keyword') || '';
  const initialDept = searchParams.get('dept') || '';
  const initialStatus = searchParams.get('status') || '';
  const initialNature = searchParams.get('nature') || '';
  const initialCategory = searchParams.get('category') || '';
  const initialPage = parseInt(searchParams.get('page') || '1', 10);
  const initialPageSize = parseInt(searchParams.get('pageSize') || '10', 10);

  const [courseType, setCourseType] = useState<CourseType>(initialCourseType);
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [pagination, setPagination] = useState({
    current: initialPage,
    pageSize: initialPageSize,
    total: 0,
  });
  const [searchKeyword, setSearchKeyword] = useState(initialKeyword);
  const [selectedDeptCode, setSelectedDeptCode] = useState<string>(initialDept);
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatus);
  const [selectedNature, setSelectedNature] = useState<string>(initialNature);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [allDepartments, setAllDepartments] = useState<{ dwh: string; dwmc: string }[]>([]);
  const [allNatures, setAllNatures] = useState<{ kcccm: string; kcccmc: string }[]>([]);
  const [allCategories, setAllCategories] = useState<{ kcflm: string; kcflmc: string }[]>([]);

  const isFirstRender = useRef(true);

  // 获取所有开设单位
  const fetchDepartments = useCallback(async () => {
    try {
      const response = await fetch(`/api/course-center?action=departments&course_type=${courseType}`);
      const result = await response.json();
      if (result.success) {
        const departments = result.data?.departments;
        setAllDepartments(Array.isArray(departments) ? departments : []);
      }
    } catch (error) {
      console.error('获取开设单位失败:', error);
    }
  }, [courseType]);

  // 获取课程性质列表
  const fetchNatures = useCallback(async () => {
    try {
      const response = await fetch(`/api/course-center?action=natures&course_type=${courseType}`);
      const result = await response.json();
      if (result.success) {
        const natures = result.data?.natures;
        setAllNatures(Array.isArray(natures) ? natures : []);
      }
    } catch (error) {
      console.error('获取课程性质失败:', error);
    }
  }, [courseType]);

  // 获取课程类别列表
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(`/api/course-center?action=categories&course_type=${courseType}`);
      const result = await response.json();
      if (result.success) {
        const categories = result.data?.categories;
        setAllCategories(Array.isArray(categories) ? categories : []);
      }
    } catch (error) {
      console.error('获取课程类别失败:', error);
    }
  }, [courseType]);

  // 单位选项
  const departmentOptions = useMemo(() => {
    return allDepartments.map(dept => ({ value: dept.dwh, label: dept.dwmc }));
  }, [allDepartments]);

  // 课程性质选项
  const natureOptions = useMemo(() => {
    return allNatures.map(nature => ({ value: nature.kcccm, label: nature.kcccmc }));
  }, [allNatures]);

  // 课程类别选项
  const categoryOptions = useMemo(() => {
    return allCategories.map(category => ({ value: category.kcflm, label: category.kcflmc }));
  }, [allCategories]);

  // 课程状态选项
  const statusOptions = [
    { value: '1', label: '开课中' },
    { value: '0', label: '已停课' },
  ];

  // 获取课程列表
  const fetchCourses = useCallback(async (page: number, pageSize: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        action: 'list',
        course_type: courseType,
        page: page.toString(),
        per_page: pageSize.toString(),
      });

      if (searchKeyword) params.append('keyword', searchKeyword);
      if (selectedDeptCode) params.append('dept', selectedDeptCode);
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedNature) params.append('nature', selectedNature);
      if (selectedCategory) params.append('category', selectedCategory);

      const response = await fetch(`/api/course-center?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setCourses(result.data.data);
        setPagination({
          current: result.data.page,
          pageSize: result.data.per_page,
          total: result.data.total,
        });
      } else {
        message.error(result.error || result.message || '获取课程列表失败');
      }
    } catch (error) {
      console.error('获取课程列表失败:', error);
      message.error('获取课程列表失败');
    } finally {
      setLoading(false);
    }
  }, [courseType, searchKeyword, selectedDeptCode, selectedStatus, selectedNature, selectedCategory, message]);

  // 当筛选条件或分页变化时，获取数据并同步 URL
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    fetchCourses(pagination.current, pagination.pageSize);

    const newSearchParams = new URLSearchParams();
    if (courseType && courseType !== 'undergraduate') newSearchParams.set('type', courseType);
    if (searchKeyword) newSearchParams.set('keyword', searchKeyword);
    if (selectedDeptCode) newSearchParams.set('dept', selectedDeptCode);
    if (selectedStatus) newSearchParams.set('status', selectedStatus);
    if (selectedNature) newSearchParams.set('nature', selectedNature);
    if (selectedCategory) newSearchParams.set('category', selectedCategory);
    if (pagination.current !== 1) newSearchParams.set('page', pagination.current.toString());
    if (pagination.pageSize !== 10) newSearchParams.set('pageSize', pagination.pageSize.toString());

    const queryString = newSearchParams.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [courseType, searchKeyword, selectedDeptCode, selectedStatus, selectedNature, selectedCategory, pagination.current, pagination.pageSize, fetchCourses, pathname, router]);

  // 初始化加载数据（从 URL 状态）
  useEffect(() => {
    fetchCourses(initialPage, initialPageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchDepartments();
    fetchNatures();
    fetchCategories();
  }, [fetchDepartments, fetchNatures, fetchCategories]);

  // 处理搜索
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // 处理重置
  const handleReset = () => {
    setSearchKeyword('');
    setSelectedDeptCode('');
    setSelectedStatus('');
    setSelectedNature('');
    setSelectedCategory('');
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // 处理课程类型切换
  const handleCourseTypeChange = (value: CourseType) => {
    setCourseType(value);
    setSearchKeyword('');
    setSelectedDeptCode('');
    setSelectedStatus('');
    setSelectedNature('');
    setSelectedCategory('');
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // 表格列定义
  const columns = [
    {
      title: '课程号',
      dataIndex: 'kch',
      key: 'kch',
      width: isMobile ? 100 : 120,
    },
    {
      title: '课程名称',
      dataIndex: 'kcmc',
      key: 'kcmc',
      width: 200,
      render: (text: string, record: Course) => {
        const detailParams = new URLSearchParams(searchParams.toString());
        detailParams.set('type', courseType);
        return (
          <Link href={`/course-center/${record.kch}?${detailParams.toString()}`} style={{ fontSize: isMobile ? 13 : 14 }}>
            {text}
          </Link>
        );
      },
    },
    {
      title: '负责人',
      dataIndex: 'kcfzrh',
      key: 'kcfzrh',
      width: isMobile ? 80 : 120,
      responsive: ['md' as const],
    },
    {
      title: '开设单位',
      dataIndex: 'gsyxmc',
      key: 'gsyxmc',
      width: 150,
      responsive: ['lg' as const],
      render: (text: string, record: Course) => {
        // 本科课程使用 gsyxmc，研究生课程使用 kcksdwmc
        return courseType === 'undergraduate' ? record.gsyxmc : record.kcksdwmc;
      },
    },
    {
      title: '学分',
      dataIndex: 'xf',
      key: 'xf',
      width: 60,
    },
  ];

  return (
    <div>
      <Title level={isMobile ? 4 : 2}>课程中心</Title>

      <Card style={{ marginBottom: 16 }}>
        <Space orientation={isMobile ? 'vertical' : 'horizontal'} style={{ width: '100%' }}>
          <Select
            value={courseType}
            onChange={handleCourseTypeChange}
            style={{ width: isMobile ? '100%' : 120 }}
            size={isMobile ? 'small' : 'middle'}
          >
            <Option value="undergraduate">本科课程</Option>
            <Option value="graduate">研究生课程</Option>
          </Select>
          <Select
            value={selectedDeptCode || undefined}
            onChange={(value) => {
              setSelectedDeptCode(value || '');
              setPagination(prev => ({ ...prev, current: 1 }));
            }}
            style={{ width: isMobile ? '100%' : 150 }}
            placeholder="开设单位"
            allowClear
            size={isMobile ? 'small' : 'middle'}
          >
            {departmentOptions.map(opt => (
              <Option key={opt.value} value={opt.value}>{opt.label}</Option>
            ))}
          </Select>
          <Select
            value={selectedNature || undefined}
            onChange={(value) => {
              setSelectedNature(value || '');
              setPagination(prev => ({ ...prev, current: 1 }));
            }}
            style={{ width: isMobile ? '100%' : 150 }}
            placeholder="课程性质"
            allowClear
            size={isMobile ? 'small' : 'middle'}
          >
            {natureOptions.map(opt => (
              <Option key={opt.value} value={opt.value}>{opt.label}</Option>
            ))}
          </Select>
          <Select
            value={selectedCategory || undefined}
            onChange={(value) => {
              setSelectedCategory(value || '');
              setPagination(prev => ({ ...prev, current: 1 }));
            }}
            style={{ width: isMobile ? '100%' : 150 }}
            placeholder="课程类别"
            allowClear
            size={isMobile ? 'small' : 'middle'}
          >
            {categoryOptions.map(opt => (
              <Option key={opt.value} value={opt.value}>{opt.label}</Option>
            ))}
          </Select>
          <Select
            value={selectedStatus || undefined}
            onChange={(value) => {
              setSelectedStatus(value || '');
              setPagination(prev => ({ ...prev, current: 1 }));
            }}
            style={{ width: isMobile ? '100%' : 120 }}
            placeholder="课程状态"
            allowClear
            size={isMobile ? 'small' : 'middle'}
          >
            {statusOptions.map(opt => (
              <Option key={opt.value} value={opt.value}>{opt.label}</Option>
            ))}
          </Select>
          <Input
            placeholder="请输入课程号、课程名称或负责人进行搜索"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined />}
            allowClear
            size={isMobile ? 'small' : 'middle'}
            style={{ width: isMobile ? '100%' : 260 }}
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
        <div className="table-responsive" style={{ margin: isMobile ? '-12px 0' : 0 }}>
          <Table
            columns={columns}
            dataSource={courses}
            rowKey="kch"
            loading={loading}
            size={isMobile ? 'small' : 'middle'}
            scroll={{ x: isMobile ? 400 : undefined }}
            pagination={{
              ...pagination,
              size: isMobile ? 'small' : undefined,
              showSizeChanger: !isMobile,
              showQuickJumper: !isMobile,
              showTotal: isMobile ? undefined : (total) => `共 ${total} 条记录`,
              onChange: (page, pageSize) => {
                setPagination(prev => ({ ...prev, current: page, pageSize: pageSize || 10 }));
              },
            }}
          />
        </div>
      </Card>
    </div>
  );
}
