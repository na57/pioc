'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  Card,
  Table,
  Select,
  Input,
  Button,
  Space,
  Pagination,
  Spin,
  Modal,
  App,
  Drawer,
  Tabs,
  Empty,
  Tag,
} from 'antd';
import { SearchOutlined, ReloadOutlined, BarChartOutlined } from '@ant-design/icons';
import * as echarts from 'echarts';

const { Option } = Select;

interface Semester {
  XNXQDM: string;
  XNDM: string | null;
  XQDM: string | null;
  XNXQMC: string | null;
  XQMC: string | null;
  PX: string | null;
  SFDQXQ: string | null;
}

interface TeachingInfo {
  JXBH: string | null;
  JSGH: string | null;
  JSXM: string | null;
  XNXQDM: string | null;
  XNXQMC: string | null;
  KCDM: string | null;
  KCMC: string | null;
  SKZC: string | null;
  SKXQ: string | null;
  KSJC: string | null;
  JSJC: string | null;
  JASDM: string | null;
  JXDD: string | null;
  JSSZXQH: string | null;
  JSSZXQMC: string | null;
  SKBJH: string | null;
  SKBJMC: string | null;
  KXH: string | null;
  KCKSDWH: string | null;
  KCKSDWMC: string | null;
  KKXND: string | null;
  KKXQM: string | null;
  SKSJ: string | null;
  JXZY: string | null;
  KRL: string | null;
  XDRS: string | null;
  XKXQH: string | null;
  XKRSXD: string | null;
  XKNJ: string | null;
  PKYQ: string | null;
  JSLXM: string | null;
  QSZ: string | null;
  ZZZ: string | null;
  KCXZM: string | null;
  JXBMC: string | null;
  JXTZ: string | null;
  KKSM: string | null;
  TSTAMP: string | null;
}

interface ClassroomData {
  xnxqmc: string | null;
  kckssj: string | null;
  kcjssj: string | null;
  rwcs: string | null;
  zzd: string | null;
  hyd: string | null;
  jszb: string | null;
  bszb: string | null;
  ysjlv: string | null;
  sjd: string | null;
  cjsj: string | null;
  dtlv: string | null;
  ttlv: string | null;
  tstamp: string | null;
  jxbh: string | null;
  wybs: string | null;
}

type StudentType = 'undergraduate' | 'graduate';

export default function TeacherTeachingPage() {
  const { message } = App.useApp();

  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [teachingData, setTeachingData] = useState<TeachingInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [semesterLoading, setSemesterLoading] = useState(false);

  // 筛选条件
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [teacherQuery, setTeacherQuery] = useState<string>('');
  const [studentType, setStudentType] = useState<StudentType>('undergraduate');

  // 分页
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // 课程详情弹窗
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TeachingInfo | null>(null);

  // 课堂数据抽屉
  const [classroomDrawerVisible, setClassroomDrawerVisible] = useState(false);
  const [classroomData, setClassroomData] = useState<ClassroomData[]>([]);
  const [classroomLoading, setClassroomLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<TeachingInfo | null>(null);

  // ECharts 实例引用
  const chartRefs = {
    attention: useRef<HTMLDivElement>(null),
    activity: useRef<HTMLDivElement>(null),
    teachingRatio: useRef<HTMLDivElement>(null),
    behavior: useRef<HTMLDivElement>(null),
  };
  const chartInstances = useRef<Record<string, echarts.ECharts | null>>({
    attention: null,
    activity: null,
    teachingRatio: null,
    behavior: null,
  });

  // 从本地缓存获取学年学期数据
  const getSemestersFromCache = (): { data: Semester[]; expireAt: number } | null => {
    try {
      const cached = localStorage.getItem('teacherTeaching_semesters');
      if (cached) {
        const parsed = JSON.parse(cached);
        // 检查是否过期（7天 = 7 * 24 * 60 * 60 * 1000 = 604800000 毫秒）
        if (parsed.expireAt > Date.now()) {
          return parsed;
        }
      }
    } catch {
      // 缓存读取失败，返回 null
    }
    return null;
  };

  // 保存学年学期数据到本地缓存
  const saveSemestersToCache = (data: Semester[]) => {
    try {
      const cacheData = {
        data,
        expireAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7天后过期
      };
      localStorage.setItem('teacherTeaching_semesters', JSON.stringify(cacheData));
    } catch {
      // 缓存保存失败，忽略错误
    }
  };

  // 获取学年学期列表
  const fetchSemesters = async () => {
    // 先尝试从缓存读取
    const cached = getSemestersFromCache();
    if (cached) {
      setSemesters(cached.data);
      // 默认选中当前学期
      const currentSemester = cached.data.find((s: Semester) => s.SFDQXQ === '1');
      if (currentSemester) {
        setSelectedSemester(currentSemester.XNXQDM);
      }
      return;
    }

    setSemesterLoading(true);
    try {
      const response = await fetch('/api/teacher-teaching?action=semesters');
      const data = await response.json();
      if (data.success) {
        setSemesters(data.data);
        // 保存到本地缓存
        saveSemestersToCache(data.data);
        // 默认选中当前学期
        const currentSemester = data.data.find((s: Semester) => s.SFDQXQ === '1');
        if (currentSemester) {
          setSelectedSemester(currentSemester.XNXQDM);
        }
      } else {
        message.error(data.message || '获取学年学期列表失败');
      }
    } catch {
      message.error('获取学年学期列表失败');
    } finally {
      setSemesterLoading(false);
    }
  };

  // 获取教师授课信息
  const fetchTeachingData = async (
    page: number = currentPage,
    xnxqdm: string = selectedSemester,
    query: string = teacherQuery,
    type: StudentType = studentType
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('per_page', pageSize.toString());
      params.append('student_type', type);
      if (xnxqdm) {
        params.append('xnxqdm', xnxqdm);
      }
      // 根据输入内容判断是教工号还是姓名（含数字则为教工号）
      if (query) {
        const hasNumber = /\d/.test(query);
        if (hasNumber) {
          params.append('jsgh', query);
        } else {
          params.append('jsxm', query);
        }
      }

      const response = await fetch(`/api/teacher-teaching?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setTeachingData(data.data);
        setTotal(data.total);
        setCurrentPage(data.page);
      } else {
        message.error(data.message || '获取教师授课信息失败');
      }
    } catch {
      message.error('获取教师授课信息失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取课堂数据
  const fetchClassroomData = async (jxbh: string, xnxqmc: string) => {
    setClassroomLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('action', 'classroom-data');
      params.append('jxbh', jxbh);
      params.append('xnxqmc', xnxqmc);

      const response = await fetch(`/api/teacher-teaching?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setClassroomData(data.data);
      } else {
        message.error(data.message || '获取课堂数据失败');
      }
    } catch {
      message.error('获取课堂数据失败');
    } finally {
      setClassroomLoading(false);
    }
  };

  useEffect(() => {
    fetchSemesters();
  }, []);

  useEffect(() => {
    if (selectedSemester) {
      fetchTeachingData(1);
    }
  }, [selectedSemester, studentType]);

  // 准备图表数据
  const dates = classroomData.map((item) => {
    if (item.kckssj) {
      const date = new Date(item.kckssj);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
    return '-';
  });

  // 初始化单个图表的函数
  const initChart = (
    ref: React.RefObject<HTMLDivElement | null>,
    key: string,
    option: echarts.EChartsOption
  ) => {
    if (ref.current) {
      // 销毁旧实例
      if (chartInstances.current[key]) {
        chartInstances.current[key]?.dispose();
      }
      // 创建新实例
      chartInstances.current[key] = echarts.init(ref.current);
      chartInstances.current[key]?.setOption(option);
    }
  };

  // 渲染图表 - 在标签页切换时调用
  const renderCharts = (activeKey?: string) => {
    if (!classroomData.length) return;

    // 1. 专注度和活跃度图表
    if (activeKey === '1' || !activeKey) {
      initChart(chartRefs.attention, 'attention', {
        title: { text: '专注度与活跃度趋势', left: 'center' },
        tooltip: { trigger: 'axis' },
        legend: { data: ['专注度', '活跃度'], bottom: 0 },
        grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
        xAxis: {
          type: 'category',
          data: dates,
          axisLabel: { rotate: 45 },
        },
        yAxis: {
          type: 'value',
          min: 0,
          max: 100,
          axisLabel: { formatter: '{value}%' },
        },
        series: [
          {
            name: '专注度',
            type: 'line',
            data: classroomData.map((item) => parseFloat(item.zzd || '0')),
            smooth: true,
            itemStyle: { color: '#5470c6' },
          },
          {
            name: '活跃度',
            type: 'line',
            data: classroomData.map((item) => parseFloat(item.hyd || '0')),
            smooth: true,
            itemStyle: { color: '#91cc75' },
          },
        ],
      });
    }

    // 2. 讲授占比和板书占比图表
    if (activeKey === '2' || !activeKey) {
      initChart(chartRefs.teachingRatio, 'teachingRatio', {
        title: { text: '教学方式占比趋势', left: 'center' },
        tooltip: { trigger: 'axis' },
        legend: { data: ['讲授占比', '板书占比'], bottom: 0 },
        grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
        xAxis: {
          type: 'category',
          data: dates,
          axisLabel: { rotate: 45 },
        },
        yAxis: {
          type: 'value',
          min: 0,
          max: 100,
          axisLabel: { formatter: '{value}%' },
        },
        series: [
          {
            name: '讲授占比',
            type: 'line',
            data: classroomData.map((item) => parseFloat(item.jszb || '0')),
            smooth: true,
            itemStyle: { color: '#fac858' },
          },
          {
            name: '板书占比',
            type: 'line',
            data: classroomData.map((item) => parseFloat(item.bszb || '0')),
            smooth: true,
            itemStyle: { color: '#ee6666' },
          },
        ],
      });
    }

    // 3. 学生行为数据图表
    if (activeKey === '3' || !activeKey) {
      initChart(chartRefs.behavior, 'behavior', {
        title: { text: '学生行为数据趋势', left: 'center' },
        tooltip: { trigger: 'axis' },
        legend: { data: ['用手机率', '睡觉度', '低头率', '抬头率'], bottom: 0 },
        grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
        xAxis: {
          type: 'category',
          data: dates,
          axisLabel: { rotate: 45 },
        },
        yAxis: {
          type: 'value',
          min: 0,
          max: 100,
          axisLabel: { formatter: '{value}%' },
        },
        series: [
          {
            name: '用手机率',
            type: 'line',
            data: classroomData.map((item) => parseFloat(item.ysjlv || '0')),
            smooth: true,
            itemStyle: { color: '#73c0de' },
          },
          {
            name: '睡觉度',
            type: 'line',
            data: classroomData.map((item) => parseFloat(item.sjd || '0')),
            smooth: true,
            itemStyle: { color: '#3ba272' },
          },
          {
            name: '低头率',
            type: 'line',
            data: classroomData.map((item) => parseFloat(item.dtlv || '0')),
            smooth: true,
            itemStyle: { color: '#fc8452' },
          },
          {
            name: '抬头率',
            type: 'line',
            data: classroomData.map((item) => parseFloat(item.ttlv || '0')),
            smooth: true,
            itemStyle: { color: '#9a60b4' },
          },
        ],
      });
    }
  };

  // 首次渲染图表
  useEffect(() => {
    if (classroomDrawerVisible && classroomData.length > 0) {
      // 延迟渲染以确保 DOM 已挂载
      setTimeout(() => {
        renderCharts('1');
      }, 100);
    }
  }, [classroomDrawerVisible, classroomData]);

  // 处理标签页切换
  const handleTabChange = (activeKey: string) => {
    // 延迟渲染以确保 DOM 已挂载
    setTimeout(() => {
      renderCharts(activeKey);
    }, 100);
  };

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      Object.values(chartInstances.current).forEach((instance) => {
        instance?.resize();
      });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 清理图表实例
  useEffect(() => {
    return () => {
      Object.values(chartInstances.current).forEach((instance) => {
        instance?.dispose();
      });
    };
  }, []);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchTeachingData(1);
  };

  const handleReset = () => {
    setSelectedSemester('');
    setTeacherQuery('');
    setStudentType('undergraduate');
    setCurrentPage(1);
    fetchTeachingData(1, '', '', 'undergraduate');
  };

  const handlePageChange = (page: number, size?: number) => {
    setCurrentPage(page);
    if (size && size !== pageSize) {
      setPageSize(size);
    }
    fetchTeachingData(page);
  };

  // 显示课程详情
  const showCourseDetail = (record: TeachingInfo) => {
    setSelectedRecord(record);
    setDetailModalVisible(true);
  };

  // 显示课堂数据
  const showClassroomData = (record: TeachingInfo) => {
    setSelectedCourse(record);
    setClassroomDrawerVisible(true);
    if (record.JXBH && record.XNXQMC) {
      // 去掉学年学期名称中的"学期"二字，以匹配课堂数据表格式
      const xnxqmc = record.XNXQMC.replace(/学期$/, '');
      fetchClassroomData(record.JXBH, xnxqmc);
    }
  };

  // 关闭课堂数据抽屉
  const closeClassroomDrawer = () => {
    setClassroomDrawerVisible(false);
    setClassroomData([]);
    setSelectedCourse(null);
  };

  const columns = [
    {
      title: '课程',
      key: 'course',
      width: 250,
      render: (_: unknown, record: TeachingInfo) => {
        const name = record.KCMC || '-';
        return (
          <Button type="link" onClick={() => showCourseDetail(record)}>
            {name}
          </Button>
        );
      },
    },
    {
      title: '授课教师',
      key: 'teacher',
      width: 150,
      render: (_: unknown, record: TeachingInfo) => {
        const name = record.JSXM || '-';
        const id = record.JSGH || '-';
        return `${name}(${id})`;
      },
    },
    {
      title: '学年学期',
      dataIndex: 'XNXQMC',
      key: 'XNXQMC',
      width: 120,
    },
    {
      title: '星期',
      dataIndex: 'SKXQ',
      key: 'SKXQ',
      width: 80,
    },
    {
      title: '节次',
      key: 'jc',
      width: 100,
      render: (_: unknown, record: TeachingInfo) => {
        const start = record.KSJC;
        const end = record.JSJC;
        if (start && end) {
          return `第${start}-${end}节`;
        }
        return '-';
      },
    },
    {
      title: '上课地点',
      dataIndex: 'JXDD',
      key: 'JXDD',
      width: 150,
    },
    {
      title: '课程性质',
      dataIndex: 'KCXZM',
      key: 'KCXZM',
      width: 100,
    },
    {
      title: '学生类型',
      key: 'studentType',
      width: 100,
      render: () => (
        <Tag color={studentType === 'undergraduate' ? 'blue' : 'purple'}>
          {studentType === 'undergraduate' ? '本科生' : '研究生'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: (_: unknown, record: TeachingInfo) => (
        <Button
          type="primary"
          size="small"
          icon={<BarChartOutlined />}
          onClick={() => showClassroomData(record)}
        >
          课堂数据
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card style={{ marginBottom: 24 }}>
        <Space wrap style={{ marginBottom: 16 }}>
          <span>学生类型：</span>
          <Select
            style={{ width: 120 }}
            value={studentType}
            onChange={(value: StudentType) => setStudentType(value)}
          >
            <Option value="undergraduate">本科生</Option>
            <Option value="graduate">研究生</Option>
          </Select>

          <span style={{ marginLeft: 16 }}>学年学期：</span>
          <Select
            style={{ width: 200 }}
            placeholder="请选择学年学期"
            value={selectedSemester || undefined}
            onChange={(value) => setSelectedSemester(value)}
            loading={semesterLoading}
            allowClear
          >
            {semesters.map((semester) => (
              <Option key={semester.XNXQDM} value={semester.XNXQDM}>
                {semester.XNXQMC || semester.XNXQDM}
                {semester.SFDQXQ === '1' ? ' (当前)' : ''}
              </Option>
            ))}
          </Select>

          <span style={{ marginLeft: 16 }}>教师：</span>
          <Input
            style={{ width: 200 }}
            placeholder="请输入教工号或姓名"
            value={teacherQuery}
            onChange={(e) => setTeacherQuery(e.target.value)}
          />

          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleSearch}
          >
            查询
          </Button>

          <Button
            icon={<ReloadOutlined />}
            onClick={handleReset}
          >
            重置
          </Button>
        </Space>
      </Card>

      <Card>
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={teachingData}
            rowKey={(record) => {
              const key = `${record.JXBH || ''}-${record.KCDM || ''}-${record.SKBJH || ''}-${record.JSGH || ''}-${record.XNXQDM || ''}-${record.SKZC || ''}-${record.SKXQ || ''}-${record.KSJC || ''}`;
              return key;
            }}
            pagination={false}
            scroll={{ x: 1500 }}
            size="small"
          />
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={total}
              onChange={handlePageChange}
              showSizeChanger
              showQuickJumper
              showTotal={(total) => `共 ${total} 条`}
              pageSizeOptions={['10', '20', '50', '100']}
            />
          </div>
        </Spin>
      </Card>

      {/* 课程详情弹窗 */}
      <Modal
        title="课程详细信息"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={600}
      >
        {selectedRecord && (
          <div style={{ maxHeight: 500, overflow: 'auto' }}>
            {[
              { label: '教学编号', value: selectedRecord.JXBH },
              { label: '教学班名称', value: selectedRecord.JXBMC },
              { label: '教师姓名', value: selectedRecord.JSXM },
              { label: '教师工号', value: selectedRecord.JSGH },
              { label: '学年学期', value: selectedRecord.XNXQMC },
              { label: '学年学期代码', value: selectedRecord.XNXQDM },
              { label: '课程名称', value: selectedRecord.KCMC },
              { label: '课程代码', value: selectedRecord.KCDM },
              { label: '课程性质', value: selectedRecord.KCXZM },
              { label: '上课周次', value: selectedRecord.SKZC },
              { label: '星期', value: selectedRecord.SKXQ },
              {
                label: '节次',
                value:
                  selectedRecord.KSJC && selectedRecord.JSJC
                    ? `第${selectedRecord.KSJC}-${selectedRecord.JSJC}节`
                    : null,
              },
              { label: '上课地点', value: selectedRecord.JXDD },
              { label: '教室代码', value: selectedRecord.JASDM },
              { label: '上课班级', value: selectedRecord.SKBJMC },
              { label: '上课班级号', value: selectedRecord.SKBJH },
              { label: '课容量', value: selectedRecord.KRL },
              { label: '修读人数', value: selectedRecord.XDRS },
              { label: '开课部门', value: selectedRecord.KCKSDWMC },
              { label: '开课部门代码', value: selectedRecord.KCKSDWH },
              { label: '开课学年度', value: selectedRecord.KKXND },
              { label: '开课学期码', value: selectedRecord.KKXQM },
              { label: '上课时间', value: selectedRecord.SKSJ },
              { label: '教学周', value: selectedRecord.JXZY },
              { label: '开课说明', value: selectedRecord.KKSM },
              { label: '起止周', value: selectedRecord.QSZ },
              { label: '终止周', value: selectedRecord.ZZZ },
              { label: '教师类型码', value: selectedRecord.JSLXM },
              { label: '排课要求', value: selectedRecord.PKYQ },
              { label: '选课序号', value: selectedRecord.KXH },
              { label: '选课人数限定', value: selectedRecord.XKRSXD },
              { label: '选考校区号', value: selectedRecord.XKXQH },
              { label: '选考年级', value: selectedRecord.XKNJ },
              { label: '学生类型', value: studentType === 'undergraduate' ? '本科生' : '研究生' },
            ].map((item, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  padding: '8px 0',
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: 14,
                }}
              >
                <span
                  style={{
                    width: 120,
                    color: '#666',
                    flexShrink: 0,
                  }}
                >
                  {item.label}:
                </span>
                <span style={{ color: '#333', wordBreak: 'break-all' }}>
                  {item.value || '-'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* 课堂数据抽屉 */}
      <Drawer
        title={`课堂数据 - ${selectedCourse?.KCMC || ''} (${selectedCourse?.XNXQMC || ''})`}
        placement="right"
        size="large"
        onClose={closeClassroomDrawer}
        open={classroomDrawerVisible}
      >
        <Spin spinning={classroomLoading}>
          {classroomData.length === 0 ? (
            <Empty description="暂无课堂数据" />
          ) : (
            <Tabs
              defaultActiveKey="1"
              onChange={handleTabChange}
              destroyOnHidden={false}
              items={[
                {
                  key: '1',
                  label: '专注度与活跃度',
                  children: (
                    <div
                      ref={chartRefs.attention}
                      style={{ width: '100%', height: 400 }}
                    />
                  ),
                },
                {
                  key: '2',
                  label: '教学方式占比',
                  children: (
                    <div
                      ref={chartRefs.teachingRatio}
                      style={{ width: '100%', height: 400 }}
                    />
                  ),
                },
                {
                  key: '3',
                  label: '学生行为数据',
                  children: (
                    <div
                      ref={chartRefs.behavior}
                      style={{ width: '100%', height: 400 }}
                    />
                  ),
                },
                {
                  key: '4',
                  label: '数据列表',
                  children: (
                    <Table
                      dataSource={classroomData}
                      rowKey="wybs"
                      size="small"
                      scroll={{ x: 1200, y: 400 }}
                      pagination={false}
                      columns={[
                        {
                          title: '课程开始时间',
                          dataIndex: 'kckssj',
                          key: 'kckssj',
                          width: 160,
                        },
                        {
                          title: '课程结束时间',
                          dataIndex: 'kcjssj',
                          key: 'kcjssj',
                          width: 160,
                        },
                        {
                          title: '专注度',
                          dataIndex: 'zzd',
                          key: 'zzd',
                          width: 80,
                          render: (val: string) => `${val}%`,
                        },
                        {
                          title: '活跃度',
                          dataIndex: 'hyd',
                          key: 'hyd',
                          width: 80,
                          render: (val: string) => `${val}%`,
                        },
                        {
                          title: '讲授占比',
                          dataIndex: 'jszb',
                          key: 'jszb',
                          width: 90,
                          render: (val: string) => `${val}%`,
                        },
                        {
                          title: '板书占比',
                          dataIndex: 'bszb',
                          key: 'bszb',
                          width: 90,
                          render: (val: string) => `${val}%`,
                        },
                        {
                          title: '用手机率',
                          dataIndex: 'ysjlv',
                          key: 'ysjlv',
                          width: 90,
                          render: (val: string) => `${val}%`,
                        },
                        {
                          title: '睡觉度',
                          dataIndex: 'sjd',
                          key: 'sjd',
                          width: 80,
                          render: (val: string) => `${val}%`,
                        },
                        {
                          title: '低头率',
                          dataIndex: 'dtlv',
                          key: 'dtlv',
                          width: 80,
                          render: (val: string) => `${val}%`,
                        },
                        {
                          title: '抬头率',
                          dataIndex: 'ttlv',
                          key: 'ttlv',
                          width: 80,
                          render: (val: string) => `${val}%`,
                        },
                      ]}
                    />
                  ),
                },
              ]}
            />
          )}
        </Spin>
      </Drawer>
    </div>
  );
}
