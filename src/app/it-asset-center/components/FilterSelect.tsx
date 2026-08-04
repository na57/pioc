'use client';

import React from 'react';
import { Select } from 'antd';

export interface FilterSelectOption {
  value: string;
  label: React.ReactNode;
}

interface FilterSelectProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  options: FilterSelectOption[];
  loading?: boolean;
  width?: number | string;
  mobileWidth?: number | string;
  size?: 'small' | 'middle' | 'large';
  showSearch?: boolean;
  onSearch?: (value: string) => void;
  style?: React.CSSProperties;
  className?: string;
}

export default function FilterSelect({
  value,
  onChange,
  placeholder = '全部',
  options,
  loading = false,
  width,
  mobileWidth = '100%',
  size = 'middle',
  showSearch = false,
  onSearch,
  style,
  className,
}: FilterSelectProps) {
  return (
    <Select
      value={value || undefined}
      onChange={(val) => {
        onChange?.(val || '');
      }}
      onClear={() => {
        onChange?.('');
      }}
      onSearch={onSearch}
      placeholder={placeholder}
      allowClear
      showSearch={showSearch}
      loading={loading}
      options={options}
      style={{ width, ...style }}
      size={size}
      className={className}
      optionFilterProp="label"
    />
  );
}
