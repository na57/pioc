'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Spin, Collapse, Tag, Space } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';

interface AiSummaryRendererProps {
  summary: string;
  loading: boolean;
  loadingText?: string;
  title?: string;
}

export default function AiSummaryRenderer({
  summary,
  loading,
  loadingText = 'AI 正在分析数据...',
  title,
}: AiSummaryRendererProps) {
  const [displayedSummary, setDisplayedSummary] = useState('');

  // 解析 AI 总结内容，分离思考过程和正式内容
  const parseAiSummary = useCallback((content: string): { thinkContent: string; formalContent: string } => {
    const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
    if (thinkMatch) {
      const thinkContent = thinkMatch[1].trim();
      const formalContent = content.replace(/<think>[\s\S]*?<\/think>/, '').trim();
      return { thinkContent, formalContent };
    }
    return { thinkContent: '', formalContent: content };
  }, []);

  // 实时解析显示的内容
  const summaryParsed = useMemo(() => parseAiSummary(displayedSummary), [displayedSummary, parseAiSummary]);

  // 逐字显示效果
  useEffect(() => {
    if (summary) {
      setDisplayedSummary('');
      let index = 0;
      const interval = setInterval(() => {
        if (index <= summary.length) {
          setDisplayedSummary(summary.slice(0, index));
          index++;
        } else {
          clearInterval(interval);
        }
      }, 30);

      return () => clearInterval(interval);
    }
  }, [summary]);

  return (
    <Spin spinning={loading} description={loadingText}>
      {displayedSummary ? (
        <Space orientation="vertical" style={{ width: '100%' }}>
          {/* 思考过程 - 可折叠 */}
          {summaryParsed.thinkContent && (
            <Collapse
              defaultActiveKey={[]}
              style={{
                backgroundColor: '#f6ffed',
                borderRadius: 8,
                border: '1px solid #b7eb8f',
              }}
              items={[
                {
                  key: 'think',
                  label: (
                    <Space>
                      <DownOutlined />
                      <span style={{ color: '#52c41a', fontWeight: 500 }}>思考过程</span>
                      <Tag color="success">AI 内部推理</Tag>
                    </Space>
                  ),
                  children: (
                    <div
                      style={{
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.8,
                        fontSize: 13,
                        color: '#389e0d',
                        padding: '8px 0',
                      }}
                    >
                      {summaryParsed.thinkContent}
                    </div>
                  ),
                },
              ]}
            />
          )}

          {/* 正式内容 - Markdown 渲染 */}
          <div
            style={{
              lineHeight: 1.8,
              fontSize: 14,
              padding: 16,
              backgroundColor: '#fff',
              borderRadius: 8,
              border: '1px solid #e8e8e8',
            }}
          >
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: '#1f1f1f' }}>
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10, marginTop: 16, color: '#1f1f1f' }}>
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 8, marginTop: 14, color: '#1f1f1f' }}>
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p style={{ marginBottom: 8 }}>{children}</p>
                ),
                ul: ({ children }) => (
                  <ul style={{ marginBottom: 8, paddingLeft: 20 }}>{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol style={{ marginBottom: 8, paddingLeft: 20 }}>{children}</ol>
                ),
                li: ({ children }) => (
                  <li style={{ marginBottom: 4 }}>{children}</li>
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
              {summaryParsed.formalContent}
            </ReactMarkdown>
          </div>
        </Space>
      ) : null}
    </Spin>
  );
}
