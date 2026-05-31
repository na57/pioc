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

// 图表类型
export type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'area';

// 图表数据格式
export interface ChartData {
  // 格式1: 数组格式 [{name: 'A', value: 10}, ...]
  [key: number]: Record<string, unknown>;
  length: number;
  // 格式2: { categories: [], values: [] }
  categories?: string[];
  values?: number[] | number[][];
  // 格式3: { xAxis: [], series: [] }
  xAxis?: string[];
  series?: Array<{ name?: string; data: number[] }>;
  // 格式4: { labels: [], data: [] }（饼图）
  labels?: string[];
  data?: number[];
}

// 图表配置
export interface ChartConfig {
  /** 图表标题 */
  title?: string;
  /** 默认图表类型 */
  defaultType?: ChartType;
  /** 图表高度 */
  height?: number;
  /** 是否显示数据摘要 */
  showSummary?: boolean;
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
  /** 是否启用图表展示 */
  enableChart?: boolean;
  /** 图表配置 */
  chartConfig?: ChartConfig;

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
