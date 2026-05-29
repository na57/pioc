'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, Input, Button, Spin, Space, Tag, Avatar, App, Collapse } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined, CodeOutlined, DatabaseOutlined, DownOutlined, BulbOutlined, ClearOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  result?: unknown[];
  error?: boolean;
  timestamp: Date;
}

interface AIChatPanelProps {
  dataObjectId: number;
  dataObjectName: string;
}

// 初始建议问题
const initialSuggestions = [
  '查询前10条数据',
  '统计总数',
  '按某个字段排序',
  '查询特定条件的数据',
];

export default function AIChatPanel({ dataObjectId, dataObjectName }: AIChatPanelProps) {
  const { message } = App.useApp();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 发送消息
  const handleSend = async (content?: string) => {
    const textToSend = content || inputValue.trim();
    if (!textToSend || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      const response = await fetch(`/api/data-objects/${dataObjectId}/ai-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: textToSend }),
      });

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.success ? data.answer : (data.userMessage || '抱歉，处理您的请求时出现错误'),
        sql: data.sql,
        result: data.result,
        error: !data.success,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (!data.success && data.userMessage) {
        message.error(data.userMessage);
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，网络连接出现问题，请稍后重试',
        error: true,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      message.error('发送请求失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理回车键
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 清空对话
  const handleClear = () => {
    setMessages([]);
    message.success('对话已清空');
  };

  return (
    <Card
      style={{ height: 'calc(100vh - 280px)', minHeight: 500 }}
      styles={{ body: { height: '100%', padding: 0, display: 'flex', flexDirection: 'column' } }}
    >
      {/* 消息列表 */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '16px 24px',
          background: '#f5f5f5',
        }}
      >
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <RobotOutlined style={{ fontSize: 48, color: '#1677ff', marginBottom: 16 }} />
            <div style={{ fontSize: 16, color: '#666', marginBottom: 16 }}>
              我是AI助手，可以帮您查询和分析"{dataObjectName}"的数据
            </div>
            <div style={{ marginBottom: 8, fontSize: 13, color: '#999' }}>
              • 支持自然语言查询，如"查询前10条数据"
            </div>
            <div style={{ marginBottom: 8, fontSize: 13, color: '#999' }}>
              • 支持统计查询，如"统计总数"、"计算平均值"
            </div>
            <div style={{ marginBottom: 24, fontSize: 13, color: '#999' }}>
              • 支持条件过滤，如"查询某个字段等于特定值的数据"
            </div>
          </div>
        ) : (
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                {msg.role === 'assistant' && (
                  <Avatar
                    icon={<RobotOutlined />}
                    style={{ backgroundColor: '#1677ff', flexShrink: 0 }}
                  />
                )}
                <div
                  style={{
                    maxWidth: '70%',
                    padding: '12px 16px',
                    borderRadius: 12,
                    background: msg.role === 'user' ? '#1677ff' : '#fff',
                    color: msg.role === 'user' ? '#fff' : 'inherit',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.role === 'user' ? (
                    <span style={{ color: '#fff' }}>{msg.content}</span>
                  ) : (
                    <Space orientation="vertical" style={{ width: '100%' }}>
                      {/* 回答内容 */}
                      <div style={{ lineHeight: 1.8 }}>{msg.content}</div>
                      
                      {/* 技术详情（SQL和查询结果） */}
                      {(msg.sql || msg.result) && (
                        <Collapse
                          defaultActiveKey={[]}
                          size="small"
                          style={{
                            backgroundColor: 'transparent',
                            borderRadius: 4,
                            border: 'none',
                            marginTop: 8,
                          }}
                          items={[
                            {
                              key: 'tech',
                              label: (
                                <span style={{ color: '#999', fontSize: 12 }}>
                                  <DownOutlined style={{ fontSize: 10, marginRight: 4 }} />
                                  查看技术详情
                                </span>
                              ),
                              children: (
                                <Space orientation="vertical" style={{ width: '100%' }}>
                                  {msg.sql && (
                                    <div>
                                      <Tag icon={<CodeOutlined />} color="blue" style={{ fontSize: 11, marginBottom: 4 }}>SQL</Tag>
                                      <pre
                                        style={{
                                          backgroundColor: '#f6f8fa',
                                          padding: 8,
                                          borderRadius: 4,
                                          fontSize: 12,
                                          fontFamily: 'monospace',
                                          overflowX: 'auto',
                                          margin: 0,
                                        }}
                                      >
                                        {msg.sql}
                                      </pre>
                                    </div>
                                  )}
                                  {msg.result && (
                                    <div>
                                      <Tag icon={<DatabaseOutlined />} color="green" style={{ fontSize: 11, marginBottom: 4 }}>查询结果</Tag>
                                      <pre
                                        style={{
                                          backgroundColor: '#f6f8fa',
                                          padding: 8,
                                          borderRadius: 4,
                                          fontSize: 12,
                                          fontFamily: 'monospace',
                                          overflowX: 'auto',
                                          maxHeight: 200,
                                          margin: 0,
                                        }}
                                      >
                                        {JSON.stringify(msg.result, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </Space>
                              ),
                            },
                          ]}
                        />
                      )}
                    </Space>
                  )}
                </div>
                {msg.role === 'user' && (
                  <Avatar
                    icon={<UserOutlined />}
                    style={{ backgroundColor: '#52c41a', flexShrink: 0 }}
                  />
                )}
              </div>
            ))}
            
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar
                  icon={<RobotOutlined />}
                  style={{ backgroundColor: '#1677ff', flexShrink: 0 }}
                />
                <Card size="small" styles={{ body: { padding: '8px 16px' } }}>
                  <Spin size="small" description="思考中..." />
                </Card>
              </div>
            )}
            <div ref={messagesEndRef} />
          </Space>
        )}
      </div>

      {/* 建议问题区域 */}
      {messages.length < 3 && (
        <div style={{ padding: '12px 24px', background: '#fafafa', borderTop: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <BulbOutlined style={{ color: '#faad14' }} />
            <span style={{ fontSize: 12, color: '#999' }}>
              您可以这样问：
            </span>
          </div>
          <Space size={[8, 8]} wrap>
            {initialSuggestions.map((suggestion, index) => (
              <Tag
                key={index}
                color="blue"
                style={{ cursor: 'pointer', padding: '4px 12px' }}
                onClick={() => handleSend(suggestion)}
              >
                {suggestion}
              </Tag>
            ))}
          </Space>
        </div>
      )}

      {/* 输入区域 */}
      <div
        style={{
          padding: '16px 24px',
          background: '#fff',
          borderTop: '1px solid #f0f0f0',
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <TextArea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="请输入您的问题..."
            autoSize={{ minRows: 1, maxRows: 4 }}
            maxLength={500}
            style={{ flex: 1 }}
            disabled={loading}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={() => handleSend()}
            loading={loading}
            disabled={!inputValue.trim()}
          >
            发送
          </Button>
          {messages.length > 0 && (
            <Button icon={<ClearOutlined />} onClick={handleClear} title="清空对话">
              清空
            </Button>
          )}
        </div>
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: '#999' }}>
            按 Enter 发送，Shift + Enter 换行
          </span>
          <span style={{ fontSize: 12, color: '#999' }}>
            {inputValue.length}/500
          </span>
        </div>
      </div>
    </Card>
  );
}
