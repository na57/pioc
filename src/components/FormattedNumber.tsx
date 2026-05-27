'use client';

import React from 'react';

interface FormattedNumberProps {
  value: number | string | undefined | null;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  style?: React.CSSProperties;
  fallback?: string;
}

/**
 * 格式化数字组件 - 使用千分位分隔符显示数字
 * @param value - 要格式化的数字值
 * @param decimals - 小数位数，默认为0
 * @param prefix - 前缀，如货币符号
 * @param suffix - 后缀，如单位
 * @param className - CSS类名
 * @param style - CSS样式
 * @param fallback - 当值为空时的回退显示文本
 */
export default function FormattedNumber({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
  style,
  fallback = '-',
}: FormattedNumberProps) {
  if (value === undefined || value === null || value === '') {
    return <span className={className} style={style}>{fallback}</span>;
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return <span className={className} style={style}>{fallback}</span>;
  }

  const formatted = num.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={className} style={style}>
      {prefix}{formatted}{suffix}
    </span>
  );
}

/**
 * 格式化数字为千分位字符串
 * @param value - 要格式化的数字值
 * @param decimals - 小数位数，默认为0
 * @returns 格式化后的字符串
 */
export function formatNumber(value: number | string | undefined | null, decimals = 0): string {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return '';
  }

  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
