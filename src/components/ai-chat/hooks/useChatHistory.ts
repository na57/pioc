'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ChatMessage, DisplayMessage } from '../types';

export interface UseChatHistoryOptions {
  storageKey: string;
  maxHistoryLength?: number;
}

export interface UseChatHistoryReturn {
  messages: DisplayMessage[];
  setMessages: React.Dispatch<React.SetStateAction<DisplayMessage[]>>;
  saveMessages: (messages: ChatMessage[]) => void;
  clearHistory: () => void;
  loadHistory: () => ChatMessage[];
}

export function useChatHistory(options: UseChatHistoryOptions): UseChatHistoryReturn {
  const { storageKey, maxHistoryLength = 10 } = options;
  const [messages, setMessages] = useState<DisplayMessage[]>([]);

  // 验证消息格式
  const validateMessages = (data: unknown): data is ChatMessage[] => {
    if (!Array.isArray(data)) return false;
    return data.every(
      (m) =>
        m &&
        typeof m === 'object' &&
        'role' in m &&
        (m.role === 'user' || m.role === 'assistant' || m.role === 'system') &&
        'content' in m &&
        typeof m.content === 'string'
    );
  };

  // 从 localStorage 加载历史记录
  const loadHistory = useCallback((): ChatMessage[] => {
    try {
      const savedHistory = localStorage.getItem(storageKey);
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory) as unknown;
        if (validateMessages(parsedHistory)) {
          return parsedHistory;
        }
      }
    } catch (error) {
      console.error('加载历史会话失败:', error);
    }
    return [];
  }, [storageKey]);

  // 保存消息到 localStorage
  const saveMessages = useCallback(
    (msgs: ChatMessage[]) => {
      try {
        const historyToSave = msgs
          .filter((m) => m.role !== 'system')
          .slice(-maxHistoryLength)
          .map(({ role, content }) => ({ role, content }));
        localStorage.setItem(storageKey, JSON.stringify(historyToSave));
      } catch (error) {
        console.error('保存历史会话失败:', error);
      }
    },
    [storageKey, maxHistoryLength]
  );

  // 清空历史记录
  const clearHistory = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setMessages([]);
    } catch (error) {
      console.error('清除历史会话失败:', error);
    }
  }, [storageKey]);

  // 初始化时加载历史记录
  useEffect(() => {
    const history = loadHistory();
    if (history.length > 0) {
      // 将 ChatMessage 转换为 DisplayMessage
      setMessages(history.map(m => ({ ...m, displayContent: m.content, isTyping: false })));
    }
  }, [loadHistory]);

  // 消息变化时自动保存
  useEffect(() => {
    if (messages.length > 0) {
      saveMessages(messages);
    }
  }, [messages, saveMessages]);

  return {
    messages,
    setMessages,
    saveMessages,
    clearHistory,
    loadHistory,
  };
}
