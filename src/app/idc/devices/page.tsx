'use client';

import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Space, Tag, Modal, Form, Input, InputNumber, Select, App } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import ActionButton from '@/app/tags/components/ActionButton';
import FriendlyTime from '@/components/FriendlyTime';
import { deviceTypeMap, getSelectableDeviceTypes, isRealDevice } from '@/lib/config/idc-device-types';

interface Device {
  id: string;
  cabinetId: string;
  cabinetName?: string;
  roomName?: string;
  name: string;
  deviceType: number;
  brandModel: string;
  assetNo: string;
  startU: number;
  occupyU: number;
  ratedPower: number;
  status: number;
  onlineDate: string;
  remark: string;
  createdAt: string;
}

interface Cabinet {
  id: string;
  name: string;
  code: string;
  roomId: string;
  roomName?: string;
  totalU: number;
  usedU: number;
  ratedPower: number;
  usedPower: number;
  status: number;
}

const statusMap: Record<number, { label: string; color: string }> = {
  1: { label: '运行', color: 'green' },
  2: { label: '停机', color: 'red' },
  3: { label: '故障', color: 'orange' },
  4: { label: '闲置', color: 'default' },
};

export default function DevicesPage() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  useEffect(() => {
    fetchCabinets();
    fetchDevices();
  }, [pagination.current, pagination.pageSize]);

  const fetchCabinets = async () => {
    try {
      const res = await fetch('/api/idc/cabinets?page=1&pageSize=1000&status=1');
      const data = await res.json();
      if (data.success) {
        setCabinets(data.data || []);
      }
    } catch (error) {
      console.error('获取机柜列表失败:', error);
    }
  };

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/idc/devices?page=${pagination.current}&pageSize=${pagination.pageSize}`);
      const data = await res.json();
      if (data.success) {
        const devicesWithCabinetName = (data.data || []).map((d: Device) => {
          const cabinet = cabinets.find(c => c.id === d.cabinetId);
          return {
            ...d,
            cabinetName: cabinet ? `${cabinet.name}(${cabinet.code})` : '-',
            roomName: cabinet?.roomName || '-',
          };
        });
        setDevices(devicesWithCabinetName);
        setPagination(prev => ({ ...prev, total: data.total || 0 }));
      } else {
        message.error(data.message || '获取设备列表失败');
      }
    } catch (error) {
      message.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingDevice(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (device: Device) => {
    setEditingDevice(device);
    form.setFieldsValue({
      ...device,
      cabinetId: device.cabinetId,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/idc/devices?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        message.success('下架成功');
        fetchDevices();
      } else {
        message.error(data.message || '下架失败');
      }
    } catch (error) {
      message.error('网络错误');
    }
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      const url = '/api/idc/devices';
      const method = editingDevice ? 'PUT' : 'POST';
      const body = editingDevice ? { ...values, id: editingDevice.id } : values;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        message.success(editingDevice ? '更新成功' : '上架成功');
        setIsModalOpen(false);
        fetchDevices();
      } else {
        message.error(data.message || '操作失败');
      }
    } catch (error) {
      message.error('网络错误');
    }
  };

  const columns = [
    { title: '设备名称', dataIndex: 'name', key: 'name' },
    {
      title: '类型',
      dataIndex: 'deviceType',
      key: 'deviceType',
      render: (type: number) => {
        const info = deviceTypeMap[type] || { label: '未知', color: 'default' };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    { title: '品牌型号', dataIndex: 'brandModel', key: 'brandModel' },
    { title: '资产编号', dataIndex: 'assetNo', key: 'assetNo' },
    {
      title: 'U位',
      key: 'uPosition',
      render: (_: unknown, record: Device) => `U${record.startU}-${record.startU + record.occupyU - 1}`,
    },
    { title: '功耗(W)', dataIndex: 'ratedPower', key: 'ratedPower' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: number) => {
        const info = statusMap[status] || { label: '未知', color: 'default' };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    { title: '所属机柜', dataIndex: 'cabinetName', key: 'cabinetName' },
    { title: '机房', dataIndex: 'roomName', key: 'roomName' },
    {
      title: '上线时间',
      dataIndex: 'onlineDate',
      key: 'onlineDate',
      render: (text: string) => text || '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Device) => (
        <Space>
          <ActionButton
            icon={<EditOutlined />}
            tooltip="编辑"
            onClick={() => handleEdit(record)}
          />
          <ActionButton
            icon={<DeleteOutlined />}
            tooltip="下架"
            danger
            confirmTitle="确认下架"
            confirmDescription="确定要下架该设备吗？"
            onConfirm={() => handleDelete(record.id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="设备管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            设备上架
          </Button>
        }
      >
        <Table
          dataSource={devices}
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
        title={editingDevice ? '编辑设备' : '设备上架'}
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={() => setIsModalOpen(false)}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="cabinetId"
            label="所属机柜"
            rules={[{ required: true, message: '请选择所属机柜' }]}
          >
            <Select placeholder="选择机柜" disabled={!!editingDevice}>
              {cabinets.map(cabinet => (
                <Select.Option key={cabinet.id} value={cabinet.id}>
                  {cabinet.name}({cabinet.code}) - {cabinet.roomName}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="name" label="设备名称" rules={[{ required: true, message: '请输入设备名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="deviceType" label="设备类型" rules={[{ required: true, message: '请选择设备类型' }]}>
            <Select placeholder="选择类型">
              {getSelectableDeviceTypes().map(type => (
                <Select.Option key={type.value} value={type.value}>{type.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="brandModel" label="品牌型号">
            <Input />
          </Form.Item>
          <Form.Item name="assetNo" label="资产编号">
            <Input />
          </Form.Item>
          <Form.Item name="startU" label="起始U位" rules={[{ required: true, message: '请输入起始U位' }]}>
            <InputNumber style={{ width: '100%' }} min={1} disabled={!!editingDevice} />
          </Form.Item>
          <Form.Item name="occupyU" label="占用U数" initialValue={1}>
            <InputNumber style={{ width: '100%' }} min={1} max={10} disabled={!!editingDevice} />
          </Form.Item>
          <Form.Item name="ratedPower" label="额定功耗(W)">
            <InputNumber style={{ width: '100%' }} min={0} precision={2} />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue={1}>
            <Select>
              <Select.Option value={1}>运行</Select.Option>
              <Select.Option value={2}>停机</Select.Option>
              <Select.Option value={3}>故障</Select.Option>
              <Select.Option value={4}>闲置</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="sortOrder" label="排序" initialValue={0}>
            <InputNumber style={{ width: '100%' }} min={0} placeholder="数值越小越靠前" />
          </Form.Item>
          <Form.Item name="onlineDate" label="上线时间">
            <Input type="date" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
