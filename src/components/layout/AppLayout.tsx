'use client';

import React, { useEffect, useState } from 'react';
import { Layout, Typography, Space, Tag, App, Avatar, Dropdown, Menu, theme, Skeleton, Drawer, Grid } from 'antd';
import type { MenuProps } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  DownOutlined,
  TeamOutlined,
  AuditOutlined,
  MonitorOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { iconMapping } from '@/lib/icons';
import { useRouter, usePathname } from 'next/navigation';
import { useSystemConfig } from '@/hooks/useSystemConfig';

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

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
  const screens = useBreakpoint();
  const isMobile = !screens.md; // 小于 md 断点视为移动端

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuLoading, setMenuLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
      if (item.app_id) {
        return true;
      }
      if (item.children && item.children.length > 0) {
        const filteredChildren = filterEmptyMenuGroups(item.children);
        return filteredChildren.length > 0;
      }
      return false;
    }).map(item => {
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
    const filteredItems = filterEmptyMenuGroups(items);

    return filteredItems.map(item => {
      const iconName = item.app_id && item.app_icon ? item.app_icon : item.icon;
      const menuPath = item.app_id && item.app_url ? item.app_url : item.path;
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
        const currentKey = `menu-${item.id}`;
        const currentKeys = [...parentKeys, currentKey];
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
    const menuId = key.replace('menu-', '');
    const findMenuPath = (items: MenuItem[]): string | null => {
      for (const item of items) {
        if (item.id.toString() === menuId) {
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
      setMobileMenuOpen(false); // 移动端关闭菜单
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

  // 响应式内容内边距
  const getContentPadding = () => {
    if (isMobile) return '8px';
    if (!screens.lg) return '16px';
    return '24px 48px';
  };

  // 响应式内容最大宽度
  const getContentMaxWidth = () => {
    if (isMobile) return '100%';
    if (!screens.lg) return '960px';
    if (!screens.xl) return '1200px';
    return '1400px';
  };

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
          padding: isMobile ? '0 16px' : '0 24px',
          background: token.colorBgContainer,
          boxShadow: '0 2px 8px rgba(0,0,0,0.09)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            {/* 移动端汉堡菜单按钮 */}
            {isMobile && (
              <MenuOutlined
                style={{
                  fontSize: 20,
                  marginRight: 16,
                  cursor: 'pointer',
                  color: token.colorText,
                }}
                onClick={() => setMobileMenuOpen(true)}
              />
            )}
            <Title
              level={isMobile ? 5 : 4}
              style={{
                margin: '16px 0',
                color: token.colorPrimary,
                cursor: 'pointer',
                marginRight: isMobile ? 12 : 24,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: isMobile ? 150 : 300,
              }}
              onClick={() => router.push('/dashboard')}
            >
              {systemConfig.name}
            </Title>

            {/* 桌面端导航菜单 */}
            {!isMobile && (
              menuLoading ? (
                <Skeleton.Button active style={{ width: 400, height: 40 }} />
              ) : (
                <Menu
                  mode="horizontal"
                  selectedKeys={selectedKeys}
                  items={navMenuItems}
                  onClick={handleNavClick}
                  style={{ borderBottom: 'none', minWidth: 400, background: 'transparent', flex: 1 }}
                />
              )
            )}
          </div>

          <Space size={isMobile ? 'small' : 'large'}>
            <Dropdown
              menu={{
                items: getUserMenuItems(),
                onClick: handleUserMenuClick
              }}
              placement="bottomRight"
            >
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: token.colorPrimary }} />
                {!isMobile && (
                  <>
                    <Text strong>{userInfo?.name || userInfo?.username || '用户'}</Text>
                    {userInfo?.role && <Tag color="blue">{userInfo.role}</Tag>}
                    <DownOutlined />
                  </>
                )}
              </Space>
            </Dropdown>
          </Space>
        </Header>

        {/* 移动端抽屉菜单 */}
        <Drawer
          title="菜单导航"
          placement="left"
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          size="large"
          styles={{ body: { padding: 0 } }}
        >
          {menuLoading ? (
            <div style={{ padding: 24 }}>
              <Skeleton active />
            </div>
          ) : (
            <Menu
              mode="inline"
              selectedKeys={selectedKeys}
              items={navMenuItems}
              onClick={handleNavClick}
              style={{ borderRight: 'none' }}
            />
          )}
        </Drawer>

        <Content style={{
          padding: getContentPadding(),
          background: token.colorBgLayout,
          minHeight: 'calc(100vh - 64px - 70px)',
        }}>
          <div style={{
            maxWidth: getContentMaxWidth(),
            margin: '0 auto',
            width: '100%',
          }}>
            {children}
          </div>
        </Content>

        <Footer style={{
          textAlign: 'center',
          background: token.colorBgContainer,
          padding: isMobile ? '16px' : '24px 50px',
          marginTop: 'auto',
        }}>
          <Text type="secondary" style={{ fontSize: isMobile ? 12 : 14 }}>
            {systemConfig.name} {systemConfig.copyright}
          </Text>
        </Footer>
      </Layout>
    </App>
  );
}

export default AppLayout;
