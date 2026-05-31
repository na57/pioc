'use client';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface DisplayMessage extends ChatMessage {
  displayContent?: string;
  isTyping?: boolean;
  sql?: string;
  result?: unknown;
}

export interface AIChatPanelProps {
  /** API端点URL */
  apiEndpoint: string;
  /** 页面标题 */
  title?: string;
  /** 副标题/描述 */
  description?: string;
  /** 输入框占位符 */
  placeholder?: string;
  /** 初始建议问题列表 */
  initialSuggestions?: string[];
  /** 本地存储key */
  storageKey?: string;
  /** 额外的请求参数 */
  extraParams?: Record<string, unknown>;
  /** 消息字段名，默认为 'message' */
  messageField?: string;

  // 功能开关
  /** 是否启用打字机效果 */
  enableTypingEffect?: boolean;
  /** 是否启用Markdown渲染 */
  enableMarkdown?: boolean;
  /** 是否启用思考过程折叠 */
  enableThinkCollapse?: boolean;
  /** 是否启用实体确认 */
  enableEntityConfirm?: boolean;
  /** 是否启用本地存储 */
  enableLocalStorage?: boolean;

  /** 自定义欢迎界面渲染 */
  renderWelcome?: () => React.ReactNode;
  /** 自定义AI消息渲染 */
  renderAssistantMessage?: (content: string, isTyping?: boolean, sql?: string) => React.ReactNode;

  // 自定义样式
  /** 卡片容器样式 */
  cardStyle?: React.CSSProperties;
  /** 消息列表容器样式 */
  messageContainerStyle?: React.CSSProperties;
}

export interface EntityCandidate {
  type: string;
  matched: string;
  id: string;
}

export interface PendingEntityConfirm {
  question: string;
  candidates: EntityCandidate[];
}

export interface ChatAPIResponse {
  success: boolean;
  data?: {
    answer?: string;
    sql?: string;
    result?: unknown;
    suggestions?: string[];
    needsClarification?: boolean;
    candidates?: EntityCandidate[];
    clarificationMessage?: string;
  };
  error?: string;
  userMessage?: string;
}
