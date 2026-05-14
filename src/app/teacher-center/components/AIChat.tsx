'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Input,
  Button,
  Space,
  Typography,
  Tag,
  Avatar,
  Spin,
  App,
  Collapse,
} from 'antd';
import {
  SendOutlined,
  UserOutlined,
  RobotOutlined,
  BulbOutlined,
  ClearOutlined,
  DownOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface DisplayMessage extends ChatMessage {
  displayContent?: string;
  isTyping?: boolean;
}

interface AIChatProps {
  gh: string;
  teacherName: string;
}

// 解析 AI 内容，分离思考过程和正式内容
function parseAIContent(content: string): { thinkContent: string; formalContent: string } {
  const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
  if (thinkMatch) {
    const thinkContent = thinkMatch[1].trim();
    const formalContent = content.replace(/<think>[\s\S]*?<\/think>/, '').trim();
    return { thinkContent, formalContent };
  }
  return { thinkContent: '', formalContent: content };
}

// AI 消息渲染组件
function AIMessageContent({ content, isTyping }: { content: string; isTyping?: boolean }) {
  const { thinkContent, formalContent } = useMemo(() => parseAIContent(content), [content]);

  return (
    <Space orientation="vertical" style={{ width: '100%' }}>
      {/* 思考过程 - 可折叠（紧凑低调样式） */}
      {thinkContent && (
        <Collapse
          defaultActiveKey={[]}
          size="small"
          style={{
            backgroundColor: 'transparent',
            borderRadius: 4,
            border: 'none',
            marginBottom: 4,
          }}
          items={[
            {
              key: 'think',
              label: (
                <span style={{ color: '#999', fontSize: 12 }}>
                  <DownOutlined style={{ fontSize: 10, marginRight: 4 }} />
                  思考过程
                </span>
              ),
              children: (
                <div
                  style={{
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.6,
                    fontSize: 12,
                    color: '#888',
                    padding: '4px 0 0 16px',
                    borderLeft: '2px solid #e8e8e8',
                    marginLeft: 4,
                  }}
                >
                  {thinkContent}
                </div>
              ),
            },
          ]}
        />
      )}

      {/* 正式内容 - Markdown 渲染 */}
      <div className="markdown-body">
        <ReactMarkdown
          components={{
            p: ({ children }) => (
              <Paragraph style={{ marginBottom: 8, lineHeight: 1.8 }}>
                {children}
              </Paragraph>
            ),
            h1: ({ children }) => (
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
                {children}
              </div>
            ),
            h2: ({ children }) => (
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>
                {children}
              </div>
            ),
            h3: ({ children }) => (
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                {children}
              </div>
            ),
            ul: ({ children }) => (
              <ul style={{ paddingLeft: 20, marginBottom: 8 }}>{children}</ul>
            ),
            ol: ({ children }) => (
              <ol style={{ paddingLeft: 20, marginBottom: 8 }}>{children}</ol>
            ),
            li: ({ children }) => (
              <li style={{ marginBottom: 4, lineHeight: 1.6 }}>{children}</li>
            ),
            strong: ({ children }) => (
              <strong style={{ fontWeight: 600 }}>{children}</strong>
            ),
            em: ({ children }) => (
              <em style={{ fontStyle: 'italic' }}>{children}</em>
            ),
            blockquote: ({ children }) => (
              <blockquote
                style={{
                  borderLeft: '4px solid #1677ff',
                  paddingLeft: 12,
                  margin: '12px 0',
                  color: '#666',
                  fontStyle: 'italic',
                }}
              >
                {children}
              </blockquote>
            ),
            code: ({ className, children }) => {
              const isBlock = className?.includes('language-');
              if (isBlock) {
                return (
                  <pre
                    style={{
                      backgroundColor: '#f6f8fa',
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
                    backgroundColor: '#f6f8fa',
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
              <div style={{ overflowX: 'auto', margin: '8px 0' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  {children}
                </table>
              </div>
            ),
            th: ({ children }) => (
              <th
                style={{
                  border: '1px solid #e8e8e8',
                  padding: '8px 12px',
                  textAlign: 'left',
                  backgroundColor: '#fafafa',
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
                  padding: '8px 12px',
                }}
              >
                {children}
              </td>
            ),
          }}
        >
          {formalContent}
        </ReactMarkdown>
        {isTyping && (
          <span
            style={{
              display: 'inline-block',
              width: 2,
              height: '1.2em',
              backgroundColor: '#1677ff',
              marginLeft: 2,
              verticalAlign: 'text-bottom',
              animation: 'ai-cursor-blink 1s step-end infinite',
            }}
          />
        )}
      </div>
    </Space>
  );
}

// localStorage key for chat history
const getStorageKey = (gh: string) => `teacher_chat_history_${gh}`;

export default function AIChat({ gh, teacherName }: AIChatProps) {
  const { message } = App.useApp();
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<any>(null);
  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 停止打字效果
  const stopTyping = useCallback(() => {
    if (typingRef.current) {
      clearInterval(typingRef.current);
      typingRef.current = null;
    }
  }, []);

  // 开始打字效果
  const startTyping = useCallback((messageIndex: number, fullContent: string, speed: number = 30) => {
    stopTyping();
    let currentIndex = 0;

    typingRef.current = setInterval(() => {
      currentIndex += 1;
      setMessages((prev) => {
        const updated = [...prev];
        if (updated[messageIndex]) {
          updated[messageIndex] = {
            ...updated[messageIndex],
            displayContent: fullContent.slice(0, currentIndex),
            isTyping: currentIndex < fullContent.length,
          };
        }
        return updated;
      });

      if (currentIndex >= fullContent.length) {
        stopTyping();
      }
    }, speed);
  }, [stopTyping]);

  // 从 localStorage 加载历史会话
  useEffect(() => {
    try {
      const storageKey = getStorageKey(gh);
      const savedHistory = localStorage.getItem(storageKey);
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory) as ChatMessage[];
        // 验证数据格式
        if (Array.isArray(parsedHistory) && parsedHistory.every(
          m => m.role && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'
        )) {
          // 恢复为 DisplayMessage，历史记录直接显示完整内容
          setMessages(parsedHistory.map(m => ({ ...m, displayContent: m.content, isTyping: false })));
        }
      }
    } catch (error) {
      console.error('加载历史会话失败:', error);
    }
  }, [gh]);

  // 保存会话到 localStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        const storageKey = getStorageKey(gh);
        localStorage.setItem(storageKey, JSON.stringify(messages));
      } catch (error) {
        console.error('保存历史会话失败:', error);
      }
    }
  }, [messages, gh]);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 发送消息
  const handleSend = async (content?: string) => {
    const textToSend = content || inputMessage.trim();
    if (!textToSend || loading) return;

    // 停止之前的打字效果
    stopTyping();

    // 添加用户消息
    const userMessage: DisplayMessage = { role: 'user', content: textToSend, displayContent: textToSend, isTyping: false };
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      // 构建历史消息（不包含系统消息，只保留最近10条）
      const history = messages
        .filter((m) => m.role !== 'system')
        .slice(-10)
        .map(({ role, content }) => ({ role, content }));

      const response = await fetch('/api/teacher-center/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gh,
          message: textToSend,
          history,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // 添加AI回复（初始为空，用于打字效果）
        const assistantMessage: DisplayMessage = {
          role: 'assistant',
          content: result.data.answer,
          displayContent: '',
          isTyping: true,
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // 启动打字效果
        const messageIndex = messages.length + 1; // 用户消息 + AI消息
        startTyping(messageIndex, result.data.answer, 25);

        // 更新建议问题
        if (result.data.suggestions && result.data.suggestions.length > 0) {
          setSuggestions(result.data.suggestions);
        }
      } else {
        message.error(result.error || '获取回答失败');
        // 添加错误消息
        const errorMessage: DisplayMessage = {
          role: 'assistant',
          content: '抱歉，处理您的问题时出现错误，请稍后重试。',
          displayContent: '抱歉，处理您的问题时出现错误，请稍后重试。',
          isTyping: false,
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      message.error('发送消息失败');
      // 添加错误消息
      const errorMessage: DisplayMessage = {
        role: 'assistant',
        content: '抱歉，网络连接出现问题，请稍后重试。',
        displayContent: '抱歉，网络连接出现问题，请稍后重试。',
        isTyping: false,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      // 聚焦输入框
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  // 清空对话
  const handleClear = () => {
    stopTyping();
    setMessages([]);
    setSuggestions([]);
    setInputMessage('');
    // 清除 localStorage 中的历史记录
    try {
      const storageKey = getStorageKey(gh);
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('清除历史会话失败:', error);
    }
    message.success('对话已清空');
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 初始建议问题
  const initialSuggestions = [
    `${teacherName}老师的教学和科研情况怎么样？`,
    `总结一下${teacherName}老师的整体情况`,
    `${teacherName}老师发表过多少篇论文？`,
    `${teacherName}老师的职业发展历程是怎样的？`,
  ];

  const displaySuggestions = suggestions.length > 0 ? suggestions : initialSuggestions;

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
            <Paragraph style={{ fontSize: 16, color: '#666', marginBottom: 16 }}>
              我是AI智能问答助手，专门回答关于<strong>{teacherName}</strong>老师的问题
            </Paragraph>
            <Paragraph type="secondary" style={{ marginBottom: 8, fontSize: 13 }}>
              • 只能询问关于这位老师的信息
            </Paragraph>
            <Paragraph type="secondary" style={{ marginBottom: 24, fontSize: 13 }}>
              • 回答仅基于系统中已有的数据，不会编造信息
            </Paragraph>
          </div>
        ) : (
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            {messages.map((msg, index) => (
              <div
                key={index}
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
                    <Text style={{ color: '#fff' }}>{msg.displayContent || msg.content}</Text>
                  ) : (
                    <AIMessageContent
                      content={msg.displayContent || ''}
                      isTyping={msg.isTyping}
                    />
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
                <Card size="small" style={{ padding: '8px 16px' }}>
                  <Spin size="small" description="思考中..." />
                </Card>
              </div>
            )}
            <div ref={messagesEndRef} />
          </Space>
        )}
      </div>

      {/* 建议问题区域 */}
      {displaySuggestions.length > 0 && messages.length < 3 && (
        <div style={{ padding: '12px 24px', background: '#fafafa', borderTop: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <BulbOutlined style={{ color: '#faad14' }} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              您可以这样问：
            </Text>
          </div>
          <Space size={[8, 8]} wrap>
            {displaySuggestions.slice(0, 4).map((suggestion, index) => (
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
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`请输入关于${teacherName}老师的问题...`}
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
            disabled={!inputMessage.trim()}
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
          <Text type="secondary" style={{ fontSize: 12 }}>
            按 Enter 发送，Shift + Enter 换行
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {inputMessage.length}/500
          </Text>
        </div>
      </div>
    </Card>
  );
}
