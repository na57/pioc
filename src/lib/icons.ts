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

// 兼容旧代码的图标选项
export const iconOptions: { value: string; label: string }[] = [];
