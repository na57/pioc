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
  /**
   * 视图权限 key（可选）。
   * 设置后由应用方提供「当前用户可访问的 key 集合」进行过滤，
   * 例如 ITC 网络天气图使用视图 id（core / hyperconverged / loadbalancer）。
   */
  viewId?: string;
  /** 子菜单（设置后渲染为可收缩的子菜单，父项标题可点击跳转） */
  children?: AppSideMenu[];
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
  // ITC网络天气图（viewId 对应 config/itc-weathermap.yaml 的视图 id，按角色过滤）
  // 「数据中心核心链路」为父项，超融合/负载均衡业务为其子项（可收缩）
  '/itc-weathermap': [
    {
      name: '数据中心核心链路',
      path: '/itc-weathermap',
      icon: 'GlobalOutlined',
      viewId: 'core',
      children: [
        { name: '超融合业务', path: '/itc-weathermap/hyperconverged', icon: 'CloudServerOutlined', viewId: 'hyperconverged' },
        { name: '负载均衡业务', path: '/itc-weathermap/loadbalancer', icon: 'DeploymentUnitOutlined', viewId: 'loadbalancer' },
      ],
    },
    // 运维排障工具：不设 viewId，所有可访问本应用的用户均可用
    { name: 'SNMP 诊断', path: '/itc-weathermap/snmp-diagnosis', icon: 'ApiOutlined' },
  ],
};

/**
 * 获取指定应用的侧边菜单
 *
 * @param permittedViewIds 当前用户可访问的视图 key 集合；
 *        传入后带 viewId 的菜单项若不在集合中则被过滤
 *        （父项在自身或任一子项可见时保留，子项全部不可见时父项降级为普通项）。
 */
export function getAppSideMenus(
  appUrl?: string | null,
  permittedViewIds?: Set<string>,
): AppSideMenu[] {
  if (!appUrl) return [];

  const filterByView = (menus: AppSideMenu[]): AppSideMenu[] => {
    if (!permittedViewIds) return menus;
    return menus
      .map((m) => {
        if (m.children?.length) {
          const children = filterByView(m.children);
          // 父项自身可见 或 任一子项可见时保留；
          // 子项全部被过滤后父项降级为普通项
          const selfAllowed = !m.viewId || permittedViewIds.has(m.viewId);
          if (!selfAllowed && children.length === 0) return null;
          return children.length > 0 ? { ...m, children } : { ...m, children: undefined };
        }
        if (m.viewId && !permittedViewIds.has(m.viewId)) return null;
        return m;
      })
      .filter((m): m is AppSideMenu => m !== null);
  };

  const menus = appSideMenus[appUrl];
  return menus ? filterByView(menus) : [];
}
