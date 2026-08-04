'use client';

import React from 'react';
import { Card, Statistic } from 'antd';

interface AssetStatCardProps {
  title: string;
  value: number;
  total: number;
  icon: React.ReactNode;
  onClick?: () => void;
  color?: string;
}

export default function AssetStatCard({ title, value, total, icon, onClick, color = '#1890ff' }: AssetStatCardProps) {
  return (
    <Card
      size="small"
      hoverable={!!onClick}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <Statistic
        title={title}
        value={value}
        prefix={icon}
        valueRender={(node) => (
          <span style={{ color }}>
            {node}
            <span style={{ color: '#1890ff', fontSize: 16, marginLeft: 8 }}>/ {total}</span>
          </span>
        )}
      />
    </Card>
  );
}
