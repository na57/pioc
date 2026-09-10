'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Table,
  Input,
  Select,
  Button,
  Space,
  Card,
  Tag,
  Avatar,
  App,
} from 'antd';
import {
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons';
import FriendlyTime from '@/components/FriendlyTime';

const { Option } = Select;

interface Teacher {
  gh: string;
  xm: string;
  dwh: string;
  dwmc: string;
  xbm: string;
  xbmmc: string;
  zyjszwdm: string;
  zyjszwdmmc: string;
  dzzw?: string;
  yddh?: string;
  dzyx?: string;
  zp?: string;
  dqztm: string;
  dqztmmc: string;
}

interface Department {
  dwh: string;
  dwmc: string;
}

interface Status {
  dqztm: string;
  dqztmmc: string;
}

export default function TeacherCenterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();

  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [inputKeyword, setInputKeyword] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const isMountedRef = useRef(false);

  // 从 URL 初始化筛选与分页状态，并使用 URL 参数获取第一次数据
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const page = parseInt(urlParams.get('page') || '1', 10);
    const size = parseInt(urlParams.get('pageSize') || '10', 10);
    const keywordFromUrl = urlParams.get('keyword') || '';
    const departmentFromUrl = urlParams.get('department') || '';
    const statusFromUrl = urlParams.get('status') || '';

    setCurrentPage(Number.isNaN(page) ? 1 : page);
    setPageSize(Number.isNaN(size) ? 10 : size);
    setInputKeyword(keywordFromUrl);
    setSearchKeyword(keywordFromUrl);
    setDepartment(departmentFromUrl);
    setStatus(statusFromUrl);

    fetchTeachers({
      page: Number.isNaN(page) ? 1 : page,
      pageSize: Number.isNaN(size) ? 10 : size,
      keyword: keywordFromUrl,
      department: departmentFromUrl,
      status: statusFromUrl,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 获取部门列表
  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/teacher-center?action=departments');
      const result = await response.json();
      if (result.success) {
        setDepartments(result.data.departments);
      }
    } catch (error) {
      console.error('获取部门列表失败:', error);
    }
  };

  // 获取状态列表
  const fetchStatuses = async () => {
    try {
      const response = await fetch('/api/teacher-center?action=statuses');
      const result = await response.json();
      if (result.success) {
        setStatuses(result.data.statuses);
      }
    } catch (error) {
      console.error('获取状态列表失败:', error);
    }
  };

  // 获取教师列表
  const fetchTeachers = async (options?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    department?: string;
    status?: string;
  }) => {
    setLoading(true);
    try {
      const page = options?.page ?? currentPage;
      const size = options?.pageSize ?? pageSize;
      const keyword = options?.keyword ?? searchKeyword;
      const dept = options?.department ?? department;
      const stat = options?.status ?? status;

      const params = new URLSearchParams({
        action: 'list',
        page: page.toString(),
        pageSize: size.toString(),
      });

      if (keyword) params.append('keyword', keyword);
      if (dept) params.append('department', dept);
      if (stat) params.append('status', stat);

      const response = await fetch(`/api/teacher-center?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setTeachers(result.data.data);
        setTotal(result.data.total);
      } else {
        message.error(result.error || '获取数据失败');
      }
    } catch (error) {
      console.error('获取教师列表失败:', error);
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 将当前筛选与分页状态同步到 URL
  const updateUrlParams = (page = currentPage, size = pageSize) => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', page.toString());
    if (size !== 10) params.set('pageSize', size.toString());
    if (searchKeyword) params.set('keyword', searchKeyword);
    if (department) params.set('department', department);
    if (status) params.set('status', status);

    const query = params.toString();
    router.replace(query ? `?${query}` : '/teacher-center', { scroll: false });
  };

  // 初始化
  useEffect(() => {
    fetchDepartments();
    fetchStatuses();
  }, []);

  // 当筛选条件或分页变化时重新获取数据并同步 URL（跳过首次挂载，由初始化 useEffect 负责读取 URL 后的第一次请求）
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    fetchTeachers();
    updateUrlParams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, department, status, searchKeyword]);

  // 搜索按钮点击
  const handleSearch = () => {
    setSearchKeyword(inputKeyword);
    setCurrentPage(1);
  };

  // 查看详情
  const handleViewDetail = (gh: string) => {
    router.push(`/teacher-center/${gh}`);
  };

  // 表格列定义
  const columns = [
    {
      title: '姓名',
      key: 'xm',
      width: 200,
      render: (text: string, record: Teacher) => (
        <Space>
          <Avatar 
            src={record.zp || null} 
            icon={<UserOutlined />}
            size="small"
          />
          <a onClick={() => handleViewDetail(record.gh)} style={{ cursor: 'pointer' }}>
            {record.xm}({record.gh})
          </a>
        </Space>
      ),
    },
    {
      title: '单位',
      dataIndex: 'dwmc',
      key: 'dwmc',
      ellipsis: true,
    },
    {
      title: '职称',
      dataIndex: 'zyjszwdmmc',
      key: 'zyjszwdmmc',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'dqztmmc',
      key: 'dqztmmc',
      width: 100,
      render: (text: string) => (
        <Tag color={text === '在岗' ? 'green' : text === '离职' ? 'red' : 'default'}>
          {text}
        </Tag>
      ),
    },
  ];

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Space orientation="horizontal" size="middle" wrap>
          <Input
            placeholder="搜索姓名或工号"
            value={inputKeyword}
            onChange={(e) => setInputKeyword(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 200 }}
            prefix={<SearchOutlined />}
            allowClear
          />
          
          <Select
            placeholder="选择部门"
            value={department || undefined}
            onChange={(value) => {
              setDepartment(value);
              setCurrentPage(1);
            }}
            style={{ width: 200 }}
            allowClear
          >
            {departments.map((dept) => (
              <Option key={dept.dwh} value={dept.dwh}>
                {dept.dwmc}
              </Option>
            ))}
          </Select>
          
          <Select
            placeholder="选择状态"
            value={status || undefined}
            onChange={(value) => {
              setStatus(value);
              setCurrentPage(1);
            }}
            style={{ width: 150 }}
            allowClear
          >
            {statuses.map((s) => (
              <Option key={s.dqztm} value={s.dqztm}>
                {s.dqztmmc}
              </Option>
            ))}
          </Select>
          
          <Button type="primary" onClick={handleSearch}>
            搜索
          </Button>
        </Space>
      </Card>

      <Table
        columns={columns}
        dataSource={teachers}
        rowKey="gh"
        loading={loading}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条记录`,
          onChange: (page, size) => {
            setCurrentPage(page);
            if (size) setPageSize(size);
          },
        }}
      />
    </div>
  );
}
