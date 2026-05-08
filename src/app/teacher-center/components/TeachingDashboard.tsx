'use client';

import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Spin, Empty, App, Tag, Drawer, Descriptions } from 'antd';
import {
  BookOutlined,
  ReadOutlined,
  ClockCircleOutlined,
  AuditOutlined,
  TeamOutlined,
  TrophyOutlined,
  ProjectOutlined,
} from '@ant-design/icons';
import FriendlyTime from '@/components/FriendlyTime';

interface TeachingStats {
  undergraduateCourseCount: number;
  graduateCourseCount: number;
  totalWorkloadHours: number;
  supervisionCount: number;
}

interface Teaching {
  jxbh?: string;
  kcdm?: string;
  kcmc: string;
  xnxqmc?: string;
  xnxqdm?: string;
  skbjsmc?: string;
  yxmc?: string;
  xdrs?: number;
  krl?: number;
}

interface Workload {
  kcm: string;
  xnxqmc?: string;
  xkrs?: number;
  xs?: number;
}

interface TeachingProject {
  xmmc: string;
  xmlb?: string;
  lxsj?: string;
  brpm?: string;
}

interface SupervisionRecord {
  kcmc?: string;
  tksj?: string;
  zf?: string;
  pjjy?: string;
  xnxqmc?: string;
}

interface CompetitionAward {
  jsmc: string;
  hjdj?: string;
  hjsj?: string;
  hjxszzxm?: string;
}

interface TeachingDashboardProps {
  gh: string;
}

export default function TeachingDashboard({ gh }: TeachingDashboardProps) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TeachingStats>({
    undergraduateCourseCount: 0,
    graduateCourseCount: 0,
    totalWorkloadHours: 0,
    supervisionCount: 0,
  });
  const [undergraduateTeaching, setUndergraduateTeaching] = useState<Teaching[]>([]);
  const [graduateTeaching, setGraduateTeaching] = useState<Teaching[]>([]);
  const [undergraduateWorkload, setUndergraduateWorkload] = useState<Workload[]>([]);
  const [graduateWorkload, setGraduateWorkload] = useState<Workload[]>([]);
  const [undergraduateProjects, setUndergraduateProjects] = useState<TeachingProject[]>([]);
  const [graduateProjects, setGraduateProjects] = useState<TeachingProject[]>([]);
  const [supervisionRecords, setSupervisionRecords] = useState<SupervisionRecord[]>([]);
  const [competitionAwards, setCompetitionAwards] = useState<CompetitionAward[]>([]);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Teaching | null>(null);
  const [courseType, setCourseType] = useState<'undergraduate' | 'graduate'>('undergraduate');

  const fetchTeachingData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/teacher-center?action=teaching&gh=${gh}`);
      const result = await response.json();
      
      if (result.success) {
        setStats(result.data.stats);
        setUndergraduateTeaching(result.data.undergraduateTeaching);
        setGraduateTeaching(result.data.graduateTeaching);
        setUndergraduateWorkload(result.data.undergraduateWorkload);
        setGraduateWorkload(result.data.graduateWorkload);
        setUndergraduateProjects(result.data.undergraduateProjects);
        setGraduateProjects(result.data.graduateProjects);
        setSupervisionRecords(result.data.supervisionRecords);
        setCompetitionAwards(result.data.competitionAwards);
      } else {
        message.error(result.error || '获取数据失败');
      }
    } catch (error) {
      console.error('获取教学数据失败:', error);
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (gh) {
      fetchTeachingData();
    }
  }, [gh]);

  const handleOpenCourseDetail = (course: Teaching, type: 'undergraduate' | 'graduate') => {
    setSelectedCourse(course);
    setCourseType(type);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedCourse(null);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin size="large" description="加载中..." />
      </div>
    );
  }

  const hasData = stats.undergraduateCourseCount > 0 || 
                  stats.graduateCourseCount > 0 || 
                  stats.totalWorkloadHours > 0 ||
                  stats.supervisionCount > 0;

  if (!hasData) {
    return (
      <Card>
        <Empty description="暂无教学数据" />
      </Card>
    );
  }

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="本科生授课"
              value={stats.undergraduateCourseCount}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="研究生授课"
              value={stats.graduateCourseCount}
              prefix={<ReadOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总教学工作量"
              value={stats.totalWorkloadHours}
              suffix="学时"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="督导听课"
              value={stats.supervisionCount}
              prefix={<AuditOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 本科生授课 */}
      {undergraduateTeaching.length > 0 && (
        <Card title="本科生授课" style={{ marginBottom: 16 }}>
          <Table
            dataSource={undergraduateTeaching}
            rowKey={(record) => record.jxbh || record.kcdm || `${record.kcmc}-${record.xnxqdm}`}
            pagination={{ pageSize: 5 }}
            size="small"
            columns={[
              {
                title: '课程名称',
                dataIndex: 'kcmc',
                ellipsis: true,
                render: (text: string, record: Teaching) => (
                  <a onClick={() => handleOpenCourseDetail(record, 'undergraduate')}>
                    {text || '<空>'}
                  </a>
                ),
              },
              { title: '学期', dataIndex: 'xnxqmc', width: 120 },
              { title: '上课班级', dataIndex: 'skbjsmc', width: 150 },
              { title: '修读人数', dataIndex: 'xdrs', width: 100 },
            ]}
          />
        </Card>
      )}

      {/* 研究生授课 */}
      {graduateTeaching.length > 0 && (
        <Card title="研究生授课" style={{ marginBottom: 16 }}>
          <Table
            dataSource={graduateTeaching}
            rowKey={(record) => record.jxbh || record.kcdm || `${record.kcmc}-${record.xnxqdm}`}
            pagination={{ pageSize: 5 }}
            size="small"
            columns={[
              {
                title: '课程名称',
                dataIndex: 'kcmc',
                ellipsis: true,
                render: (text: string, record: Teaching) => (
                  <a onClick={() => handleOpenCourseDetail(record, 'graduate')}>
                    {text || '<空>'}
                  </a>
                ),
              },
              { title: '学期', dataIndex: 'xnxqmc', width: 120 },
              { title: '院系', dataIndex: 'yxmc', width: 150 },
              { title: '修读人数', dataIndex: 'xdrs', width: 100 },
            ]}
          />
        </Card>
      )}

      {/* 教学工作量 */}
      {(undergraduateWorkload.length > 0 || graduateWorkload.length > 0) && (
        <Card title="教学工作量" style={{ marginBottom: 16 }}>
          <Table
            dataSource={[...undergraduateWorkload, ...graduateWorkload]}
            rowKey={(record) => `${record.kcm}-${record.xnxqmc}`}
            pagination={{ pageSize: 5 }}
            size="small"
            columns={[
              { title: '课程名称', dataIndex: 'kcm', ellipsis: true },
              { title: '学期', dataIndex: 'xnxqmc', width: 120 },
              { title: '选课人数', dataIndex: 'xkrs', width: 100 },
              { title: '学时', dataIndex: 'xs', width: 80 },
            ]}
          />
        </Card>
      )}

      {/* 教学研究项目 */}
      {(undergraduateProjects.length > 0 || graduateProjects.length > 0) && (
        <Card title="教学研究项目" style={{ marginBottom: 16 }}>
          <Table
            dataSource={[...undergraduateProjects, ...graduateProjects]}
            rowKey={(record) => `${record.xmmc}-${record.lxsj}`}
            pagination={{ pageSize: 5 }}
            size="small"
            columns={[
              { title: '项目名称', dataIndex: 'xmmc', ellipsis: true },
              { title: '项目类别', dataIndex: 'xmlb', width: 150 },
              { title: '立项时间', dataIndex: 'lxsj', width: 120, render: (text) => <FriendlyTime date={text} /> },
              { title: '本人排名', dataIndex: 'brpm', width: 100 },
            ]}
          />
        </Card>
      )}

      {/* 督导记录 */}
      {supervisionRecords.length > 0 && (
        <Card title="督导听课记录" style={{ marginBottom: 16 }}>
          <Table
            dataSource={supervisionRecords}
            rowKey="tksj"
            pagination={{ pageSize: 5 }}
            size="small"
            columns={[
              { title: '课程名称', dataIndex: 'kcmc', ellipsis: true },
              { title: '学期', dataIndex: 'xnxqmc', width: 120 },
              { title: '听课时间', dataIndex: 'tksj', width: 120, render: (text) => <FriendlyTime date={text} /> },
              { title: '总分', dataIndex: 'zf', width: 80 },
            ]}
          />
        </Card>
      )}

      {/* 指导学生竞赛获奖 */}
      {competitionAwards.length > 0 && (
        <Card title="指导学生竞赛获奖">
          <Table
            dataSource={competitionAwards}
            rowKey={(record) => `${record.jsmc}-${record.hjsj}`}
            pagination={{ pageSize: 5 }}
            size="small"
            columns={[
              { title: '竞赛名称', dataIndex: 'jsmc', ellipsis: true },
              { title: '获奖等级', dataIndex: 'hjdj', width: 120 },
              { title: '获奖时间', dataIndex: 'hjsj', width: 120, render: (text) => <FriendlyTime date={text} /> },
              { title: '获奖学生', dataIndex: 'hjxszzxm', width: 100 },
            ]}
          />
        </Card>
      )}

      {/* 课程详情抽屉 */}
      <Drawer
        title={courseType === 'undergraduate' ? '本科生授课详情' : '研究生授课详情'}
        size="large"
        open={drawerOpen}
        onClose={handleCloseDrawer}
      >
        {selectedCourse && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="课程名称">{selectedCourse.kcmc || '<空>'}</Descriptions.Item>
            <Descriptions.Item label="课程代码">{selectedCourse.kcdm || '-'}</Descriptions.Item>
            <Descriptions.Item label="教学班ID">{selectedCourse.jxbh || '-'}</Descriptions.Item>
            <Descriptions.Item label="学期">{selectedCourse.xnxqmc || '-'}</Descriptions.Item>
            <Descriptions.Item label="学期代码">{selectedCourse.xnxqdm || '-'}</Descriptions.Item>
            <Descriptions.Item label="上课班级">{selectedCourse.skbjsmc || '-'}</Descriptions.Item>
            <Descriptions.Item label="院系">{selectedCourse.yxmc || '-'}</Descriptions.Item>
            <Descriptions.Item label="修读人数">{selectedCourse.xdrs ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="容量">{selectedCourse.krl ?? '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
}
