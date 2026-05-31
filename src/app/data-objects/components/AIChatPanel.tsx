'use client';

import { AIChatPanel as AIChatPanelBase } from '@/components/ai-chat';

interface AIChatPanelProps {
  dataObjectId: number;
  dataObjectName: string;
}

export default function AIChatPanel({ dataObjectId, dataObjectName }: AIChatPanelProps) {
  const initialSuggestions = [
    '查询前10条数据',
    '统计总数',
    '按某个字段排序',
    '查询特定条件的数据',
  ];

  // 自定义欢迎界面
  const renderWelcome = () => (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: 48, color: '#1677ff', marginBottom: 16 }}>
        <svg viewBox="0 0 1024 1024" width="1em" height="1em" fill="currentColor">
          <path d="M464 144c-40 0-72 32-72 72v64H200c-40 0-72 32-72 72v400c0 40 32 72 72 72h624c40 0 72-32 72-72V352c0-40-32-72-72-72H608v-64c0-40-32-72-72-72h-72z m0 64h72v72h-72v-72zM200 320h624c17 0 32 15 32 32v400c0 17-15 32-32 32H200c-17 0-32-15-32-32V352c0-17 15-32 32-32z" />
          <path d="M512 480c-80 0-144 64-144 144s64 144 144 144 144-64 144-144-64-144-144-144z m0 64c44 0 80 36 80 80s-36 80-80 80-80-36-80-80 36-80 80-80z" />
        </svg>
      </div>
      <div style={{ fontSize: 16, color: '#666', marginBottom: 16 }}>
        我是AI助手，可以帮您查询和分析"<strong>{dataObjectName}</strong>"的数据
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
  );

  return (
    <AIChatPanelBase
      apiEndpoint={`/api/data-objects/${dataObjectId}/ai-chat`}
      title="AI 问答"
      description={`我是AI助手，可以帮您查询和分析"${dataObjectName}"的数据`}
      placeholder="请输入您的问题..."
      initialSuggestions={initialSuggestions}
      storageKey={`data_object_chat_${dataObjectId}`}
      messageField="question"
      // 功能开关 - data-objects 启用 Markdown 以支持表格等格式
      enableTypingEffect={true}
      enableMarkdown={true}
      enableThinkCollapse={true}
      enableEntityConfirm={false}
      enableLocalStorage={false}
      enableChart={true}
      chartConfig={{
        height: 320,
        showSummary: true,
      }}
      // 自定义渲染
      renderWelcome={renderWelcome}
    />
  );
}
