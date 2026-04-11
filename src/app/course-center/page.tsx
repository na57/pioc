'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Input,
  Select,
  Button,
  Space,
  Typography,
  Drawer,
  Descriptions,
  Tabs,
  Tag,
  message,
  Spin,
  Empty,
  Row,
  Col,
  Statistic,
  Divider,
  Flex,
} from 'antd';
import { SearchOutlined, BookOutlined, TeamOutlined, BarChartOutlined } from '@ant-design/icons';

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
  // 研究生特有字段
  kcjbm?: string;
  kcjbmc?: string;
  kclbm?: string;
  kclbmc?: string;
  skyylxm?: string;
  kcksrq?: string;
  sfyjc?: string;
  sfyx?: string;
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

export default function CourseCenterPage() {
  const [courseType, setCourseType] = useState<'undergraduate' | 'graduate'>('undergraduate');
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [searchKeyword, setSearchKeyword] = useState('');

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [teachingClasses, setTeachingClasses] = useState<TeachingClass[]>([]);
  const [teachingClassesLoading, setTeachingClassesLoading] = useState(false);
  const [classroomStats, setClassroomStats] = useState<ClassroomStats[]>([]);
  const [classroomStatsLoading, setClassroomStatsLoading] = useState(false);
  const [selectedJxbh, setSelectedJxbh] = useState<string>('');

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
  }, [courseType, searchKeyword]);

  // 获取教学班列表
  const fetchTeachingClasses = async (kcdm: string) => {
    setTeachingClassesLoading(true);
    try {
      const response = await fetch(
        `/api/course-center?action=teaching-classes&kcdm=${kcdm}&course_type=${courseType}`
      );
      const result = await response.json();

      if (result.success) {
        setTeachingClasses(result.data);
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
    fetchCourses(1);
  };

  // 处理课程类型切换
  const handleCourseTypeChange = (value: 'undergraduate' | 'graduate') => {
    setCourseType(value);
    setSearchKeyword('');
  };

  // 打开课程详情抽屉
  const openCourseDetail = (course: Course) => {
    setSelectedCourse(course);
    setDrawerVisible(true);
    setSelectedJxbh('');
    setClassroomStats([]);
    fetchTeachingClasses(course.kch);
  };

  // 处理教学班选择
  const handleTeachingClassSelect = (jxbh: string) => {
    setSelectedJxbh(jxbh);
    fetchClassroomStats(jxbh);
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
        <Button type="link" onClick={() => openCourseDetail(record)}>
          {text}
        </Button>
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

  // 按教学班号分组
  const groupedTeachingClasses = teachingClasses.reduce((acc, item) => {
    const jxbh = item.jxbh;
    if (!acc[jxbh]) {
      acc[jxbh] = [];
    }
    acc[jxbh].push(item);
    return acc;
  }, {} as Record<string, TeachingClass[]>);

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
          <Input
            placeholder="请输入课程号、课程名称、开课单位或负责人进行搜索"
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

      {/* 课程详情抽屉 */}
      <Drawer
        title={
          <Space>
            <BookOutlined />
            {selectedCourse?.kcmc}
          </Space>
        }
        size="large"
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        {selectedCourse && (
          <Tabs
            defaultActiveKey="info"
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
                      <Descriptions.Item label="课程号">{selectedCourse.kch}</Descriptions.Item>
                      <Descriptions.Item label="课程名称">{selectedCourse.kcmc}</Descriptions.Item>
                      <Descriptions.Item label="英文名称">{selectedCourse.kcywmc}</Descriptions.Item>
                      <Descriptions.Item label="负责人">{selectedCourse.kcfzrh}</Descriptions.Item>
                      <Descriptions.Item label="开设单位">{selectedCourse.kcksdwmc}</Descriptions.Item>
                      <Descriptions.Item label="学分">{selectedCourse.xf}</Descriptions.Item>
                      <Descriptions.Item label="总学时">{selectedCourse.zxs}</Descriptions.Item>
                      <Descriptions.Item label="理论学时">{selectedCourse.llxs}</Descriptions.Item>
                      <Descriptions.Item label="实验学时">{selectedCourse.syxs}</Descriptions.Item>
                      <Descriptions.Item label="实践学时">{selectedCourse.sjxs}</Descriptions.Item>
                      <Descriptions.Item label="周学时">{selectedCourse.zhxs}</Descriptions.Item>
                      <Descriptions.Item label="课程分类">{selectedCourse.kcflmc}</Descriptions.Item>
                      <Descriptions.Item label="课程层次">{selectedCourse.kcccmc}</Descriptions.Item>
                      <Descriptions.Item label="考试类型">{selectedCourse.kslxdmmc}</Descriptions.Item>
                      <Descriptions.Item label="授课语种">{selectedCourse.skyzmc}</Descriptions.Item>
                    </Descriptions>

                    <Divider />

                    <Title level={5}>课程简介</Title>
                    <p>{selectedCourse.kcjj || '暂无简介'}</p>

                    <Title level={5}>课程目标</Title>
                    <p>{selectedCourse.kcmb || '暂无目标'}</p>

                    <Title level={5}>教材</Title>
                    <p>{selectedCourse.jc || '暂无教材信息'}</p>

                    <Title level={5}>参考书目</Title>
                    <p>{selectedCourse.cksm || '暂无参考书目'}</p>
                  </>
                ),
              },
              {
                key: 'classes',
                label: (
                  <Space>
                    <TeamOutlined />
                    教学班 ({teachingClasses.length})
                  </Space>
                ),
                children: (
                  <Spin spinning={teachingClassesLoading}>
                    {Object.keys(groupedTeachingClasses).length === 0 ? (
                      <Empty description="暂无教学班信息" />
                    ) : (
                      <Flex gap="middle" vertical>
                        {Object.entries(groupedTeachingClasses).map(([jxbh, classes]) => (
                          <Card
                            key={jxbh}
                            style={{ width: '100%' }}
                            title={`教学班号: ${jxbh}`}
                            extra={
                              <Button
                                type={selectedJxbh === jxbh ? 'primary' : 'default'}
                                size="small"
                                onClick={() => handleTeachingClassSelect(jxbh)}
                              >
                                查看课堂统计
                              </Button>
                            }
                          >
                            <Flex gap="small" vertical>
                              {classes.map((item, index) => (
                                <div
                                  key={index}
                                  style={{
                                    padding: '12px 0',
                                    borderBottom: index < classes.length - 1 ? '1px solid #f0f0f0' : 'none'
                                  }}
                                >
                                  <Space orientation="vertical" style={{ width: '100%' }}>
                                    <Row gutter={16}>
                                      <Col span={6}>
                                        <strong>学期:</strong> {item.xnxqmc}
                                      </Col>
                                      <Col span={6}>
                                        <strong>教师:</strong> {item.jsxm} ({item.jsgh})
                                      </Col>
                                      <Col span={6}>
                                        <strong>上课班级:</strong> {item.skbjmc}
                                      </Col>
                                      <Col span={6}>
                                        <strong>课容量:</strong> {item.krl} / {item.xdrs}人
                                      </Col>
                                    </Row>
                                    <Row gutter={16}>
                                      <Col span={12}>
                                        <strong>上课时间:</strong> {item.sksj}
                                      </Col>
                                      <Col span={12}>
                                        <strong>上课地点:</strong> {item.jxdd}
                                      </Col>
                                    </Row>
                                  </Space>
                                </div>
                              ))}
                            </Flex>
                          </Card>
                        ))}
                      </Flex>
                    )}
                  </Spin>
                ),
              },
              {
                key: 'stats',
                label: (
                  <Space>
                    <BarChartOutlined />
                    课堂统计
                  </Space>
                ),
                children: !selectedJxbh ? (
                  <Empty description="请先选择一个教学班查看课堂统计" />
                ) : (
                  <Spin spinning={classroomStatsLoading}>
                    {classroomStats.length === 0 ? (
                      <Empty description="暂无课堂统计数据" />
                    ) : (
                      <>
                        <Title level={5}>教学班号: {selectedJxbh}</Title>
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
                ),
              },
            ]}
          />
        )}
      </Drawer>
    </div>
  );
}
