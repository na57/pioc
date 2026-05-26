'use client';

import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Space, Tag, Modal, Form, Input, InputNumber, DatePicker, Select, message, App } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import ActionButton from '@/app/tags/components/ActionButton';
import FriendlyTime from '@/components/FriendlyTime';
import dayjs from 'dayjs';

interface Room {
  id: string;
  name: string;
  code: string;
  location: string;
  floor: string;
  area: number;
  fireProtectionInfo: string;
  securityInfo: string;
  contactPerson: string;
  contactPhone: string;
  builtDate: string;
  remark: string;
  status: number;
  createdAt: string;
  updatedAt: string;
}

export default function RoomsPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  useEffect(() => {
    fetchRooms();
  }, [pagination.current, pagination.pageSize]);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/idc/rooms?page=${pagination.current}&pageSize=${pagination.pageSize}`);
      const data = await res.json();
      if (data.success) {
        setRooms(data.data || []);
        setPagination(prev => ({ ...prev, total: data.total || 0 }));
      } else {
        message.error(data.message || '获取机房列表失败');
      }
    } catch (error) {
      message.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingRoom(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    form.setFieldsValue({
      ...room,
      builtDate: room.builtDate ? dayjs(room.builtDate) : null,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/idc/rooms?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        message.success('删除成功');
        fetchRooms();
      } else {
        message.error(data.message || '删除失败');
      }
    } catch (error) {
      message.error('网络错误');
    }
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      const url = '/api/idc/rooms';
      const method = editingRoom ? 'PUT' : 'POST';
      const body = editingRoom
        ? { ...values, id: editingRoom.id, builtDate: values.builtDate ? (values.builtDate as dayjs.Dayjs).format('YYYY-MM-DD') : null }
        : { ...values, builtDate: values.builtDate ? (values.builtDate as dayjs.Dayjs).format('YYYY-MM-DD') : null };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        message.success(editingRoom ? '更新成功' : '创建成功');
        setIsModalOpen(false);
        fetchRooms();
      } else {
        message.error(data.message || '操作失败');
      }
    } catch (error) {
      message.error('网络错误');
    }
  };

  const columns = [
    {
      title: '机房名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Room) => (
        <a onClick={() => router.push(`/idc/rooms/${record.id}`)}>{text}</a>
      ),
    },
    { title: '位置', dataIndex: 'location', key: 'location' },
    { title: '楼层', dataIndex: 'floor', key: 'floor' },
    { title: '面积(m²)', dataIndex: 'area', key: 'area' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: number) => status === 1 ? <Tag color="green">启用</Tag> : <Tag color="red">停用</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Room) => (
        <Space>
          <ActionButton
            icon={<EditOutlined />}
            tooltip="编辑"
            onClick={() => handleEdit(record)}
          />
          <ActionButton
            icon={<DeleteOutlined />}
            tooltip="删除"
            danger
            confirmTitle="确认删除"
            confirmDescription="确定要删除该机房吗？删除后将同时删除关联的环境设备。"
            onConfirm={() => handleDelete(record.id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="机房管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增机房
          </Button>
        }
      >
        <Table
          dataSource={rooms}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            onChange: (page, pageSize) => setPagination({ current: page, pageSize: pageSize || 10, total: pagination.total }),
          }}
        />
      </Card>

      <Modal
        title={editingRoom ? '编辑机房' : '新增机房'}
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={() => setIsModalOpen(false)}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="机房名称" rules={[{ required: true, message: '请输入机房名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="code" label="机房编号" rules={[{ required: true, message: '请输入机房编号' }]}>
            <Input disabled={!!editingRoom} />
          </Form.Item>
          <Form.Item name="location" label="所在位置">
            <Input />
          </Form.Item>
          <Form.Item name="floor" label="楼层">
            <Input />
          </Form.Item>
          <Form.Item name="area" label="面积(m²)">
            <InputNumber style={{ width: '100%' }} min={0} precision={2} />
          </Form.Item>
          <Form.Item name="fireProtectionInfo" label="消防系统信息">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="securityInfo" label="门禁/监控信息">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="contactPerson" label="负责人">
            <Input />
          </Form.Item>
          <Form.Item name="contactPhone" label="联系电话">
            <Input />
          </Form.Item>
          <Form.Item name="builtDate" label="建成时间">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue={1}>
            <Select>
              <Select.Option value={1}>启用</Select.Option>
              <Select.Option value={0}>停用</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="sortOrder" label="排序" initialValue={0}>
            <InputNumber style={{ width: '100%' }} min={0} placeholder="数值越小越靠前" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
