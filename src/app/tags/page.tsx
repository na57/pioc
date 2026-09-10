'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Button,
  Table,
  Input,
  Select,
  Space,
  Tag,
  message,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import TagModal from './components/TagModal';
import TagGroupModal from './components/TagGroupModal';
import GroupList from './components/GroupList';
import ActionButton from './components/ActionButton';

const { Option } = Select;

interface TagItem {
  id: number;
  name: string;
  code: string;
  color: string;
  description: string | null;
  status: number;
  groups: { id: number; name: string }[];
  created_at: string;
}

interface TagGroup {
  id: number;
  name: string;
  code: string;
  description: string | null;
  color: string | null;
  sort_order: number;
  status: number;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

export default function TagsPage() {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [groups, setGroups] = useState<TagGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
  });
  const [filters, setFilters] = useState({
    name: '',
    status: undefined as number | undefined,
    group_id: undefined as number | undefined,
  });
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [tagModalTitle, setTagModalTitle] = useState('新建标签');
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [groupModalTitle, setGroupModalTitle] = useState('新建分组');
  const [editingGroup, setEditingGroup] = useState<TagGroup | null>(null);

  // 获取标签列表
  const fetchTags = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });
      if (filters.name) params.append('name', filters.name);
      if (filters.status !== undefined) params.append('status', filters.status.toString());
      if (filters.group_id !== undefined) params.append('group_id', filters.group_id.toString());

      const response = await fetch(`/api/tags?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setTags(data.data.list);
        setPagination(prev => ({ ...prev, total: data.data.pagination.total }));
      } else {
        message.error(data.message || '获取标签列表失败');
      }
    } catch (error) {
      message.error('获取标签列表失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, filters]);

  // 获取分组列表
  const fetchGroups = useCallback(async () => {
    try {
      const response = await fetch('/api/tag-groups?all=true');
      const data = await response.json();
      if (data.success) {
        setGroups(data.data.list);
      }
    } catch (error) {
      console.error('获取分组列表失败:', error);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // 删除标签
  const handleDeleteTag = async (id: number) => {
    try {
      const response = await fetch(`/api/tags/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        message.success('标签删除成功');
        fetchTags();
      } else {
        message.error(data.message || '删除标签失败');
      }
    } catch (error) {
      message.error('删除标签失败');
    }
  };

  // 打开新建标签弹窗
  const handleAddTag = () => {
    setEditingTag(null);
    setTagModalTitle('新建标签');
    setTagModalVisible(true);
  };

  // 打开编辑标签弹窗
  const handleEditTag = (tag: TagItem) => {
    setEditingTag(tag);
    setTagModalTitle('编辑标签');
    setTagModalVisible(true);
  };

  // 标签弹窗提交成功
  const handleTagModalSuccess = () => {
    setTagModalVisible(false);
    fetchTags();
  };

  // 打开新建分组弹窗
  const handleAddGroup = () => {
    setEditingGroup(null);
    setGroupModalTitle('新建分组');
    setGroupModalVisible(true);
  };

  // 打开编辑分组弹窗
  const handleEditGroup = (group: TagGroup) => {
    setEditingGroup(group);
    setGroupModalTitle('编辑分组');
    setGroupModalVisible(true);
  };

  // 分组弹窗提交成功
  const handleGroupModalSuccess = () => {
    setGroupModalVisible(false);
    fetchGroups();
    // 如果当前按分组筛选，需要刷新标签列表
    if (filters.group_id !== undefined) {
      fetchTags();
    }
  };

  // 选择分组筛选
  const handleSelectGroup = (groupId: number | undefined) => {
    setFilters(prev => ({ ...prev, group_id: groupId }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // 删除分组
  const handleDeleteGroup = async (id: number) => {
    try {
      const response = await fetch(`/api/tag-groups/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        message.success('分组删除成功');
        fetchGroups();
        // 如果删除的是当前筛选的分组，清除筛选
        if (filters.group_id === id) {
          setFilters(prev => ({ ...prev, group_id: undefined }));
        }
        fetchTags();
      } else {
        message.error(data.message || '删除分组失败');
      }
    } catch (error) {
      message.error('删除分组失败');
    }
  };

  // 表格列定义
  const columns: ColumnsType<TagItem> = [
    {
      title: '标签名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: TagItem) => (
        <Space>
          <Tag color={record.color}>{text}</Tag>
        </Space>
      ),
    },
    {
      title: '编码',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: '所属分组',
      dataIndex: 'groups',
      key: 'groups',
      render: (groups: { id: number; name: string }[]) => (
        <Space size="small" wrap>
          {groups?.map(group => (
            <Tag key={group.id} style={{ margin: 0 }}>
              {group.name}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: number) => (
        <Tag color={status === 1 ? 'success' : 'default'}>
          {status === 1 ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record: TagItem) => (
        <Space size="small">
          <ActionButton
            icon={<EditOutlined />}
            tooltip="编辑"
            onClick={() => handleEditTag(record)}
          />
          <ActionButton
            icon={<DeleteOutlined />}
            tooltip="删除"
            danger
            confirmTitle="确认删除"
            confirmDescription={`确定要删除标签 "${record.name}" 吗？`}
            onConfirm={() => handleDeleteTag(record.id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={16}>
        {/* 左侧分组列表 */}
        <Col xs={24} sm={24} md={6} lg={5} xl={4}>
          <GroupList
            groups={groups}
            selectedGroupId={filters.group_id}
            onSelectGroup={handleSelectGroup}
            onAddGroup={handleAddGroup}
            onEditGroup={handleEditGroup}
            onDeleteGroup={handleDeleteGroup}
            loading={loading}
          />
        </Col>

        {/* 右侧标签列表 */}
        <Col xs={24} sm={24} md={18} lg={19} xl={20}>
          <Card>
            {/* 筛选栏 */}
            <Space wrap style={{ marginBottom: 16 }}>
              <Input
                placeholder="搜索标签名称"
                value={filters.name}
                onChange={e => {
                  setFilters(prev => ({ ...prev, name: e.target.value }));
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                prefix={<SearchOutlined />}
                style={{ width: 200 }}
                allowClear
              />
              <Select
                placeholder="状态"
                value={filters.status}
                onChange={value => {
                  setFilters(prev => ({ ...prev, status: value }));
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                style={{ width: 100 }}
                allowClear
              >
                <Option value={1}>启用</Option>
                <Option value={0}>禁用</Option>
              </Select>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddTag}>
                新建标签
              </Button>
            </Space>

            {/* 标签表格 */}
            <Table
              columns={columns}
              dataSource={tags}
              rowKey="id"
              loading={loading}
              pagination={{
                current: pagination.page,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: true,
                showTotal: total => `共 ${total} 条`,
                onChange: (page, pageSize) => {
                  setPagination(prev => ({ ...prev, page, pageSize: pageSize || 20 }));
                },
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* 标签弹窗 */}
      <TagModal
        title={tagModalTitle}
        open={tagModalVisible}
        onCancel={() => setTagModalVisible(false)}
        onSuccess={handleTagModalSuccess}
        initialValues={editingTag}
        groups={groups}
      />

      {/* 分组弹窗 */}
      <TagGroupModal
        title={groupModalTitle}
        open={groupModalVisible}
        onCancel={() => setGroupModalVisible(false)}
        onSuccess={handleGroupModalSuccess}
        initialValues={editingGroup}
      />
    </div>
  );
}
