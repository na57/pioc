'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Spin, Alert, Space, Tag, Modal, Input, App } from 'antd';
import { EditOutlined, ReloadOutlined, EyeOutlined, SaveOutlined, FileTextOutlined } from '@ant-design/icons';


const { TextArea } = Input;

interface SchemaEditorProps {
  dataObjectId: number;
  dataObjectName: string;
  isCreator: boolean;
}

export default function SchemaEditor({ dataObjectId, dataObjectName, isCreator }: SchemaEditorProps) {
  const { message } = App.useApp();
  const isDark = false;

  const [schema, setSchema] = useState<string>('');
  const [schemaStatus, setSchemaStatus] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedSchema, setEditedSchema] = useState('');

  // 加载Schema
  const loadSchema = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/data-objects/${dataObjectId}/ai-schema`);
      const data = await response.json();

      if (data.success) {
        setSchema(data.schema);
        setEditedSchema(data.schema);
      } else {
        message.error(data.error || '加载Schema失败');
      }
    } catch (error) {
      message.error('加载Schema失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadSchema();
  }, [dataObjectId]);

  // 重新生成Schema
  const handleRegenerate = async () => {
    if (!isCreator) {
      message.error('只有创建者可以重新生成Schema');
      return;
    }

    Modal.confirm({
      title: '重新生成Schema',
      content: '重新生成会覆盖当前的Schema描述，确定要继续吗？',
      onOk: async () => {
        setGenerating(true);
        try {
          const response = await fetch(`/api/data-objects/${dataObjectId}/ai-schema`, {
            method: 'POST',
          });
          const data = await response.json();

          if (data.success) {
            setSchema(data.schema);
            setEditedSchema(data.schema);
            setSchemaStatus(1);
            message.success('Schema重新生成成功');
          } else {
            message.error(data.error || '重新生成失败');
          }
        } catch (error) {
          message.error('重新生成失败');
        } finally {
          setGenerating(false);
        }
      },
    });
  };

  // 保存编辑的Schema
  const handleSave = async () => {
    if (!isCreator) {
      message.error('只有创建者可以编辑Schema');
      return;
    }

    if (!editedSchema.trim()) {
      message.error('Schema内容不能为空');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/data-objects/${dataObjectId}/ai-schema`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema: editedSchema }),
      });
      const data = await response.json();

      if (data.success) {
        setSchema(editedSchema);
        setSchemaStatus(2);
        setEditMode(false);
        message.success('Schema保存成功');
      } else {
        message.error(data.error || '保存失败');
      }
    } catch (error) {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 取消编辑
  const handleCancel = () => {
    setEditedSchema(schema);
    setEditMode(false);
  };

  // 获取状态标签
  const getStatusTag = () => {
    switch (schemaStatus) {
      case 0:
        return <Tag color="default">未生成</Tag>;
      case 1:
        return <Tag color="blue">已生成</Tag>;
      case 2:
        return <Tag color="green">已编辑</Tag>;
      default:
        return <Tag color="default">未知</Tag>;
    }
  };

  return (
    <Card
      title={
        <Space>
          <FileTextOutlined />
          <span>AI问答 Schema</span>
          <Tag color="blue">{dataObjectName}</Tag>
          {getStatusTag()}
        </Space>
      }
      extra={
        isCreator && (
          <Space>
            {!editMode ? (
              <>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleRegenerate}
                  loading={generating}
                  size="small"
                >
                  重新生成
                </Button>
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => setEditMode(true)}
                  size="small"
                >
                  编辑
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handleCancel} size="small">
                  取消
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSave}
                  loading={saving}
                  size="small"
                >
                  保存
                </Button>
              </>
            )}
          </Space>
        )
      }
      style={{ height: '100%' }}
      styles={{ body: { padding: 0 } }}
    >
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <Spin />
          <p style={{ marginTop: 16, color: isDark ? '#999' : '#666' }}>加载Schema...</p>
        </div>
      ) : editMode ? (
        <TextArea
          value={editedSchema}
          onChange={(e) => setEditedSchema(e.target.value)}
          autoSize={{ minRows: 20, maxRows: 30 }}
          style={{
            backgroundColor: isDark ? '#141414' : '#fff',
            color: isDark ? '#fff' : '#333',
            fontFamily: 'monospace',
            fontSize: 13,
            border: 'none',
            padding: 16,
          }}
        />
      ) : schema ? (
        <div
          style={{
            padding: 16,
            maxHeight: 600,
            overflow: 'auto',
            backgroundColor: isDark ? '#1f1f1f' : '#fff',
          }}
        >
          <div
            style={{
              color: isDark ? '#fff' : '#333',
              lineHeight: 1.8,
            }}
            dangerouslySetInnerHTML={{
              __html: schema
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/```([\s\S]*?)```/g, '<pre style="background:#f5f5f5;padding:12px;border-radius:4px;overflow:auto;"><code>$1</code></pre>')
                .replace(/`([^`]+)`/g, '<code style="background:#f5f5f5;padding:2px 4px;border-radius:3px;">$1</code>')
                .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br/>'),
            }}
          />
        </div>
      ) : (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <Alert
            title="Schema未生成"
            description={<>Schema用于帮助AI理解数据结构，生成准确的查询语句。点击&quot;重新生成&quot;按钮自动生成。</>}
            type="info"
            showIcon
            action={
              isCreator && (
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={handleRegenerate}
                  loading={generating}
                >
                  立即生成
                </Button>
              )
            }
          />
        </div>
      )}
    </Card>
  );
}
