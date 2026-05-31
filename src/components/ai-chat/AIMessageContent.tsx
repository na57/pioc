'use client';

import { useMemo } from 'react';
import { Space, Typography, Tag, Collapse } from 'antd';
import { DownOutlined, CodeOutlined, DatabaseOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AIChart from './AIChart';
import type { ChartConfig } from './types';

const { Paragraph } = Typography;

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

interface AIMessageContentProps {
  content: string;
  isTyping?: boolean;
  sql?: string;
  result?: unknown;
  enableMarkdown?: boolean;
  enableThinkCollapse?: boolean;
  showTechnicalDetails?: boolean;
  enableChart?: boolean;
  chartConfig?: ChartConfig;
}

export default function AIMessageContent({
  content,
  isTyping,
  sql,
  result,
  enableMarkdown = true,
  enableThinkCollapse = true,
  showTechnicalDetails = true,
  enableChart = true,
  chartConfig,
}: AIMessageContentProps) {
  const { thinkContent, formalContent } = useMemo(() => parseAIContent(content), [content]);

  // 简单的文本渲染
  const renderSimpleText = (text: string) => (
    <div style={{ lineHeight: 1.8 }}>{text}</div>
  );

  // Markdown 渲染
  const renderMarkdown = (text: string) => (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
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
        {text}
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
  );

  // 技术详情渲染（SQL和查询结果）
  const renderTechnicalDetails = () => {
    if (!showTechnicalDetails || (!sql && !result)) return null;

    return (
      <Collapse
        defaultActiveKey={[]}
        size="small"
        expandIcon={({ isActive }) => (
          <DownOutlined
            style={{
              fontSize: 10,
              marginRight: 4,
              transition: 'transform 0.3s',
              transform: isActive ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        )}
        style={{
          backgroundColor: 'transparent',
          borderRadius: 4,
          border: 'none',
          marginTop: 8,
        }}
        items={[
          {
            key: 'tech',
            label: <span style={{ color: '#999', fontSize: 12 }}>查看技术详情</span>,
            children: (
              <Space orientation="vertical" style={{ width: '100%' }}>
                {sql && (
                  <div>
                    <Tag color="blue" style={{ fontSize: 11, marginBottom: 4 }}>
                      <CodeOutlined style={{ marginRight: 4 }} />
                      SQL
                    </Tag>
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
                      {sql}
                    </pre>
                  </div>
                )}
                {result !== undefined && result !== null && (
                  <div>
                    <Tag color="green" style={{ fontSize: 11, marginBottom: 4 }}>
                      <DatabaseOutlined style={{ marginRight: 4 }} />
                      查询结果
                    </Tag>
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
                      {JSON.stringify(result as Record<string, unknown>, null, 2)}
                    </pre>
                  </div>
                )}
              </Space>
            ),
          },
        ]}
      />
    );
  };

  // 思考过程渲染
  const renderThinkContent = () => {
    if (!enableThinkCollapse || !thinkContent) return null;

    return (
      <Collapse
        defaultActiveKey={[]}
        size="small"
        expandIcon={({ isActive }) => (
          <DownOutlined
            style={{
              fontSize: 10,
              marginRight: 4,
              transition: 'transform 0.3s',
              transform: isActive ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        )}
        style={{
          backgroundColor: 'transparent',
          borderRadius: 4,
          border: 'none',
          marginBottom: 4,
        }}
        items={[
          {
            key: 'think',
            label: <span style={{ color: '#999', fontSize: 12 }}>思考过程</span>,
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
    );
  };

  return (
    <Space orientation="vertical" style={{ width: '100%' }}>
      {renderThinkContent()}
      {enableMarkdown ? renderMarkdown(formalContent) : renderSimpleText(formalContent)}
      {enableChart && result && (
        <AIChart data={result} config={chartConfig} />
      )}
      {renderTechnicalDetails()}
    </Space>
  );
}
