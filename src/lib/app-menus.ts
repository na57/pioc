// 应用级侧边菜单（代码内置，不入库）
//
// 设计说明：
// - 应用左侧菜单基本固定，少数场景可能根据用户在应用内的数据变化，
//   这类配置放数据库需要额外建表、迁移与管理界面，运维成本高于收益；
// - 各应用的侧边菜单在此按应用访问地址（pioc_apps.url）注册，
//   AppLayout 依据当前应用 URL 读取并渲染左侧栏；
// - 未来若某应用菜单需要按用户数据动态生成，可将此处的值扩展为
//   同步/异步解析函数（接收用户上下文），调用方 AppLayout 相应适配。

export interface AppSideMenu {
  /** 菜单名称 */
  name: string;
  /** 菜单路径，支持查询参数（如 /xxx?tab=stats） */
  path: string;
  /** 图标名称，需存在于 iconMapping 中 */
  icon?: string | null;
}

// 按应用 URL 注册的固定侧边菜单（数组顺序即展示顺序）
const appSideMenus: Record<string, AppSideMenu[]> = {
  // IT资产中心：与页面 Tabs 的 key 对应（无 tab 参数为「信息系统」默认页）
  '/it-asset-center': [
    { name: '信息系统', path: '/it-asset-center', icon: 'DatabaseOutlined' },
    { name: '数据统计', path: '/it-asset-center?tab=stats', icon: 'BarChartOutlined' },
    { name: '资产清单', path: '/it-asset-center?tab=assets', icon: 'AppstoreOutlined' },
    { name: 'AI智能问答', path: '/it-asset-center?tab=ai-chat', icon: 'RobotOutlined' },
    { name: '巡检计划', path: '/it-asset-center?tab=schedules', icon: 'FieldTimeOutlined' },
    { name: '资源图谱', path: '/it-asset-center?tab=graph', icon: 'ApartmentOutlined' },
  ],
};

/**
 * 获取指定应用 URL 的内置侧边菜单
 * 未注册的应用返回空数组（侧边栏自动隐藏）
 */
export function getAppSideMenus(appUrl?: string | null): AppSideMenu[] {
  if (!appUrl) return [];
  return appSideMenus[appUrl] ?? [];
}
