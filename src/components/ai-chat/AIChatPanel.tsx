'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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
} from 'antd';
import {
  SendOutlined,
  UserOutlined,
  RobotOutlined,
  BulbOutlined,
  ClearOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useChatHistory } from './hooks/useChatHistory';
import { useMultiTypingEffect } from './hooks/useTypingEffect';
import AIMessageContent from './AIMessageContent';
import type {
  AIChatPanelProps,
  DisplayMessage,
  ChatAPIResponse,
  PendingEntityConfirm,
} from './types';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

// 默认欢迎界面
function DefaultWelcome({ description }: { description: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <RobotOutlined style={{ fontSize: 48, color: '#1677ff', marginBottom: 16 }} />
      <Paragraph style={{ fontSize: 16, color: '#666', marginBottom: 16 }}>
        {description}
      </Paragraph>
      <Paragraph type="secondary" style={{ marginBottom: 8, fontSize: 13 }}>
        • 支持自然语言查询，如"查询前10条数据"
      </Paragraph>
      <Paragraph type="secondary" style={{ marginBottom: 8, fontSize: 13 }}>
        • 支持统计查询，如"统计总数"、"计算平均值"
      </Paragraph>
      <Paragraph type="secondary" style={{ marginBottom: 24, fontSize: 13 }}>
        • 回答基于系统中已有的数据，不会编造信息
      </Paragraph>
    </div>
  );
}

export default function AIChatPanel({
  apiEndpoint,
  title = 'AI智能问答',
  description = '我是AI智能问答助手，可以帮您查询和分析数据',
  placeholder = '请输入您的问题...',
  initialSuggestions = [],
  storageKey,
  extraParams = {},
  messageField = 'message',
  // 功能开关
  enableTypingEffect = true,
  enableMarkdown = true,
  enableThinkCollapse = true,
  enableEntityConfirm = false,
  enableLocalStorage = true,
  // 自定义渲染
  renderWelcome,
  renderAssistantMessage,
  // 自定义样式
  cardStyle,
  messageContainerStyle,
}: AIChatPanelProps) {
  const { message } = App.useApp();
  const [inputMessage, setInputMessage] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingEntityConfirm, setPendingEntityConfirm] = useState<PendingEntityConfirm | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<any>(null);

  // 使用 hook 管理聊天历史
  const {
    messages,
    setMessages,
    clearHistory: clearChatHistory,
  } = useChatHistory({
    storageKey: storageKey || `ai_chat_${apiEndpoint.replace(/\//g, '_')}`,
    maxHistoryLength: 10,
  });

  // 使用 hook 管理打字效果
  const { getDisplayContent, isTyping, startTyping, stopAllTyping } = useMultiTypingEffect({
    speed: 20,
  });

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
    stopAllTyping();

    // 添加用户消息
    const userMessage: DisplayMessage = {
      role: 'user',
      content: textToSend,
      displayContent: textToSend,
      isTyping: false,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      // 构建历史消息（只保留最近10条）
      const history = messages
        .filter((m) => m.role !== 'system')
        .slice(-10)
        .map(({ role, content }) => ({ role, content }));

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [messageField]: textToSend,
          history,
          ...extraParams,
        }),
      });

      const result: ChatAPIResponse = await response.json();

      if (result.success) {
        // 检查是否需要确认实体
        if (enableEntityConfirm && result.data?.needsClarification && result.data?.candidates) {
          setPendingEntityConfirm({
            question: textToSend,
            candidates: result.data.candidates,
          });

          // 添加AI回复
          const assistantMessage: DisplayMessage = {
            role: 'assistant',
            content: result.data.clarificationMessage || '请确认您指的是哪个实体？',
            displayContent: result.data.clarificationMessage || '请确认您指的是哪个实体？',
            isTyping: false,
          };
          setMessages((prev) => [...prev, assistantMessage]);
        } else {
          // 正常回复
          const assistantMessage: DisplayMessage = {
            role: 'assistant',
            content: result.data?.answer || '查询完成',
            displayContent: enableTypingEffect ? '' : result.data?.answer || '查询完成',
            isTyping: enableTypingEffect,
            sql: result.data?.sql,
            result: result.data?.result,
          };
          setMessages((prev) => [...prev, assistantMessage]);

          // 启动打字效果
          if (enableTypingEffect) {
            const messageIndex = messages.length + 1;
            startTyping(messageIndex, result.data?.answer || '查询完成');
          }

          // 更新建议问题
          if (result.data?.suggestions && result.data.suggestions.length > 0) {
            setSuggestions(result.data.suggestions);
          }
        }
      } else {
        message.error(result.error || '获取回答失败');
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
      const errorMessage: DisplayMessage = {
        role: 'assistant',
        content: '抱歉，网络连接出现问题，请稍后重试。',
        displayContent: '抱歉，网络连接出现问题，请稍后重试。',
        isTyping: false,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  // 确认实体
  const handleConfirmEntity = async (candidate: { type: string; matched: string; id: string }) => {
    if (!pendingEntityConfirm) return;

    setLoading(true);
    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: pendingEntityConfirm.question,
          confirmedEntity: candidate,
          ...extraParams,
        }),
      });

      const result: ChatAPIResponse = await response.json();

      if (result.success) {
        // 添加确认消息
        const confirmMessage: DisplayMessage = {
          role: 'user',
          content: `确认: ${candidate.matched}`,
          displayContent: `确认: ${candidate.matched}`,
          isTyping: false,
        };

        // 添加AI回复
        const assistantMessage: DisplayMessage = {
          role: 'assistant',
          content: result.data?.answer || '查询完成',
          displayContent: enableTypingEffect ? '' : result.data?.answer || '查询完成',
          isTyping: enableTypingEffect,
          sql: result.data?.sql,
          result: result.data?.result,
        };

        setMessages((prev) => [...prev, confirmMessage, assistantMessage]);

        // 启动打字效果
        if (enableTypingEffect) {
          const messageIndex = messages.length + 1;
          startTyping(messageIndex, result.data?.answer || '查询完成');
        }
      } else {
        message.error(result.error || '查询失败');
      }
    } catch (error) {
      console.error('确认实体失败:', error);
      message.error('确认实体失败');
    } finally {
      setLoading(false);
      setPendingEntityConfirm(null);
    }
  };

  // 清空对话
  const handleClear = () => {
    stopAllTyping();
    setMessages([]);
    setSuggestions([]);
    setInputMessage('');
    setPendingEntityConfirm(null);
    if (enableLocalStorage) {
      clearChatHistory();
    }
    message.success('对话已清空');
  };

  // 重新生成最后一条回复
  const handleRegenerate = async () => {
    if (loading || messages.length === 0) return;

    // 找到最后一条用户消息
    let lastUserIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserIndex = i;
        break;
      }
    }

    if (lastUserIndex === -1) return;

    const lastUserMessage = messages[lastUserIndex];
    const textToSend = lastUserMessage.content;

    // 停止打字效果
    stopAllTyping();

    // 移除最后一条AI回复（如果存在）
    const newMessages = messages.slice(0, lastUserIndex + 1);
    setMessages(newMessages);
    setLoading(true);

    try {
      // 构建历史消息（只保留最近10条，不包括最后一条AI回复）
      const history = newMessages
        .filter((m) => m.role !== 'system')
        .slice(-11, -1) // 排除最后一条用户消息
        .map(({ role, content }) => ({ role, content }));

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [messageField]: textToSend,
          history,
          ...extraParams,
        }),
      });

      const result: ChatAPIResponse = await response.json();

      if (result.success) {
        // 添加新的AI回复
        const assistantMessage: DisplayMessage = {
          role: 'assistant',
          content: result.data?.answer || '查询完成',
          displayContent: enableTypingEffect ? '' : result.data?.answer || '查询完成',
          isTyping: enableTypingEffect,
          sql: result.data?.sql,
          result: result.data?.result,
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // 启动打字效果
        if (enableTypingEffect) {
          const messageIndex = newMessages.length;
          startTyping(messageIndex, result.data?.answer || '查询完成');
        }

        // 更新建议问题
        if (result.data?.suggestions && result.data.suggestions.length > 0) {
          setSuggestions(result.data.suggestions);
        }
      } else {
        message.error(result.error || '重新生成失败');
        const errorMessage: DisplayMessage = {
          role: 'assistant',
          content: '抱歉，重新生成回答时出现错误，请稍后重试。',
          displayContent: '抱歉，重新生成回答时出现错误，请稍后重试。',
          isTyping: false,
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('重新生成失败:', error);
      message.error('重新生成失败');
      const errorMessage: DisplayMessage = {
        role: 'assistant',
        content: '抱歉，网络连接出现问题，请稍后重试。',
        displayContent: '抱歉，网络连接出现问题，请稍后重试。',
        isTyping: false,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const displaySuggestions = suggestions.length > 0 ? suggestions : initialSuggestions;

  // 获取消息的显示内容
  const getMessageDisplayContent = (msg: DisplayMessage, index: number): string => {
    if (msg.role === 'user') {
      return msg.displayContent || msg.content;
    }
    if (enableTypingEffect && isTyping(index)) {
      return getDisplayContent(index);
    }
    return msg.displayContent || msg.content;
  };

  return (
    <Card
      style={{ height: 'auto', minHeight: 'auto', ...cardStyle }}
      styles={{ body: { height: 'auto', padding: 0, display: 'flex', flexDirection: 'column' } }}
    >
      {/* 消息列表 */}
      <div
        style={{
          flex: 'none',
          overflow: 'visible',
          padding: '16px 24px',
          background: '#f5f5f5',
          ...messageContainerStyle,
        }}
      >
        {messages.length === 0 ? (
          renderWelcome ? (
            renderWelcome()
          ) : (
            <DefaultWelcome description={description} />
          )
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
                    <Text style={{ color: '#fff' }}>
                      {getMessageDisplayContent(msg, index)}
                    </Text>
                  ) : renderAssistantMessage ? (
                    renderAssistantMessage(
                      getMessageDisplayContent(msg, index),
                      isTyping(index),
                      msg.sql
                    )
                  ) : (
                    <AIMessageContent
                      content={getMessageDisplayContent(msg, index)}
                      isTyping={enableTypingEffect && isTyping(index)}
                      sql={msg.sql}
                      result={msg.result}
                      enableMarkdown={enableMarkdown}
                      enableThinkCollapse={enableThinkCollapse}
                      showTechnicalDetails={true}
                    />
                  )}
                  {/* 最后一条AI消息显示重新生成按钮 */}
                  {msg.role === 'assistant' &&
                    index === messages.length - 1 &&
                    !loading &&
                    !pendingEntityConfirm && (
                      <div style={{ marginTop: 8, textAlign: 'right' }}>
                        <Button
                          type="link"
                          size="small"
                          icon={<ReloadOutlined />}
                          onClick={handleRegenerate}
                          style={{ padding: 0, fontSize: 12 }}
                        >
                          重新生成
                        </Button>
                      </div>
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

            {/* 实体确认选项 */}
            {pendingEntityConfirm && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar
                  icon={<RobotOutlined />}
                  style={{ backgroundColor: '#1677ff', flexShrink: 0 }}
                />
                <Card size="small" style={{ maxWidth: '70%' }}>
                  <Paragraph style={{ marginBottom: 12 }}>请选择您指的是：</Paragraph>
                  <Space wrap>
                    {pendingEntityConfirm.candidates.map((candidate, idx) => (
                      <Button
                        key={idx}
                        type="primary"
                        ghost
                        onClick={() => handleConfirmEntity(candidate)}
                      >
                        {candidate.matched}
                      </Button>
                    ))}
                  </Space>
                </Card>
              </div>
            )}

            {loading && !pendingEntityConfirm && (
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
            placeholder={placeholder}
            autoSize={{ minRows: 1, maxRows: 4 }}
            maxLength={500}
            style={{ flex: 1 }}
            disabled={loading || !!pendingEntityConfirm}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={() => handleSend()}
            loading={loading}
            disabled={!inputMessage.trim() || !!pendingEntityConfirm}
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
