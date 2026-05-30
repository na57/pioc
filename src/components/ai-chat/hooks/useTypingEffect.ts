'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseTypingEffectOptions {
  speed?: number;
  onComplete?: () => void;
}

export interface UseTypingEffectReturn {
  displayContent: string;
  isTyping: boolean;
  startTyping: (content: string) => void;
  stopTyping: () => void;
}

export function useTypingEffect(options: UseTypingEffectOptions = {}): UseTypingEffectReturn {
  const { speed = 25, onComplete } = options;
  const [displayContent, setDisplayContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const contentRef = useRef('');
  const currentIndexRef = useRef(0);

  // 停止打字效果
  const stopTyping = useCallback(() => {
    if (typingRef.current) {
      clearInterval(typingRef.current);
      typingRef.current = null;
    }
    setIsTyping(false);
  }, []);

  // 开始打字效果
  const startTyping = useCallback(
    (content: string) => {
      // 先停止之前的打字效果
      stopTyping();

      contentRef.current = content;
      currentIndexRef.current = 0;
      setDisplayContent('');
      setIsTyping(true);

      typingRef.current = setInterval(() => {
        currentIndexRef.current += 1;
        const newContent = contentRef.current.slice(0, currentIndexRef.current);
        setDisplayContent(newContent);

        if (currentIndexRef.current >= contentRef.current.length) {
          stopTyping();
          onComplete?.();
        }
      }, speed);
    },
    [speed, stopTyping, onComplete]
  );

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (typingRef.current) {
        clearInterval(typingRef.current);
      }
    };
  }, []);

  return {
    displayContent,
    isTyping,
    startTyping,
    stopTyping,
  };
}

// 用于管理多个消息的打字效果
export interface UseMultiTypingEffectReturn {
  getDisplayContent: (index: number) => string;
  isTyping: (index: number) => boolean;
  startTyping: (index: number, content: string) => void;
  stopAllTyping: () => void;
}

export function useMultiTypingEffect(options: UseTypingEffectOptions = {}): UseMultiTypingEffectReturn {
  const { speed = 25 } = options;
  const [typingStates, setTypingStates] = useState<Record<number, { content: string; isTyping: boolean }>>({});
  const typingRefs = useRef<Record<number, ReturnType<typeof setInterval>>>({});

  // 停止所有打字效果
  const stopAllTyping = useCallback(() => {
    Object.values(typingRefs.current).forEach((ref) => {
      if (ref) clearInterval(ref);
    });
    typingRefs.current = {};
  }, []);

  // 开始指定消息的打字效果
  const startTyping = useCallback(
    (index: number, content: string) => {
      // 停止该索引之前的打字效果
      if (typingRefs.current[index]) {
        clearInterval(typingRefs.current[index]);
      }

      let currentIndex = 0;
      setTypingStates((prev) => ({
        ...prev,
        [index]: { content: '', isTyping: true },
      }));

      typingRefs.current[index] = setInterval(() => {
        currentIndex += 1;
        setTypingStates((prev) => ({
          ...prev,
          [index]: {
            content: content.slice(0, currentIndex),
            isTyping: currentIndex < content.length,
          },
        }));

        if (currentIndex >= content.length) {
          if (typingRefs.current[index]) {
            clearInterval(typingRefs.current[index]);
            delete typingRefs.current[index];
          }
        }
      }, speed);
    },
    [speed]
  );

  // 获取指定索引的显示内容
  const getDisplayContent = useCallback(
    (index: number) => {
      return typingStates[index]?.content || '';
    },
    [typingStates]
  );

  // 获取指定索引是否正在打字
  const isTyping = useCallback(
    (index: number) => {
      return typingStates[index]?.isTyping || false;
    },
    [typingStates]
  );

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      Object.values(typingRefs.current).forEach((ref) => {
        if (ref) clearInterval(ref);
      });
    };
  }, []);

  return {
    getDisplayContent,
    isTyping,
    startTyping,
    stopAllTyping,
  };
}
