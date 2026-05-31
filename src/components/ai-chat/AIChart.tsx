'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import { Card, Space, Segmented, Empty, Typography } from 'antd';
import {
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  DotChartOutlined,
  AreaChartOutlined,
} from '@ant-design/icons';
import * as echarts from 'echarts';
import type { ChartConfig, ChartType, ChartData } from './types';

const { Text } = Typography;

interface AIChartProps {
  data: unknown;
  config?: ChartConfig;
  height?: number;
}

// 检测数据是否适合图表展示
function isChartableData(data: unknown): data is ChartData {
  if (!data || typeof data !== 'object') return false;

  const d = data as Record<string, unknown>;

  // 支持数组格式
  if (Array.isArray(d)) {
    return d.length > 0 && typeof d[0] === 'object';
  }

  // 支持 { categories: [], values: [] } 格式
  if (Array.isArray(d.categories) && Array.isArray(d.values)) {
    return d.categories.length === d.values.length;
  }

  // 支持 { xAxis: [], series: [] } 格式
  if (Array.isArray(d.xAxis) && Array.isArray(d.series)) {
    return true;
  }

  // 支持 { labels: [], data: [] } 格式（饼图）
  if (Array.isArray(d.labels) && Array.isArray(d.data)) {
    return d.labels.length === d.data.length;
  }

  return false;
}

// 自动推断图表类型
function inferChartType(data: ChartData): ChartType[] {
  const types: ChartType[] = [];

  // 检查数据格式
  const isArrayData = Array.isArray(data);
  const hasCategories = 'categories' in data && Array.isArray(data.categories);
  const hasXAxis = 'xAxis' in data && Array.isArray(data.xAxis);
  const hasLabels = 'labels' in data && Array.isArray(data.labels);

  // 如果有类别数据，支持柱状图、折线图、面积图
  if (hasCategories || hasXAxis || isArrayData) {
    types.push('bar', 'line', 'area');
  }

  // 如果有标签数据，支持饼图
  if (hasLabels || isArrayData) {
    types.push('pie');
  }

  // 如果有多个系列，支持散点图
  if ('series' in data && Array.isArray(data.series) && data.series.length > 1) {
    types.push('scatter');
  }

  return types.length > 0 ? types : ['bar'];
}

// 提取数据用于图表
function extractChartData(data: ChartData): {
  categories: string[];
  series: Array<{ name: string; data: number[] }>;
  pieData: Array<{ name: string; value: number }>;
} {
  // 数组格式: [{name: 'A', value: 10}, ...]
  if (Array.isArray(data)) {
    const keys = Object.keys(data[0] || {});
    const nameKey = keys.find(k => typeof (data[0] as Record<string, unknown>)[k] === 'string') || keys[0];
    const valueKeys = keys.filter(k => typeof (data[0] as Record<string, unknown>)[k] === 'number');

    if (valueKeys.length === 1) {
      // 单系列数据 - 也生成饼图数据
      const pieData = data.map((item: Record<string, unknown>) => ({
        name: String(item[nameKey]),
        value: Number(item[valueKeys[0]]),
      }));

      return {
        categories: data.map((item: Record<string, unknown>) => String(item[nameKey])),
        series: [{
          name: valueKeys[0],
          data: data.map((item: Record<string, unknown>) => Number(item[valueKeys[0]])),
        }],
        pieData,
      };
    }

    // 多系列数据
    return {
      categories: data.map((item: Record<string, unknown>) => String(item[nameKey])),
      series: valueKeys.map(key => ({
        name: key,
        data: data.map((item: Record<string, unknown>) => Number(item[key])),
      })),
      pieData: [],
    };
  }

  // { categories: [], values: [] } 格式
  if ('categories' in data && 'values' in data) {
    const values = data.values as number[] | number[][];
    const isMultiSeries = Array.isArray(values[0]);

    return {
      categories: data.categories as string[],
      series: isMultiSeries
        ? (values as number[][]).map((v, i) => ({ name: `系列${i + 1}`, data: v }))
        : [{ name: '数值', data: values as number[] }],
      pieData: (data.categories as string[]).map((cat, i) => ({
        name: cat,
        value: isMultiSeries ? (values as number[][])[0][i] : (values as number[])[i],
      })),
    };
  }

  // { xAxis: [], series: [] } 格式
  if ('xAxis' in data && 'series' in data) {
    const seriesData = data.series as Array<{ name?: string; data: number[] }>;
    return {
      categories: data.xAxis as string[],
      series: seriesData.map((s, i) => ({
        name: s.name || `系列${i + 1}`,
        data: s.data,
      })),
      pieData: [],
    };
  }

  // { labels: [], data: [] } 格式（饼图专用）
  if ('labels' in data && 'data' in data) {
    const labels = data.labels as string[];
    const values = data.data as number[];
    return {
      categories: labels,
      series: [{ name: '数值', data: values }],
      pieData: labels.map((label, i) => ({ name: label, value: values[i] })),
    };
  }

  return { categories: [], series: [], pieData: [] };
}

// 生成图表配置
function generateChartOption(
  type: ChartType,
  chartData: ReturnType<typeof extractChartData>,
  title?: string
): echarts.EChartsOption {
  const baseOption: echarts.EChartsOption = {
    tooltip: {
      trigger: type === 'pie' ? 'item' : 'axis',
      axisPointer: type === 'bar' ? { type: 'shadow' } : undefined,
    },
    legend: {
      bottom: 0,
      textStyle: { fontSize: 11 },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true,
    },
  };

  if (title) {
    baseOption.title = {
      text: title,
      left: 'center',
      textStyle: { fontSize: 14, fontWeight: 'normal' },
    };
  }

  switch (type) {
    case 'pie':
      return {
        ...baseOption,
        xAxis: undefined,
        yAxis: undefined,
        series: [{
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['50%', '50%'],
          data: chartData.pieData.length > 0 ? chartData.pieData : chartData.categories.map((cat, i) => ({
            name: cat,
            value: chartData.series[0]?.data[i] || 0,
          })),
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
          label: {
            formatter: '{b}: {c} ({d}%)',
          },
        }],
      };

    case 'scatter':
      return {
        ...baseOption,
        xAxis: { type: 'category', data: chartData.categories },
        yAxis: { type: 'value' },
        series: chartData.series.map(s => ({
          type: 'scatter',
          name: s.name,
          data: s.data,
          symbolSize: 10,
        })),
      };

    case 'area':
      return {
        ...baseOption,
        xAxis: { type: 'category', data: chartData.categories, boundaryGap: false },
        yAxis: { type: 'value' },
        series: chartData.series.map(s => ({
          type: 'line',
          name: s.name,
          data: s.data,
          areaStyle: { opacity: 0.3 },
          smooth: true,
        })),
      };

    case 'line':
      return {
        ...baseOption,
        xAxis: { type: 'category', data: chartData.categories, boundaryGap: false },
        yAxis: { type: 'value' },
        series: chartData.series.map(s => ({
          type: 'line',
          name: s.name,
          data: s.data,
          smooth: true,
        })),
      };

    case 'bar':
    default:
      return {
        ...baseOption,
        xAxis: { type: 'category', data: chartData.categories },
        yAxis: { type: 'value' },
        series: chartData.series.map(s => ({
          type: 'bar',
          name: s.name,
          data: s.data,
          barMaxWidth: 40,
        })),
      };
  }
}

const chartTypeIcons: Record<ChartType, React.ReactNode> = {
  bar: <BarChartOutlined />,
  line: <LineChartOutlined />,
  pie: <PieChartOutlined />,
  scatter: <DotChartOutlined />,
  area: <AreaChartOutlined />,
};

const chartTypeLabels: Record<ChartType, string> = {
  bar: '柱状图',
  line: '折线图',
  pie: '饼图',
  scatter: '散点图',
  area: '面积图',
};

export default function AIChart({ data, config, height = 300 }: AIChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const [currentType, setCurrentType] = useState<ChartType>('bar');

  // 检查数据是否可图表化
  const canRenderChart = useMemo(() => isChartableData(data), [data]);

  // 推断支持的图表类型
  const supportedTypes = useMemo(() => {
    if (!canRenderChart) return [];
    return inferChartType(data as ChartData);
  }, [data, canRenderChart]);

  // 设置默认图表类型
  useEffect(() => {
    if (config?.defaultType && supportedTypes.includes(config.defaultType)) {
      setCurrentType(config.defaultType);
    } else if (supportedTypes.length > 0 && !supportedTypes.includes(currentType)) {
      setCurrentType(supportedTypes[0]);
    }
  }, [supportedTypes, config?.defaultType, currentType]);

  // 初始化图表
  useEffect(() => {
    if (!chartRef.current || !canRenderChart) return;

    // 销毁旧实例
    if (chartInstanceRef.current) {
      chartInstanceRef.current.dispose();
    }

    // 创建新实例
    chartInstanceRef.current = echarts.init(chartRef.current);

    // 提取数据并生成配置
    const chartData = extractChartData(data as ChartData);
    const option = generateChartOption(currentType, chartData, config?.title);

    chartInstanceRef.current.setOption(option);

    // 响应式
    const handleResize = () => {
      chartInstanceRef.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstanceRef.current?.dispose();
      chartInstanceRef.current = null;
    };
  }, [data, currentType, config?.title, canRenderChart]);

  // 更新图表配置
  useEffect(() => {
    if (!chartInstanceRef.current || !canRenderChart) return;

    const chartData = extractChartData(data as ChartData);
    const option = generateChartOption(currentType, chartData, config?.title);
    chartInstanceRef.current.setOption(option, true);
  }, [currentType, data, config?.title, canRenderChart]);

  if (!canRenderChart) {
    return null;
  }

  // 构建 Segmented 选项
  const segmentedOptions = supportedTypes.map(type => ({
    value: type,
    icon: chartTypeIcons[type],
    label: chartTypeLabels[type],
  }));

  return (
    <Card
      size="small"
      style={{ marginTop: 12 }}
      styles={{ body: { padding: 12 } }}
    >
      <Space orientation="vertical" style={{ width: '100%' }} size="middle">
        {/* 图表类型切换 */}
        {supportedTypes.length > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Segmented
              options={segmentedOptions}
              value={currentType}
              onChange={(value) => setCurrentType(value as ChartType)}
              size="small"
            />
          </div>
        )}

        {/* 图表容器 */}
        <div
          ref={chartRef}
          style={{
            width: '100%',
            height,
            minHeight: 200,
          }}
        />

        {/* 数据摘要 */}
        {config?.showSummary !== false && (
          <div style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              共 {extractChartData(data as ChartData).categories.length} 个数据点
              {extractChartData(data as ChartData).series.length > 1 &&
                `，${extractChartData(data as ChartData).series.length} 个数据系列`}
            </Text>
          </div>
        )}
      </Space>
    </Card>
  );
}

// 导出工具函数供外部使用
export { isChartableData, inferChartType, extractChartData };
