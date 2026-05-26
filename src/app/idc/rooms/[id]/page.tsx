'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, Descriptions, Table, Button, Space, Tag, Spin, Row, Col, Statistic, Tabs, Modal, Form, Input, InputNumber, Select, message, App, Progress } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import ActionButton from '@/app/tags/components/ActionButton';
import FriendlyTime from '@/components/FriendlyTime';
import { v4 as uuidv4 } from 'uuid';

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
  airConditioners?: AirConditioner[];
  upsList?: UPS[];
  batteries?: Battery[];
  generators?: Generator[];
  cabinets?: Cabinet[];
}

interface AirConditioner {
  id: string;
  name: string;
  model: string;
  coolingCapacity: number;
  assetNo: string;
  status: number;
}

interface UPS {
  id: string;
  name: string;
  model: string;
  capacity: number;
  assetNo: string;
  status: number;
}

interface Battery {
  id: string;
  name: string;
  batteryCount: number;
  totalCapacity: number;
  assetNo: string;
  status: number;
}

interface Generator {
  id: string;
  name: string;
  model: string;
  power: number;
  assetNo: string;
  status: number;
}

interface Cabinet {
  id: string;
  name: string;
  code: string;
  totalU: number;
  usedU: number;
  ratedPower: number;
  usedPower: number;
  position: string;
  status: number;
}

type DeviceType = 'ac' | 'ups' | 'battery' | 'generator';

const acStatusMap: Record<number, { label: string; color: string }> = {
  1: { label: '运行', color: 'green' },
  2: { label: '停机', color: 'red' },
  3: { label: '故障', color: 'orange' },
  4: { label: '维修', color: 'blue' },
};

const batteryStatusMap: Record<number, { label: string; color: string }> = {
  1: { label: '正常', color: 'green' },
  2: { label: '故障', color: 'red' },
  3: { label: '更换中', color: 'orange' },
};

const generatorStatusMap: Record<number, { label: string; color: string }> = {
  1: { label: '待机', color: 'green' },
  2: { label: '运行', color: 'blue' },
  3: { label: '故障', color: 'red' },
  4: { label: '维修', color: 'orange' },
};

const deviceTypeConfig: Record<DeviceType, { name: string; apiPath: string }> = {
  ac: { name: '空调', apiPath: 'air-conditioners' },
  ups: { name: 'UPS', apiPath: 'ups' },
  battery: { name: '电池组', apiPath: 'batteries' },
  generator: { name: '发电机', apiPath: 'generators' },
};

export default function RoomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { message } = App.useApp();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<Room | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<DeviceType | null>(null);
  const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null);
  const [isCabinetModalOpen, setIsCabinetModalOpen] = useState(false);
  const [editingCabinet, setEditingCabinet] = useState<Cabinet | null>(null);
  const [form] = Form.useForm();
  const [cabinetForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('basic');
  const [envActiveTab, setEnvActiveTab] = useState('ac');

  useEffect(() => {
    if (id) {
      fetchRoomDetail();
    }
  }, [id]);

  const fetchRoomDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/idc/rooms?id=${id}`);
      const data = await res.json();
      if (data.success) {
        setRoom(data.data);
      } else {
        message.error(data.message || '获取机房详情失败');
      }
    } catch (error) {
      message.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCabinet = async (cabinetId: string) => {
    try {
      const res = await fetch(`/api/idc/cabinets?id=${cabinetId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        message.success('删除成功');
        fetchRoomDetail();
      } else {
        message.error(data.message || '删除失败');
      }
    } catch (error) {
      message.error('网络错误');
    }
  };

  const handleAddCabinet = () => {
    setEditingCabinet(null);
    cabinetForm.resetFields();
    cabinetForm.setFieldsValue({ roomId: id });
    setIsCabinetModalOpen(true);
  };

  const handleEditCabinet = (cabinet: Cabinet) => {
    setEditingCabinet(cabinet);
    cabinetForm.setFieldsValue({
      ...cabinet,
      roomId: id,
    });
    setIsCabinetModalOpen(true);
  };

  const handleSubmitCabinet = async (values: Record<string, unknown>) => {
    try {
      const url = '/api/idc/cabinets';
      const method = editingCabinet ? 'PUT' : 'POST';
      const body = editingCabinet
        ? { ...values, id: editingCabinet.id, roomId: id }
        : { ...values, roomId: id };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        message.success(editingCabinet ? '机柜更新成功' : '机柜创建成功');
        setIsCabinetModalOpen(false);
        fetchRoomDetail();
      } else {
        message.error(data.message || '操作失败');
      }
    } catch (error) {
      message.error('网络错误');
    }
  };

  const handleAddDevice = (type: DeviceType) => {
    setModalType(type);
    setEditingItem(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEditDevice = (type: DeviceType, item: Record<string, unknown>) => {
    setModalType(type);
    setEditingItem(item);
    form.setFieldsValue(item);
    setIsModalOpen(true);
  };

  const handleDeleteDevice = async (type: DeviceType, itemId: string) => {
    const config = deviceTypeConfig[type];
    try {
      const res = await fetch(`/api/idc/${config.apiPath}?id=${itemId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        message.success('删除成功');
        fetchRoomDetail();
      } else {
        message.error(data.message || '删除失败');
      }
    } catch (error) {
      message.error('网络错误');
    }
  };

  const handleSubmitDevice = async (values: Record<string, unknown>) => {
    if (!modalType) return;

    const config = deviceTypeConfig[modalType];
    const url = '/api/idc/' + config.apiPath;
    const method = editingItem ? 'PUT' : 'POST';
    const body = editingItem
      ? { ...values, id: editingItem.id, roomId: id }
      : { ...values, roomId: id };

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        message.success(editingItem ? '更新成功' : '创建成功');
        setIsModalOpen(false);
        fetchRoomDetail();
      } else {
        message.error(data.message || '操作失败');
      }
    } catch (error) {
      message.error('网络错误');
    }
  };

  const getDeviceColumns = (type: DeviceType) => {
    const baseColumns = [
      { title: '设备名称', dataIndex: 'name', key: 'name' },
      { title: '型号', dataIndex: 'model', key: 'model' },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: (status: number) => {
          let info;
          if (type === 'battery') {
            info = batteryStatusMap[status] || { label: '未知', color: 'default' };
          } else if (type === 'generator') {
            info = generatorStatusMap[status] || { label: '未知', color: 'default' };
          } else {
            info = acStatusMap[status] || { label: '未知', color: 'default' };
          }
          return <Tag color={info.color}>{info.label}</Tag>;
        },
      },
      {
        title: '操作',
        key: 'action',
        render: (_: unknown, record: Record<string, unknown>) => (
          <Space>
            <ActionButton
              icon={<EditOutlined />}
              tooltip="编辑"
              onClick={() => handleEditDevice(type, record)}
            />
            <ActionButton
              icon={<DeleteOutlined />}
              tooltip="删除"
              danger
              confirmTitle="确认删除"
              confirmDescription={`确定要删除该${deviceTypeConfig[type].name}吗？`}
              onConfirm={() => handleDeleteDevice(type, record.id as string)}
            />
          </Space>
        ),
      },
    ];

    if (type === 'ac') {
      return [
        ...baseColumns.slice(0, 2),
        { title: '制冷量(KW)', dataIndex: 'coolingCapacity', key: 'coolingCapacity' },
        { title: '资产编号', dataIndex: 'assetNo', key: 'assetNo' },
        ...baseColumns.slice(2),
      ];
    } else if (type === 'ups') {
      return [
        ...baseColumns.slice(0, 2),
        { title: '容量(KVA)', dataIndex: 'capacity', key: 'capacity' },
        { title: '资产编号', dataIndex: 'assetNo', key: 'assetNo' },
        ...baseColumns.slice(2),
      ];
    } else if (type === 'battery') {
      return [
        baseColumns[0],
        { title: '电池数量', dataIndex: 'batteryCount', key: 'batteryCount' },
        { title: '总容量(AH)', dataIndex: 'totalCapacity', key: 'totalCapacity' },
        { title: '资产编号', dataIndex: 'assetNo', key: 'assetNo' },
        ...baseColumns.slice(2),
      ];
    } else if (type === 'generator') {
      return [
        ...baseColumns.slice(0, 2),
        { title: '功率(KW)', dataIndex: 'power', key: 'power' },
        { title: '资产编号', dataIndex: 'assetNo', key: 'assetNo' },
        ...baseColumns.slice(2),
      ];
    }
    return baseColumns;
  };

  const cabinetColumns = [
    {
      title: '机柜名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Cabinet) => (
        <a onClick={() => router.push(`/idc/cabinets/${record.id}`)}>{name}</a>
      ),
    },
    {
      title: 'U位使用',
      key: 'uUsage',
      width: 200,
      render: (_: unknown, record: Cabinet) => {
        const percent = record.totalU > 0 ? Math.round((record.usedU / record.totalU) * 100) : 0;
        return (
          <div style={{ width: 180 }}>
            <Progress percent={percent} size="small" format={() => `${record.usedU}/${record.totalU}`} />
          </div>
        );
      },
    },
    {
      title: '功耗使用',
      key: 'powerUsage',
      width: 200,
      render: (_: unknown, record: Cabinet) => {
        const percent = record.ratedPower > 0 ? Math.round((record.usedPower / record.ratedPower) * 100) : 0;
        return (
          <div style={{ width: 180 }}>
            <Progress percent={percent} size="small" format={() => `${record.usedPower}/${record.ratedPower}W`} />
          </div>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: number) => status === 1 ? <Tag color="green">可用</Tag> : <Tag color="red">不可用</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Cabinet) => (
        <Space>
          <ActionButton
            icon={<EditOutlined />}
            tooltip="编辑"
            onClick={() => handleEditCabinet(record)}
          />
          <ActionButton
            icon={<DeleteOutlined />}
            tooltip="删除"
            danger
            confirmTitle="确认删除"
            confirmDescription="确定要删除该机柜吗？"
            onConfirm={() => handleDeleteCabinet(record.id)}
          />
        </Space>
      ),
    },
  ];

  const renderDeviceTable = (type: DeviceType, data: unknown[]) => (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAddDevice(type)}>
          新增{deviceTypeConfig[type].name}
        </Button>
      </div>
      <Table
        dataSource={data as Record<string, unknown>[]}
        columns={getDeviceColumns(type)}
        rowKey="id"
        pagination={false}
        size="small"
      />
    </>
  );

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!room) {
    return (
      <div style={{ padding: 24 }}>
        <Card>
          <p>机房不存在或已被删除</p>
          <Button onClick={() => router.push('/idc/rooms')}>返回机房列表</Button>
        </Card>
      </div>
    );
  }

  const cabinets = room.cabinets || [];
  const totalU = cabinets.reduce((sum, c) => sum + c.totalU, 0);
  const usedU = cabinets.reduce((sum, c) => sum + c.usedU, 0);
  const totalPower = cabinets.reduce((sum, c) => sum + (c.ratedPower || 0), 0);
  const usedPower = cabinets.reduce((sum, c) => sum + (c.usedPower || 0), 0);

  const airConditioners = room.airConditioners || [];
  const upsList = room.upsList || [];
  const batteries = room.batteries || [];
  const generators = room.generators || [];

  const totalCooling = airConditioners.reduce((sum, ac) => sum + (ac.coolingCapacity || 0), 0);
  const totalUpsCapacity = upsList.reduce((sum, ups) => sum + (ups.capacity || 0), 0);
  const totalBatteryCapacity = batteries.reduce((sum, b) => sum + (b.totalCapacity || 0), 0);
  const totalGeneratorPower = generators.reduce((sum, g) => sum + (g.power || 0), 0);

  // 基本信息Tab内容
  const basicInfoContent = (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="总制冷量(KW)" value={Number(totalCooling).toFixed(2)} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="UPS总容量(KVA)" value={Number(totalUpsCapacity).toFixed(2)} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="电池总容量(AH)" value={Number(totalBatteryCapacity).toFixed(2)} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="发电机总功率(KW)" value={Number(totalGeneratorPower).toFixed(2)} />
          </Card>
        </Col>
      </Row>

      <Card>
        <Descriptions bordered column={3}>
          <Descriptions.Item label="机房名称">{room.name}</Descriptions.Item>
          <Descriptions.Item label="编号">{room.code}</Descriptions.Item>
          <Descriptions.Item label="状态">
            {room.status === 1 ? <Tag color="green">启用</Tag> : <Tag color="red">停用</Tag>}
          </Descriptions.Item>
          <Descriptions.Item label="所在位置">{room.location || '-'}</Descriptions.Item>
          <Descriptions.Item label="楼层">{room.floor || '-'}</Descriptions.Item>
          <Descriptions.Item label="面积">{room.area ? `${room.area}m²` : '-'}</Descriptions.Item>
          <Descriptions.Item label="负责人">{room.contactPerson || '-'}</Descriptions.Item>
          <Descriptions.Item label="联系电话">{room.contactPhone || '-'}</Descriptions.Item>
          <Descriptions.Item label="建成时间">{room.builtDate || '-'}</Descriptions.Item>
          <Descriptions.Item label="消防系统" span={2}>{room.fireProtectionInfo || '-'}</Descriptions.Item>
          <Descriptions.Item label="门禁/监控">{room.securityInfo || '-'}</Descriptions.Item>
          <Descriptions.Item label="备注" span={3}>{room.remark || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>
    </>
  );

  // 机柜Tab内容
  const cabinetsContent = (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddCabinet}>
          新增机柜
        </Button>
      </div>
      <Table
        dataSource={cabinets}
        columns={cabinetColumns}
        rowKey="id"
        pagination={false}
      />
    </>
  );

  // 环境设备Tab内容
  const envDevicesContent = (
    <Tabs
      activeKey={envActiveTab}
      onChange={setEnvActiveTab}
      items={[
        {
          key: 'ac',
          label: `空调 (${airConditioners.length})`,
          children: renderDeviceTable('ac', airConditioners as unknown[]),
        },
        {
          key: 'ups',
          label: `UPS (${upsList.length})`,
          children: renderDeviceTable('ups', upsList as unknown[]),
        },
        {
          key: 'battery',
          label: `电池组 (${batteries.length})`,
          children: renderDeviceTable('battery', batteries as unknown[]),
        },
        {
          key: 'generator',
          label: `发电机 (${generators.length})`,
          children: renderDeviceTable('generator', generators as unknown[]),
        },
      ]}
    />
  );

  return (
    <div style={{ padding: 24 }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/idc/rooms')} style={{ marginBottom: 16 }}>
        返回机房列表
      </Button>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'basic',
              label: '基本信息',
              children: basicInfoContent,
            },
            {
              key: 'cabinets',
              label: `机柜 (${cabinets.length})`,
              children: cabinetsContent,
            },
            {
              key: 'env',
              label: '环境设备',
              children: envDevicesContent,
            },
          ]}
        />
      </Card>

      <Modal
        title={editingItem ? `编辑${modalType ? deviceTypeConfig[modalType].name : ''}` : `新增${modalType ? deviceTypeConfig[modalType].name : ''}`}
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={() => setIsModalOpen(false)}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmitDevice}>
          <Form.Item name="name" label="设备名称" rules={[{ required: true, message: '请输入设备名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="model" label="型号">
            <Input />
          </Form.Item>
          {modalType === 'ac' && (
            <Form.Item name="coolingCapacity" label="制冷量(KW)">
              <InputNumber style={{ width: '100%' }} min={0} precision={2} />
            </Form.Item>
          )}
          {modalType === 'ups' && (
            <Form.Item name="capacity" label="容量(KVA)">
              <InputNumber style={{ width: '100%' }} min={0} precision={2} />
            </Form.Item>
          )}
          {modalType === 'battery' && (
            <>
              <Form.Item name="batteryCount" label="电池数量">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
              <Form.Item name="totalCapacity" label="总容量(AH)">
                <InputNumber style={{ width: '100%' }} min={0} precision={2} />
              </Form.Item>
            </>
          )}
          {modalType === 'generator' && (
            <Form.Item name="power" label="功率(KW)">
              <InputNumber style={{ width: '100%' }} min={0} precision={2} />
            </Form.Item>
          )}
          <Form.Item name="assetNo" label="资产编号">
            <Input />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue={1}>
            <Select>
              {modalType === 'battery' ? (
                <>
                  <Select.Option value={1}>正常</Select.Option>
                  <Select.Option value={2}>故障</Select.Option>
                  <Select.Option value={3}>更换中</Select.Option>
                </>
              ) : modalType === 'generator' ? (
                <>
                  <Select.Option value={1}>待机</Select.Option>
                  <Select.Option value={2}>运行</Select.Option>
                  <Select.Option value={3}>故障</Select.Option>
                  <Select.Option value={4}>维修</Select.Option>
                </>
              ) : (
                <>
                  <Select.Option value={1}>运行</Select.Option>
                  <Select.Option value={2}>停机</Select.Option>
                  <Select.Option value={3}>故障</Select.Option>
                  <Select.Option value={4}>维修</Select.Option>
                </>
              )}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingCabinet ? '编辑机柜' : '新增机柜'}
        open={isCabinetModalOpen}
        onOk={() => cabinetForm.submit()}
        onCancel={() => setIsCabinetModalOpen(false)}
        width={600}
      >
        <Form form={cabinetForm} layout="vertical" onFinish={handleSubmitCabinet}>
          <Form.Item name="name" label="机柜名称" rules={[{ required: true, message: '请输入机柜名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="code" label="机柜编号" rules={[{ required: true, message: '请输入机柜编号' }]}>
            <Input disabled={!!editingCabinet} />
          </Form.Item>
          <Form.Item name="totalU" label="总U数" initialValue={42}>
            <InputNumber style={{ width: '100%' }} min={1} max={100} />
          </Form.Item>
          <Form.Item name="ratedPower" label="额定功耗(W)">
            <InputNumber style={{ width: '100%' }} min={0} precision={2} />
          </Form.Item>
          <Form.Item name="position" label="机房内位置">
            <Input />
          </Form.Item>
          <Form.Item name="pduInfo" label="PDU配置">
            <Input />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue={1}>
            <Select>
              <Select.Option value={1}>可用</Select.Option>
              <Select.Option value={0}>不可用</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="sortOrder" label="排序" initialValue={0}>
            <InputNumber style={{ width: '100%' }} min={0} placeholder="数值越小越靠前" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
