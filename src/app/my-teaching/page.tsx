'use client';

import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Select,
  Pagination,
  Spin,
  Modal,
  Button,
  Tag,
  Empty,
} from 'antd';
import { BookOutlined } from '@ant-design/icons';

const { Option } = Select;

interface Semester {
  XNXQDM: string;
  XNDM: string | null;
  XQDM: string | null;
  XNXQMC: string | null;
  XQMC: string | null;
  PX: string | null;
  SFDQXQ: string | null;
}

interface TeachingInfo {
  JXBH: string | null;
  JSGH: string | null;
  JSXM: string | null;
  XNXQDM: string | null;
  XNXQMC: string | null;
  KCDM: string | null;
  KCMC: string | null;
  SKZC: string | null;
  SKXQ: string | null;
  KSJC: string | null;
  JSJC: string | null;
  JASDM: string | null;
  JXDD: string | null;
  JSSZXQH: string | null;
  JSSZXQMC: string | null;
  SKBJH: string | null;
  SKBJMC: string | null;
  KXH: string | null;
  KCKSDWH: string | null;
  KCKSDWMC: string | null;
  KKXND: string | null;
  KKXQM: string | null;
  SKSJ: string | null;
  JXZY: string | null;
  KRL: string | null;
  XDRS: string | null;
  XKXQH: string | null;
  XKRSXD: string | null;
  XKNJ: string | null;
  PKYQ: string | null;
  JSLXM: string | null;
  QSZ: string | null;
  ZZZ: string | null;
  KCXZM: string | null;
  JXBMC: string | null;
  JXTZ: string | null;
  KKSM: string | null;
  TSTAMP: string | null;
}

export default function MyTeachingPage() {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [teachingData, setTeachingData] = useState<TeachingInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [semesterLoading, setSemesterLoading] = useState(false);

  // 筛选条件
  const [selectedSemester, setSelectedSemester] = useState<string>('');

  // 分页
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // 课程详情弹窗
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TeachingInfo | null>(null);

  // 从本地缓存获取学年学期数据
  const getSemestersFromCache = (): { data: Semester[]; expireAt: number } | null => {
    try {
      const cached = localStorage.getItem('myTeaching_semesters');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.expireAt > Date.now()) {
          return parsed;
        }
      }
    } catch {
      // 缓存读取失败，返回 null
    }
    return null;
  };

  // 保存学年学期数据到本地缓存
  const saveSemestersToCache = (data: Semester[]) => {
    try {
      const cacheData = {
        data,
        expireAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7天后过期
      };
      localStorage.setItem('myTeaching_semesters', JSON.stringify(cacheData));
    } catch {
      // 缓存保存失败，忽略错误
    }
  };

  // 获取学年学期列表
  const fetchSemesters = async () => {
    const cached = getSemestersFromCache();
    if (cached) {
      setSemesters(cached.data);
      const currentSemester = cached.data.find((s: Semester) => s.SFDQXQ === '1');
      if (currentSemester) {
        setSelectedSemester(currentSemester.XNXQDM);
      }
      return;
    }

    setSemesterLoading(true);
    try {
      const response = await fetch('/api/my-teaching?action=semesters');
      const data = await response.json();
      if (data.success) {
        setSemesters(data.data);
        saveSemestersToCache(data.data);
        const currentSemester = data.data.find((s: Semester) => s.SFDQXQ === '1');
        if (currentSemester) {
          setSelectedSemester(currentSemester.XNXQDM);
        }
      }
    } catch {
      // 错误处理
    } finally {
      setSemesterLoading(false);
    }
  };

  // 获取我的授课信息
  const fetchTeachingData = async (
    page: number = currentPage,
    xnxqdm: string = selectedSemester
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('per_page', pageSize.toString());
      if (xnxqdm) {
        params.append('xnxqdm', xnxqdm);
      }

      const response = await fetch(`/api/my-teaching?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setTeachingData(data.data);
        setTotal(data.total);
        setCurrentPage(data.page);
      }
    } catch {
      // 错误处理
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSemesters();
  }, []);

  useEffect(() => {
    if (selectedSemester) {
      fetchTeachingData(1);
    }
  }, [selectedSemester]);

  const handlePageChange = (page: number, size?: number) => {
    setCurrentPage(page);
    if (size && size !== pageSize) {
      setPageSize(size);
    }
    fetchTeachingData(page);
  };

  // 显示课程详情
  const showCourseDetail = (record: TeachingInfo) => {
    setSelectedRecord(record);
    setDetailModalVisible(true);
  };

  const columns = [
    {
      title: '课程',
      key: 'course',
      width: 280,
      render: (_: unknown, record: TeachingInfo) => {
        const name = record.KCMC || '-';
        return (
          <Button type="link" onClick={() => showCourseDetail(record)} style={{ padding: 0, textAlign: 'left' }}>
            <BookOutlined style={{ marginRight: 4 }} />
            {name}
          </Button>
        );
      },
    },
    {
      title: '学年学期',
      dataIndex: 'XNXQMC',
      key: 'XNXQMC',
      width: 140,
    },
    {
      title: '星期',
      dataIndex: 'SKXQ',
      key: 'SKXQ',
      width: 80,
      render: (text: string | null) => text || '-',
    },
    {
      title: '节次',
      key: 'jc',
      width: 100,
      render: (_: unknown, record: TeachingInfo) => {
        const start = record.KSJC;
        const end = record.JSJC;
        if (start && end) {
          return `第${start}-${end}节`;
        }
        return '-';
      },
    },
    {
      title: '上课地点',
      dataIndex: 'JXDD',
      key: 'JXDD',
      width: 180,
      render: (text: string | null) => text || '-',
    },
    {
      title: '上课班级',
      dataIndex: 'SKBJMC',
      key: 'SKBJMC',
      width: 200,
      render: (text: string | null) => text || '-',
    },
    {
      title: '课程性质',
      dataIndex: 'KCXZM',
      key: 'KCXZM',
      width: 100,
      render: (text: string | null) => text ? <Tag color="blue">{text}</Tag> : '-',
    },
    {
      title: '人数',
      key: 'rs',
      width: 100,
      render: (_: unknown, record: TeachingInfo) => {
        const xdrs = record.XDRS;
        const krl = record.KRL;
        if (xdrs && krl) {
          return `${xdrs}/${krl}`;
        }
        return xdrs || krl || '-';
      },
    },
  ];

  return (
    <div>
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span>学年学期：</span>
          <Select
            style={{ width: 220 }}
            placeholder="请选择学年学期"
            value={selectedSemester || undefined}
            onChange={(value) => setSelectedSemester(value)}
            loading={semesterLoading}
            allowClear
            virtual={false}
          >
            {semesters.map((semester) => (
              <Option key={semester.XNXQDM} value={semester.XNXQDM}>
                {semester.XNXQMC || semester.XNXQDM}
                {semester.SFDQXQ === '1' ? ' (当前)' : ''}
              </Option>
            ))}
          </Select>
        </div>
      </Card>

      <Card>
        <Spin spinning={loading}>
          {teachingData.length === 0 && !loading ? (
            <Empty description="暂无授课信息" />
          ) : (
            <>
              <Table
                columns={columns}
                dataSource={teachingData}
                rowKey={(record) => {
                  const key = `${record.JXBH || ''}-${record.KCDM || ''}-${record.SKBJH || ''}-${record.JSGH || ''}-${record.XNXQDM || ''}-${record.SKZC || ''}-${record.SKXQ || ''}-${record.KSJC || ''}`;
                  return key;
                }}
                pagination={false}
                scroll={{ x: 1200 }}
                size="small"
              />
              <div style={{ marginTop: 16, textAlign: 'right' }}>
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={total}
                  onChange={handlePageChange}
                  showSizeChanger
                  showQuickJumper
                  showTotal={(total) => `共 ${total} 条`}
                  pageSizeOptions={['10', '20', '50', '100']}
                />
              </div>
            </>
          )}
        </Spin>
      </Card>

      {/* 课程详情弹窗 */}
      <Modal
        title="课程详细信息"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={600}
      >
        {selectedRecord && (
          <div style={{ maxHeight: 500, overflow: 'auto' }}>
            {[
              { label: '教学编号', value: selectedRecord.JXBH },
              { label: '教学班名称', value: selectedRecord.JXBMC },
              { label: '教师姓名', value: selectedRecord.JSXM },
              { label: '教师工号', value: selectedRecord.JSGH },
              { label: '学年学期', value: selectedRecord.XNXQMC },
              { label: '学年学期代码', value: selectedRecord.XNXQDM },
              { label: '课程名称', value: selectedRecord.KCMC },
              { label: '课程代码', value: selectedRecord.KCDM },
              { label: '课程性质', value: selectedRecord.KCXZM },
              { label: '上课周次', value: selectedRecord.SKZC },
              { label: '星期', value: selectedRecord.SKXQ },
              {
                label: '节次',
                value:
                  selectedRecord.KSJC && selectedRecord.JSJC
                    ? `第${selectedRecord.KSJC}-${selectedRecord.JSJC}节`
                    : null,
              },
              { label: '上课地点', value: selectedRecord.JXDD },
              { label: '教室代码', value: selectedRecord.JASDM },
              { label: '上课班级', value: selectedRecord.SKBJMC },
              { label: '上课班级号', value: selectedRecord.SKBJH },
              { label: '课容量', value: selectedRecord.KRL },
              { label: '修读人数', value: selectedRecord.XDRS },
              { label: '开课部门', value: selectedRecord.KCKSDWMC },
              { label: '开课部门代码', value: selectedRecord.KCKSDWH },
              { label: '开课学年度', value: selectedRecord.KKXND },
              { label: '开课学期码', value: selectedRecord.KKXQM },
              { label: '上课时间', value: selectedRecord.SKSJ },
              { label: '教学周', value: selectedRecord.JXZY },
              { label: '开课说明', value: selectedRecord.KKSM },
              { label: '起止周', value: selectedRecord.QSZ },
              { label: '终止周', value: selectedRecord.ZZZ },
              { label: '教师类型码', value: selectedRecord.JSLXM },
              { label: '排课要求', value: selectedRecord.PKYQ },
              { label: '选课序号', value: selectedRecord.KXH },
              { label: '选课人数限定', value: selectedRecord.XKRSXD },
              { label: '选考校区号', value: selectedRecord.XKXQH },
              { label: '选考年级', value: selectedRecord.XKNJ },
            ].map((item, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  padding: '8px 0',
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: 14,
                }}
              >
                <span
                  style={{
                    width: 120,
                    color: '#666',
                    flexShrink: 0,
                  }}
                >
                  {item.label}:
                </span>
                <span style={{ color: '#333', wordBreak: 'break-all' }}>
                  {item.value || '-'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
