'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Form, Input, Button, Card, App, Typography, Divider, Spin } from 'antd';
import { UserOutlined, LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useRouter, useSearchParams } from 'next/navigation';

const { Title } = Typography;

interface SystemConfig {
  auth?: {
    enableCasLogin?: boolean;
    directCasLogin?: boolean;
  };
}

function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      if (error === 'invalid_ticket') {
        message.error('CAS票据验证失败，请重试');
      } else if (error === 'no_ticket') {
        message.error('未收到CAS票据');
      } else {
        message.error(`登录错误: ${error}`);
      }
    }
  }, [searchParams, message]);

  useEffect(() => {
    fetch('/api/system/config')
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          setSystemConfig(result.data);
        }
      })
      .catch(() => {
        // 配置获取失败时不影响正常登录
      });
  }, []);

  useEffect(() => {
    const error = searchParams.get('error');
    const auth = systemConfig?.auth;
    if (auth?.directCasLogin && auth?.enableCasLogin !== false && !error) {
      setRedirecting(true);
      const redirect = searchParams.get('redirect');
      const casLoginUrl = redirect
        ? `/api/auth/cas/login?redirect=${encodeURIComponent(redirect)}`
        : '/api/auth/cas/login';
      window.location.href = casLoginUrl;
    }
  }, [systemConfig, searchParams]);

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (data.success) {
        message.success('登录成功');
        const redirect = searchParams.get('redirect');
        router.push(redirect || '/my-apps');
      } else {
        message.error(data.message || '登录失败');
      }
    } catch {
      message.error('登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleCasLogin = () => {
    const redirect = searchParams.get('redirect');
    const casLoginUrl = redirect
      ? `/api/auth/cas/login?redirect=${encodeURIComponent(redirect)}`
      : '/api/auth/cas/login';
    window.location.href = casLoginUrl;
  };

  if (redirecting) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin description="正在跳转 CAS 登录页..." />
      </div>
    );
  }

  return (
    <>
      <Form
        name="login"
        onFinish={onFinish}
        autoComplete="off"
        size="large"
      >
        <Form.Item
          name="username"
          rules={[{ required: true, message: '请输入用户名' }]}
        >
          <Input prefix={<UserOutlined />} placeholder="用户名" />
        </Form.Item>
        <Form.Item
          name="password"
          rules={[{ required: true, message: '请输入密码' }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="密码" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            登录
          </Button>
        </Form.Item>
      </Form>
      {systemConfig?.auth?.enableCasLogin !== false && (
        <>
          <Divider plain>或</Divider>
          <Button
            block
            size="large"
            icon={<SafetyCertificateOutlined />}
            onClick={handleCasLogin}
            style={{ marginTop: 8 }}
          >
            CAS/OAuth 登录
          </Button>
        </>
      )}
    </>
  );
}

export default function LoginPage() {
  return (
    <App>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #001529 0%, #1890ff 100%)',
      }}>
        <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Title level={2}>个人智慧运行中心</Title>
            <Title level={5} type="secondary">PIOC</Title>
          </div>
          <Suspense fallback={<div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>}>
            <LoginForm />
          </Suspense>
        </Card>
      </div>
    </App>
  );
}
