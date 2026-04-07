'use client';

import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Tag, Space, Modal, Form, Input, Select, Popconfirm, Badge, Tooltip, App } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined, PlayCircleOutlined, FlagOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';

const { TextArea } = Input;

interface LabelingTask {
  id: number;
  name: string;
  description: string | null;
  data_object_id: number;
  data_object_name: string;
  tag_group_id: number;
  tag_group_name: string;
  status: number;
  created_by: number;
  creator_name: string;
  collaborator_count: number;
  result_count: number;
  created_at: string;
}

interface DataObject {
  id: number;
  name: string;
}

interface TagGroup {
  id: number;
  name: string;
}

export default function LabelingTasksPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [tasks, setTasks] = useState<LabelingTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [dataObjects, setDataObjects] = useState<DataObject[]>([]);
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchDataObjects();
    fetchTagGroups();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/labeling-tasks');
      const data = await response.json();
      if (data.success) {
        setTasks(data.data);
      } else {
        message.error(data.message || '获取作业列表失败');
      }
    } catch (error) {
      message.error('获取作业列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchDataObjects = async () => {
    try {
      const response = await fetch('/api/data-objects');
      const data = await response.json();
      if (data.success) {
        // API 返回格式为 { data: { list: [...] } }
        const list = data.data?.list || [];
        setDataObjects(list);
      }
    } catch (error) {
      console.error('Failed to fetch data objects:', error);
    }
  };

  const fetchTagGroups = async () => {
    try {
      const response = await fetch('/api/tag-groups?all=true');
      const data = await response.json();
      if (data.success) {
        // API 返回格式为 { data: { list: [...] } }
        const list = data.data?.list || [];
        setTagGroups(list);
      }
    } catch (error) {
      console.error('Failed to fetch tag groups:', error);
    }
  };

  const handleCreate = async (values: any) => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/labeling-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (data.success) {
        message.success('创建成功');
        setIsModalOpen(false);
        form.resetFields();
        fetchTasks();
      } else {
        message.error(data.message || '创建失败');
      }
    } catch (error) {
      message.error('创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/labeling-tasks/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        message.success('删除成功');
        fetchTasks();
      } else {
        message.error(data.message || '删除失败');
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleStartLabeling = (taskId: number) => {
    router.push(`/labeling-tasks/${taskId}/label`);
  };

  const handleManageCollaborators = (taskId: number) => {
    router.push(`/labeling-tasks/${taskId}/collaborators`);
  };

  const columns = [
    {
      title: '作业名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: LabelingTask) => (
        <Space>
          <FlagOutlined />
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: '数据对象',
      dataIndex: 'data_object_name',
      key: 'data_object_name',
    },
    {
      title: '标签组',
      dataIndex: 'tag_group_name',
      key: 'tag_group_name',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: number) => (
        status === 1 ? (
          <Badge status="processing" text="进行中" />
        ) : (
          <Badge status="default" text="已结束" />
        )
      ),
    },
    {
      title: '创建者',
      dataIndex: 'creator_name',
      key: 'creator_name',
    },
    {
      title: '协作者',
      dataIndex: 'collaborator_count',
      key: 'collaborator_count',
      render: (count: number) => (
        <Tooltip title={`${count} 位协作者`}>
          <Tag icon={<TeamOutlined />} color="blue">
            {count}
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: '已打标',
      dataIndex: 'result_count',
      key: 'result_count',
      render: (count: number) => (
        <Tag color="green">{count} 条</Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: LabelingTask) => (
        <Space size="small">
          <Tooltip title="开始打标">
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              size="small"
              onClick={() => handleStartLabeling(record.id)}
            >
              打标
            </Button>
          </Tooltip>
          <Tooltip title="管理协作者">
            <Button
              icon={<TeamOutlined />}
              size="small"
              onClick={() => handleManageCollaborators(record.id)}
            >
              协作者
            </Button>
          </Tooltip>
          <Popconfirm
            title="确认删除"
            description="确定要删除这个打标作业吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button danger icon={<DeleteOutlined />} size="small">
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="打标作业"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
          >
            创建作业
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={tasks}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="创建打标作业"
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
        >
          <Form.Item
            name="name"
            label="作业名称"
            rules={[{ required: true, message: '请输入作业名称' }]}
          >
            <Input placeholder="请输入作业名称" />
          </Form.Item>

          <Form.Item
            name="description"
            label="作业描述"
          >
            <TextArea rows={3} placeholder="请输入作业描述（可选）" />
          </Form.Item>

          <Form.Item
            name="data_object_id"
            label="数据对象"
            rules={[{ required: true, message: '请选择数据对象' }]}
          >
            <Select
              placeholder="请选择数据对象"
              options={dataObjects.map(obj => ({
                label: obj.name,
                value: obj.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="tag_group_id"
            label="标签组"
            rules={[{ required: true, message: '请选择标签组' }]}
          >
            <Select
              placeholder="请选择标签组"
              options={tagGroups.map(group => ({
                label: group.name,
                value: group.id,
              }))}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                创建
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
