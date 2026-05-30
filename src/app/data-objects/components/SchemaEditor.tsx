'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Spin, Alert, Space, Tag, Input, App, Typography } from 'antd';
import { EditOutlined, ReloadOutlined, EyeOutlined, SaveOutlined, FileTextOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const { TextArea } = Input;
const { Paragraph } = Typography;

interface SchemaEditorProps {
  dataObjectId: number;
  dataObjectName: string;
  isCreator: boolean;
}

export default function SchemaEditor({ dataObjectId, dataObjectName, isCreator }: SchemaEditorProps) {
  const { message, modal } = App.useApp();
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
        // 根据 schema 是否存在设置状态
        setSchemaStatus(data.schema ? 1 : 0);
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

    modal.confirm({
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
          rows={20}
          style={{
            backgroundColor: isDark ? '#141414' : '#fff',
            color: isDark ? '#fff' : '#333',
            fontFamily: 'monospace',
            fontSize: 13,
            border: 'none',
            padding: 16,
            maxHeight: 'calc(100vh - 320px)',
            overflow: 'auto',
          }}
        />
      ) : schema ? (
        <div
          style={{
            padding: 16,
            maxHeight: 'calc(100vh - 320px)',
            overflow: 'auto',
            backgroundColor: isDark ? '#1f1f1f' : '#fff',
          }}
        >
          <div className="markdown-body" style={{ color: isDark ? '#fff' : '#333' }}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => (
                  <Paragraph style={{ marginBottom: 12, lineHeight: 1.8 }}>
                    {children}
                  </Paragraph>
                ),
                h1: ({ children }) => (
                  <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, marginTop: 24 }}>
                    {children}
                  </div>
                ),
                h2: ({ children }) => (
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, marginTop: 20 }}>
                    {children}
                  </div>
                ),
                h3: ({ children }) => (
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, marginTop: 16 }}>
                    {children}
                  </div>
                ),
                ul: ({ children }) => (
                  <ul style={{ paddingLeft: 20, marginBottom: 12 }}>{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol style={{ paddingLeft: 20, marginBottom: 12 }}>{children}</ol>
                ),
                li: ({ children }) => (
                  <li style={{ marginBottom: 6, lineHeight: 1.6 }}>{children}</li>
                ),
                strong: ({ children }) => (
                  <strong style={{ fontWeight: 600 }}>{children}</strong>
                ),
                code: ({ className, children }) => {
                  const isBlock = className?.includes('language-');
                  if (isBlock) {
                    return (
                      <pre
                        style={{
                          backgroundColor: isDark ? '#141414' : '#f6f8fa',
                          padding: 12,
                          borderRadius: 6,
                          overflowX: 'auto',
                          margin: '8px 0',
                          fontSize: 13,
                        }}
                      >
                        <code style={{ fontFamily: 'monospace' }}>{children}</code>
                      </pre>
                    );
                  }
                  return (
                    <code
                      style={{
                        backgroundColor: isDark ? '#141414' : '#f6f8fa',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 13,
                        fontFamily: 'monospace',
                      }}
                    >
                      {children}
                    </code>
                  );
                },
                table: ({ children }) => (
                  <div style={{ overflowX: 'auto', margin: '12px 0' }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th
                    style={{
                      border: '1px solid #e8e8e8',
                      padding: '10px 12px',
                      textAlign: 'left',
                      backgroundColor: isDark ? '#2c2c2c' : '#fafafa',
                      fontWeight: 600,
                    }}
                  >
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td
                    style={{
                      border: '1px solid #e8e8e8',
                      padding: '10px 12px',
                    }}
                  >
                    {children}
                  </td>
                ),
              }}
            >
              {schema}
            </ReactMarkdown>
          </div>
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
