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
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

const { Title } = Typography;
const { Option } = Select;

// 课程类型
interface Course {
  kch: string;
  kcmc: string;
  kcfzrh: string;
  kcksdwh: string;
  kcksdwmc: string;
  xf: string;
  zxs: string;
  llxs: string;
  syxs: string;
  sjxs: string;
  kcjj: string;
  jc: string;
  cksm: string;
  kcccm: string;
  kcccmc: string;
  kcflm: string;
  kcflmc: string;
  jxfsdm: string;
  skyzdm: string;
  skyzmc: string;
  kcztdm: string;
  kslxdm: string;
  kslxdmmc: string;
  kcsm: string;
  kcmb: string;
  ywkcmb: string;
  zhxs: string;
  kcywmc: string;
  gsyxbm: string;
  gsyxmc: string;
  tstamp: string;
}

export default function CourseCenterPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 从 URL 读取初始状态
  const initialCourseType = (searchParams.get('type') as 'undergraduate' | 'graduate') || 'undergraduate';
  const initialKeyword = searchParams.get('keyword') || '';
  const initialDept = searchParams.get('dept') || '';
  const initialStatus = searchParams.get('status') || '';
  const initialPage = parseInt(searchParams.get('page') || '1', 10);
  const initialPageSize = parseInt(searchParams.get('pageSize') || '10', 10);

  const [courseType, setCourseType] = useState<'undergraduate' | 'graduate'>(initialCourseType);
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
  const [allDepartments, setAllDepartments] = useState<{ code: string; name: string }[]>([]);



  // 获取所有开设单位
  const fetchDepartments = useCallback(async () => {
    try {
      const response = await fetch(`/api/course-center?action=departments&course_type=${courseType}`);
      const result = await response.json();
      if (result.success) {
        setAllDepartments(result.data);
      }
    } catch (error) {
      console.error('获取开设单位失败:', error);
    }
  }, [courseType]);

  // 单位选项 - value 是代码，label 是名称
  const departmentOptions = useMemo(() => {
    return [
      { value: '', label: '全部单位' },
      ...allDepartments.map(dept => ({ value: dept.code, label: dept.name }))
    ];
  }, [allDepartments]);

  // 课程状态选项
  const statusOptions = [
    { value: '', label: '全部状态' },
    { value: '1', label: '开课中' },
    { value: '0', label: '已停课' },
  ];

  // 获取课程列表
  const fetchCourses = useCallback(async (page: number, pageSize: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        course_type: courseType,
        page: page.toString(),
        per_page: pageSize.toString(),
      });

      if (searchKeyword) params.append('keyword', searchKeyword);
      if (selectedDeptCode) params.append('dept', selectedDeptCode);
      if (selectedStatus) params.append('status', selectedStatus);

      const response = await fetch(`/api/course-center?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setCourses(result.data);
        setPagination({
          current: result.page,
          pageSize: result.per_page,
          total: result.total,
        });
      } else {
        message.error(result.message || '获取课程列表失败');
      }
    } catch (error) {
      message.error('获取课程列表失败');
    } finally {
      setLoading(false);
    }
  }, [courseType, searchKeyword, selectedDeptCode, selectedStatus]);

  // 当筛选条件或分页变化时，获取数据
  useEffect(() => {
    fetchCourses(pagination.current, pagination.pageSize);
  }, [fetchCourses, pagination.current, pagination.pageSize]);

  // 更新 URL 的 effect - 使用 ref 避免循环
  const isFirstRender = React.useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const newSearchParams = new URLSearchParams();
    if (courseType) newSearchParams.set('type', courseType);
    if (searchKeyword) newSearchParams.set('keyword', searchKeyword);
    if (selectedDeptCode) newSearchParams.set('dept', selectedDeptCode);
    if (selectedStatus) newSearchParams.set('status', selectedStatus);
    if (pagination.current !== 1) newSearchParams.set('page', pagination.current.toString());
    if (pagination.pageSize !== 10) newSearchParams.set('pageSize', pagination.pageSize.toString());
    
    const queryString = newSearchParams.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [courseType, searchKeyword, selectedDeptCode, selectedStatus, pagination.current, pagination.pageSize]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  // 处理搜索
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchCourses(1);
  };

  // 处理重置
  const handleReset = () => {
    setSearchKeyword('');
    setSelectedDeptCode('');
    setSelectedStatus('');
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchCourses(1);
  };

  // 处理课程类型切换
  const handleCourseTypeChange = (value: 'undergraduate' | 'graduate') => {
    setCourseType(value);
    setSearchKeyword('');
    setSelectedDeptCode('');
    setSelectedStatus('');
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // 表格列定义
  const columns = [
    {
      title: '课程号',
      dataIndex: 'kch',
      key: 'kch',
      width: 120,
    },
    {
      title: '课程名称',
      dataIndex: 'kcmc',
      key: 'kcmc',
      render: (text: string, record: Course) => (
        <Link href={`/course-center/${record.kch}`}>
          {text}
        </Link>
      ),
    },
    {
      title: '负责人',
      dataIndex: 'kcfzrh',
      key: 'kcfzrh',
      width: 120,
    },
    {
      title: '开设单位',
      dataIndex: 'kcksdwmc',
      key: 'kcksdwmc',
      width: 200,
    },
    {
      title: '学分',
      dataIndex: 'xf',
      key: 'xf',
      width: 80,
    },
  ];

  return (
    <div>
      <Title level={2}>课程中心</Title>

      <Card style={{ marginBottom: 16 }}>
        <Space.Compact style={{ width: '100%' }}>
          <Select
            value={courseType}
            onChange={handleCourseTypeChange}
            style={{ width: 120 }}
          >
            <Option value="undergraduate">本科课程</Option>
            <Option value="graduate">研究生课程</Option>
          </Select>
          <Select
            value={selectedDeptCode}
            onChange={setSelectedDeptCode}
            style={{ width: 150 }}
            placeholder="开设单位"
            allowClear
          >
            {departmentOptions.map(opt => (
              <Option key={opt.value} value={opt.value}>{opt.label}</Option>
            ))}
          </Select>
          <Select
            value={selectedStatus}
            onChange={setSelectedStatus}
            style={{ width: 120 }}
            placeholder="课程状态"
            allowClear
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
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            查询
          </Button>
          <Button onClick={handleReset}>
            重置
          </Button>
        </Space.Compact>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={courses}
          rowKey="kch"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({ ...prev, current: page, pageSize: pageSize || 10 }));
              fetchCourses(page, pageSize);
            },
          }}
        />
      </Card>
    </div>
  );
}
