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
  const [courseType, setCourseType] = useState<'undergraduate' | 'graduate'>('undergraduate');
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // 根据课程数据动态获取开设单位选项
  const departmentOptions = useMemo(() => {
    const departments = [...new Set(courses.map(item => item.kcksdwmc).filter(Boolean))];
    return [
      { value: '', label: '全部单位' },
      ...departments.map(dept => ({ value: dept, label: dept }))
    ];
  }, [courses]);

  // 课程状态选项
  const statusOptions = [
    { value: '', label: '全部状态' },
    { value: '1', label: '开课中' },
    { value: '0', label: '已停课' },
  ];

  // 获取课程列表
  const fetchCourses = useCallback(async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        course_type: courseType,
        page: page.toString(),
        per_page: pageSize.toString(),
      });

      if (searchKeyword) params.append('keyword', searchKeyword);
      if (selectedDept) params.append('dept', selectedDept);
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
  }, [courseType, searchKeyword, selectedDept, selectedStatus]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // 处理搜索
  const handleSearch = () => {
    fetchCourses(1);
  };

  // 处理重置
  const handleReset = () => {
    setSearchKeyword('');
    setSelectedDept('');
    setSelectedStatus('');
    fetchCourses(1);
  };

  // 处理课程类型切换
  const handleCourseTypeChange = (value: 'undergraduate' | 'graduate') => {
    setCourseType(value);
    setSearchKeyword('');
    setSelectedDept('');
    setSelectedStatus('');
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
            value={selectedDept}
            onChange={setSelectedDept}
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
              fetchCourses(page, pageSize);
            },
          }}
        />
      </Card>
    </div>
  );
}
