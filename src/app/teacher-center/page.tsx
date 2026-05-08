'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  Input,
  Select,
  Button,
  Space,
  Card,
  Typography,
  Tag,
  Avatar,
  App,
} from 'antd';
import {
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons';
import FriendlyTime from '@/components/FriendlyTime';

const { Title } = Typography;
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
  const { message } = App.useApp();
  
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);

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
  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        action: 'list',
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
      });
      
      if (keyword) params.append('keyword', keyword);
      if (department) params.append('department', department);
      if (status) params.append('status', status);

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

  // 初始化
  useEffect(() => {
    fetchDepartments();
    fetchStatuses();
  }, []);

  // 当筛选条件变化时重新获取数据
  useEffect(() => {
    fetchTeachers();
  }, [currentPage, pageSize, department, status]);

  // 搜索按钮点击
  const handleSearch = () => {
    setCurrentPage(1);
    fetchTeachers();
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
      <Title level={2}>教师中心</Title>
      
      <Card style={{ marginBottom: 16 }}>
        <Space orientation="horizontal" size="middle" wrap>
          <Input
            placeholder="搜索姓名或工号"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
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
