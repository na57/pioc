// 响应式断点配置（与 Ant Design 保持一致）
export const breakpoints = {
  xs: 480,    // 超小屏幕（手机）
  sm: 576,    // 小屏幕（平板竖屏）
  md: 768,    // 中等屏幕（平板横屏）
  lg: 992,    // 大屏幕（笔记本）
  xl: 1200,   // 超大屏幕（桌面）
  xxl: 1600,  // 超大屏幕（大屏桌面）
} as const;

// 媒体查询工具函数
export const mediaQueries = {
  xs: `(max-width: ${breakpoints.xs}px)`,
  sm: `(max-width: ${breakpoints.sm}px)`,
  md: `(max-width: ${breakpoints.md}px)`,
  lg: `(max-width: ${breakpoints.lg}px)`,
  xl: `(max-width: ${breakpoints.xl}px)`,
  xxl: `(max-width: ${breakpoints.xxl}px)`,
} as const;

// 响应式栅格配置
export const responsiveGrid = {
  // 单列布局（移动端）
  singleColumn: {
    xs: 24,
    sm: 24,
    md: 24,
    lg: 24,
    xl: 24,
    xxl: 24,
  },
  // 双列布局
  twoColumn: {
    xs: 24,
    sm: 24,
    md: 12,
    lg: 12,
    xl: 12,
    xxl: 12,
  },
  // 三列布局
  threeColumn: {
    xs: 24,
    sm: 24,
    md: 12,
    lg: 8,
    xl: 8,
    xxl: 8,
  },
  // 四列布局
  fourColumn: {
    xs: 24,
    sm: 12,
    md: 12,
    lg: 6,
    xl: 6,
    xxl: 6,
  },
  // 卡片网格布局
  cardGrid: {
    xs: 24,
    sm: 12,
    md: 12,
    lg: 8,
    xl: 6,
    xxl: 6,
  },
} as const;

// 内容区域最大宽度
export const contentMaxWidth = {
  xs: '100%',
  sm: '100%',
  md: '100%',
  lg: '960px',
  xl: '1200px',
  xxl: '1400px',
} as const;

// 响应式间距
export const responsiveSpacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// 响应式内边距
export const responsivePadding = {
  xs: '12px 16px',
  sm: '16px 20px',
  md: '20px 24px',
  lg: '24px 32px',
  xl: '24px 48px',
  xxl: '24px 64px',
} as const;
