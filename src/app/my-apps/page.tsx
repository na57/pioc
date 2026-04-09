'use client';

import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Spin, Empty, App } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';
import { largeIconMapping, useIcons } from '@/lib/icons';
import { useRouter } from 'next/navigation';

const { Title, Text } = Typography;

interface App {
  id: number;
  name: string;
  description: string;
  icon: string;
  url: string;
  status: number;
}

export default function MyAppsPage() {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { getLargeIcon } = useIcons();
  const { message } = App.useApp();

  useEffect(() => {
    fetchMyApps();
  }, []);

  const fetchMyApps = async () => {
    try {
      const response = await fetch('/api/my-apps');
      const data = await response.json();
      if (data.success) {
        setApps(data.data);
      } else if (response.status === 403) {
        message.error('您没有权限访问');
      } else {
        message.error(data.message || '获取应用列表失败');
      }
    } catch {
      message.error('获取应用列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAppClick = (app: App) => {
    if (app.url) {
      router.push(app.url);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Spin size="large" description="加载中..." />
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>我的应用</h1>
      {apps.length === 0 ? (
        <Empty
          description="暂无可用应用"
          style={{ marginTop: 100 }}
        />
      ) : (
        <Row gutter={[24, 24]}>
          {apps.map((app) => (
            <Col xs={24} sm={12} md={8} lg={6} key={app.id}>
              <Card
                hoverable
                onClick={() => handleAppClick(app)}
                style={{
                  height: '100%',
                  cursor: app.url ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s',
                }}
                styles={{
                  body: {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    padding: 32,
                  },
                }}
              >
                <div style={{ marginBottom: 16, color: '#1890ff' }}>
                  {getLargeIcon(app.icon, largeIconMapping.AppstoreOutlined)}
                </div>
                <Title level={4} style={{ margin: '0 0 8px 0' }}>
                  {app.name}
                </Title>
                <Text type="secondary" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {app.description || '暂无描述'}
                </Text>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
