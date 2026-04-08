'use client';

import React, { useEffect, useState, createContext, useContext, useCallback } from 'react';
import * as Icons from '@ant-design/icons';

// 图标缓存
const iconCache = new Map<string, React.ComponentType<React.SVGProps<SVGSVGElement>>>();

/**
 * 动态获取图标组件
 * @param name 图标名称
 * @returns 图标组件或 null
 */
function getIconComponent(name: string): React.ComponentType<React.SVGProps<SVGSVGElement>> | null {
  // 检查缓存
  if (iconCache.has(name)) {
    return iconCache.get(name) || null;
  }
  
  // 从 @ant-design/icons 中获取
  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>>)[name];
  
  if (IconComponent) {
    iconCache.set(name, IconComponent);
    return IconComponent;
  }
  
  return null;
}

/**
 * 创建图标元素
 * @param name 图标名称
 * @param props 图标属性
 * @returns 图标元素
 */
export function createIconElement(
  name: string, 
  props?: React.SVGProps<SVGSVGElement>
): React.ReactNode {
  const IconComponent = getIconComponent(name);
  if (!IconComponent) return null;
  return React.createElement(IconComponent, props);
}

// 图标上下文类型
interface IconContextType {
  availableIcons: string[];
  isLoading: boolean;
  refreshIcons: () => Promise<void>;
  hasIcon: (name: string) => boolean;
  getIcon: (name: string, defaultIcon?: React.ReactNode) => React.ReactNode;
  getLargeIcon: (name: string, defaultIcon?: React.ReactNode) => React.ReactNode;
}

// 创建上下文
const IconContext = createContext<IconContextType | null>(null);

// 图标提供者组件
export function IconProvider({ children }: { children: React.ReactNode }) {
  const [availableIcons, setAvailableIcons] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchIcons = useCallback(async () => {
    try {
      const response = await fetch('/api/apps/icons');
      const data = await response.json();
      if (data.success) {
        setAvailableIcons(data.data);
        // 预加载所有图标到缓存
        data.data.forEach((iconName: string) => {
          getIconComponent(iconName);
        });
      }
    } catch (error) {
      console.error('Failed to fetch icons:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIcons();
  }, [fetchIcons]);

  const hasIcon = useCallback((name: string): boolean => {
    return !!getIconComponent(name);
  }, []);

  const getIcon = useCallback((name: string, defaultIcon?: React.ReactNode): React.ReactNode => {
    return createIconElement(name) || defaultIcon || null;
  }, []);

  const getLargeIcon = useCallback((name: string, defaultIcon?: React.ReactNode): React.ReactNode => {
    return createIconElement(name, { style: { fontSize: 48 } }) || defaultIcon || null;
  }, []);

  const refreshIcons = useCallback(async () => {
    setIsLoading(true);
    await fetchIcons();
  }, [fetchIcons]);

  const contextValue: IconContextType = {
    availableIcons,
    isLoading,
    refreshIcons,
    hasIcon,
    getIcon,
    getLargeIcon,
  };

  return React.createElement(IconContext.Provider, { value: contextValue }, children);
}

// 使用图标的 Hook
export function useIcons() {
  const context = useContext(IconContext);
  if (!context) {
    throw new Error('useIcons must be used within an IconProvider');
  }
  return context;
}

// 动态图标组件
interface DynamicIconProps {
  name: string;
  size?: number;
  style?: React.CSSProperties;
  className?: string;
}

export function DynamicIcon({ name, size, style, className }: DynamicIconProps) {
  const iconElement = createIconElement(name, {
    style: { ...style, fontSize: size },
    className,
  });
  
  return iconElement || null;
}

// 兼容旧代码的静态图标映射
export const iconMapping: Record<string, React.ReactNode> = new Proxy(
  {} as Record<string, React.ReactNode>,
  {
    get(_, name: string) {
      return createIconElement(name);
    },
  }
);

// 兼容旧代码的大图标映射
export const largeIconMapping: Record<string, React.ReactNode> = new Proxy(
  {} as Record<string, React.ReactNode>,
  {
    get(_, name: string) {
      return createIconElement(name, { style: { fontSize: 48 } });
    },
  }
);

// 常用图标选项列表
export const iconOptions: { value: string; label: string }[] = [
  { value: 'DashboardOutlined', label: '仪表盘' },
  { value: 'HomeOutlined', label: '首页' },
  { value: 'SettingOutlined', label: '设置' },
  { value: 'UserOutlined', label: '用户' },
  { value: 'TeamOutlined', label: '团队' },
  { value: 'MenuOutlined', label: '菜单' },
  { value: 'AppstoreOutlined', label: '应用' },
  { value: 'FileOutlined', label: '文件' },
  { value: 'FolderOutlined', label: '文件夹' },
  { value: 'MailOutlined', label: '邮件' },
  { value: 'MessageOutlined', label: '消息' },
  { value: 'BellOutlined', label: '通知' },
  { value: 'SearchOutlined', label: '搜索' },
  { value: 'FilterOutlined', label: '筛选' },
  { value: 'SortAscendingOutlined', label: '排序' },
  { value: 'EditOutlined', label: '编辑' },
  { value: 'DeleteOutlined', label: '删除' },
  { value: 'PlusOutlined', label: '添加' },
  { value: 'MinusOutlined', label: '减少' },
  { value: 'CheckOutlined', label: '勾选' },
  { value: 'CloseOutlined', label: '关闭' },
  { value: 'EyeOutlined', label: '查看' },
  { value: 'EyeInvisibleOutlined', label: '隐藏' },
  { value: 'LockOutlined', label: '锁定' },
  { value: 'UnlockOutlined', label: '解锁' },
  { value: 'SafetyOutlined', label: '安全' },
  { value: 'KeyOutlined', label: '密钥' },
  { value: 'LinkOutlined', label: '链接' },
  { value: 'CloudOutlined', label: '云' },
  { value: 'DatabaseOutlined', label: '数据库' },
  { value: 'ServerOutlined', label: '服务器' },
  { value: 'LaptopOutlined', label: '电脑' },
  { value: 'MobileOutlined', label: '手机' },
  { value: 'TabletOutlined', label: '平板' },
  { value: 'DesktopOutlined', label: '桌面' },
  { value: 'GlobalOutlined', label: '全球' },
  { value: 'EnvironmentOutlined', label: '位置' },
  { value: 'FlagOutlined', label: '标记' },
  { value: 'TagOutlined', label: '标签' },
  { value: 'TagsOutlined', label: '标签组' },
  { value: 'BarcodeOutlined', label: '条码' },
  { value: 'QrcodeOutlined', label: '二维码' },
  { value: 'ShoppingCartOutlined', label: '购物车' },
  { value: 'ShoppingOutlined', label: '购物' },
  { value: 'GiftOutlined', label: '礼物' },
  { value: 'HeartOutlined', label: '收藏' },
  { value: 'StarOutlined', label: '星标' },
  { value: 'LikeOutlined', label: '点赞' },
  { value: 'FireOutlined', label: '热门' },
  { value: 'TrophyOutlined', label: '奖杯' },
  { value: 'CrownOutlined', label: '皇冠' },
  { value: 'SmileOutlined', label: '微笑' },
  { value: 'CustomerServiceOutlined', label: '客服' },
  { value: 'PhoneOutlined', label: '电话' },
  { value: 'VideoCameraOutlined', label: '视频' },
  { value: 'AudioOutlined', label: '音频' },
  { value: 'PictureOutlined', label: '图片' },
  { value: 'CameraOutlined', label: '相机' },
  { value: 'PrinterOutlined', label: '打印' },
  { value: 'UploadOutlined', label: '上传' },
  { value: 'DownloadOutlined', label: '下载' },
  { value: 'ImportOutlined', label: '导入' },
  { value: 'ExportOutlined', label: '导出' },
  { value: 'ShareAltOutlined', label: '分享' },
  { value: 'SendOutlined', label: '发送' },
  { value: 'RocketOutlined', label: '火箭' },
  { value: 'ThunderboltOutlined', label: '闪电' },
  { value: 'ToolOutlined', label: '工具' },
  { value: 'BuildOutlined', label: '构建' },
  { value: 'CodeOutlined', label: '代码' },
  { value: 'BugOutlined', label: 'Bug' },
  { value: 'ApiOutlined', label: 'API' },
  { value: 'ClusterOutlined', label: '集群' },
  { value: 'DeploymentUnitOutlined', label: '部署' },
  { value: 'CloudServerOutlined', label: '云服务' },
  { value: 'CloudUploadOutlined', label: '云上传' },
  { value: 'CloudDownloadOutlined', label: '云下载' },
  { value: 'CalendarOutlined', label: '日历' },
  { value: 'ClockCircleOutlined', label: '时钟' },
  { value: 'HistoryOutlined', label: '历史' },
  { value: 'ScheduleOutlined', label: '日程' },
  { value: 'PieChartOutlined', label: '饼图' },
  { value: 'BarChartOutlined', label: '柱状图' },
  { value: 'LineChartOutlined', label: '折线图' },
  { value: 'AreaChartOutlined', label: '面积图' },
  { value: 'DotChartOutlined', label: '点图' },
  { value: 'SlidersOutlined', label: '滑块' },
  { value: 'ControlOutlined', label: '控制' },
  { value: 'ExperimentOutlined', label: '实验' },
  { value: 'BulbOutlined', label: '灯泡' },
  { value: 'InfoCircleOutlined', label: '信息' },
  { value: 'QuestionCircleOutlined', label: '帮助' },
  { value: 'ExclamationCircleOutlined', label: '警告' },
  { value: 'WarningOutlined', label: '提醒' },
  { value: 'StopOutlined', label: '停止' },
  { value: 'PauseOutlined', label: '暂停' },
  { value: 'PlayCircleOutlined', label: '播放' },
  { value: 'ReloadOutlined', label: '刷新' },
  { value: 'RedoOutlined', label: '重做' },
  { value: 'UndoOutlined', label: '撤销' },
  { value: 'SwapOutlined', label: '交换' },
  { value: 'SyncOutlined', label: '同步' },
  { value: 'RollbackOutlined', label: '回滚' },
  { value: 'RetweetOutlined', label: '转发' },
  { value: 'SwapLeftOutlined', label: '左交换' },
  { value: 'SwapRightOutlined', label: '右交换' },
  { value: 'MenuFoldOutlined', label: '收起菜单' },
  { value: 'MenuUnfoldOutlined', label: '展开菜单' },
  { value: 'OrderedListOutlined', label: '有序列表' },
  { value: 'UnorderedListOutlined', label: '无序列表' },
  { value: 'TableOutlined', label: '表格' },
  { value: 'ProfileOutlined', label: '档案' },
  { value: 'ContainerOutlined', label: '容器' },
  { value: 'ReadOutlined', label: '阅读' },
  { value: 'SolutionOutlined', label: '解决方案' },
  { value: 'ReconciliationOutlined', label: '对账' },
  { value: 'AuditOutlined', label: '审计' },
  { value: 'SafetyCertificateOutlined', label: '证书' },
  { value: 'InsuranceOutlined', label: '保险' },
  { value: 'SecurityScanOutlined', label: '安全扫描' },
  { value: 'FileProtectOutlined', label: '文件保护' },
  { value: 'FileSearchOutlined', label: '文件搜索' },
  { value: 'FileSyncOutlined', label: '文件同步' },
  { value: 'FileAddOutlined', label: '添加文件' },
  { value: 'FileExcelOutlined', label: 'Excel' },
  { value: 'FileWordOutlined', label: 'Word' },
  { value: 'FilePdfOutlined', label: 'PDF' },
  { value: 'FilePptOutlined', label: 'PPT' },
  { value: 'FileTextOutlined', label: '文本' },
  { value: 'FileZipOutlined', label: '压缩包' },
  { value: 'FileMarkdownOutlined', label: 'Markdown' },
  { value: 'FileUnknownOutlined', label: '未知文件' },
  { value: 'FolderOpenOutlined', label: '打开文件夹' },
  { value: 'FolderAddOutlined', label: '添加文件夹' },
];
