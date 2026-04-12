'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, Button, Tag, Space, Spin, Empty, Badge, Typography, Table, Drawer, Dropdown, Popover, App } from 'antd';
import { FlagOutlined, CheckCircleOutlined, DeleteOutlined, DownOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useParams, useRouter } from 'next/navigation';

const { Title, Text } = Typography;

interface LabelingTask {
  id: number;
  name: string;
  description: string | null;
  data_object_id: number;
  data_object_name: string;
  data_object_primary_key?: string;
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

interface TagGroup {
  id: number;
  name: string;
  tags: TagItem[];
}

interface DataEntry {
  id: string | number;
  _display?: string;
  _key: string;
  [key: string]: any;
}

interface LabelingResult {
  id: number;
  data_entry_id: string;
  tag_id: number;
  created_by: number;
  created_at: string;
}

interface PaginationState {
  current: number;
  pageSize: number;
  total: number;
}

export default function LabelPage() {
  const params = useParams();
  const router = useRouter();
  const { message } = App.useApp();
  const taskId = Number(params.id);

  const [task, setTask] = useState<LabelingTask | null>(null);
  const [tagGroup, setTagGroup] = useState<TagGroup | null>(null);
  const [dataEntries, setDataEntries] = useState<DataEntry[]>([]);
  const [allResults, setAllResults] = useState<LabelingResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // 分页状态
  const [pagination, setPagination] = useState<PaginationState>({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  
  // 抽屉状态
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<DataEntry | null>(null);
  
  // 批量选择状态
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  useEffect(() => {
    if (taskId) {
      fetchTask();
    }
  }, [taskId]);

  const fetchTask = async () => {
    try {
      const response = await fetch(`/api/labeling-tasks/${taskId}`);
      const data = await response.json();
      if (data.success) {
        setTask(data.data);
        await fetchTagGroup(data.data.tag_group_id);
        await fetchDataEntries(data.data.data_object_id, 1);
        await fetchAllResults();
      } else {
        message.error(data.message || '获取作业信息失败');
      }
    } catch (error) {
      message.error('获取作业信息失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchTagGroup = async (tagGroupId: number) => {
    try {
      const groupResponse = await fetch(`/api/tag-groups/${tagGroupId}`);
      const groupData = await groupResponse.json();
      if (!groupData.success) return;

      const tagsResponse = await fetch(`/api/tags?group_id=${tagGroupId}&pageSize=1000`);
      const tagsData = await tagsResponse.json();
      
      if (tagsData.success) {
        setTagGroup({
          ...groupData.data,
          tags: tagsData.data?.list || [],
        });
      }
    } catch (error) {
      console.error('Failed to fetch tag group:', error);
    }
  };

  const fetchDataEntries = async (dataObjectId: number, page: number) => {
    setDataLoading(true);
    try {
      const response = await fetch(`/api/data-objects/${dataObjectId}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          page: page, 
          pageSize: pagination.pageSize 
        }),
      });
      const data = await response.json();
      if (data.success) {
        // 为每条数据确保有唯一的 key
        const entries = (data.data?.list || []).map((entry: any, index: number) => ({
          ...entry,
          _key: entry.id ? String(entry.id) : `entry-${page}-${index}`,
        }));
        
        setDataEntries(entries);
        setPagination(prev => ({
          ...prev,
          current: page,
          total: data.data?.pagination?.total || 0,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch data entries:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const fetchAllResults = async () => {
    try {
      const response = await fetch(`/api/labeling-tasks/${taskId}/results`);
      const data = await response.json();
      if (data.success) {
        setAllResults(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch results:', error);
    }
  };

  const getEntryResults = (entry: DataEntry) => {
    const entryId = getEntryPrimaryKey(entry);
    return allResults.filter(r => r.data_entry_id === entryId);
  };

  // 获取数据条目的主键值
  const getEntryPrimaryKey = (entry: DataEntry): string => {
    if (!task?.data_object_primary_key) {
      return entry.id ? String(entry.id) : entry._key;
    }
    // 使用数据对象配置的 primary_key 字段
    const primaryKeyValue = entry[task.data_object_primary_key];
    return primaryKeyValue !== undefined ? String(primaryKeyValue) : (entry.id ? String(entry.id) : entry._key);
  };

  const handleTagClick = async (entry: DataEntry, tagId: number) => {
    if (!task) return;
    
    setSubmitting(true);
    try {
      const response = await fetch(`/api/labeling-tasks/${taskId}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data_object_id: task.data_object_id,
          data_entry_id: getEntryPrimaryKey(entry),
          tag_id: tagId,
        }),
      });
      const data = await response.json();
      if (data.success) {
        message.success('打标成功');
        await fetchAllResults();
      } else {
        message.error(data.message || '打标失败');
      }
    } catch (error) {
      message.error('打标失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveTag = async (resultId: number) => {
    try {
      const response = await fetch(`/api/labeling-tasks/${taskId}/results/${resultId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        message.success('移除标签成功');
        await fetchAllResults();
      } else {
        message.error(data.message || '移除标签失败');
      }
    } catch (error) {
      message.error('移除标签失败');
    }
  };

  const handleBatchTag = async (tagId: number) => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要打标的数据');
      return;
    }
    
    if (!task) return;
    
    setSubmitting(true);
    let successCount = 0;
    let failCount = 0;
    
    for (const rowKey of selectedRowKeys) {
      // 通过 _key 找到对应的 entry
      const entry = dataEntries.find(e => e._key === rowKey);
      if (!entry) continue;
      
      try {
        const response = await fetch(`/api/labeling-tasks/${taskId}/results`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data_object_id: task.data_object_id,
            data_entry_id: getEntryPrimaryKey(entry),
            tag_id: tagId,
          }),
        });
        const data = await response.json();
        if (data.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
      }
    }
    
    await fetchAllResults();
    setSubmitting(false);
    setSelectedRowKeys([]);
    
    if (successCount > 0) {
      message.success(`成功打标 ${successCount} 条数据`);
    }
    if (failCount > 0) {
      message.error(`${failCount} 条数据打标失败`);
    }
  };

  const openDrawer = (entry: DataEntry) => {
    setSelectedEntry(entry);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedEntry(null);
  };

  const handleTableChange = (newPagination: any) => {
    if (task) {
      fetchDataEntries(task.data_object_id, newPagination.current);
    }
  };

  const renderEntryTags = (entry: DataEntry) => {
    const results = getEntryResults(entry);
    if (results.length === 0) {
      return <Text type="secondary">未打标</Text>;
    }
    
    return (
      <Space wrap size="small">
        {results.map((result) => {
          const tag = tagGroup?.tags.find(t => t.id === result.tag_id);
          return tag ? (
            <Tag
              key={result.id}
              color={tag.color}
              closable
              onClose={(e) => {
                e.stopPropagation();
                handleRemoveTag(result.id);
              }}
              icon={<CheckCircleOutlined />}
            >
              {tag.name}
            </Tag>
          ) : null;
        })}
      </Space>
    );
  };

  const columns = [
    {
      title: '数据内容',
      dataIndex: '_display',
      key: 'display',
      render: (text: string, record: DataEntry) => (
        <div
          style={{
            maxWidth: 400,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            color: '#1890ff',
          }}
          onClick={() => openDrawer(record)}
        >
          {text || record._key}
        </div>
      ),
    },
    {
      title: '已打标签',
      key: 'tags',
      width: 300,
      render: (_: any, record: DataEntry) => renderEntryTags(record),
    },
    {
      title: '快速打标',
      key: 'quickTag',
      width: 200,
      render: (_: any, record: DataEntry) => (
        <Space wrap size="small">
          {tagGroup?.tags.slice(0, 3).map((tag) => (
            <Button
              key={tag.id}
              size="small"
              style={{
                backgroundColor: tag.color,
                color: '#fff',
                border: 'none',
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleTagClick(record, tag.id);
              }}
              loading={submitting}
            >
              {tag.name}
            </Button>
          ))}
          {tagGroup && tagGroup.tags.length > 3 && (
            <Popover
              content={
                <Space wrap style={{ maxWidth: 300 }}>
                  {tagGroup.tags.slice(3).map((tag) => (
                    <Button
                      key={tag.id}
                      size="small"
                      style={{
                        backgroundColor: tag.color,
                        color: '#fff',
                        border: 'none',
                      }}
                      onClick={() => handleTagClick(record, tag.id)}
                      loading={submitting}
                    >
                      {tag.name}
                    </Button>
                  ))}
                </Space>
              }
              title="更多标签"
              trigger="click"
            >
              <Button size="small" icon={<DownOutlined />} />
            </Popover>
          )}
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  const batchTagMenu = {
    items: tagGroup?.tags.map((tag) => ({
      key: tag.id,
      label: (
        <Space>
          <span
            style={{
              display: 'inline-block',
              width: 12,
              height: 12,
              backgroundColor: tag.color,
              borderRadius: 2,
            }}
          />
          {tag.name}
        </Space>
      ),
      onClick: () => handleBatchTag(tag.id),
    })) || [],
  };

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

  const labeledCount = allResults.length;
  const progress = pagination.total > 0 ? (labeledCount / pagination.total) * 100 : 0;

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <Space>
            <FlagOutlined />
            <span>{task.name}</span>
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

        <div style={{ marginBottom: '16px' }}>
          <Space>
            <Text>总数据：{pagination.total} 条</Text>
            <Text>已打标：{labeledCount} 条</Text>
            <Text type="secondary">({Math.round(progress)}%)</Text>
          </Space>
        </div>

        {selectedRowKeys.length > 0 && (
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f0f5ff', borderRadius: '6px' }}>
            <Space>
              <Text>已选择 {selectedRowKeys.length} 条数据</Text>
              <Dropdown menu={batchTagMenu}>
                <Button type="primary" loading={submitting}>
                  批量打标 <DownOutlined />
                </Button>
              </Dropdown>
            </Space>
          </div>
        )}

        <Table
          rowKey="_key"
          rowSelection={rowSelection}
          columns={columns}
          dataSource={dataEntries}
          loading={dataLoading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: false,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 800 }}
        />
      </Card>

      <Drawer
        title="数据详情"
        placement="right"
        size="large"
        onClose={closeDrawer}
        open={drawerOpen}
      >
        {selectedEntry && (
          <>
            <div style={{ marginBottom: '24px' }}>
              <Title level={5}>数据内容</Title>
              <div style={{ padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                {Object.entries(selectedEntry).map(([key, value]) => (
                  <div key={key} style={{ marginBottom: '8px' }}>
                    <Text strong>{key}: </Text>
                    <Text>{String(value)}</Text>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <Title level={5}>已打标签</Title>
              <Space wrap>
                {getEntryResults(selectedEntry).length === 0 ? (
                  <Text type="secondary">暂无标签</Text>
                ) : (
                  getEntryResults(selectedEntry).map((result) => {
                    const tag = tagGroup?.tags.find(t => t.id === result.tag_id);
                    return tag ? (
                      <Tag
                        key={result.id}
                        color={tag.color}
                        closable
                        onClose={() => handleRemoveTag(result.id)}
                        icon={<CheckCircleOutlined />}
                      >
                        {tag.name}
                      </Tag>
                    ) : null;
                  })
                )}
              </Space>
            </div>

            <div>
              <Title level={5}>选择标签</Title>
              <Space wrap>
                {tagGroup?.tags.map((tag) => (
                  <Button
                    key={tag.id}
                    style={{
                      backgroundColor: tag.color,
                      color: '#fff',
                      border: 'none',
                    }}
                    onClick={() => {
                      handleTagClick(selectedEntry, tag.id);
                    }}
                    loading={submitting}
                  >
                    {tag.name}
                  </Button>
                ))}
              </Space>
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}
