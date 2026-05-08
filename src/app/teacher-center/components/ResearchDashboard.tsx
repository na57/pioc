'use client';

import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Spin, Empty, App, Tag, Drawer, Descriptions } from 'antd';
import {
  FileTextOutlined,
  BookOutlined,
  TrademarkCircleOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import FriendlyTime from '@/components/FriendlyTime';

interface ResearchStats {
  paperCount: number;
  bookCount: number;
  patentCount: number;
  awardCount: number;
}

interface ResearchPaper {
  lwbh?: string;
  lwzwmc: string;
  fbkwmc?: string;
  lwfbrq?: string;
  lzslqkmc?: string;
  yxyz?: string;
  lwdyzzmc?: string;
  lwqrzzmc?: string;
  fbkwjbmc?: string;
  lwnbxh?: string;
  fbkwno?: string;
  fbkwny?: string;
  qsysh?: string;
  zsysh?: string;
}

interface ResearchBook {
  zzbh?: string;
  zzzwmc: string;
  cbs?: string;
  cbrq?: string;
  isbnh?: string;
  zzdyzzmc?: string;
  zzqrzzmc?: string;
  cbsjbmc?: string;
}

interface ResearchPatent {
  zlcgbh?: string;
  zlcgmc: string;
  zllxmc?: string;
  zlsqrq?: string;
  sqggrq?: string;
  zlztmc?: string;
  zlfmr?: string;
  zlqr?: string;
  zlfmrdw?: string;
  zlqrddw?: string;
  zlh?: string;
}

interface ResearchAward {
  hjcgbh?: string;
  hjmc: string;
  hjjbmc?: string;
  hjrq?: string;
  cghjlbmc?: string;
  hjdjmc?: string;
  djhm?: string;
  hjdwmc?: string;
  sbrq?: string;
}

interface ResearchDashboardProps {
  gh: string;
}

export default function ResearchDashboard({ gh }: ResearchDashboardProps) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ResearchStats>({
    paperCount: 0,
    bookCount: 0,
    patentCount: 0,
    awardCount: 0,
  });
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [books, setBooks] = useState<ResearchBook[]>([]);
  const [patents, setPatents] = useState<ResearchPatent[]>([]);
  const [awards, setAwards] = useState<ResearchAward[]>([]);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerType, setDrawerType] = useState<'paper' | 'book' | 'patent' | 'award' | null>(null);
  const [selectedItem, setSelectedItem] = useState<ResearchPaper | ResearchBook | ResearchPatent | ResearchAward | null>(null);

  const fetchResearchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/teacher-center?action=research&gh=${gh}`);
      const result = await response.json();
      
      if (result.success) {
        setStats(result.data.stats);
        setPapers(result.data.papers);
        setBooks(result.data.books);
        setPatents(result.data.patents);
        setAwards(result.data.awards);
      } else {
        message.error(result.error || '获取数据失败');
      }
    } catch (error) {
      console.error('获取科研数据失败:', error);
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (gh) {
      fetchResearchData();
    }
  }, [gh]);

  const handleOpenDetail = (type: 'paper' | 'book' | 'patent' | 'award', item: ResearchPaper | ResearchBook | ResearchPatent | ResearchAward) => {
    setDrawerType(type);
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setDrawerType(null);
    setSelectedItem(null);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin size="large" description="加载中..." />
      </div>
    );
  }

  const hasData = stats.paperCount > 0 || stats.bookCount > 0 || stats.patentCount > 0 || stats.awardCount > 0;

  if (!hasData) {
    return (
      <Card>
        <Empty description="暂无科研数据" />
      </Card>
    );
  }

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="发表论文"
              value={stats.paperCount}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="出版著作"
              value={stats.bookCount}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="申请专利"
              value={stats.patentCount}
              prefix={<TrademarkCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="科研获奖"
              value={stats.awardCount}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 论文列表 */}
      {papers.length > 0 && (
        <Card title="科研论文" style={{ marginBottom: 16 }}>
          <Table
            dataSource={papers}
            rowKey={(record) => `${record.lwbh}-${record.lwdyzzmc}`}
            pagination={{ pageSize: 5 }}
            size="small"
            columns={[
              {
                title: '论文名称',
                dataIndex: 'lwzwmc',
                ellipsis: true,
                render: (text: string, record: ResearchPaper) => (
                  <a onClick={() => handleOpenDetail('paper', record)}>{text}</a>
                ),
              },
              { title: '发表期刊', dataIndex: 'fbkwmc', width: 150 },
              { title: '发表日期', dataIndex: 'lwfbrq', width: 120, render: (text) => <FriendlyTime date={text} /> },
              { title: '收录情况', dataIndex: 'lzslqkmc', width: 100 },
            ]}
          />
        </Card>
      )}

      {/* 著作列表 */}
      {books.length > 0 && (
        <Card title="科研著作" style={{ marginBottom: 16 }}>
          <Table
            dataSource={books}
            rowKey={(record) => `${record.zzbh}-${record.cbrq}`}
            pagination={{ pageSize: 5 }}
            size="small"
            columns={[
              {
                title: '著作名称',
                dataIndex: 'zzzwmc',
                ellipsis: true,
                render: (text: string, record: ResearchBook) => (
                  <a onClick={() => handleOpenDetail('book', record)}>{text}</a>
                ),
              },
              { title: '出版社', dataIndex: 'cbs', width: 150 },
              { title: '出版日期', dataIndex: 'cbrq', width: 120, render: (text) => <FriendlyTime date={text} /> },
            ]}
          />
        </Card>
      )}

      {/* 专利列表 */}
      {patents.length > 0 && (
        <Card title="科研专利" style={{ marginBottom: 16 }}>
          <Table
            dataSource={patents}
            rowKey={(record) => `${record.zlcgbh}-${record.zlsqrq}`}
            pagination={{ pageSize: 5 }}
            size="small"
            columns={[
              {
                title: '专利名称',
                dataIndex: 'zlcgmc',
                ellipsis: true,
                render: (text: string, record: ResearchPatent) => (
                  <a onClick={() => handleOpenDetail('patent', record)}>{text}</a>
                ),
              },
              { title: '专利类型', dataIndex: 'zllxmc', width: 120 },
              { title: '申请日期', dataIndex: 'zlsqrq', width: 120, render: (text) => <FriendlyTime date={text} /> },
              { title: '授权状态', dataIndex: 'zlztmc', width: 100 },
            ]}
          />
        </Card>
      )}

      {/* 获奖列表 */}
      {awards.length > 0 && (
        <Card title="科研获奖">
          <Table
            dataSource={awards}
            rowKey={(record) => `${record.hjcgbh}-${record.hjrq}`}
            pagination={{ pageSize: 5 }}
            size="small"
            columns={[
              {
                title: '获奖名称',
                dataIndex: 'hjmc',
                ellipsis: true,
                render: (text: string, record: ResearchAward) => (
                  <a onClick={() => handleOpenDetail('award', record)}>{text}</a>
                ),
              },
              { title: '获奖级别', dataIndex: 'hjjbmc', width: 120 },
              { title: '获奖日期', dataIndex: 'hjrq', width: 120, render: (text) => <FriendlyTime date={text} /> },
            ]}
          />
        </Card>
      )}

      {/* 详情抽屉 */}
      <Drawer
        title={
          drawerType === 'paper' ? '论文详情' :
          drawerType === 'book' ? '著作详情' :
          drawerType === 'patent' ? '专利详情' :
          drawerType === 'award' ? '获奖详情' : '详情'
        }
        size="large"
        open={drawerOpen}
        onClose={handleCloseDrawer}
      >
        {drawerType === 'paper' && selectedItem && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="论文名称">{(selectedItem as ResearchPaper).lwzwmc}</Descriptions.Item>
            <Descriptions.Item label="发表期刊">{(selectedItem as ResearchPaper).fbkwmc || '-'}</Descriptions.Item>
            <Descriptions.Item label="期刊级别">{(selectedItem as ResearchPaper).fbkwjbmc || '-'}</Descriptions.Item>
            <Descriptions.Item label="发表日期">{(selectedItem as ResearchPaper).lwfbrq ? <FriendlyTime date={(selectedItem as ResearchPaper).lwfbrq!} /> : '-'}</Descriptions.Item>
            <Descriptions.Item label="卷号">{(selectedItem as ResearchPaper).fbkwno || '-'}</Descriptions.Item>
            <Descriptions.Item label="期号">{(selectedItem as ResearchPaper).fbkwny || '-'}</Descriptions.Item>
            <Descriptions.Item label="起始页">{(selectedItem as ResearchPaper).qsysh || '-'}</Descriptions.Item>
            <Descriptions.Item label="终止页">{(selectedItem as ResearchPaper).zsysh || '-'}</Descriptions.Item>
            <Descriptions.Item label="论文编号">{(selectedItem as ResearchPaper).lwnbxh || '-'}</Descriptions.Item>
            <Descriptions.Item label="收录情况">{(selectedItem as ResearchPaper).lzslqkmc || '-'}</Descriptions.Item>
            <Descriptions.Item label="影响因子">{(selectedItem as ResearchPaper).yxyz || '-'}</Descriptions.Item>
            <Descriptions.Item label="第一作者">{(selectedItem as ResearchPaper).lwdyzzmc || '-'}</Descriptions.Item>
            <Descriptions.Item label="其他作者">{(selectedItem as ResearchPaper).lwqrzzmc || '-'}</Descriptions.Item>
          </Descriptions>
        )}
        {drawerType === 'book' && selectedItem && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="著作名称">{(selectedItem as ResearchBook).zzzwmc}</Descriptions.Item>
            <Descriptions.Item label="出版社">{(selectedItem as ResearchBook).cbs || '-'}</Descriptions.Item>
            <Descriptions.Item label="出版社级别">{(selectedItem as ResearchBook).cbsjbmc || '-'}</Descriptions.Item>
            <Descriptions.Item label="出版日期">{(selectedItem as ResearchBook).cbrq ? <FriendlyTime date={(selectedItem as ResearchBook).cbrq!} /> : '-'}</Descriptions.Item>
            <Descriptions.Item label="ISBN号">{(selectedItem as ResearchBook).isbnh || '-'}</Descriptions.Item>
            <Descriptions.Item label="第一作者">{(selectedItem as ResearchBook).zzdyzzmc || '-'}</Descriptions.Item>
            <Descriptions.Item label="其他作者">{(selectedItem as ResearchBook).zzqrzzmc || '-'}</Descriptions.Item>
          </Descriptions>
        )}
        {drawerType === 'patent' && selectedItem && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="专利名称">{(selectedItem as ResearchPatent).zlcgmc}</Descriptions.Item>
            <Descriptions.Item label="专利类型">{(selectedItem as ResearchPatent).zllxmc || '-'}</Descriptions.Item>
            <Descriptions.Item label="专利号">{(selectedItem as ResearchPatent).zlh || '-'}</Descriptions.Item>
            <Descriptions.Item label="申请日期">{(selectedItem as ResearchPatent).zlsqrq ? <FriendlyTime date={(selectedItem as ResearchPatent).zlsqrq!} /> : '-'}</Descriptions.Item>
            <Descriptions.Item label="授权公告日期">{(selectedItem as ResearchPatent).sqggrq ? <FriendlyTime date={(selectedItem as ResearchPatent).sqggrq!} /> : '-'}</Descriptions.Item>
            <Descriptions.Item label="专利状态">{(selectedItem as ResearchPatent).zlztmc || '-'}</Descriptions.Item>
            <Descriptions.Item label="发明人">{(selectedItem as ResearchPatent).zlfmr || '-'}</Descriptions.Item>
            <Descriptions.Item label="发明人单位">{(selectedItem as ResearchPatent).zlfmrdw || '-'}</Descriptions.Item>
            <Descriptions.Item label="专利权利人">{(selectedItem as ResearchPatent).zlqr || '-'}</Descriptions.Item>
            <Descriptions.Item label="权利单位">{(selectedItem as ResearchPatent).zlqrddw || '-'}</Descriptions.Item>
          </Descriptions>
        )}
        {drawerType === 'award' && selectedItem && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="获奖名称">{(selectedItem as ResearchAward).hjmc}</Descriptions.Item>
            <Descriptions.Item label="获奖级别">{(selectedItem as ResearchAward).hjjbmc || '-'}</Descriptions.Item>
            <Descriptions.Item label="成果类别">{(selectedItem as ResearchAward).cghjlbmc || '-'}</Descriptions.Item>
            <Descriptions.Item label="获奖等级">{(selectedItem as ResearchAward).hjdjmc || '-'}</Descriptions.Item>
            <Descriptions.Item label="获奖日期">{(selectedItem as ResearchAward).hjrq ? <FriendlyTime date={(selectedItem as ResearchAward).hjrq!} /> : '-'}</Descriptions.Item>
            <Descriptions.Item label="证书编号">{(selectedItem as ResearchAward).djhm || '-'}</Descriptions.Item>
            <Descriptions.Item label="颁奖单位">{(selectedItem as ResearchAward).hjdwmc || '-'}</Descriptions.Item>
            <Descriptions.Item label="申报日期">{(selectedItem as ResearchAward).sbrq ? <FriendlyTime date={(selectedItem as ResearchAward).sbrq!} /> : '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
}
