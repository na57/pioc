'use client';

import React from 'react';

interface FriendlyTimeProps {
  date: string | Date | undefined | null;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 格式化时间为友好显示
 * - 小于 60 秒：显示"刚刚"
 * - 小于 60 分钟：显示"xx分钟前"
 * - 小于 24 小时：显示"xx小时前"
 * - 小于 7 天：显示"xx天前"
 * - 超过 7 天：显示 yyyy/m/d 格式日期
 */
export function formatFriendlyTime(dateString: string | Date | undefined | null): string {
  if (!dateString) {
    return '-';
  }
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  // 检查日期是否有效
  if (isNaN(date.getTime())) {
    return '-';
  }
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return '刚刚';
  } else if (diffMins < 60) {
    return `${diffMins}分钟前`;
  } else if (diffHours < 24) {
    return `${diffHours}小时前`;
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else {
    // 超过7天显示 yyyy/m/d
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  }
}

/**
 * 友好时间显示组件
 * 显示相对时间（如"5分钟前"），鼠标悬停显示完整时间
 */
export default function FriendlyTime({ date, className, style }: FriendlyTimeProps) {
  // 处理空值情况
  if (!date) {
    return <span className={className} style={style}>-</span>;
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // 检查日期是否有效
  if (isNaN(dateObj.getTime())) {
    return <span className={className} style={style}>-</span>;
  }
  
  const fullTime = dateObj.toLocaleString();
  const friendlyTime = formatFriendlyTime(date);

  return (
    <span title={fullTime} className={className} style={style}>
      {friendlyTime}
    </span>
  );
}
