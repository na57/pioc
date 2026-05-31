'use client';

import { AIChatPanel } from '@/components/ai-chat';

interface AIChatProps {
  gh: string;
  teacherName: string;
}

export default function AIChat({ gh, teacherName }: AIChatProps) {
  const initialSuggestions = [
    `${teacherName}老师的教学和科研情况怎么样？`,
    `总结一下${teacherName}老师的整体情况`,
    `${teacherName}老师发表过多少篇论文？`,
    `${teacherName}老师的职业发展历程是怎样的？`,
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
        我是AI智能问答助手，专门回答关于<strong>{teacherName}</strong>老师的问题
      </div>
      <div style={{ marginBottom: 8, fontSize: 13, color: '#999' }}>
        • 只能询问关于这位老师的信息
      </div>
      <div style={{ marginBottom: 24, fontSize: 13, color: '#999' }}>
        • 回答仅基于系统中已有的数据，不会编造信息
      </div>
    </div>
  );

  return (
    <AIChatPanel
      apiEndpoint="/api/teacher-center/chat"
      title="AI问答"
      description={`我是AI智能问答助手，专门回答关于${teacherName}老师的问题`}
      placeholder={`请输入关于${teacherName}老师的问题...`}
      initialSuggestions={initialSuggestions}
      storageKey={`teacher_chat_history_${gh}`}
      extraParams={{ gh }}
      // 功能开关
      enableTypingEffect={true}
      enableMarkdown={true}
      enableThinkCollapse={true}
      enableEntityConfirm={false}
      enableLocalStorage={true}
      enableChart={true}
      chartConfig={{
        height: 300,
        showSummary: true,
      }}
      // 自定义渲染
      renderWelcome={renderWelcome}
    />
  );
}
