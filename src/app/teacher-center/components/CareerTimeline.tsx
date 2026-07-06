'use client';

import { useEffect, useState } from 'react';
import { Timeline, Card, Spin, Empty, Tag, App, Drawer, Button, Descriptions } from 'antd';
import type { TimelineProps } from 'antd';
import {
  TrophyOutlined,
  FileTextOutlined,
  TeamOutlined,
  StarOutlined,
  SwapOutlined,
  SafetyCertificateOutlined,
  BookOutlined,
  SolutionOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import FriendlyTime from '@/components/FriendlyTime';
import ActionButton from '@/app/tags/components/ActionButton';

interface CareerTimelineItem {
  id: string;
  date: string;
  type: 'appointment' | 'title' | 'assessment' | 'award' | 'transfer' | 'contract' | 'education' | 'resume';
  title: string;
  description: string;
  isCurrent?: boolean;
  details?: Record<string, unknown>;
}

interface CareerTimelineProps {
  gh: string;
}

const typeIcons = {
  appointment: <TeamOutlined />,
  title: <TrophyOutlined />,
  assessment: <FileTextOutlined />,
  award: <StarOutlined />,
  transfer: <SwapOutlined />,
  contract: <SafetyCertificateOutlined />,
  education: <BookOutlined />,
  resume: <SolutionOutlined />,
};

const typeColors = {
  appointment: 'blue',
  title: 'gold',
  assessment: 'green',
  award: 'red',
  transfer: 'purple',
  contract: 'cyan',
  education: 'magenta',
  resume: 'orange',
};

const typeLabels: Record<string, string> = {
  appointment: '岗位聘任',
  title: '专业技术职务',
  assessment: '年度考核',
  award: '获得奖励',
  transfer: '部门调动',
  contract: '签订合同',
  education: '学历学位',
  resume: '工作经历',
};

// 详情展示组件
function DetailContent({ item }: { item: CareerTimelineItem }) {
  const { type, details } = item;
  
  if (!details) {
    return <Empty description="暂无详细数据" />;
  }

  const items: { key: string; label: string; children: React.ReactNode }[] = [];

  switch (type) {
    case 'title':
      // 专业技术职务详情
      items.push(
        { key: '1', label: '职务名称', children: details.zyjszwmmc as string || '-' },
        { key: '2', label: '职务级别', children: details.zyjszwjbmmc as string || '-' },
        { key: '3', label: '评定日期', children: details.pdrq as string || '-' },
        { key: '4', label: '聘任起始日期', children: details.prqsrq as string || '-' },
        { key: '5', label: '是否现任', children: details.sfxzwmmc === '是' || details.sfxzwmmc === '1' ? '是' : '否' },
      );
      break;

    case 'appointment':
      // 岗位聘任详情
      items.push(
        { key: '1', label: '岗位类型', children: (details.positionType as string) || '-' },
        { key: '2', label: '岗位名称', children: details.gwmc as string || '-' },
        { key: '3', label: '岗位等级', children: details.gwdjmmc as string || '-' },
        { key: '4', label: '聘任日期', children: details.prrq as string || '-' },
      );
      break;

    case 'assessment':
      // 考核详情
      items.push(
        { key: '1', label: '考核日期', children: details.khrq as string || '-' },
        { key: '2', label: '考核结果', children: details.khjgmc as string || '-' },
      );
      break;

    case 'award':
      // 奖励详情
      items.push(
        { key: '1', label: '奖励名称', children: details.jlmc as string || '-' },
        { key: '2', label: '奖励级别', children: details.jljbmc as string || '-' },
        { key: '3', label: '获奖日期', children: details.jlhq as string || '-' },
      );
      break;

    case 'transfer':
      // 部门调动详情
      items.push(
        { key: '1', label: '调动日期', children: details.ddrq as string || '-' },
        { key: '2', label: '原部门号', children: details.ydwh as string || '-' },
        { key: '3', label: '新部门号', children: details.xdwh as string || '-' },
      );
      break;

    case 'contract':
      // 聘用合同详情
      items.push(
        { key: '1', label: '合同类型', children: details.htlxmc as string || '-' },
        { key: '2', label: '签订日期', children: details.qdrq as string || '-' },
        { key: '3', label: '到期日期', children: details.dqrq as string || '-' },
      );
      break;

    case 'education':
      // 学历学位详情
      items.push(
        { key: '1', label: '学历', children: details.xlmmc as string || '-' },
        { key: '2', label: '学位', children: details.hdxwmmc as string || '-' },
        { key: '3', label: '所学专业', children: details.sxzymmc as string || '-' },
        { key: '4', label: '毕业学校', children: details.byyxxhdw as string || '-' },
        { key: '5', label: '学习起始日期', children: details.xxqsrq as string || '-' },
        { key: '6', label: '学习结束日期', children: details.xxzzrq as string || '-' },
        { key: '7', label: '获学位日期', children: details.hxwrq as string || '-' },
      );
      break;

    case 'resume':
      // 工作简历详情
      items.push(
        { key: '1', label: '工作单位', children: details.gzdw as string || '-' },
        { key: '2', label: '担任职务', children: details.crdzzw as string || '-' },
        { key: '3', label: '起始日期', children: details.gzqsrq as string || '-' },
        { key: '4', label: '结束日期', children: (details.gzzzrq as string) || '至今' },
        { key: '5', label: '工作内容', children: details.gznr as string || '-' },
      );
      break;

    default:
      // 默认展示所有字段
      Object.entries(details).forEach(([key, value], index) => {
        items.push({
          key: String(index + 1),
          label: key,
          children: value as React.ReactNode || '-',
        });
      });
  }

  return (
    <Descriptions
      bordered
      column={1}
      size="small"
      items={items}
    />
  );
}

export default function CareerTimeline({ gh }: CareerTimelineProps) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CareerTimelineItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CareerTimelineItem | null>(null);

  const fetchCareerData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/teacher-center?action=career&gh=${gh}`);
      const result = await response.json();
      
      if (result.success) {
        setItems(result.data.timeline);
      } else {
        message.error(result.error || '获取数据失败');
      }
    } catch (error) {
      console.error('获取教职生涯数据失败:', error);
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (gh) {
      fetchCareerData();
    }
  }, [gh]);

  const handleViewDetail = (item: CareerTimelineItem) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedItem(null);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin size="large" description="加载中..." />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <Empty description="暂无教职生涯数据" />
      </Card>
    );
  }

  // 构建 Timeline items 配置
  const timelineItems: TimelineProps['items'] = items.map((item) => ({
    key: item.id,
    icon: typeIcons[item.type],
    color: typeColors[item.type],
    content: (
      <div style={{ position: 'relative' }}>
        <div style={{ marginBottom: 8 }}>
          <Tag color={typeColors[item.type]}>
            <FriendlyTime date={item.date} />
          </Tag>
          {item.isCurrent && <Tag color="green">当前</Tag>}
        </div>
        <div style={{ fontWeight: 500 }}>{item.title}</div>
        {item.description && (
          <div style={{ color: '#666', marginTop: 4 }}>{item.description}</div>
        )}
        <div style={{ marginTop: 8 }}>
          <ActionButton
            icon={<EyeOutlined />}
            tooltip="查看详情"
            onClick={() => handleViewDetail(item)}
          />
        </div>
      </div>
    ),
  }));

  return (
    <>
      <Card>
        <Timeline mode="alternate" items={timelineItems} />
      </Card>

      <Drawer
        title={
          selectedItem ? (
            <div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>
                {typeLabels[selectedItem.type] || '详情'}
              </div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                {selectedItem.date}
              </div>
            </div>
          ) : '详情'
        }
        size="large"
        open={drawerOpen}
        onClose={handleCloseDrawer}
      >
        {selectedItem && <DetailContent item={selectedItem} />}
      </Drawer>
    </>
  );
}
