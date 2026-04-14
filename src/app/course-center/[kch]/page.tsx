'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  Tabs,
  Tag,
  App,
  Spin,
  Empty,
  Row,
  Col,
  Statistic,
  Divider,
  Table,
  Drawer,
  Select,
  Input,
  Descriptions,
} from 'antd';
import { BookOutlined, TeamOutlined, BarChartOutlined, ArrowLeftOutlined, CloseOutlined, SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { useParams, useRouter } from 'next/navigation';
import ActionButton from '@/app/tags/components/ActionButton';

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

// 教学班类型
interface TeachingClass {
  jxbh: string;
  jsgh: string;
  jsxm: string;
  xnxqdm: string;
  xnxqmc: string;
  kcdm: string;
  kcmc: string;
  skzc: string;
  skxq: string;
  ksjc: string;
  jsjc: string;
  jasdm: string;
  jxdd: string;
  jsszxqh: string;
  jsszxqmc: string;
  skbjh: string;
  skbjmc: string;
  kxh: string;
  kcksdwh: string;
  kcksdwmc: string;
  kkxnd: string;
  kkxqm: string;
  sksj: string;
  jxzy: string;
  krl: string;
  xdrs: string;
  xkxqh: string;
  xkrsxd: string;
  xknj: string;
  pkyq: string;
  jslxm: string;
  qsz: string;
  zzz: string;
  kcxzm: string;
  jxbmc: string;
  jxtz: string;
  kksm: string;
  tstamp: string;
}

// 课堂统计类型
interface ClassroomStats {
  xnxqmc: string;
  kckssj: string;
  kcjssj: string;
  rwcs: string;
  zzd: string;
  hyd: string;
  jszb: string;
  bszb: string;
  ysjlv: string;
  sjd: string;
  cjsj: string;
  dtlv: string;
  ttlv: string;
  tstamp: string;
  jxbh: string;
  wybs: string;
}

export default function CourseDetailPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const params = useParams();
  const kch = params.kch as string;

  const [loading, setLoading] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);
  const [teachingClasses, setTeachingClasses] = useState<TeachingClass[]>([]);
  const [teachingClassesLoading, setTeachingClassesLoading] = useState(false);
  const [classroomStats, setClassroomStats] = useState<ClassroomStats[]>([]);
  const [classroomStatsLoading, setClassroomStatsLoading] = useState(false);
  const [selectedJxbh, setSelectedJxbh] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('info');
  const [courseType, setCourseType] = useState<'undergraduate' | 'graduate'>('undergraduate');
  const [statsDrawerVisible, setStatsDrawerVisible] = useState(false);
  
  // 教学班筛选状态
  const [semesterFilter, setSemesterFilter] = useState<string>('');
  const [teacherFilter, setTeacherFilter] = useState<string>('');
  const [teachingClassPagination, setTeachingClassPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  
  // 教学班详情抽屉
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedTeachingClass, setSelectedTeachingClass] = useState<TeachingClass | null>(null);

  // 获取课程详情
  const fetchCourseDetail = useCallback(async () => {
    setLoading(true);
    try {
      // 先尝试获取本科生课程
      let response = await fetch(`/api/course-center?course_type=undergraduate&keyword=${kch}&page=1&per_page=1`);
      let result = await response.json();

      if (result.success && result.data.length > 0) {
        setCourse(result.data[0]);
        setCourseType('undergraduate');
        fetchTeachingClasses(result.data[0].kch, 'undergraduate');
      } else {
        // 尝试获取研究生课程
        response = await fetch(`/api/course-center?course_type=graduate&keyword=${kch}&page=1&per_page=1`);
        result = await response.json();

        if (result.success && result.data.length > 0) {
          setCourse(result.data[0]);
          setCourseType('graduate');
          fetchTeachingClasses(result.data[0].kch, 'graduate');
        } else {
          message.error('课程不存在');
        }
      }
    } catch (error) {
      message.error('获取课程详情失败');
    } finally {
      setLoading(false);
    }
  }, [kch, message]);

  // 获取教学班列表
  const fetchTeachingClasses = async (courseKch: string, type: 'undergraduate' | 'graduate') => {
    setTeachingClassesLoading(true);
    try {
      const response = await fetch(
        `/api/course-center?action=teaching-classes&kcdm=${courseKch}&course_type=${type}`
      );
      const result = await response.json();

      if (result.success) {
        setTeachingClasses(result.data);
        setTeachingClassPagination(prev => ({
          ...prev,
          total: result.data.length,
        }));
      } else {
        message.error(result.message || '获取教学班列表失败');
      }
    } catch (error) {
      message.error('获取教学班列表失败');
    } finally {
      setTeachingClassesLoading(false);
    }
  };

  // 获取课堂统计数据
  const fetchClassroomStats = async (jxbh: string) => {
    setClassroomStatsLoading(true);
    try {
      const response = await fetch(`/api/course-center?action=classroom-stats&jxbh=${jxbh}`);
      const result = await response.json();

      if (result.success) {
        setClassroomStats(result.data);
      } else {
        message.error(result.message || '获取课堂统计数据失败');
      }
    } catch (error) {
      message.error('获取课堂统计数据失败');
    } finally {
      setClassroomStatsLoading(false);
    }
  };

  // 处理查看课堂统计
  const handleViewStats = (jxbh: string) => {
    setSelectedJxbh(jxbh);
    setStatsDrawerVisible(true);
    fetchClassroomStats(jxbh);
  };
  
  // 处理查看详情
  const handleViewDetail = (record: TeachingClass) => {
    setSelectedTeachingClass(record);
    setDetailDrawerVisible(true);
  };

  useEffect(() => {
    if (kch) {
      fetchCourseDetail();
    }
  }, [kch, fetchCourseDetail]);

  // 获取唯一的学期列表
  const semesterOptions = useMemo(() => {
    const semesters = [...new Set(teachingClasses.map(item => item.xnxqmc).filter(Boolean))];
    return semesters.map(s => ({ value: s, label: s }));
  }, [teachingClasses]);
  
  // 获取唯一的教师列表
  const teacherOptions = useMemo(() => {
    const teachers = [...new Set(teachingClasses.map(item => item.jsxm).filter(Boolean))];
    return teachers.map(t => ({ value: t, label: t }));
  }, [teachingClasses]);

  // 合并教学班数据（按jxbh分组，合并教师、时间、地点等信息）
  const mergedTeachingClasses = useMemo(() => {
    const grouped = new Map<string, TeachingClass[]>();
    
    // 先筛选
    const filtered = teachingClasses.filter(item => {
      const matchSemester = !semesterFilter || item.xnxqmc === semesterFilter;
      const matchTeacher = !teacherFilter || item.jsxm === teacherFilter;
      return matchSemester && matchTeacher;
    });
    
    // 按jxbh分组
    filtered.forEach(item => {
      if (!grouped.has(item.jxbh)) {
        grouped.set(item.jxbh, []);
      }
      grouped.get(item.jxbh)!.push(item);
    });
    
    // 合并每组数据
    return Array.from(grouped.values()).map(group => {
      const first = group[0];
      // 合并教师信息
      const teachers = [...new Set(group.map(item => `${item.jsxm} (${item.jsgh})`))].join(', ');
      // 合并上课时间
      const times = [...new Set(group.map(item => item.sksj).filter(Boolean))].join('; ');
      // 合并上课地点
      const locations = [...new Set(group.map(item => item.jxdd).filter(Boolean))].join('; ');
      // 合并上课周次
      const weeks = [...new Set(group.map(item => item.skzc).filter(Boolean))].join('; ');
      // 合并上课班级
      const classes = [...new Set(group.map(item => item.skbjmc).filter(Boolean))].join(', ');
      
      return {
        ...first,
        jsxm: teachers || first.jsxm,
        sksj: times || first.sksj,
        jxdd: locations || first.jxdd,
        skzc: weeks || first.skzc,
        skbjmc: classes || first.skbjmc,
        _mergedItems: group, // 保存原始数据用于详情展示
      };
    });
  }, [teachingClasses, semesterFilter, teacherFilter]);

  // 分页后的数据
  const paginatedTeachingClasses = useMemo(() => {
    const start = (teachingClassPagination.current - 1) * teachingClassPagination.pageSize;
    const end = start + teachingClassPagination.pageSize;
    return mergedTeachingClasses.slice(start, end);
  }, [mergedTeachingClasses, teachingClassPagination]);

  // 教学班表格列定义
  const teachingClassColumns = [
    {
      title: '教学班名称',
      dataIndex: 'jxbmc',
      key: 'jxbmc',
      width: 180,
      render: (text: string, record: TeachingClass) => (
        <Button type="link" onClick={() => handleViewDetail(record)}>
          {text || record.jxbh}
        </Button>
      ),
    },
    {
      title: '学期',
      dataIndex: 'xnxqmc',
      key: 'xnxqmc',
      width: 180,
    },
    {
      title: '教师',
      dataIndex: 'jsxm',
      key: 'jsxm',
      width: 200,
    },
    {
      title: '上课班级',
      dataIndex: 'skbjmc',
      key: 'skbjmc',
      width: 150,
    },
    {
      title: '上课时间',
      dataIndex: 'sksj',
      key: 'sksj',
      width: 150,
    },
    {
      title: '上课地点',
      dataIndex: 'jxdd',
      key: 'jxdd',
      width: 150,
    },
    {
      title: '课容量',
      dataIndex: 'krl',
      key: 'krl',
      width: 80,
      render: (text: string, record: TeachingClass) => (
        <span>{text}/{record.xdrs}人</span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (_: unknown, record: TeachingClass) => (
        <Space>
          <ActionButton
            icon={<BarChartOutlined />}
            tooltip="查看课堂统计"
            onClick={() => handleViewStats(record.jxbh)}
          />
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!course) {
    return (
      <div style={{ padding: 24 }}>
        <Empty description="课程不存在" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Card style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/course-center')}>
          返回课程列表
        </Button>
      </Card>

      <Title level={2}>
        <Space>
          <BookOutlined />
          {course.kcmc}
        </Space>
      </Title>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'info',
              label: (
                <Space>
                  <BookOutlined />
                  课程信息
                </Space>
              ),
              children: (
                <>
                  <Descriptions bordered column={2}>
                    <Descriptions.Item label="课程号">{course.kch}</Descriptions.Item>
                    <Descriptions.Item label="课程名称">{course.kcmc}</Descriptions.Item>
                    <Descriptions.Item label="英文名称">{course.kcywmc}</Descriptions.Item>
                    <Descriptions.Item label="负责人">{course.kcfzrh}</Descriptions.Item>
                    <Descriptions.Item label="开设单位">{course.kcksdwmc}</Descriptions.Item>
                    <Descriptions.Item label="学分">{course.xf}</Descriptions.Item>
                    <Descriptions.Item label="总学时">{course.zxs}</Descriptions.Item>
                    <Descriptions.Item label="理论学时">{course.llxs}</Descriptions.Item>
                    <Descriptions.Item label="实验学时">{course.syxs}</Descriptions.Item>
                    <Descriptions.Item label="实践学时">{course.sjxs}</Descriptions.Item>
                    <Descriptions.Item label="周学时">{course.zhxs}</Descriptions.Item>
                    <Descriptions.Item label="课程分类">{course.kcflmc}</Descriptions.Item>
                    <Descriptions.Item label="课程层次">{course.kcccmc}</Descriptions.Item>
                    <Descriptions.Item label="考试类型">{course.kslxdmmc}</Descriptions.Item>
                    <Descriptions.Item label="授课语种">{course.skyzmc}</Descriptions.Item>
                  </Descriptions>

                  <Divider />

                  <Title level={5}>课程简介</Title>
                  <p>{course.kcjj || '暂无简介'}</p>

                  <Title level={5}>课程目标</Title>
                  <p>{course.kcmb || '暂无目标'}</p>

                  <Title level={5}>教材</Title>
                  <p>{course.jc || '暂无教材信息'}</p>

                  <Title level={5}>参考书目</Title>
                  <p>{course.cksm || '暂无参考书目'}</p>
                </>
              ),
            },
            {
              key: 'classes',
              label: (
                <Space>
                  <TeamOutlined />
                  教学班 ({mergedTeachingClasses.length})
                </Space>
              ),
              children: (
                <Spin spinning={teachingClassesLoading}>
                  {/* 筛选栏 */}
                  <Card style={{ marginBottom: 16 }}>
                    <Space wrap>
                      <Select
                        placeholder="选择学期"
                        value={semesterFilter || undefined}
                        onChange={setSemesterFilter}
                        style={{ width: 200 }}
                        allowClear
                      >
                        {semesterOptions.map(opt => (
                          <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                        ))}
                      </Select>
                      <Select
                        placeholder="选择教师"
                        value={teacherFilter || undefined}
                        onChange={setTeacherFilter}
                        style={{ width: 150 }}
                        allowClear
                      >
                        {teacherOptions.map(opt => (
                          <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                        ))}
                      </Select>
                      <Button onClick={() => {
                        setSemesterFilter('');
                        setTeacherFilter('');
                        setTeachingClassPagination(prev => ({ ...prev, current: 1 }));
                      }}>
                        重置筛选
                      </Button>
                    </Space>
                  </Card>

                  {/* 教学班表格 */}
                  <Table
                    columns={teachingClassColumns}
                    dataSource={paginatedTeachingClasses}
                    rowKey="jxbh"
                    loading={teachingClassesLoading}
                    scroll={{ x: 1200 }}
                    pagination={{
                      ...teachingClassPagination,
                      total: mergedTeachingClasses.length,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `共 ${total} 条记录`,
                      onChange: (page, pageSize) => {
                        setTeachingClassPagination({
                          current: page,
                          pageSize: pageSize || 10,
                          total: mergedTeachingClasses.length,
                        });
                      },
                    }}
                  />
                </Spin>
              ),
            },
          ]}
        />
      </Card>

      {/* 课堂统计抽屉 */}
      <Drawer
        title={
          <Space>
            <BarChartOutlined />
            课堂统计 - {selectedJxbh}
          </Space>
        }
        size="large"
        open={statsDrawerVisible}
        onClose={() => setStatsDrawerVisible(false)}
        extra={
          <Button icon={<CloseOutlined />} onClick={() => setStatsDrawerVisible(false)}>
            关闭
          </Button>
        }
      >
        <Spin spinning={classroomStatsLoading}>
          {classroomStats.length === 0 ? (
            <Empty description="暂无课堂统计数据" />
          ) : (
            <>
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={4}>
                  <Statistic
                    title="平均专注度"
                    value={(
                      classroomStats.reduce((sum, s) => sum + parseFloat(s.zzd || '0'), 0) /
                      classroomStats.length
                    ).toFixed(2)}
                    suffix="%"
                  />
                </Col>
                <Col span={4}>
                  <Statistic
                    title="平均活跃度"
                    value={(
                      classroomStats.reduce((sum, s) => sum + parseFloat(s.hyd || '0'), 0) /
                      classroomStats.length
                    ).toFixed(2)}
                    suffix="%"
                  />
                </Col>
                <Col span={4}>
                  <Statistic
                    title="平均抬头率"
                    value={(
                      classroomStats.reduce((sum, s) => sum + parseFloat(s.ttlv || '0'), 0) /
                      classroomStats.length
                    ).toFixed(2)}
                    suffix="%"
                  />
                </Col>
                <Col span={4}>
                  <Statistic
                    title="平均低头率"
                    value={(
                      classroomStats.reduce((sum, s) => sum + parseFloat(s.dtlv || '0'), 0) /
                      classroomStats.length
                    ).toFixed(2)}
                    suffix="%"
                  />
                </Col>
                <Col span={4}>
                  <Statistic
                    title="讲授占比"
                    value={(
                      classroomStats.reduce((sum, s) => sum + parseFloat(s.jszb || '0'), 0) /
                      classroomStats.length
                    ).toFixed(2)}
                    suffix="%"
                  />
                </Col>
                <Col span={4}>
                  <Statistic
                    title="板书占比"
                    value={(
                      classroomStats.reduce((sum, s) => sum + parseFloat(s.bszb || '0'), 0) /
                      classroomStats.length
                    ).toFixed(2)}
                    suffix="%"
                  />
                </Col>
              </Row>

              <Divider />

              <Title level={5}>课堂记录详情</Title>
              <Table
                dataSource={classroomStats}
                rowKey="wybs"
                size="small"
                pagination={{ pageSize: 10 }}
                columns={[
                  {
                    title: '学期',
                    dataIndex: 'xnxqmc',
                    key: 'xnxqmc',
                  },
                  {
                    title: '开始时间',
                    dataIndex: 'kckssj',
                    key: 'kckssj',
                  },
                  {
                    title: '结束时间',
                    dataIndex: 'kcjssj',
                    key: 'kcjssj',
                  },
                  {
                    title: '专注度',
                    dataIndex: 'zzd',
                    key: 'zzd',
                    render: (v: string) => <Tag color="blue">{v}%</Tag>,
                  },
                  {
                    title: '活跃度',
                    dataIndex: 'hyd',
                    key: 'hyd',
                    render: (v: string) => <Tag color="green">{v}%</Tag>,
                  },
                  {
                    title: '抬头率',
                    dataIndex: 'ttlv',
                    key: 'ttlv',
                    render: (v: string) => <Tag color="cyan">{v}%</Tag>,
                  },
                  {
                    title: '低头率',
                    dataIndex: 'dtlv',
                    key: 'dtlv',
                    render: (v: string) => <Tag color="orange">{v}%</Tag>,
                  },
                  {
                    title: '用手机率',
                    dataIndex: 'ysjlv',
                    key: 'ysjlv',
                    render: (v: string) => <Tag color="red">{v}%</Tag>,
                  },
                  {
                    title: '睡觉度',
                    dataIndex: 'sjd',
                    key: 'sjd',
                    render: (v: string) => <Tag color="purple">{v}%</Tag>,
                  },
                ]}
              />
            </>
          )}
        </Spin>
      </Drawer>
      
      {/* 教学班详情抽屉 */}
      <Drawer
        title={
          <Space>
            <TeamOutlined />
            教学班详情 - {selectedTeachingClass?.jxbh}
          </Space>
        }
        size="large"
        open={detailDrawerVisible}
        onClose={() => setDetailDrawerVisible(false)}
        extra={
          <Button icon={<CloseOutlined />} onClick={() => setDetailDrawerVisible(false)}>
            关闭
          </Button>
        }
      >
        {selectedTeachingClass && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="教学班号">{selectedTeachingClass.jxbh}</Descriptions.Item>
            <Descriptions.Item label="教学班名称">{selectedTeachingClass.jxbmc}</Descriptions.Item>
            <Descriptions.Item label="学期">{selectedTeachingClass.xnxqmc}</Descriptions.Item>
            <Descriptions.Item label="课序号">{selectedTeachingClass.kxh}</Descriptions.Item>
            <Descriptions.Item label="教师">{selectedTeachingClass.jsxm} ({selectedTeachingClass.jsgh})</Descriptions.Item>
            <Descriptions.Item label="上课班级">{selectedTeachingClass.skbjmc}</Descriptions.Item>
            <Descriptions.Item label="上课周次">{selectedTeachingClass.skzc}</Descriptions.Item>
            <Descriptions.Item label="上课时间">{selectedTeachingClass.sksj}</Descriptions.Item>
            <Descriptions.Item label="上课地点">{selectedTeachingClass.jxdd}</Descriptions.Item>
            <Descriptions.Item label="教室">{selectedTeachingClass.jasdm}</Descriptions.Item>
            <Descriptions.Item label="校区">{selectedTeachingClass.jsszxqmc}</Descriptions.Item>
            <Descriptions.Item label="课容量">{selectedTeachingClass.krl}人</Descriptions.Item>
            <Descriptions.Item label="修读人数">{selectedTeachingClass.xdrs}人</Descriptions.Item>
            <Descriptions.Item label="教学资源">{selectedTeachingClass.jxzy}</Descriptions.Item>
            <Descriptions.Item label="课程性质">{selectedTeachingClass.kcxzm}</Descriptions.Item>
            <Descriptions.Item label="教学特征">{selectedTeachingClass.jxtz}</Descriptions.Item>
            <Descriptions.Item label="开课说明">{selectedTeachingClass.kksm}</Descriptions.Item>
            <Descriptions.Item label="排课要求">{selectedTeachingClass.pkyq}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
}
