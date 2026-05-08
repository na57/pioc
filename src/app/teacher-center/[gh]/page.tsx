'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  Tabs,
  Descriptions,
  Button,
  Space,
  Avatar,
  Typography,
  Tag,
  Spin,
  App,
} from 'antd';
import {
  ArrowLeftOutlined,
  UserOutlined,
} from '@ant-design/icons';
import ResearchDashboard from '../components/ResearchDashboard';
import CareerTimeline from '../components/CareerTimeline';
import TeachingDashboard from '../components/TeachingDashboard';
import AISummary from '../components/AISummary';

const { Title, Text } = Typography;

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
  csrq?: string;
  zzmmmmc?: string;
  zgxlmmc?: string;
  zgxwmmc?: string;
  yjfx?: string;
  cjgzny?: string;
  lxrq?: string;
}

export default function TeacherDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { message } = App.useApp();
  const gh = params.gh as string;

  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [activeTab, setActiveTab] = useState('basic');

  // 获取教师基本信息
  const fetchTeacherBasic = async () => {
    try {
      const response = await fetch(`/api/teacher-center?action=detail&gh=${gh}`);
      const result = await response.json();
      
      if (result.success) {
        setTeacher(result.data.basic);
      } else {
        message.error(result.error || '获取数据失败');
      }
    } catch (error) {
      console.error('获取教师详情失败:', error);
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始化
  useEffect(() => {
    if (gh) {
      fetchTeacherBasic();
    }
  }, [gh]);

  // 返回列表
  const handleBack = () => {
    router.push('/teacher-center');
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin size="large" description="加载中..." />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div>
        <Card>
          <Text>教师不存在或已被删除</Text>
          <div style={{ marginTop: 16 }}>
            <Button onClick={handleBack}>返回列表</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {/* 头部信息 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Space size="large">
            <Avatar
              src={teacher.zp || null}
              icon={<UserOutlined />}
              size={80}
            />
            <div>
              <Title level={3} style={{ margin: 0 }}>
                {teacher.xm}
                <Tag color="blue" style={{ marginLeft: 8 }}>{teacher.gh}</Tag>
              </Title>
              <div style={{ marginTop: 8 }}>
                <Text>{teacher.dwmc}</Text>
                <Text style={{ marginLeft: 16 }}>职称: {teacher.zyjszwdmmc}</Text>
                {teacher.dzzw && (
                  <Text style={{ marginLeft: 16 }}>职务: {teacher.dzzw}</Text>
                )}
              </div>
              <div style={{ marginTop: 4 }}>
                <Tag color={teacher.dqztmmc === '在岗' ? 'green' : 'default'}>
                  {teacher.dqztmmc}
                </Tag>
              </div>
            </div>
          </Space>
          
          <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
            返回列表
          </Button>
        </div>
      </Card>

      {/* 标签页 */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'basic',
            label: '基本信息',
            children: (
              <Card>
                <Descriptions bordered column={2}>
                  <Descriptions.Item label="工号">{teacher.gh}</Descriptions.Item>
                  <Descriptions.Item label="姓名">{teacher.xm}</Descriptions.Item>
                  <Descriptions.Item label="性别">{teacher.xbmmc}</Descriptions.Item>
                  <Descriptions.Item label="出生日期">{teacher.csrq || '-'}</Descriptions.Item>
                  <Descriptions.Item label="单位">{teacher.dwmc}</Descriptions.Item>
                  <Descriptions.Item label="职称">{teacher.zyjszwdmmc}</Descriptions.Item>
                  <Descriptions.Item label="职务">{teacher.dzzw || '-'}</Descriptions.Item>
                  <Descriptions.Item label="政治面貌">{teacher.zzmmmmc || '-'}</Descriptions.Item>
                  <Descriptions.Item label="最高学历">{teacher.zgxlmmc || '-'}</Descriptions.Item>
                  <Descriptions.Item label="最高学位">{teacher.zgxwmmc || '-'}</Descriptions.Item>
                  <Descriptions.Item label="研究方向" span={2}>{teacher.yjfx || '-'}</Descriptions.Item>
                  <Descriptions.Item label="手机号码">{teacher.yddh || '-'}</Descriptions.Item>
                  <Descriptions.Item label="电子邮箱">{teacher.dzyx || '-'}</Descriptions.Item>
                  <Descriptions.Item label="参加工作年月">{teacher.cjgzny || '-'}</Descriptions.Item>
                  <Descriptions.Item label="来校日期">{teacher.lxrq || '-'}</Descriptions.Item>
                  <Descriptions.Item label="当前状态">{teacher.dqztmmc}</Descriptions.Item>
                </Descriptions>
              </Card>
            ),
          },
          {
            key: 'career',
            label: '教职生涯',
            children: <CareerTimeline gh={gh} />,
          },
          {
            key: 'research',
            label: '科研情况',
            children: <ResearchDashboard gh={gh} />,
          },
          {
            key: 'teaching',
            label: '教学情况',
            children: <TeachingDashboard gh={gh} />,
          },
          {
            key: 'ai-summary',
            label: 'AI总结',
            children: <AISummary gh={gh} />,
          },
        ]}
      />
    </div>
  );
}
