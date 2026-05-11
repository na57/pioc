'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, Button, Row, Col, Typography, App, Empty } from 'antd';
import { RobotOutlined, PlayCircleOutlined, CheckCircleOutlined, BookOutlined, TrophyOutlined, TeamOutlined, ExperimentOutlined } from '@ant-design/icons';
import AiSummaryRenderer from '@/components/AiSummaryRenderer';

const { Title, Paragraph, Text } = Typography;

interface AISummaryProps {
  gh: string;
}

export default function AISummary({ gh }: AISummaryProps) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [started, setStarted] = useState(false);
  const [timeout, setTimeout] = useState(60);
  const [remainingTime, setRemainingTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const fetchAISummary = async () => {
    setLoading(true);
    setStarted(true);
    setSummary('');
    
    // 先获取配置中的timeout值来启动倒计时
    // 默认使用60秒，等待API返回后更新
    const defaultTimeout = 60;
    setTimeout(defaultTimeout);
    setRemainingTime(defaultTimeout);
    
    // 启动倒计时
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    try {
      const response = await fetch(`/api/teacher-center?action=ai-summary&gh=${gh}`);
      const result = await response.json();
      
      if (result.success) {
        setSummary(result.data.summary);
        // 更新实际的timeout值
        if (result.data.timeout) {
          setTimeout(result.data.timeout);
        }
      } else {
        message.error(result.error || '生成AI总结失败');
      }
    } catch (error) {
      console.error('生成AI总结失败:', error);
      message.error('生成AI总结失败');
    } finally {
      setLoading(false);
      // 请求完成后清理定时器
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const features = [
    {
      icon: <BookOutlined style={{ color: '#1677ff' }} />,
      title: '教学能力分析',
      description: '授课门数、工作量、教学项目、教材出版等',
    },
    {
      icon: <ExperimentOutlined style={{ color: '#52c41a' }} />,
      title: '科研成果评估',
      description: '论文发表、著作出版、专利申请、科研获奖等',
    },
    {
      icon: <TrophyOutlined style={{ color: '#faad14' }} />,
      title: '职业发展轨迹',
      description: '职称晋升、岗位变动、考核情况、荣誉称号等',
    },
    {
      icon: <TeamOutlined style={{ color: '#eb2f96' }} />,
      title: '综合竞争力评价',
      description: '同行对比分析、发展趋势预测、综合评价等级',
    },
  ];

  // 功能介绍页面
  if (!started) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <RobotOutlined style={{ fontSize: 64, color: '#1677ff', marginBottom: 24 }} />
          <Title level={3}>AI 教师画像总结</Title>
          <Paragraph style={{ fontSize: 16, color: '#666', maxWidth: 600, margin: '0 auto 32px' }}>
            基于教师的教学、科研、教职生涯等多维度数据，通过 AI 智能分析生成全面的教师画像总结
          </Paragraph>
          
          <Row gutter={[16, 16]} style={{ maxWidth: 600, margin: '0 auto 32px' }}>
            {features.map((item, index) => (
              <Col key={index} xs={24} sm={12}>
                <Card size="small" style={{ height: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ fontSize: 24 }}>{item.icon}</div>
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: 4 }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>{item.description}</div>
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          <Button
            type="primary"
            size="large"
            icon={<PlayCircleOutlined />}
            onClick={fetchAISummary}
            style={{ minWidth: 160 }}
          >
            开始AI总结
          </Button>
        </div>
      </Card>
    );
  }

  // 加载中状态
  if (loading) {
    return (
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RobotOutlined style={{ color: '#1677ff', fontSize: 20 }} />
            <span style={{ fontWeight: 500, fontSize: 16 }}>AI教师画像总结</span>
          </div>
          {remainingTime > 0 && (
            <Text type="secondary" style={{ fontSize: 14 }}>
              预计还需等待: <Text strong style={{ color: '#1677ff' }}>{remainingTime}</Text> 秒
            </Text>
          )}
        </div>
        <AiSummaryRenderer 
          summary={summary} 
          loading={loading} 
          loadingText={`AI 正在分析教师数据，请稍候...`}
        />
      </Card>
    );
  }

  // 暂无数据状态
  if (!summary) {
    return (
      <Card>
        <Empty description="暂无AI总结数据">
          <Button type="primary" onClick={fetchAISummary}>
            重新生成
          </Button>
        </Empty>
      </Card>
    );
  }

  // 结果展示
  return (
    <Card>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
          <span style={{ fontWeight: 500, fontSize: 16 }}>AI教师画像总结</span>
        </div>
        <Button onClick={fetchAISummary}>
          重新生成
        </Button>
      </div>
      <AiSummaryRenderer 
        summary={summary} 
        loading={loading} 
        loadingText="AI 正在分析教师数据..."
      />
    </Card>
  );
}
