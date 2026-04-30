'use client';

import React, { useEffect, useState } from 'react';
import { Layout, Typography, Space, Tag, App, Avatar, Dropdown, Menu, theme, Skeleton } from 'antd';
import type { MenuProps } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  DownOutlined,
  TeamOutlined,
  AuditOutlined,
  MonitorOutlined,
} from '@ant-design/icons';
import { iconMapping } from '@/lib/icons';
import { useRouter, usePathname } from 'next/navigation';
import { useSystemConfig } from '@/hooks/useSystemConfig';

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

interface UserInfo {
  userId: number;
  username: string;
  email: string;
  name: string;
  role?: string;
}

interface MenuItem {
  id: number;
  name: string;
  path: string;
  icon?: string;
  parent_id: number | null;
  sort_order: number;
  status: number;
  app_id?: number | null;
  app_icon?: string;
  app_url?: string;
  children?: MenuItem[];
}

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuLoading, setMenuLoading] = useState(true);
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const { config: systemConfig } = useSystemConfig();

  useEffect(() => {
    fetchUserInfo();
    fetchMenus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUserInfo = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();

      if (data.success) {
        setUserInfo(data.data);
      } else {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      }
    } catch {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchMenus = async () => {
    try {
      setMenuLoading(true);
      const response = await fetch('/api/menus/my');
      const data = await response.json();
      if (data.success) {
        setMenus(data.data);
      }
    } catch {
      // 如果获取失败，使用默认菜单
      setMenus([]);
    } finally {
      setMenuLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      message.success('已退出登录');
      router.push('/login');
      router.refresh();
    } catch {
      message.error('退出失败');
    }
  };

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      handleLogout();
    } else if (key === 'profile') {
      message.info('个人中心功能开发中');
    } else if (key.startsWith('/')) {
      router.push(key);
    }
  };

  // 过滤掉没有可显示子项的菜单组
  const filterEmptyMenuGroups = (items: MenuItem[]): MenuItem[] => {
    return items.filter(item => {
      // 如果是应用（有app_id），直接显示
      if (item.app_id) {
        return true;
      }
      // 如果是菜单组（没有app_id），检查是否有子项
      if (item.children && item.children.length > 0) {
        // 递归过滤子菜单
        const filteredChildren = filterEmptyMenuGroups(item.children);
        // 如果有有效的子项，保留此菜单组
        return filteredChildren.length > 0;
      }
      // 没有子项的菜单组不显示
      return false;
    }).map(item => {
      // 递归处理子菜单
      if (item.children && item.children.length > 0) {
        return {
          ...item,
          children: filterEmptyMenuGroups(item.children),
        };
      }
      return item;
    });
  };

  // 将菜单数据转换为 Ant Design Menu 组件需要的格式
  const convertToMenuItems = (items: MenuItem[]): MenuProps['items'] => {
    // 先过滤掉空的菜单组
    const filteredItems = filterEmptyMenuGroups(items);

    return filteredItems.map(item => {
      // 如果是应用链接，优先使用应用的图标
      const iconName = item.app_id && item.app_icon ? item.app_icon : item.icon;
      // 如果是应用菜单，使用应用的URL作为跳转路径
      const menuPath = item.app_id && item.app_url ? item.app_url : item.path;
      // 使用菜单ID作为key，确保唯一性
      const menuItem: any = {
        key: `menu-${item.id}`,
        icon: iconName ? iconMapping[iconName] : null,
        label: item.name,
      };

      if (item.children && item.children.length > 0) {
        menuItem.children = convertToMenuItems(item.children);
      }

      return menuItem;
    });
  };

  // 获取选中的菜单项
  const getSelectedKeys = (): string[] => {
    const keys: string[] = [];

    const findPath = (items: MenuItem[], parentKeys: string[] = []): string[] => {
      for (const item of items) {
        // 使用菜单ID作为key
        const currentKey = `menu-${item.id}`;
        const currentKeys = [...parentKeys, currentKey];
        // 如果是应用菜单，使用应用的URL作为路径进行匹配
        const menuPath = item.app_id && item.app_url ? item.app_url : item.path;

        if (menuPath && pathname.startsWith(menuPath)) {
          return currentKeys;
        }

        if (item.children) {
          const childKeys = findPath(item.children, currentKeys);
          if (childKeys.length > 0) {
            return childKeys;
          }
        }
      }
      return [];
    };

    return findPath(menus);
  };

  const handleNavClick = ({ key }: { key: string }) => {
    // 从key中提取菜单ID，查找对应的跳转路径
    const menuId = key.replace('menu-', '');
    const findMenuPath = (items: MenuItem[]): string | null => {
      for (const item of items) {
        if (item.id.toString() === menuId) {
          // 如果是应用菜单，使用应用的URL作为跳转路径
          return item.app_id && item.app_url ? item.app_url : item.path;
        }
        if (item.children) {
          const path = findMenuPath(item.children);
          if (path) return path;
        }
      }
      return null;
    };

    const menuPath = findMenuPath(menus);
    if (menuPath) {
      router.push(menuPath);
    }
  };

  const isAdmin = userInfo?.role === 'admin';

  const getUserMenuItems = (): MenuProps['items'] => {
    const items: MenuProps['items'] = [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: '个人中心',
      },
    ];

    if (isAdmin) {
      items.push({
        key: 'system-management',
        icon: <SettingOutlined />,
        label: '系统管理',
        children: [
          {
            key: '/users',
            icon: <UserOutlined />,
            label: '用户管理',
          },
          {
            key: '/roles',
            icon: <TeamOutlined />,
            label: '角色管理',
          },
          {
            key: '/audit-logs',
            icon: <AuditOutlined />,
            label: '操作日志',
          },
          {
            key: '/monitoring',
            icon: <MonitorOutlined />,
            label: '系统监控',
          },
          {
            key: '/system',
            icon: <SettingOutlined />,
            label: '系统设置',
          },
        ],
      });
    }

    items.push(
      {
        key: 'divider',
        type: 'divider',
      },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '退出登录',
        danger: true,
      }
    );

    return items;
  };

  const navMenuItems = convertToMenuItems(menus);
  const selectedKeys = getSelectedKeys();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: token.colorBgLayout,
      }}>
        <Text>加载中...</Text>
      </div>
    );
  }

  return (
    <App>
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        background: token.colorBgContainer,
        boxShadow: '0 2px 8px rgba(0,0,0,0.09)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Title
            level={4}
            style={{
              margin: '16px 0',
              color: token.colorPrimary,
              cursor: 'pointer',
              marginRight: 24
            }}
            onClick={() => router.push('/dashboard')}
          >
            {systemConfig.name}
          </Title>
          {menuLoading ? (
            <Skeleton.Button active style={{ width: 400, height: 40 }} />
          ) : (
            <Menu
              mode="horizontal"
              selectedKeys={selectedKeys}
              items={navMenuItems}
              onClick={handleNavClick}
              style={{ borderBottom: 'none', minWidth: 400, background: 'transparent' }}
            />
          )}
        </div>

        <Space size="large">
          <Dropdown
            menu={{
              items: getUserMenuItems(),
              onClick: handleUserMenuClick
            }}
            placement="bottomRight"
          >
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: token.colorPrimary }} />
              <Text strong>{userInfo?.name || userInfo?.username || '用户'}</Text>
              {userInfo?.role && <Tag color="blue">{userInfo.role}</Tag>}
              <DownOutlined />
            </Space>
          </Dropdown>
        </Space>
      </Header>

      <Content style={{ padding: '24px 50px', background: token.colorBgLayout }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {children}
        </div>
      </Content>

      <Footer style={{
        textAlign: 'center',
        background: token.colorBgContainer,
        padding: '24px 50px',
        marginTop: 'auto',
      }}>
        <Text type="secondary">
          {systemConfig.name} {systemConfig.copyright}
        </Text>
      </Footer>
    </Layout>
    </App>
  );
}

export default AppLayout;
