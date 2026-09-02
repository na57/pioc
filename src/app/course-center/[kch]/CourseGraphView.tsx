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
  Space,
} from 'antd';
import { useSearchParams } from 'next/navigation';

const { Text } = Typography;

// ============================================
// 节点类型元数据：颜色 + 中文名
// ============================================

interface NodeMeta {
  color: string;
  label: string;
}

const NODE_META: Record<string, NodeMeta> = {
  course: { color: '#1677ff', label: '课程' }, // 蓝色
  semester: { color: '#faad14', label: '学期' }, // 黄色
  teaching_class: { color: '#52c41a', label: '教学班' }, // 绿色
  classroom_stats: { color: '#fa8c16', label: '课堂统计' }, // 橙色
  supervision: { color: '#eb2f96', label: '督导信息' }, // 粉色
  course_ideology: { color: '#722ed1', label: '课程思政' }, // 紫色
  grade: { color: '#13c2c2', label: '成绩信息' }, // 青色
};

// ============================================
// 全局唯一 ID 工具（避免不同类型 ID 冲突）
// ============================================

const ID_SEP = '::';

function toGlobalId(nodeType: string, rawId: string): string {
  return `${nodeType}${ID_SEP}${rawId}`;
}

// ============================================
// 图数据结构（nodes + edges，力导向布局）
// ============================================

interface GraphNode {
  id: string;
  node_type: string;
  name: string;
  status?: string;
  extraInfo?: string; // 额外信息（如教学班的教师、学期等）
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
  extraInfo?: string;
  children?: ApiGraphNode[];
}

// ECharts 原生保留字段：userdata 存放我们自定义数据
interface NodeUserdata {
  nodeType: string;
  rawId: string;
  status?: string;
  extraInfo?: string;
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

// 递归收集可见边（source -> target），返回原始 id 对
function collectVisibleEdges(
  nodes: GraphNode[],
  result: { sourceId: string; targetId: string }[] = []
): { sourceId: string; targetId: string }[] {
  nodes.forEach((node) => {
    if (node.children && node.children.length > 0 && !node.collapsed) {
      node.children.forEach((child) => {
        result.push({ sourceId: node.id, targetId: child.id });
      });
      collectVisibleEdges(node.children, result);
    }
  });
  return result;
}

// 按原始 ID 在可见树中反查 GraphNode
function findNodeByRawId(nodes: GraphNode[], rawId: string): GraphNode | undefined {
  for (const n of nodes) {
    if (n.id === rawId) return n;
    if (n.children && !n.collapsed) {
      const f = findNodeByRawId(n.children, rawId);
      if (f) return f;
    }
  }
  return undefined;
}

// ============================================
// 组件
// ============================================

interface CourseGraphViewProps {
  kch: string;
  courseName: string;
  courseType: 'undergraduate' | 'graduate';
}

export default function CourseGraphView({ kch, courseName, courseType }: CourseGraphViewProps) {
  const { message } = App.useApp();
  const chartRef = useRef<any>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const defaultCanvasCursor = useRef<string>('grab');
  const [loading, setLoading] = useState(true);
  const [graphData, setGraphData] = useState<GraphNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // 加载课程图谱数据（一次性加载所有层级的节点）
  const loadCourseGraph = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/course-center?action=course-graph&kch=${encodeURIComponent(kch)}&course_type=${courseType}`
      );
      if (response.status === 401) {
        message.error('请先登录');
        return;
      }
      const result = await response.json();
      if (!result.success) {
        message.error(result.error || '加载课程图谱失败');
        setLoading(false);
        return;
      }
      
      // 解析返回的图谱数据
      const rootNode: GraphNode = {
        id: kch,
        node_type: 'course',
        name: courseName,
        children: [],
        _loaded: true,
        collapsed: false,
      };

      // 如果有子节点数据，添加到根节点
      if (result.data?.children && result.data.children.length > 0) {
        rootNode.children = result.data.children.map((child: ApiGraphNode) => parseGraphNode(child));
      }

      setGraphData([rootNode]);
    } catch {
      message.error('加载课程图谱失败');
    } finally {
      setLoading(false);
    }
  }, [kch, courseName, courseType, message]);

  // 递归解析图谱节点
  const parseGraphNode = (node: ApiGraphNode): GraphNode => {
    return {
      id: node.id,
      node_type: node.node_type,
      name: node.name,
      status: node.status,
      extraInfo: node.extraInfo,
      children: node.children?.map(parseGraphNode) || [],
      _loaded: true,
      collapsed: false,
    };
  };

  // 加载子节点（如果需要动态加载）
  const fetchChildren = useCallback(
    async (nodeId: string, nodeType: string): Promise<GraphNode[]> => {
      const response = await fetch(
        `/api/course-center?action=graph-children&node_id=${encodeURIComponent(
          nodeId
        )}&node_type=${encodeURIComponent(nodeType)}&course_type=${courseType}`
      );
      if (response.status === 401) {
        message.error('请先登录');
        return [];
      }
      const result = await response.json();
      if (!result.success) {
        message.error(result.error || '加载子节点失败');
        return [];
      }
      const children: GraphNode[] = (result.data?.children || []).map(
        (c: ApiGraphNode) => ({
          id: c.id,
          node_type: c.node_type,
          name: c.name,
          status: c.status,
          extraInfo: c.extraInfo,
          children: [],
          _loaded: false,
          collapsed: true,
        })
      );
      return children;
    },
    [courseType, message]
  );

  // 节点点击：展开/折叠或加载子节点
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
        extraInfo: ud.extraInfo,
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
    if (kch && courseName) {
      loadCourseGraph();
    }
  }, [kch, courseName, loadCourseGraph]);

  // Safari 双指捏合手势支持
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
    const wheel = new WheelEvent('wheel', {
      deltaY: ratio > 1 ? -8 : 8,
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
  const { echartsNodes, echartsLinks, categories, nodeCount } = useMemo(() => {
    const visibleNodes = collectVisibleNodes(graphData);
    const visibleEdgesRaw = collectVisibleEdges(graphData);

    // 分类（按 NODE_META 顺序 + 颜色）
    // 注意：必须为每个分类设置 itemStyle.color，否则图例会使用 ECharts 默认调色板，
    // 导致图例颜色与节点实际颜色不一致
    const categoryMap = new Map<string, number>();
    const cats: { name: string; itemStyle: { color: string } }[] = [];
    Object.entries(NODE_META).forEach(([type, meta]) => {
      categoryMap.set(type, cats.length);
      cats.push({ name: meta.label, itemStyle: { color: meta.color } });
    });

    // 构建 ECharts data 项
    type EChartsNodeItem = {
      id: string;
      name: string;
      userdata: NodeUserdata;
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
        continue;
      }
      usedGids.add(gid);

      const meta = NODE_META[node.node_type] || { color: '#999', label: node.node_type };
      const isRoot = node.node_type === 'course';
      const isLoading = !!node._loading;
      const symbolSize = isRoot ? 36 : 28;
      const childCount = node.children?.length ?? 0;

      nodes.push({
        id: gid,
        name: node.name,
        userdata: {
          nodeType: node.node_type,
          rawId: node.id,
          status: node.status,
          extraInfo: node.extraInfo,
          loaded: node._loaded,
          loading: isLoading,
          collapsed: node.collapsed,
          childCount,
        },
        symbol: 'circle',
        symbolSize,
        category: categoryMap.get(node.node_type) ?? 0,
        fixed: node.fixed,
        fx: node.fx,
        fy: node.fy,
        itemStyle: {
          color: meta.color,
          borderColor: '#ffffff',
          borderWidth: isRoot ? 3 : 2.5,
          shadowBlur: isLoading ? 12 : isRoot ? 10 : 6,
          shadowColor: isLoading ? meta.color : 'rgba(0,0,0,0.2)',
          cursor: 'pointer',
        },
        label: {
          show: true,
          position: 'bottom',
          formatter: node.name,
          distance: 6,
          fontSize: isRoot ? 13 : 12,
          color: '#333',
          fontWeight: isRoot ? 600 : 400,
          align: 'center',
          verticalAlign: 'top',
          cursor: 'pointer',
        },
      });
    }

    // 构建 links
    const links: EChartsLink[] = [];
    for (const edge of visibleEdgesRaw) {
      const srcNode = findNodeByRawId(graphData, edge.sourceId);
      const dstNode = findNodeByRawId(graphData, edge.targetId);
      if (!srcNode || !dstNode) continue;
      const srcGid = toGlobalId(srcNode.node_type, edge.sourceId);
      const dstGid = toGlobalId(dstNode.node_type, edge.targetId);
      if (srcGid === dstGid) continue;
      const isRootRelation = srcNode.node_type === 'course';
      links.push({
        source: srcGid,
        target: dstGid,
        lineStyle: {
          color: isRootRelation ? '#1677ff' : '#5a6a7e',
          width: isRootRelation ? 2 : 1.2,
          curveness: 0.2,
          type: isRootRelation ? 'solid' : 'dashed',
        },
      });
    }

    return {
      echartsNodes: nodes,
      echartsLinks: links,
      categories: cats,
      nodeCount: nodes.length,
    };
  }, [graphData]);

  // ============================================
  // ECharts Option
  // ============================================
  const option = useMemo(() => {
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
          const extraInfoHtml = ud.extraInfo
            ? `<div style="margin-bottom:4px">${ud.extraInfo}</div>`
            : '';
          const loadingHint = ud.loading
            ? '<div style="color:#1677ff">⏳ 正在加载...</div>'
            : '';
          const childHint =
            ud.childCount > 0
              ? `<div style="color:#666;margin-top:4px">📌 ${ud.childCount} 个关联节点</div>`
              : '';
          return `<div style="max-width:280px">
            <div style="font-weight:600;margin-bottom:6px;font-size:13px">${params.data.name}</div>
            <div style="margin-bottom:2px">类型：<span style="color:${meta?.color || '#999'}">${meta?.label || ud.nodeType}</span></div>
            ${extraInfoHtml}
            ${loadingHint}
            ${childHint}
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
          categories: safeCats,
          data: safeNodes,
          links: safeLinks,
          roam: true,
          draggable: true,
          focusNodeAdjacency: true,
          force: {
            repulsion: 350,
            edgeLength: [120, 200],
            gravity: 0.08,
            edgeForce: 0.2,
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
            curveness: 0.2,
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
  const renderSelectedPanel = () => {
    if (!selectedNode) {
      return (
        <Text type="secondary" style={{ fontSize: 12 }}>
          点击节点查看详情
        </Text>
      );
    }

    const meta = NODE_META[selectedNode.node_type] || {
      color: '#999',
      label: selectedNode.node_type,
    };

    return (
      <div>
        <div style={{ marginBottom: 8 }}>
          <Tag color={meta.color}>{meta.label}</Tag>
        </div>
        <div style={{ fontWeight: 500, marginBottom: 4 }}>{selectedNode.name}</div>
        {selectedNode.extraInfo && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {selectedNode.extraInfo}
          </Text>
        )}
      </div>
    );
  };

  return (
    <Card
      title={
        <Space orientation="horizontal" size="middle" wrap>
          <span>课程图谱</span>
          {!loading && nodeCount > 0 && (
            <Tag color="blue" style={{ margin: 0 }}>
              共 {nodeCount} 个节点
            </Tag>
          )}
        </Space>
      }
      styles={{ body: { padding: 16 } }}
    >
      <Spin spinning={loading} description="加载课程图谱...">
        {!loading && graphData.length === 0 ? (
          <Empty description="暂无课程图谱数据" />
        ) : (
          <div style={{ position: 'relative' }} ref={setGraphContainer}>
            <ReactECharts
              ref={chartRef}
              option={option}
              style={{ height: '600px', width: '100%' }}
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
                  minWidth: 200,
                  maxWidth: 260,
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
      <div
        style={{
          marginTop: 12,
          padding: '8px 12px',
          background: '#fafafa',
          borderRadius: 6,
        }}
      >
        <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.8 }}>
          💡 <strong>操作提示</strong>：<br />
          · 拖拽节点：可自由拖动调整位置<br />
          · 画布操作：按住空白处拖拽平移整个图谱，鼠标滚轮缩放视图<br />
          · 悬停节点：高亮显示其所有邻接节点和关联关系
        </Text>
      </div>
    </Card>
  );
}