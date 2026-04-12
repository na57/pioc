'use client';

import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Tag, Space, Spin, Empty, Badge, Typography, Statistic, Row, Col, Progress } from 'antd';
import { ArrowLeftOutlined, FlagOutlined, CheckCircleOutlined, UserOutlined } from '@ant-design/icons';
import { useParams, useRouter } from 'next/navigation';
import FriendlyTime from '@/components/FriendlyTime';

const { Title, Text } = Typography;

interface LabelingTask {
  id: number;
  name: string;
  description: string | null;
  data_object_id: number;
  data_object_name: string;
  data_object_display_template?: string;
  tag_group_id: number;
  tag_group_name: string;
  status: number;
  created_by: number;
  creator_name: string;
  collaborator_count: number;
  result_count: number;
  created_at: string;
}

interface TagItem {
  id: number;
  name: string;
  color: string;
}

interface LabelingResultDetail {
  id: number;
  data_entry_id: string;
  data_entry_display: string;
  tag_id: number;
  tag_name: string;
  tag_color: string;
  created_by: number;
  creator_name: string;
  created_at: string;
}

interface TagStatistics {
  tag_id: number;
  tag_name: string;
  tag_color: string;
  count: number;
}

export default function TaskResultsPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = Number(params.id);

  const [task, setTask] = useState<LabelingTask | null>(null);
  const [results, setResults] = useState<LabelingResultDetail[]>([]);
  const [tagStats, setTagStats] = useState<TagStatistics[]>([]);
  const [dataEntriesMap, setDataEntriesMap] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    if (taskId) {
      fetchTaskAndResults();
    }
  }, [taskId]);

  const fetchTaskAndResults = async () => {
    setLoading(true);
    try {
      // 获取任务详情
      const taskResponse = await fetch(`/api/labeling-tasks/${taskId}`);
      const taskData = await taskResponse.json();
      if (taskData.success) {
        setTask(taskData.data);
        
        // 获取数据对象的数据列表
        await fetchDataEntriesMap(taskData.data.data_object_id);
      }

      // 获取打标结果
      await fetchResults();
    } catch (error) {
      console.error('Failed to fetch task:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDataEntriesMap = async (dataObjectId: number) => {
    try {
      const response = await fetch(`/api/data-objects/${dataObjectId}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: 1, pageSize: 10000 }),
      });
      const data = await response.json();
      if (data.success) {
        const map = new Map<string, any>();
        const primaryKey = data.data?.primary_key || 'id';
        (data.data?.list || []).forEach((entry: any) => {
          // 使用主键字段作为key，与存储打标结果时保持一致
          const keyValue = entry[primaryKey] !== undefined ? String(entry[primaryKey]) : String(entry.id);
          map.set(keyValue, entry);
        });
        setDataEntriesMap(map);
      }
    } catch (error) {
      console.error('Failed to fetch data entries map:', error);
    }
  };

  // 根据显示模板渲染数据条目
  const renderDataEntryDisplay = (dataEntryId: string): string => {
    const entry = dataEntriesMap.get(dataEntryId);
    if (!entry || !task?.data_object_display_template) {
      return dataEntryId;
    }

    let display = task.data_object_display_template;
    // 替换模板中的字段，如 {{id}} -> 实际值
    Object.keys(entry).forEach((key) => {
      display = display.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(entry[key]));
    });
    return display;
  };

  const fetchResults = async () => {
    setDataLoading(true);
    try {
      const response = await fetch(`/api/labeling-tasks/${taskId}/results`);
      const data = await response.json();
      if (data.success) {
        setResults(data.data || []);
        calculateTagStats(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch results:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const calculateTagStats = (resultsData: LabelingResultDetail[]) => {
    const statsMap = new Map<number, TagStatistics>();
    
    resultsData.forEach((result) => {
      if (statsMap.has(result.tag_id)) {
        const stat = statsMap.get(result.tag_id)!;
        stat.count += 1;
      } else {
        statsMap.set(result.tag_id, {
          tag_id: result.tag_id,
          tag_name: result.tag_name,
          tag_color: result.tag_color,
          count: 1,
        });
      }
    });
    
    setTagStats(Array.from(statsMap.values()).sort((a, b) => b.count - a.count));
  };

  const columns = [
    {
      title: '数据条目',
      dataIndex: 'data_entry_id',
      key: 'data_entry_id',
      render: (dataEntryId: string) => {
        const displayText = renderDataEntryDisplay(dataEntryId);
        return (
          <div>
            <div>{displayText}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>{dataEntryId}</Text>
          </div>
        );
      },
    },
    {
      title: '标签',
      dataIndex: 'tag_name',
      key: 'tag_name',
      render: (text: string, record: LabelingResultDetail) => (
        <Tag color={record.tag_color} icon={<CheckCircleOutlined />}>
          {text}
        </Tag>
      ),
    },
    {
      title: '打标人',
      dataIndex: 'creator_name',
      key: 'creator_name',
      render: (text: string) => (
        <Space>
          <UserOutlined />
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: '打标时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (text: string) => <FriendlyTime date={text} />,
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!task) {
    return (
      <div style={{ padding: '24px' }}>
        <Empty description="作业不存在或暂无权限访问" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <Space>
            <FlagOutlined />
            <span>{task.name} - 打标结果</span>
            {task.status === 1 ? (
              <Badge status="processing" text="进行中" />
            ) : (
              <Badge status="default" text="已结束" />
            )}
          </Space>
        }
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/labeling-tasks')}>
            返回列表
          </Button>
        }
      >
        {task.description && (
          <div style={{ marginBottom: '16px' }}>
            <Text type="secondary">{task.description}</Text>
          </div>
        )}

        {/* 统计卡片 */}
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总打标数"
                value={results.length}
                styles={{ content: { color: '#1890ff' } }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="已打标条目"
                value={new Set(results.map(r => r.data_entry_id)).size}
                styles={{ content: { color: '#52c41a' } }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="使用标签数"
                value={tagStats.length}
                styles={{ content: { color: '#722ed1' } }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="参与人数"
                value={new Set(results.map(r => r.created_by)).size}
                styles={{ content: { color: '#fa8c16' } }}
              />
            </Card>
          </Col>
        </Row>

        {/* 标签分布 */}
        {tagStats.length > 0 && (
          <Card title="标签分布" style={{ marginBottom: '24px' }}>
            <Space orientation="vertical" style={{ width: '100%' }}>
              {tagStats.map((stat) => (
                <div key={stat.tag_id} style={{ display: 'flex', alignItems: 'center' }}>
                  <Tag color={stat.tag_color} style={{ minWidth: '100px' }}>
                    {stat.tag_name}
                  </Tag>
                  <Progress
                    percent={Math.round((stat.count / results.length) * 100)}
                    style={{ flex: 1, marginLeft: '16px' }}
                    format={(percent) => `${stat.count}次 (${percent}%)`}
                  />
                </div>
              ))}
            </Space>
          </Card>
        )}

        {/* 打标结果列表 */}
        <Card title="打标明细">
          <Table
            rowKey="id"
            columns={columns}
            dataSource={results}
            loading={dataLoading}
            pagination={{ pageSize: 20 }}
            scroll={{ x: 800 }}
          />
        </Card>
      </Card>
    </div>
  );
}
