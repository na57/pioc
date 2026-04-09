'use client';

import React from 'react';
import { Button, Tooltip, Popconfirm } from 'antd';
import type { ButtonProps } from 'antd';

interface ActionButtonProps extends Omit<ButtonProps, 'icon'> {
  icon: React.ReactNode;
  tooltip?: string;
  confirmTitle?: string;
  confirmDescription?: string;
  onConfirm?: () => void;
  danger?: boolean;
}

export default function ActionButton({
  icon,
  tooltip,
  confirmTitle,
  confirmDescription,
  onConfirm,
  danger = false,
  onClick,
  ...restProps
}: ActionButtonProps) {
  const button = (
    <Button
      type="text"
      size="small"
      icon={icon}
      danger={danger}
      onClick={confirmTitle ? undefined : onClick}
      {...restProps}
    />
  );

  const withTooltip = tooltip ? (
    <Tooltip title={tooltip}>{button}</Tooltip>
  ) : (
    button
  );

  if (confirmTitle && onConfirm) {
    return (
      <Popconfirm
        title={confirmTitle}
        description={confirmDescription}
        onConfirm={onConfirm}
        okText="确定"
        cancelText="取消"
      >
        {withTooltip}
      </Popconfirm>
    );
  }

  return withTooltip;
}
