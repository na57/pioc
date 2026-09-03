'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  Card,
  Spin,
  Empty,
  App,
  Typography,
  Tag,
  Select,
  Space,
  Button,
} from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const { Text } = Typography;

// ============================================
// 节点类型元数据：颜色 + 中文名
// ============================================

interface NodeMeta {
  color: string;
  label: string;
}

const NODE_META: Record<string, NodeMeta> = {
  information_system: { color: '#1677ff', label: '信息系统' }, // 蓝色（匹配样例）
  domain: { color: '#a0d911', label: '域名' }, // 黄绿色（匹配样例）
  dns_record: { color: '#4e5969', label: 'DNS记录' }, // 深灰蓝色（匹配样例）
  physical_device: { color: '#fa8c16', label: '物理设备' }, // 橙色（匹配样例）
  virtual_machine: { color: '#0958d9', label: '虚拟机' }, // 深蓝
  web_server: { color: '#13c2c2', label: 'Web服务器' }, // 青色
  web_app: { color: '#d4380d', label: 'Web应用' }, // 深橙
  web_site_monitor: { color: '#52c41a', label: 'Web站点监控' }, // 绿色
  port_monitor: { color: '#389e0d', label: '端口监控' }, // 深绿
  ops_access_control: { color: '#faad14', label: '运维访问控制' }, // 黄色
  data_source: { color: '#eb2f96', label: '数据源' }, // 粉色
};

// 非活动状态节点的统一颜色（灰色），正常颜色的节点即表示活动状态
const INACTIVE_NODE_COLOR = '#8c8c8c';

// ============================================
// 全局唯一 ID 工具（避免不同资产类型 ID 冲突）
// ============================================

const ID_SEP = '::';

function toGlobalId(nodeType: string, rawId: string): string {
  return `${nodeType}${ID_SEP}${rawId}`;
}

function fromGlobalId(gid: string): { nodeType: string; id: string } {
  if (!gid) return { nodeType: '', id: '' };
  const p = gid.indexOf(ID_SEP);
  if (p === -1) return { nodeType: '', id: gid };
  return { nodeType: gid.slice(0, p), id: gid.slice(p + ID_SEP.length) };
}

// ============================================
// 图数据结构（nodes + edges，力导向布局）
// ============================================

interface GraphNode {
  id: string;
  node_type: string;
  name: string;
  status?: string;
  children?: GraphNode[];
  collapsed?: boolean;
  _loaded?: boolean;
  _loading?: boolean;
  // 力导向布局特有：固定位置（拖拽后）
  fixed?: boolean;
  fx?: number;
  fy?: number;
}

interface ApiGraphNode {
  id: string;
  node_type: string;
  name: string;
  status?: string;
  key_fields: Record<string, string | undefined>;
}

// ECharts 原生保留字段：userdata 存放我们自定义数据（避免 ECharts 内部遍历自定义属性报 dataIndex 错误）
interface NodeUserdata {
  nodeType: string;
  rawId: string;
  status?: string;
  loaded?: boolean;
  loading?: boolean;
  collapsed?: boolean;
  childCount: number;
}

interface EChartsLink {
  source: string;
  target: string;
  lineStyle: {
    color: string;
    width: number;
    curveness: number;
    type?: string;
  };
}

// ============================================
// 工具：递归更新图
// ============================================

function attachChildren(
  nodes: GraphNode[],
  targetId: string,
  children: GraphNode[]
): GraphNode[] {
  return nodes.map((node) => {
    if (node.id === targetId) {
      return {
        ...node,
        children: [...(node.children || []), ...children],
        _loaded: true,
        _loading: false,
        collapsed: false,
      };
    }
    if (node.children && node.children.length > 0) {
      return {
        ...node,
        children: attachChildren(node.children, targetId, children),
      };
    }
    return node;
  });
}

function markLoaded(nodes: GraphNode[], targetId: string): GraphNode[] {
  return nodes.map((node) => {
    if (node.id === targetId) {
      return { ...node, _loaded: true, _loading: false };
    }
    if (node.children && node.children.length > 0) {
      return { ...node, children: markLoaded(node.children, targetId) };
    }
    return node;
  });
}

function toggleCollapsed(nodes: GraphNode[], targetId: string): GraphNode[] {
  return nodes.map((node) => {
    if (node.id === targetId) {
      return { ...node, collapsed: !node.collapsed };
    }
    if (node.children && node.children.length > 0) {
      return { ...node, children: toggleCollapsed(node.children, targetId) };
    }
    return node;
  });
}

function setLoadingFlag(nodes: GraphNode[], targetId: string): GraphNode[] {
  return nodes.map((node) => {
    if (node.id === targetId) {
      return { ...node, _loading: true };
    }
    if (node.children && node.children.length > 0) {
      return { ...node, children: setLoadingFlag(node.children, targetId) };
    }
    return node;
  });
}

function updateFixedPos(
  nodes: GraphNode[],
  targetId: string,
  fx?: number,
  fy?: number
): GraphNode[] {
  return nodes.map((node) => {
    if (node.id === targetId) {
      return { ...node, fixed: true, fx, fy };
    }
    if (node.children) {
      return { ...node, children: updateFixedPos(node.children, targetId, fx, fy) };
    }
    return node;
  });
}

// 递归收集可见节点（考虑 collapsed 状态）
function collectVisibleNodes(
  nodes: GraphNode[],
  result: GraphNode[] = []
): GraphNode[] {
  nodes.forEach((node) => {
    result.push(node);
    if (node.children && node.children.length > 0 && !node.collapsed) {
      collectVisibleNodes(node.children, result);
    }
  });
  return result;
}

// 递归收集可见边（source -> target），直接携带节点引用，
// 避免后续再用原始 id 反查类型（跨资产类型 id 冲突会导致类型误判）
function collectVisibleEdges(
  nodes: GraphNode[],
  result: { source: GraphNode; target: GraphNode }[] = []
): { source: GraphNode; target: GraphNode }[] {
  nodes.forEach((node) => {
    if (node.children && node.children.length > 0 && !node.collapsed) {
      node.children.forEach((child) => {
        result.push({ source: node, target: child });
      });
      collectVisibleEdges(node.children, result);
    }
  });
  return result;
}

// ============================================
// 组件
// ============================================

export interface FocusSystem {
  id: string;
  name: string;
  status?: string;
}

interface ResourceGraphProps {
  /** 外部指定的聚焦系统：仅显示该系统作为第一级节点（如列表"查看图谱"跳转） */
  focusSystem?: FocusSystem | null;
}

function makeSystemNode(sys: FocusSystem): GraphNode {
  return {
    id: sys.id,
    node_type: 'information_system',
    name: sys.name,
    status: sys.status,
    children: [],
    _loaded: false,
    collapsed: true,
  };
}

export default function ResourceGraph({ focusSystem }: ResourceGraphProps) {
  const { message } = App.useApp();
  const router = useRouter();
  const chartRef = useRef<any>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const defaultCanvasCursor = useRef<string>('grab');
  // 用 ref 持有 focus，供 loadTopLevelSystems 等异步流程读取最新值
  const focusRef = useRef<FocusSystem | undefined | null>(focusSystem);
  focusRef.current = focusSystem;
  const [loading, setLoading] = useState(true);
  const [graphData, setGraphData] = useState<GraphNode[]>([]);
  const [allTopSystems, setAllTopSystems] = useState<{ id: string; name: string; status?: string }[]>([]);
  const [selectedSystemIds, setSelectedSystemIds] = useState<string[]>(
    focusSystem ? [focusSystem.id] : []
  );
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const handleUnauthorized = useCallback(() => {
    router.push(
      `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`
    );
  }, [router]);

  // 加载顶层信息系统（无父应用的系统）
  const loadTopLevelSystems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        '/api/it-asset-center?action=systems&parent=root&per_page=1000'
      );
      if (response.status === 401) {
        handleUnauthorized();
        setLoading(false);
        return;
      }
      const result = await response.json();
      if (!result.success) {
        message.error(result.error || '加载信息系统失败');
        setLoading(false);
        return;
      }
      const systems: GraphNode[] = (result.data.data || []).map((sys: any) => ({
        id: sys.id,
        node_type: 'information_system',
        name: sys.name,
        status: sys.status,
        children: [],
        _loaded: false,
        collapsed: true,
      }));
      // 若存在聚焦系统，将其插入到第一级（即使它不是顶层系统）
      const focus = focusRef.current;
      const finalSystems = focus
        ? [makeSystemNode(focus), ...systems.filter((s) => s.id !== focus.id)]
        : systems;
      setAllTopSystems(finalSystems.map((s) => ({ id: s.id, name: s.name, status: s.status })));
      setGraphData(finalSystems);
      if (focus) {
        setSelectedSystemIds([focus.id]);
      }
    } catch {
      message.error('加载信息系统失败');
    } finally {
      setLoading(false);
    }
  }, [message, handleUnauthorized]);

  // 聚焦系统变化：预置筛选并保证该系统作为第一级节点存在
  useEffect(() => {
    focusRef.current = focusSystem;
    if (!focusSystem) {
      setSelectedSystemIds([]);
      return;
    }
    setSelectedSystemIds([focusSystem.id]);
    setGraphData((prev) => {
      const rest = prev.filter((n) => n.id !== focusSystem.id);
      return [makeSystemNode(focusSystem), ...rest];
    });
    // 下拉选项中也要包含该系统（可能不在顶层列表中）
    setAllTopSystems((prev) => {
      if (prev.some((s) => s.id === focusSystem.id)) {
        return prev.map((s) =>
          s.id === focusSystem.id ? { ...s, name: focusSystem.name, status: focusSystem.status } : s
        );
      }
      return [
        { id: focusSystem.id, name: focusSystem.name, status: focusSystem.status },
        ...prev,
      ];
    });
  }, [focusSystem]);

  // 加载子节点
  const fetchChildren = useCallback(
    async (nodeId: string, nodeType: string): Promise<GraphNode[]> => {
      const response = await fetch(
        `/api/it-asset-center?action=graph-children&node_id=${encodeURIComponent(
          nodeId
        )}&node_type=${encodeURIComponent(nodeType)}`
      );
      if (response.status === 401) {
        handleUnauthorized();
        return [];
      }
      const result = await response.json();
      if (!result.success) {
        message.error(result.error || '加载子节点失败');
        return [];
      }
      const children: GraphNode[] = (result.data.children || []).map(
        (c: ApiGraphNode) => ({
          id: c.id,
          node_type: c.node_type,
          name: c.name,
          status: c.status,
          children: [],
          _loaded: false,
          collapsed: true,
        })
      );
      return children;
    },
    [message, handleUnauthorized]
  );

  // 节点点击：读取 ECharts userdata 反解 rawId/nodeType → 操作 graphData
  const handleNodeClick = useCallback(
    async (params: any) => {
      const ud: NodeUserdata | undefined = params?.data?.userdata;
      if (!ud || !ud.rawId) return;

      const nodeId = ud.rawId;
      const nodeType = ud.nodeType;
      const loaded = ud.loaded;

      setSelectedNode({
        id: nodeId,
        node_type: nodeType,
        name: params.data.name,
        status: ud.status,
      });

      if (!loaded) {
        setGraphData((prev) => setLoadingFlag(prev, nodeId));
        try {
          const children = await fetchChildren(nodeId, nodeType);
          if (children.length === 0) {
            setGraphData((prev) => markLoaded(prev, nodeId));
          } else {
            setGraphData((prev) => attachChildren(prev, nodeId, children));
          }
        } catch {
          setGraphData((prev) => markLoaded(prev, nodeId));
        }
      } else {
        setGraphData((prev) => toggleCollapsed(prev, nodeId));
      }
    },
    [fetchChildren]
  );

  // 拖拽结束后保存节点固定位置
  const handleDragEnd = useCallback((params: any) => {
    const ud: NodeUserdata | undefined = params?.data?.userdata;
    if (!ud || !ud.rawId) return;
    const nodeId = ud.rawId;
    const x = params.event?.offsetX;
    const y = params.event?.offsetY;

    setGraphData((prev) =>
      updateFixedPos(
        prev,
        nodeId,
        typeof x === 'number' ? x : undefined,
        typeof y === 'number' ? y : undefined
      )
    );
  }, []);

  // 初始加载
  useEffect(() => {
    loadTopLevelSystems();
  }, [loadTopLevelSystems]);

  // Safari 双指捏合会触发非标准 gesture* 事件（不触发 wheel），
  // 默认行为是缩放整个页面。这里阻止默认行为，并把 gesture 的 scale
  // 转换为 wheel 事件派发给 ECharts 画布，实现仅图谱缩放。
  const lastGestureScaleRef = useRef<number | null>(null);

  const handleGestureStart = useCallback((e: Event) => {
    e.preventDefault();
    lastGestureScaleRef.current = null;
  }, []);

  const handleGestureChange = useCallback((e: Event) => {
    e.preventDefault();
    const ge = e as Event & { scale?: number; clientX?: number; clientY?: number };
    if (typeof ge.scale !== 'number') return;
    const prev = lastGestureScaleRef.current ?? ge.scale;
    const ratio = prev > 0 ? ge.scale / prev : 1;
    lastGestureScaleRef.current = ge.scale;
    if (Math.abs(ratio - 1) < 0.005) return;

    const canvas = canvasContainerRef.current?.querySelector('canvas');
    if (!canvas) return;
    // 派发合成 wheel 事件（ctrlKey 表示缩放手势），ECharts roam 会接管
    const wheel = new WheelEvent('wheel', {
      deltaY: ratio > 1 ? -8 : 8, // 放大向上滚、缩小向下滚
      clientX: ge.clientX ?? 0,
      clientY: ge.clientY ?? 0,
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    canvas.dispatchEvent(wheel);
  }, []);

  const handleGestureEnd = useCallback((e: Event) => {
    e.preventDefault();
    lastGestureScaleRef.current = null;
  }, []);

  // callback ref：节点挂载/卸载时绑定/解绑 gesture 事件
  const setGraphContainer = useCallback(
    (node: HTMLDivElement | null) => {
      const prev = canvasContainerRef.current;
      if (prev) {
        prev.removeEventListener('gesturestart', handleGestureStart);
        prev.removeEventListener('gesturechange', handleGestureChange);
        prev.removeEventListener('gestureend', handleGestureEnd);
      }
      canvasContainerRef.current = node;
      if (node) {
        node.addEventListener('gesturestart', handleGestureStart, { passive: false });
        node.addEventListener('gesturechange', handleGestureChange, { passive: false });
        node.addEventListener('gestureend', handleGestureEnd, { passive: false });
      }
    },
    [handleGestureStart, handleGestureChange, handleGestureEnd]
  );

  // 获取 canvas
  const getCanvasEl = useCallback((): HTMLCanvasElement | null => {
    const wrap = canvasContainerRef.current;
    if (!wrap) return null;
    return wrap.querySelector('canvas');
  }, []);

  // 注册图表事件
  const onChartReady = useCallback(
    (instance: any) => {
      instance.off('click');
      instance.off('dragEnd');
      instance.off('mouseover');
      instance.off('mouseout');

      instance.on('click', handleNodeClick);
      instance.on('dragEnd', handleDragEnd);

      // 光标切换：悬停节点时改为 pointer，避免 roam 的四向箭头
      instance.on('mouseover', (params: any) => {
        if (params?.componentType !== 'series') return;
        const isNode =
          params.dataType === 'node' ||
          (params.data && params.data.userdata && params.data.userdata.rawId);
        if (!isNode) return;
        const canvas = getCanvasEl();
        if (canvas) {
          if (canvas.style.cursor && canvas.style.cursor !== 'pointer') {
            defaultCanvasCursor.current = canvas.style.cursor;
          }
          canvas.style.cursor = 'pointer';
        }
      });

      instance.on('mouseout', () => {
        const canvas = getCanvasEl();
        if (canvas) {
          canvas.style.cursor = defaultCanvasCursor.current;
        }
      });
    },
    [handleNodeClick, handleDragEnd, getCanvasEl]
  );

  // ============================================
  // 转换为力导向图的 ECharts 配置数据
  // ============================================
  const { echartsNodes, echartsLinks, categories, displaySystemCount } = useMemo(() => {
    // 1. 按筛选条件取顶层节点，空数组=全部
    const filteredRootNodes =
      selectedSystemIds.length > 0
        ? graphData.filter((n) => selectedSystemIds.includes(n.id))
        : graphData;

    const visibleNodes = collectVisibleNodes(filteredRootNodes);
    const visibleEdgesRaw = collectVisibleEdges(filteredRootNodes);

    // 2. 分类（按 NODE_META 顺序 + 颜色）
    // 注意：必须为每个分类设置 itemStyle.color，否则图例会使用 ECharts 默认调色板，
    // 导致图例颜色与节点实际颜色不一致
    const categoryMap = new Map<string, number>();
    const cats: { name: string; itemStyle: { color: string } }[] = [];
    Object.entries(NODE_META).forEach(([type, meta]) => {
      categoryMap.set(type, cats.length);
      cats.push({ name: meta.label, itemStyle: { color: meta.color } });
    });
    // 追加"非活动资产"分类（灰色），非活动状态的节点统一归入该分类
    const inactiveCategoryIndex = cats.length;
    cats.push({ name: '非活动资产', itemStyle: { color: INACTIVE_NODE_COLOR } });

    // 3. 构建 ECharts data 项（加全局前缀去重，自定义数据放 userdata）
    type EChartsNodeItem = {
      id: string;                // 全局唯一 gid
      name: string;
      userdata: NodeUserdata;    // 原生 userdata 字段：自定义数据口袋
      symbolSize: number;
      category: number;
      fixed?: boolean;
      fx?: number;
      fy?: number;
      symbol: 'circle';
      itemStyle: {
        color: string;
        borderColor: string;
        borderWidth: number;
        shadowBlur?: number;
        shadowColor?: string;
        cursor: string;
      };
      label: {
        show: boolean;
        position: 'bottom';
        formatter: string;
        distance: number;
        fontSize: number;
        color: string;
        fontWeight: number;
        align: 'center';
        verticalAlign: 'top';
        cursor: string;
      };
    };

    const usedGids = new Set<string>();
    const nodes: EChartsNodeItem[] = [];
    for (const node of visibleNodes) {
      const gid = toGlobalId(node.node_type, node.id);
      if (usedGids.has(gid)) {
        // 防御：相同 ID 已出现（理论不会出现，除非 data 本身有脏数据）
        // eslint-disable-next-line no-console
        console.warn('[ResourceGraph] 跳过重复节点 ID：', gid, node.name);
        continue;
      }
      usedGids.add(gid);

      const meta = NODE_META[node.node_type] || { color: '#999', label: node.node_type };
      const isSystem = node.node_type === 'information_system';
      const isLoading = !!node._loading;
      const symbolSize = isSystem ? 52 : 26;
      const childCount = node.children?.length ?? 0;
      // 非活动状态（inactive/unknown/faulty/idle/planning）统一用灰色显示，正常颜色即表示活动状态
      const isInactive = !!node.status && node.status !== 'active';
      const nodeColor = isInactive ? INACTIVE_NODE_COLOR : meta.color;
      const nodeCategory = isInactive ? inactiveCategoryIndex : (categoryMap.get(node.node_type) ?? 0);

      nodes.push({
        id: gid,
        name: node.name,
        userdata: {
          nodeType: node.node_type,
          rawId: node.id,
          status: node.status,
          loaded: node._loaded,
          loading: isLoading,
          collapsed: node.collapsed,
          childCount,
        },
        symbol: 'circle',
        symbolSize,
        category: nodeCategory,
        fixed: node.fixed,
        fx: node.fx,
        fy: node.fy,
        itemStyle: {
          color: nodeColor,
          borderColor: '#ffffff',
          borderWidth: 2.5,
          shadowBlur: isLoading ? 12 : 6,
          shadowColor: isLoading ? nodeColor : 'rgba(0,0,0,0.2)',
          cursor: 'pointer',
        },
        label: {
          show: true,
          position: 'bottom',
          formatter: node.name,
          distance: 6,
          fontSize: 12,
          color: '#333',
          fontWeight: isSystem ? 600 : 400,
          align: 'center',
          verticalAlign: 'top',
          cursor: 'pointer',
        },
      });
    }

    // 4. 构建 links（source/target 都用 gid。边在收集阶段已携带精确节点引用，
    //    不再用原始 id 反查类型，避免跨资产类型 id 冲突导致类型误判）
    const links: EChartsLink[] = [];
    for (const edge of visibleEdgesRaw) {
      const srcNode = edge.source;
      const dstNode = edge.target;
      const srcGid = toGlobalId(srcNode.node_type, srcNode.id);
      const dstGid = toGlobalId(dstNode.node_type, dstNode.id);
      if (srcGid === dstGid) continue;
      const isSystemRelation = srcNode.node_type === 'information_system';
      links.push({
        source: srcGid,
        target: dstGid,
        lineStyle: {
          color: '#5a6a7e',
          width: isSystemRelation ? 1.5 : 1,
          curveness: 0.15,
          type: isSystemRelation ? 'solid' : 'dashed',
        },
      });
    }

    return {
      echartsNodes: nodes,
      echartsLinks: links,
      categories: cats,
      displaySystemCount: filteredRootNodes.length,
    };
  }, [graphData, selectedSystemIds]);

  // ============================================
  // ECharts Option
  // ============================================
  const option = useMemo(() => {
    // 避免空数组渲染：series.data 为空时 ECharts 也可能做内部遍历触发警告
    const safeNodes = echartsNodes.length > 0 ? echartsNodes : [];
    const safeLinks = echartsLinks.length > 0 ? echartsLinks : [];
    const safeCats = categories.length > 0 ? categories : [{ name: '无' }];

    return {
      tooltip: {
        trigger: 'item',
        confine: true,
        appendToBody: true,
        enterable: false,
        hideDelay: 100,
        formatter: (params: any) => {
          if (params.dataType === 'edge') {
            return `<div style="max-width:220px">
              <div style="font-weight:600;margin-bottom:4px">关联关系</div>
              <div>${params.data.sourceName || params.data.source} → ${params.data.targetName || params.data.target}</div>
            </div>`;
          }
          const ud: NodeUserdata | undefined = params.data?.userdata;
          if (!ud || !ud.rawId) return '';
          const meta = NODE_META[ud.nodeType];
          const loadingHint = ud.loading ? '<div style="color:#1677ff">⏳ 正在加载子节点...</div>' : '';
          const expandHint = !ud.loaded
            ? '<div style="color:#666;margin-top:4px">💡 点击展开关联资源</div>'
            : ud.childCount > 0
              ? `<div style="color:#666;margin-top:4px">📌 子节点 ${ud.childCount} 个（点击${ud.collapsed ? '展开' : '折叠'}）</div>`
              : '<div style="color:#999;margin-top:4px">— 无下级资源 —</div>';
          return `<div style="max-width:280px">
            <div style="font-weight:600;margin-bottom:6px;font-size:13px">${params.data.name}</div>
            <div style="margin-bottom:2px">类型：<span style="color:${meta?.color || '#999'}">${meta?.label || ud.nodeType}</span></div>
            ${loadingHint}
            ${expandHint}
          </div>`;
        },
      },
      legend: [
        {
          data: safeCats.map((c) => c.name),
          orient: 'vertical' as const,
          right: 16,
          top: 16,
          textStyle: { fontSize: 11 },
          itemWidth: 12,
          itemHeight: 12,
        },
      ],
      animation: true,
      animationDuration: 600,
      animationEasingUpdate: 'quinticInOut',
      series: [
        {
          type: 'graph',
          layout: 'force',
          // 保证 categories 顺序与 data.category 索引严格对齐
          categories: safeCats,
          // 只放标准字段：data / links / roam / draggable / force / emphasis / select / edgeSymbol / label / lineStyle / symbol 等
          data: safeNodes,
          links: safeLinks,
          roam: true,
          draggable: true,
          focusNodeAdjacency: true,
          force: {
            repulsion: 420,
            edgeLength: [100, 180],
            gravity: 0.06,
            edgeForce: 0.15,
            friction: 0.6,
          },
          symbol: 'circle',
          label: {
            show: true,
            position: 'bottom',
            distance: 6,
            fontSize: 12,
            color: '#333',
            align: 'center',
            verticalAlign: 'top',
            cursor: 'pointer',
          },
          lineStyle: {
            color: '#5a6a7e',
            width: 1.2,
            curveness: 0.15,
            opacity: 0.85,
          },
          edgeSymbol: ['none', 'arrow'],
          edgeSymbolSize: [0, 8],
          edgeLabel: { show: false },
          emphasis: {
            focus: 'adjacency' as const,
            lineStyle: {
              width: 2.5,
              opacity: 1,
            },
            itemStyle: {
              shadowBlur: 16,
              shadowColor: 'rgba(0,0,0,0.35)',
              borderWidth: 3,
              cursor: 'pointer',
            },
            label: {
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            },
          },
          select: {
            itemStyle: {
              borderWidth: 4,
              borderColor: '#f5222d',
              shadowBlur: 20,
              shadowColor: 'rgba(245,34,45,0.4)',
              cursor: 'pointer',
            },
            label: {
              fontWeight: 700,
              cursor: 'pointer',
            },
          },
          top: 20,
          bottom: 20,
          left: 20,
          right: 160,
        },
      ],
    };
  }, [echartsNodes, echartsLinks, categories]);

  // 选中节点详情面板
  const STATUS_BADGE_COLOR: Record<string, string> = {
    active: '#52c41a',
    inactive: '#8c8c8c',
    planning: '#1677ff',
  };

  const renderSelectedPanel = () => {
    if (!selectedNode) {
      return (
        <Text type="secondary" style={{ fontSize: 12 }}>
          点击节点可展开其关联资源
        </Text>
      );
    }

    const meta = NODE_META[selectedNode.node_type] || {
      color: '#999',
      label: selectedNode.node_type,
    };
    const isSystem = selectedNode.node_type === 'information_system';
    const detailHref = isSystem
      ? `/it-asset-center/${encodeURIComponent(selectedNode.id)}`
      : `/it-asset-center/assets/${selectedNode.node_type}/${encodeURIComponent(selectedNode.id)}`;

    return (
      <div>
        <div style={{ marginBottom: 8 }}>
          <Tag color={meta.color}>{meta.label}</Tag>
          <Link href={detailHref} target="_blank">
            {selectedNode.name}
          </Link>
        </div>
        <Text type="secondary" style={{ fontSize: 12 }}>
          状态：{selectedNode.status || '-'}
        </Text>
      </div>
    );
  };

  return (
    <Card
      title={
        <Space orientation="horizontal" size="middle" wrap>
          <span>资源图谱</span>
          {!loading && allTopSystems.length > 0 && (
            <Tag color="blue" style={{ margin: 0 }}>
              共 {allTopSystems.length} 个顶层系统
              {selectedSystemIds.length > 0 && `，已筛选 ${displaySystemCount} 个`}
            </Tag>
          )}
        </Space>
      }
      extra={
        <Space orientation="horizontal" size="middle" wrap>
          <Select
            mode="multiple"
            allowClear
            showSearch
            maxTagCount="responsive"
            placeholder={
              <Space orientation="horizontal" size={4}>
                <FilterOutlined />
                <span>筛选顶层信息系统</span>
              </Space>
            }
            style={{ minWidth: 280 }}
            size="middle"
            disabled={loading || allTopSystems.length === 0}
            value={selectedSystemIds}
            onChange={(values) => {
              setSelectedSystemIds(values);
              if (values.length > 0 && selectedNode && !values.includes(selectedNode.id)) {
                setSelectedNode(null);
              }
            }}
            options={allTopSystems.map((sys) => ({
              value: sys.id,
              label: sys.name,
              status: sys.status,
            }))}
            // 自定义过滤：按系统名称（label 字符串）模糊匹配。
            // 注意：antd 使用 options 数组时默认按 optionFilterProp（默认 value）过滤，
            // 会导致中文搜索匹配到 id 而显示 No data
            filterOption={(input, option) => {
              const label = String((option?.label as string) ?? '');
              return label.toLowerCase().includes(input.toLowerCase());
            }}
            optionRender={(optionInfo: any) => {
              const opt = optionInfo?.option ?? {};
              const status = opt.status ?? opt.data?.status ?? '';
              const color = STATUS_BADGE_COLOR[status] || '#bfbfbf';
              return (
                <Space orientation="horizontal" size={6} align="center">
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ color: '#333' }}>{optionInfo.label}</span>
                </Space>
              );
            }}
          />
        </Space>
      }
      styles={{ body: { padding: 16 } }}
    >
        <Spin spinning={loading} description="加载信息系统中...">
          {!loading && graphData.length === 0 ? (
            <Empty description="暂无信息系统数据" />
          ) : !loading && displaySystemCount === 0 ? (
            <Empty
              description={
                <Space orientation="vertical" size={8} align="center">
                  <span>筛选结果为空</span>
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => setSelectedSystemIds([])}
                  >
                    清空筛选条件
                  </Button>
                </Space>
              }
            />
          ) : (
            <div style={{ position: 'relative' }} ref={setGraphContainer}>
              <ReactECharts
                ref={chartRef}
                option={option}
                style={{ height: '640px', width: '100%' }}
                onChartReady={onChartReady}
                lazyUpdate={true}
                notMerge={false}
              />
              {selectedNode && (
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    background: 'rgba(255,255,255,0.96)',
                    border: '1px solid #e8e8e8',
                    borderRadius: 8,
                    padding: 14,
                    minWidth: 220,
                    maxWidth: 280,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    zIndex: 10,
                  }}
                >
                  {renderSelectedPanel()}
                </div>
              )}
            </div>
          )}
        </Spin>
        <div style={{ marginTop: 12, padding: '8px 12px', background: '#fafafa', borderRadius: 6 }}>
          <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.8 }}>
            💡 <strong>操作提示</strong>：<br />
            · <strong>顶部筛选</strong>：在右上角下拉框中按名称搜索并多选顶层信息系统，清空则显示全部<br />
            · 点击节点：加载并展开其直接关联资源；再次点击已加载节点可折叠/展开<br />
            · 拖拽节点：可自由拖动调整位置，松开后该节点将固定在新位置<br />
            · 画布操作：按住空白处拖拽平移整个图谱，鼠标滚轮缩放视图<br />
            · 悬停节点：高亮显示其所有邻接节点和关联关系
          </Text>
        </div>
    </Card>
  );
}
