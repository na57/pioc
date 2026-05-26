'use client';

import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Button, Tag, Space, Spin } from 'antd';
import { DatabaseOutlined, HddOutlined, DesktopOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import FriendlyTime from '@/components/FriendlyTime';

interface Room {
  id: string;
  name: string;
  code: string;
  location: string;
  area: number;
  status: number;
  cabinetCount?: number;
  deviceCount?: number;
  createdAt: string;
}

interface Stats {
  roomCount: number;
  cabinetCount: number;
  deviceCount: number;
  totalPower: number;
}

export default function IdcHomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [stats, setStats] = useState<Stats>({
    roomCount: 0,
    cabinetCount: 0,
    deviceCount: 0,
    totalPower: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 获取机房列表
      const roomsRes = await fetch('/api/idc/rooms?page=1&pageSize=100');
      const roomsData = await roomsRes.json();
      
      if (roomsData.success) {
        setRooms(roomsData.data || []);
        setStats(prev => ({ ...prev, roomCount: roomsData.data?.length || 0 }));
      }

      // 获取机柜统计
      const cabinetsRes = await fetch('/api/idc/cabinets?page=1&pageSize=1000');
      const cabinetsData = await cabinetsRes.json();
      
      if (cabinetsData.success) {
        const cabinets = cabinetsData.data || [];
        setStats(prev => ({ ...prev, cabinetCount: cabinets.length }));
      }

      // 获取设备统计
      const devicesRes = await fetch('/api/idc/devices?page=1&pageSize=1000');
      const devicesData = await devicesRes.json();
      
      if (devicesData.success) {
        const devices = devicesData.data || [];
        const totalPower = devices.reduce((sum: number, d: { ratedPower?: number }) => sum + (d.ratedPower || 0), 0);
        setStats(prev => ({ ...prev, deviceCount: devices.length, totalPower }));
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: '机房名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Room) => (
        <Button type="link" onClick={() => router.push(`/idc/rooms/${record.id}`)}>
          {text}
        </Button>
      ),
    },
    {
      title: '编号',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: '位置',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: '面积(m²)',
      dataIndex: 'area',
      key: 'area',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: number) => (
        status === 1 ? <Tag color="green">启用</Tag> : <Tag color="red">停用</Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => <FriendlyTime date={text} />,
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 24 }}>
        <DatabaseOutlined style={{ marginRight: 8 }} />
        IDC机房管理
      </h1>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="机房总数"
                value={stats.roomCount}
                prefix={<DatabaseOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="机柜总数"
                value={stats.cabinetCount}
                prefix={<HddOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="设备总数"
                value={stats.deviceCount}
                prefix={<DesktopOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="总功耗(W)"
                value={stats.totalPower}
                prefix={<AppstoreOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <Card
          title="机房列表"
          extra={
            <Space>
              <Button type="primary" onClick={() => router.push('/idc/rooms')}>
                管理机房
              </Button>
              <Button onClick={() => router.push('/idc/cabinets')}>
                管理机柜
              </Button>
              <Button onClick={() => router.push('/idc/devices')}>
                管理设备
              </Button>
            </Space>
          }
        >
          <Table
            dataSource={rooms}
            columns={columns}
            rowKey="id"
            pagination={false}
          />
        </Card>
      </Spin>
    </div>
  );
}
