'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, Descriptions, Table, Button, Space, Tag, Spin, Progress, Row, Col, Tabs, Modal, Form, Input, InputNumber, Select, Grid, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, DatabaseOutlined, PushpinOutlined } from '@ant-design/icons';
import ActionButton from '@/app/tags/components/ActionButton';
import FriendlyTime from '@/components/FriendlyTime';
import FormattedNumber from '@/components/FormattedNumber';
import { App } from 'antd';
import {
  deviceTypeMap,
  getSelectableDeviceTypes,
  getDeviceTypeConfig,
  isRealDevice,
  isReservedSpace,
  RESERVED_REASONS,
  getReservedReasonLabel,
} from '@/lib/config/idc-device-types';

const { useBreakpoint } = Grid;

interface Cabinet {
  id: string;
  roomId: string;
  name: string;
  code: string;
  totalU: number;
  usedU: number;
  ratedPower: number;
  usedPower: number;
  position: string;
  pduInfo: string;
  status: number;
  remark: string;
  createdAt: string;
  roomName?: string;
}

interface Device {
  id: string;
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
}



const statusMap: Record<number, { label: string; color: string }> = {
  1: { label: '运行', color: 'green' },
  2: { label: '停机', color: 'red' },
  3: { label: '故障', color: 'orange' },
  4: { label: '闲置', color: 'default' },
};

export default function CabinetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { message } = App.useApp();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [cabinet, setCabinet] = useState<Cabinet | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [activeTab, setActiveTab] = useState('basic');
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [deviceForm] = Form.useForm();
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [reserveForm] = Form.useForm();
  const [selectedUPosition, setSelectedUPosition] = useState<number | null>(null);
  const [maxOccupyU, setMaxOccupyU] = useState<number>(42);

  // 监听起始U位变化，计算最大占用U数
  const startU = Form.useWatch('startU', deviceForm);
  useEffect(() => {
    if (cabinet && startU) {
      const max = cabinet.totalU - startU + 1;
      setMaxOccupyU(Math.max(1, max));
    } else {
      setMaxOccupyU(cabinet?.totalU || 42);
    }
  }, [startU, cabinet]);

  useEffect(() => {
    if (id) {
      fetchCabinetDetail();
    }
  }, [id]);

  const fetchCabinetDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/idc/cabinets?id=${id}`);
      const data = await res.json();
      if (data.success) {
        setCabinet(data.data);
        setDevices(data.data.devices || []);
      } else {
        message.error(data.message || '获取机柜详情失败');
      }
    } catch (error) {
      message.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  // 生成U位视图数据
  const generateUPositionData = () => {
    if (!cabinet) return [];

    const uPositions = [];
    for (let u = cabinet.totalU; u >= 1; u--) {
      // 查找占用该U位的设备
      const device = devices.find(d => u >= d.startU && u < d.startU + d.occupyU);
      
      if (device) {
        // 只显示设备的起始U位
        if (u === device.startU) {
          uPositions.push({
            u,
            device,
            isStart: true,
          });
        } else {
          uPositions.push({
            u,
            device,
            isStart: false,
          });
        }
      } else {
        uPositions.push({
          u,
          device: null,
          isStart: false,
        });
      }
    }
    return uPositions;
  };

  const handleAddDevice = () => {
    setEditingDevice(null);
    deviceForm.resetFields();
    deviceForm.setFieldsValue({ cabinetId: id, occupyU: 1, status: 1, sortOrder: 0 });
    setIsDeviceModalOpen(true);
  };

  const handleEditDevice = (device: Device) => {
    setEditingDevice(device);
    deviceForm.setFieldsValue({
      ...device,
      cabinetId: id,
    });
    setIsDeviceModalOpen(true);
  };

  const handleSubmitDevice = async (values: Record<string, unknown>) => {
    try {
      const url = '/api/idc/devices';
      const method = editingDevice ? 'PUT' : 'POST';
      const body = editingDevice
        ? { ...values, id: editingDevice.id, cabinetId: id }
        : { ...values, cabinetId: id };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        message.success(editingDevice ? '设备修改成功' : '设备上架成功');
        setIsDeviceModalOpen(false);
        fetchCabinetDetail();
      } else {
        message.error(data.message || '操作失败');
      }
    } catch (error) {
      message.error('网络错误');
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    try {
      const res = await fetch(`/api/idc/devices?id=${deviceId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        message.success('下架成功');
        fetchCabinetDetail();
      } else {
        message.error(data.message || '下架失败');
      }
    } catch (error) {
      message.error('网络错误');
    }
  };

  // 打开预留空间弹窗
  const handleReserveSpace = (uPosition: number) => {
    setSelectedUPosition(uPosition);
    reserveForm.resetFields();
    reserveForm.setFieldsValue({
      startU: uPosition,
      occupyU: 1,
      reservedReason: 'cooling',
    });
    setIsReserveModalOpen(true);
  };

  // 提交预留空间
  const handleSubmitReserve = async (values: Record<string, unknown>) => {
    try {
      const body = {
        cabinetId: id,
        name: getReservedReasonLabel(values.reservedReason as string),
        deviceType: 5, // 预留空间类型
        startU: values.startU,
        occupyU: values.occupyU,
        status: 1,
        remark: values.remark || null,
      };

      const res = await fetch('/api/idc/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        message.success('预留空间成功');
        setIsReserveModalOpen(false);
        fetchCabinetDetail();
      } else {
        message.error(data.message || '操作失败');
      }
    } catch (error) {
      message.error('网络错误');
    }
  };

  const uPositionColumns = [
    {
      title: 'U位',
      key: 'u',
      width: isMobile ? 60 : 100,
      align: 'center' as const,
      render: (_: unknown, record: { u: number; device: Device | null; isStart: boolean }) => {
        if (!record.device || !record.isStart) {
          return <span style={{ fontWeight: 'bold' }}>U{record.u}</span>;
        }
        // 设备占用多个U时，显示从U几到U几
        const endU = record.device.startU + record.device.occupyU - 1;
        if (record.device.occupyU > 1) {
          return <span style={{ fontWeight: 'bold' }}>U{record.device.startU}-{endU}</span>;
        }
        return <span style={{ fontWeight: 'bold' }}>U{record.u}</span>;
      },
    },
    {
      title: '设备信息',
      key: 'device',
      render: (_: unknown, record: { u: number; device: Device | null; isStart: boolean }) => {
        if (!record.device) {
          return (
            <Space>
              <span style={{ color: '#999' }}>空闲</span>
              <ActionButton
                icon={<PushpinOutlined />}
                tooltip="标记为预留空间"
                onClick={() => handleReserveSpace(record.u)}
              />
            </Space>
          );
        }

        if (!record.isStart) {
          return null; // 非起始U位不显示
        }

        const typeConfig = getDeviceTypeConfig(record.device.deviceType);
        const isReserved = isReservedSpace(record.device.deviceType);

        return (
          <div style={{
            background: typeConfig.bgColor,
            padding: isMobile ? '4px 8px' : '8px 12px',
            borderRadius: 4,
            border: `1px solid ${typeConfig.borderColor}`,
          }}>
            <div style={{ fontWeight: 500, marginBottom: 4, fontSize: isMobile ? 13 : 14 }}>
              {isReserved ? (
                <span>{record.device.name || '预留空间'}</span>
              ) : (
                record.device.name
              )}
            </div>
            <Space size="small" wrap>
              <Tag color={typeConfig.color}>{typeConfig.label}</Tag>
              {!isReserved && (
                <Tag color={statusMap[record.device.status]?.color || 'default'}>
                  {statusMap[record.device.status]?.label || '未知'}
                </Tag>
              )}
              {record.device.ratedPower > 0 && <Tag><FormattedNumber value={record.device.ratedPower} />W</Tag>}
            </Space>
            {isReserved && record.device.remark && (
              <div style={{ marginTop: 4, fontSize: isMobile ? 11 : 12, color: '#666' }}>
                {record.device.remark}
              </div>
            )}
            {!isReserved && (
              <div style={{ marginTop: 4, fontSize: isMobile ? 11 : 12, color: '#666' }}>
                {record.device.brandModel} | {record.device.assetNo || '无资产编号'}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: isMobile ? 80 : 120,
      render: (_: unknown, record: { u: number; device: Device | null; isStart: boolean }) => {
        if (!record.device || !record.isStart) return null;

        const isReserved = isReservedSpace(record.device.deviceType);

        // 预留空间只显示"取消预留"操作
        if (isReserved) {
          return (
            <ActionButton
              icon={<DeleteOutlined />}
              tooltip="取消预留"
              danger
              confirmTitle="确认取消预留"
              confirmDescription={`确定要取消 ${record.device.name} 吗？`}
              onConfirm={() => handleDeleteDevice(record.device!.id)}
            />
          );
        }

        // 真实设备显示修改和下架操作
        return (
          <Space size="small">
            <ActionButton
              icon={<EditOutlined />}
              tooltip="修改"
              onClick={() => handleEditDevice(record.device!)}
            />
            <ActionButton
              icon={<DeleteOutlined />}
              tooltip="下架"
              danger
              confirmTitle="确认下架"
              confirmDescription={`确定要下架设备 ${record.device.name} 吗？`}
              onConfirm={() => handleDeleteDevice(record.device!.id)}
            />
          </Space>
        );
      },
    },
  ];

  const deviceColumns = [
    { title: '设备名称', dataIndex: 'name', key: 'name', width: 120 },
    {
      title: '类型',
      dataIndex: 'deviceType',
      key: 'deviceType',
      width: 80,
      render: (type: number) => {
        const info = deviceTypeMap[type] || { label: '未知', color: 'default' };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    { title: '品牌型号', dataIndex: 'brandModel', key: 'brandModel', width: 120, responsive: ['md' as const] },
    { title: '资产编号', dataIndex: 'assetNo', key: 'assetNo', width: 120, responsive: ['md' as const] },
    {
      title: 'U位',
      key: 'uPosition',
      width: 80,
      render: (_: unknown, record: Device) => `U${record.startU}-${record.startU + record.occupyU - 1}`,
    },
    {
      title: '功耗(W)',
      dataIndex: 'ratedPower',
      key: 'ratedPower',
      width: 90,
      responsive: ['lg' as const],
      render: (value: number) => <FormattedNumber value={value} />,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: number) => {
        const info = statusMap[status] || { label: '未知', color: 'default' };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: Device) => (
        <Space size="small">
          <ActionButton
            icon={<EditOutlined />}
            tooltip="修改"
            onClick={() => handleEditDevice(record)}
          />
          <ActionButton
            icon={<DeleteOutlined />}
            tooltip="下架"
            danger
            confirmTitle="确认下架"
            confirmDescription={`确定要下架设备 ${record.name} 吗？`}
            onConfirm={() => handleDeleteDevice(record.id)}
          />
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!cabinet) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ marginBottom: 24 }}>
          <DatabaseOutlined style={{ marginRight: 8 }} />
          IDC机房管理
        </h1>
        <Card>
          <p>机柜不存在或已被删除</p>
          <Button onClick={() => router.push('/idc')}>返回IDC首页</Button>
        </Card>
      </div>
    );
  }

  const uPositionData = generateUPositionData();
  // 计算真实设备数量（不包含预留空间）
  const realDeviceCount = devices.filter(d => isRealDevice(d.deviceType)).length;
  // 计算空间使用率（包含预留空间）
  const totalUsedU = devices.reduce((sum, d) => sum + d.occupyU, 0);
  const uUsagePercent = cabinet.totalU > 0 ? Math.round((totalUsedU / cabinet.totalU) * 100) : 0;
  const powerUsagePercent = cabinet.ratedPower > 0 ? Math.round((cabinet.usedPower / cabinet.ratedPower) * 100) : 0;

  // 基本信息Tab内容
  const basicInfoContent = (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={16}>
          <Card title="机柜信息" styles={{ body: { padding: isMobile ? 12 : 24 } }}>
            <Descriptions
              bordered
              column={{ xs: 1, sm: 2 }}
              size={isMobile ? 'small' : 'large'}
            >
              <Descriptions.Item label="机柜名称">{cabinet.name}</Descriptions.Item>
              <Descriptions.Item label="编号">{cabinet.code}</Descriptions.Item>
              <Descriptions.Item label="所属机房">
                {cabinet.roomName ? (
                  <a onClick={() => router.push(`/idc/rooms/${cabinet.roomId}`)} style={{ cursor: 'pointer' }}>
                    {cabinet.roomName}
                  </a>
                ) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="位置">{cabinet.position || '-'}</Descriptions.Item>
              <Descriptions.Item label="PDU配置">{cabinet.pduInfo || '-'}</Descriptions.Item>
              <Descriptions.Item label="额定功率">
                <FormattedNumber value={cabinet.ratedPower} suffix="W" />
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {cabinet.status === 1 ? <Tag color="green">可用</Tag> : <Tag color="red">不可用</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                <FriendlyTime date={cabinet.createdAt} />
              </Descriptions.Item>
              <Descriptions.Item label="备注">{cabinet.remark || '-'}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="容量统计" styles={{ body: { padding: isMobile ? 12 : 24 } }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8, fontSize: isMobile ? 13 : 14 }}>
                U位使用: <FormattedNumber value={totalUsedU} />/<FormattedNumber value={cabinet.totalU} />
                <span style={{ color: '#999', marginLeft: 8 }}>
                  (含预留空间)
                </span>
              </div>
              <Progress percent={uUsagePercent} status={uUsagePercent > 90 ? 'exception' : 'normal'} size={isMobile ? 'small' : 'medium'} />
            </div>
            <div>
              <div style={{ marginBottom: 8, fontSize: isMobile ? 13 : 14 }}>
                功耗使用: <FormattedNumber value={cabinet.usedPower} suffix="W" />/<FormattedNumber value={cabinet.ratedPower} suffix="W" />
              </div>
              <Progress percent={powerUsagePercent} status={powerUsagePercent > 90 ? 'exception' : 'normal'} size={isMobile ? 'small' : 'medium'} />
            </div>
          </Card>
        </Col>
      </Row>

      <Card
        title={`设备列表 (${realDeviceCount})`}
        styles={{ body: { padding: isMobile ? 0 : 24 } }}
        extra={
          cabinet.status === 1 && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddDevice} size={isMobile ? 'small' : 'middle'}>
              {isMobile ? '上架' : '上架设备'}
            </Button>
          )
        }
      >
        <div className="table-responsive" style={{ margin: isMobile ? '-12px 0' : 0 }}>
          <Table
            dataSource={devices.filter(d => isRealDevice(d.deviceType))}
            columns={deviceColumns}
            rowKey="id"
            pagination={false}
            size={isMobile ? 'small' : 'middle'}
            scroll={{ x: isMobile ? 400 : undefined, y: 400 }}
          />
        </div>
      </Card>
    </>
  );

  // U位视图Tab内容
  const uPositionContent = (
    <Card 
      title="U位视图" 
      styles={{ body: { padding: isMobile ? 0 : 24 } }}
      extra={
        cabinet.status === 1 && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddDevice} size={isMobile ? 'small' : 'middle'}>
            {isMobile ? '上架' : '上架设备'}
          </Button>
        )
      }
    >
      <div className="table-responsive" style={{ margin: isMobile ? '-12px 0' : 0 }}>
        <Table
          dataSource={uPositionData.filter(item => item.isStart || !item.device)}
          columns={uPositionColumns}
          rowKey="u"
          pagination={false}
          size={isMobile ? 'small' : 'middle'}
          scroll={{ x: isMobile ? 300 : undefined, y: 600 }}
        />
      </div>
    </Card>
  );

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 24 }}>
        <DatabaseOutlined style={{ marginRight: 8 }} />
        {cabinet.roomName || '未知机房'} - {cabinet.name}
      </h1>

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
              key: 'uPosition',
              label: 'U位视图',
              children: uPositionContent,
            },
          ]}
        />
      </Card>

      <Modal
        title={editingDevice ? '修改设备' : '设备上架'}
        open={isDeviceModalOpen}
        onOk={() => deviceForm.submit()}
        onCancel={() => setIsDeviceModalOpen(false)}
        width={isMobile ? '95%' : 600}
        style={{ maxWidth: 600 }}
      >
        <Form form={deviceForm} layout="vertical" onFinish={handleSubmitDevice}>
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
            <InputNumber style={{ width: '100%' }} min={1} max={cabinet?.totalU || 42} />
          </Form.Item>
          <Form.Item name="occupyU" label="占用U数" initialValue={1}>
            <InputNumber style={{ width: '100%' }} min={1} max={maxOccupyU} />
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

      {/* 预留空间弹窗 */}
      <Modal
        title="标记预留空间"
        open={isReserveModalOpen}
        onOk={() => reserveForm.submit()}
        onCancel={() => setIsReserveModalOpen(false)}
        width={isMobile ? '95%' : 500}
        style={{ maxWidth: 500 }}
      >
        <Form form={reserveForm} layout="vertical" onFinish={handleSubmitReserve}>
          <Form.Item name="startU" label="起始U位" rules={[{ required: true, message: '请输入起始U位' }]}>
            <InputNumber style={{ width: '100%' }} min={1} max={cabinet?.totalU || 42} disabled />
          </Form.Item>
          <Form.Item name="occupyU" label="预留U数" initialValue={1} rules={[{ required: true, message: '请输入预留U数' }]}>
            <InputNumber style={{ width: '100%' }} min={1} max={10} />
          </Form.Item>
          <Form.Item name="reservedReason" label="预留原因" initialValue="cooling" rules={[{ required: true, message: '请选择预留原因' }]}>
            <Select placeholder="选择预留原因">
              {RESERVED_REASONS.map(reason => (
                <Select.Option key={reason.value} value={reason.value}>{reason.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="remark" label="备注说明">
            <Input.TextArea rows={2} placeholder="可选：补充说明预留原因" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
