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

interface EChartsNode {
  id: string;
  name: string;
  node_type: string;
  status?: string;
  _loaded?: boolean;
  _loading?: boolean;
  // Tooltip 显示需要的派生字段（避免挂载深层引用 _raw）
  collapsed?: boolean;
  _childCount?: number;
  symbolSize: number;
  category: number;
  fixed?: boolean;
  fx?: number;
  fy?: number;
  itemStyle: {
    color: string;
    borderColor: string;
    borderWidth: number;
    shadowBlur?: number;
    shadowColor?: string;
  };
  label: {
    show: boolean;
    position: string;
    formatter: string;
    fontSize: number;
    color: string;
    fontWeight?: number;
  };
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

// 递归收集可见边（source -> target）
function collectVisibleEdges(
  nodes: GraphNode[],
  result: { source: string; target: string }[] = []
): { source: string; target: string }[] {
  nodes.forEach((node) => {
    if (node.children && node.children.length > 0 && !node.collapsed) {
      node.children.forEach((child) => {
        result.push({ source: node.id, target: child.id });
      });
      collectVisibleEdges(node.children, result);
    }
  });
  return result;
}

// ============================================
// 组件
// ============================================

export default function ResourceGraph() {
  const { message } = App.useApp();
  // 用 ref 持有 message / router，避免其引用变化导致 useCallback/useEffect 无限重跑
  const messageRef = useRef(message);
  messageRef.current = message;
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const chartRef = useRef<any>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  // 记录上一次 roam 默认的光标，恢复时使用
  const defaultCanvasCursor = useRef<string>('grab');
  const [loading, setLoading] = useState(true);
  const [graphData, setGraphData] = useState<GraphNode[]>([]);
  const [allTopSystems, setAllTopSystems] = useState<{ id: string; name: string; status?: string }[]>([]);
  const [selectedSystemIds, setSelectedSystemIds] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const handleUnauthorized = useCallback(() => {
    routerRef.current.push(
      `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`
    );
  }, []);

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
        messageRef.current.error(result.error || '加载信息系统失败');
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
      // 保存一份完整列表（用于下拉选项）
      setAllTopSystems(systems.map((s) => ({ id: s.id, name: s.name, status: s.status })));
      setGraphData(systems);
    } catch {
      messageRef.current.error('加载信息系统失败');
    } finally {
      setLoading(false);
    }
  }, [handleUnauthorized]);

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
        messageRef.current.error(result.error || '加载子节点失败');
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
    [handleUnauthorized]
  );

  // 节点点击：加载子节点 / 切换展开折叠
  const handleNodeClick = useCallback(
    async (params: any) => {
      const data = params?.data;
      if (!data) return;

      // EChartsNode 自身已携带所需字段，直接读取
      const nodeId = data.id;
      const nodeType = data.node_type;
      const loaded = data._loaded;

      setSelectedNode({
        id: nodeId,
        node_type: nodeType,
        name: data.name,
        status: data.status,
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

  // 初始加载：获取顶层信息系统
  useEffect(() => {
    loadTopLevelSystems();
  }, [loadTopLevelSystems]);

  // 拖拽结束后保存节点固定位置
  const handleDragEnd = useCallback((params: any) => {
    const data = params?.data;
    if (!data || !data.id) return;
    const nodeId = data.id;
    const coord = params.event?.offsetX !== undefined
      ? { x: params.event.offsetX, y: params.event.offsetY }
      : null;

    setGraphData((prev) => {
      function updateFixed(nodes: GraphNode[]): GraphNode[] {
        return nodes.map((n) => {
          if (n.id === nodeId) {
            return {
              ...n,
              fixed: true,
              fx: coord?.x ?? n.fx,
              fy: coord?.y ?? n.fy,
            };
          }
          if (n.children) {
            return { ...n, children: updateFixed(n.children) };
          }
          return n;
        });
      }
      return updateFixed(prev);
    });
  }, []);

  // 获取 ECharts 渲染的 canvas 元素
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

      // 解决 roam 光标（四向箭头/grab）覆盖节点 pointer 光标的问题：
      // 鼠标进入节点时直接修改 canvas 的 style.cursor，离开时恢复
      instance.on('mouseover', (params: any) => {
        if (params?.componentType !== 'series') return;
        // 只在"节点"上显示手形（边 edge 不显示）：dataType === 'node' 或 data.id 存在
        const data = params.data;
        const isNode = params.dataType === 'node' || (data && data.id);
        if (!isNode) return;
        const canvas = getCanvasEl();
        if (canvas) {
          // 先记录 roam 原本的光标（grab/grabbing/move 等），离开时还原
          if (canvas.style.cursor && canvas.style.cursor !== 'pointer') {
            defaultCanvasCursor.current = canvas.style.cursor;
          }
          canvas.style.cursor = 'pointer';
        }
      });

      instance.on('mouseout', (_params: any) => {
        const canvas = getCanvasEl();
        if (canvas) {
          canvas.style.cursor = defaultCanvasCursor.current;
        }
      });
    },
    [handleNodeClick, handleDragEnd, getCanvasEl]
  );

  // 将图数据转换为力导向图的 nodes + links
  const { echartsNodes, echartsLinks, categories, displaySystemCount } = useMemo(() => {
    // 根据选中的顶层系统ID进行过滤（空数组表示全部显示）
    const filteredRootNodes = selectedSystemIds.length > 0
      ? graphData.filter((n) => selectedSystemIds.includes(n.id))
      : graphData;

    const visibleNodes = collectVisibleNodes(filteredRootNodes);
    const visibleEdges = collectVisibleEdges(filteredRootNodes);

    // 分类（按节点类型）
    const categoryMap = new Map<string, number>();
    const cats: { name: string }[] = [];
    Object.entries(NODE_META).forEach(([type, meta]) => {
      categoryMap.set(type, cats.length);
      cats.push({ name: meta.label });
    });

    const nodes: EChartsNode[] = visibleNodes.map((node) => {
      const meta = NODE_META[node.node_type] || { color: '#999', label: node.node_type };
      const isSystem = node.node_type === 'information_system';
      const isLoading = node._loading;
      // 信息系统节点略大
      const symbolSize = isSystem ? 32 : 26;

      const childCount = node.children?.length ?? 0;
      return {
        id: node.id,
        name: node.name,
        node_type: node.node_type,
        status: node.status,
        _loaded: node._loaded,
        _loading: node._loading,
        // Tooltip 用：派生字段（不挂载深层 children 引用）
        collapsed: node.collapsed,
        _childCount: childCount,
        symbolSize,
        category: categoryMap.get(node.node_type) ?? 0,
        fixed: node.fixed,
        fx: node.fx,
        fy: node.fy,
        itemStyle: {
          color: meta.color,
          borderColor: '#ffffff',
          borderWidth: 2.5,
          shadowBlur: isLoading ? 12 : 6,
          shadowColor: isLoading ? meta.color : 'rgba(0,0,0,0.2)',
          // 节点悬停显示手形光标，暗示可点击展开/折叠
          cursor: 'pointer',
        },
        label: {
          show: true,
          position: 'bottom',
          formatter: node.name,
          fontSize: 12,
          color: '#333',
          fontWeight: isSystem ? 600 : 400,
          // 标签区域也显示手形光标
          cursor: 'pointer',
        },
      };
    });

    const links: EChartsLink[] = visibleEdges.map((edge) => {
      // 查找源节点类型以决定边样式
      const sourceNode = visibleNodes.find((n) => n.id === edge.source);
      const isSystemRelation = sourceNode?.node_type === 'information_system';
      return {
        source: edge.source,
        target: edge.target,
        lineStyle: {
          color: '#5a6a7e',
          width: isSystemRelation ? 1.5 : 1,
          curveness: 0.15,
          // 信息系统内部用实线，跨类型关联用虚线
          type: isSystemRelation ? 'solid' : 'dashed',
        },
      };
    });

    return {
      echartsNodes: nodes,
      echartsLinks: links,
      categories: cats,
      displaySystemCount: filteredRootNodes.length,
    };
  }, [graphData, selectedSystemIds]);

  // 构建 ECharts 力导向图配置
  const option = useMemo(() => ({
    tooltip: {
      trigger: 'item',
      confine: true,
      appendToBody: true,
      formatter: (params: any) => {
        if (params.dataType === 'edge') {
          return `<div style="max-width:200px">
            <div style="font-weight:600;margin-bottom:4px">关联关系</div>
            <div>${params.data.source} → ${params.data.target}</div>
          </div>`;
        }
        const data: EChartsNode | undefined = params.data;
        if (!data || !data.id) return '';
        const meta = NODE_META[data.node_type];
        const statusText = data.status || '-';
        const loadingHint = data._loading ? '<div style="color:#1677ff">⏳ 正在加载子节点...</div>' : '';
        const childCount = data._childCount ?? 0;
        const expandHint = !data._loaded
          ? '<div style="color:#666;margin-top:4px">💡 点击展开关联资源</div>'
          : childCount > 0
            ? `<div style="color:#666;margin-top:4px">📌 子节点 ${childCount} 个（点击${data.collapsed ? '展开' : '折叠'}）</div>`
            : '<div style="color:#999;margin-top:4px">— 无下级资源 —</div>';
        return `<div style="max-width:280px">
          <div style="font-weight:600;margin-bottom:6px;font-size:13px">${data.name}</div>
          <div style="margin-bottom:2px">类型：<span style="color:${meta?.color || '#999'}">${meta?.label || data.node_type}</span></div>
          <div style="margin-bottom:2px">状态：${statusText}</div>
          ${loadingHint}
          ${expandHint}
        </div>`;
      },
    },
    legend: [
      {
        data: categories.map((c) => c.name),
        orient: 'vertical',
        right: 16,
        top: 16,
        textStyle: { fontSize: 11 },
        itemWidth: 12,
        itemHeight: 12,
      },
    ],
    animation: true,
    animationDuration: 800,
    animationEasingUpdate: 'quinticInOut',
    series: [
      {
        type: 'graph',
        layout: 'force',
        data: echartsNodes,
        links: echartsLinks,
        categories: categories,
        roam: true,
        draggable: true,
        focusNodeAdjacency: true,
        // 力导向布局参数
        force: {
          repulsion: 420,       // 节点排斥力（略大避免拥挤）
          edgeLength: [100, 180], // 边长度范围
          gravity: 0.06,         // 中心力强度（略小让图更舒展）
          edgeForce: 0.15,
          friction: 0.6,
        },
        label: {
          show: true,
          position: 'bottom',
          distance: 6,
          fontSize: 12,
          color: '#333',
          align: 'center',
          verticalAlign: 'top',
        },
        lineStyle: {
          color: '#5a6a7e',
          width: 1.2,
          curveness: 0.15,
          opacity: 0.85,
        },
        // 边箭头：指向子节点
        edgeSymbol: ['none', 'arrow'],
        edgeSymbolSize: [0, 8],
        edgeLabel: {
          show: false,
        },
        emphasis: {
          focus: 'adjacency',
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
        symbol: 'circle',
        top: 20,
        bottom: 20,
        left: 20,
        right: 160,
      },
    ],
  }), [echartsNodes, echartsLinks, categories]);

  // 选中节点详情面板
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

  // 状态颜色映射
  const STATUS_BADGE_COLOR: Record<string, string> = {
    active: '#52c41a',
    inactive: '#8c8c8c',
    planning: '#1677ff',
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
              // 筛选时清空已选节点，避免引用不存在的节点
              if (values.length > 0 && selectedNode && !values.includes(selectedNode.id)) {
                setSelectedNode(null);
              }
            }}
            // label 使用纯字符串 sys.name，保证 showSearch 可模糊匹配
            options={allTopSystems.map((sys) => ({
              value: sys.id,
              label: sys.name,
              // 自定义字段：保留 status 给 optionRender 使用
              status: sys.status,
            }))}
            // 自定义下拉选项渲染：色点 + 系统名称（不影响搜索，搜索匹配的是纯 label）
            optionRender={(optionInfo: any) => {
              const status = optionInfo?.option?.data?.status || '';
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
            <div style={{ position: 'relative' }} ref={canvasContainerRef}>
              <ReactECharts
                ref={chartRef}
                option={option}
                style={{ height: '640px', width: '100%' }}
                onChartReady={onChartReady}
                lazyUpdate={true}
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
