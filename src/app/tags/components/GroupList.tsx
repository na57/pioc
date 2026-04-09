'use client';

import React from 'react';
import { Card, Space, Tag, Menu } from 'antd';
import type { MenuProps } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import ActionButton from './ActionButton';

interface TagGroup {
  id: number;
  name: string;
  code: string;
  description: string | null;
  color: string | null;
  sort_order: number;
  status: number;
}

interface GroupListProps {
  groups: TagGroup[];
  selectedGroupId: number | undefined;
  onSelectGroup: (groupId: number | undefined) => void;
  onAddGroup: () => void;
  onEditGroup: (group: TagGroup) => void;
  onDeleteGroup: (id: number) => void;
  loading: boolean;
}

export default function GroupList({
  groups,
  selectedGroupId,
  onSelectGroup,
  onAddGroup,
  onEditGroup,
  onDeleteGroup,
  loading,
}: GroupListProps) {
  // 构建菜单项
  const allItem = {
    key: 'all',
    icon: selectedGroupId === undefined ? <FolderOpenOutlined /> : <FolderOutlined />,
    label: '全部',
    onClick: () => onSelectGroup(undefined),
  };

  const groupItems = groups.map((group) => ({
    key: String(group.id),
    icon: selectedGroupId === group.id ? <FolderOpenOutlined /> : <FolderOutlined />,
    label: (
      <Space>
        {group.color && (
          <Tag
            color={group.color}
            style={{ margin: 0, width: 8, height: 8, padding: 0 }}
          />
        )}
        <span>{group.name}</span>
      </Space>
    ),
    onClick: () => onSelectGroup(group.id),
  }));

  const items: MenuProps['items'] = [allItem, ...groupItems];

  const selectedKey = selectedGroupId === undefined ? 'all' : String(selectedGroupId);

  return (
    <Card
      title="分组列表"
      size="small"
      extra={
        <ActionButton
          icon={<PlusOutlined />}
          tooltip="新建分组"
          onClick={onAddGroup}
        />
      }
    >
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        items={items}
        style={{ border: 'none' }}
      />
      {/* 操作按钮区域 */}
      <div style={{ marginTop: 8, padding: '0 16px' }}>
        {groups.map((group) => (
          selectedGroupId === group.id && (
            <Space key={group.id} size="small">
              <ActionButton
                icon={<EditOutlined />}
                tooltip="编辑"
                onClick={() => onEditGroup(group)}
              />
              <ActionButton
                icon={<DeleteOutlined />}
                tooltip="删除"
                danger
                confirmTitle="确认删除"
                confirmDescription={`确定要删除分组 "${group.name}" 吗？该分组下的标签将失去此分组关联。`}
                onConfirm={() => onDeleteGroup(group.id)}
              />
            </Space>
          )
        ))}
      </div>
    </Card>
  );
}
