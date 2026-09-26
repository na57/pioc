'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  App,
  Spin,
  Empty,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Typography,
  Row,
  Col,
  Badge,
  Drawer,
  Timeline,
  Alert,
  Divider,
} from 'antd';
import type { TimelineProps } from 'antd';
import {
  PlusOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  HistoryOutlined,
  FieldTimeOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import ActionButton from '@/app/tags/components/ActionButton';
import FriendlyTime from '@/components/FriendlyTime';

const { Text, Paragraph } = Typography;

// ============================================
// 类型定义
// ============================================

interface RuleOption {
  id: number;
  name: string;
  description?: string;
}

interface InspectionSchedule {
  id: string;
  name: string;
  system_id: string;
  system_name: string;
  rule_ids: number[] | null;
  cron_expression: string;
  description: string | null;
  is_enabled: number;
  last_run_at: string | null;
  next_run_at: string | null;
  total_runs: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface ScheduleLog {
  id: string;
  schedule_id: string;
  inspection_record_id: string | null;
  status: 'running' | 'completed' | 'failed';
  result_summary: string | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  created_at: string;
}

interface InformationSystem {
  id: string;
  name: string;
  status: string;
}

// ============================================
// Cron 表达式语法提示
// ============================================

const CRON_HELP_TEXT = `格式: 分 时 日 月 周
示例:
  0 9 * * *    每天 9:00
  0 18 * * *   每天 18:00
  */30 * * * * 每30分钟
  0 9 * * 1    每周一 9:00
  0 9 1 * *    每月1日 9:00`;

// ============================================
// 组件
// ============================================

export default function InspectionSchedulePanel() {
  const { message } = App.useApp();
  const messageRef = useRef(message);
  messageRef.current = message;

  // 列表状态
  const [schedules, setSchedules] = useState<InspectionSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 创建/编辑弹窗
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<InspectionSchedule | null>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [systems, setSystems] = useState<InformationSystem[]>([]);
  const [rules, setRules] = useState<RuleOption[]>([]);

  // 执行日志抽屉
  const [logDrawerOpen, setLogDrawerOpen] = useState(false);
  const [logScheduleName, setLogScheduleName] = useState('');
  const [logs, setLogs] = useState<ScheduleLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);

  // ============================================
  // 数据加载
  // ============================================

  /** 加载巡检计划列表 */
  const fetchSchedules = useCallback(async (p: number, ps: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: p.toString(),
        pageSize: ps.toString(),
      });
      const response = await fetch(`/api/it-asset-center/schedules?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        setSchedules(result.data || []);
        setTotal(result.total || 0);
      } else {
        messageRef.current.error(result.error || '获取巡检计划失败');
      }
    } catch {
      messageRef.current.error('获取巡检计划失败');
    } finally {
      setLoading(false);
    }
  }, []);

  /** 加载信息系统列表（用于下拉选择） */
  const fetchSystemsList = useCallback(async () => {
    try {
      const response = await fetch('/api/it-asset-center?action=systems&per_page=1000');
      const result = await response.json();
      if (result.success) {
        setSystems(result.data.data || []);
      }
    } catch {
      // 静默失败
    }
  }, []);

  /** 加载合规规则列表（用于下拉选择） */
  const fetchRulesList = useCallback(async () => {
    try {
      const response = await fetch('/api/rules/accessible');
      const result = await response.json();
      if (result.success) {
        setRules(result.data || []);
      }
    } catch {
      // 静默失败
    }
  }, []);

  useEffect(() => {
    fetchSchedules(page, pageSize);
    fetchSystemsList();
    fetchRulesList();
  }, [fetchSchedules, fetchSystemsList, fetchRulesList, page, pageSize]);

  // ============================================
  // 创建/编辑计划
  // ============================================

  const handleOpenCreate = () => {
    setEditingSchedule(null);
    form.resetFields();
    form.setFieldsValue({ cronExpression: '0 9 * * *' });
    setModalOpen(true);
  };

  const handleOpenEdit = (schedule: InspectionSchedule) => {
    setEditingSchedule(schedule);
    form.setFieldsValue({
      name: schedule.name,
      systemId: schedule.system_id,
      ruleIds: schedule.rule_ids || [],
      cronExpression: schedule.cron_expression,
      description: schedule.description || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      if (editingSchedule) {
        // 更新
        const selectedSystem = systems.find((s) => s.id === values.systemId);
        const response = await fetch('/api/it-asset-center/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            id: editingSchedule.id,
            ...values,
          }),
        });
        const result = await response.json();
        if (result.success) {
          messageRef.current.success('更新成功');
          setModalOpen(false);
          fetchSchedules(page, pageSize);
        } else {
          messageRef.current.error(result.error || '更新失败');
        }
      } else {
        // 创建
        const selectedSystem = systems.find((s) => s.id === values.systemId);
        const response = await fetch('/api/it-asset-center/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            ...values,
            systemName: selectedSystem?.name || '',
          }),
        });
        const result = await response.json();
        if (result.success) {
          messageRef.current.success('创建成功');
          setModalOpen(false);
          fetchSchedules(1, pageSize);
          setPage(1);
        } else {
          messageRef.current.error(result.error || '创建失败');
        }
      }
    } catch {
      // 表单验证失败
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================
  // 操作
  // ============================================

  /** 删除计划 */
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch('/api/it-asset-center/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      const result = await response.json();
      if (result.success) {
        messageRef.current.success('删除成功');
        fetchSchedules(page, pageSize);
      } else {
        messageRef.current.error(result.error || '删除失败');
      }
    } catch {
      messageRef.current.error('删除失败');
    }
  };

  /** 立即执行 */
  const handleRunNow = async (id: string) => {
    try {
      const response = await fetch('/api/it-asset-center/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run', id }),
      });
      const result = await response.json();
      if (result.success) {
        messageRef.current.success('已触发立即执行，请稍后查看日志');
        fetchSchedules(page, pageSize);
      } else {
        messageRef.current.error(result.error || '触发执行失败');
      }
    } catch {
      messageRef.current.error('触发执行失败');
    }
  };

  /** 启用/暂停 */
  const handleToggleEnable = async (schedule: InspectionSchedule) => {
    const action = schedule.is_enabled ? 'disable' : 'enable';
    try {
      const response = await fetch('/api/it-asset-center/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id: schedule.id }),
      });
      const result = await response.json();
      if (result.success) {
        messageRef.current.success(schedule.is_enabled ? '已暂停' : '已启用');
        fetchSchedules(page, pageSize);
      } else {
        messageRef.current.error(result.error || '操作失败');
      }
    } catch {
      messageRef.current.error('操作失败');
    }
  };

  /** 查看执行日志 */
  const handleViewLogs = async (schedule: InspectionSchedule) => {
    setLogScheduleName(schedule.name);
    setLogDrawerOpen(true);
    setLogsPage(1);
    await fetchLogs(schedule.id, 1, 10);
  };

  /** 加载执行日志 */
  const fetchLogs = async (scheduleId: string, p: number, ps: number) => {
    setLogsLoading(true);
    try {
      const response = await fetch('/api/it-asset-center/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logs', id: scheduleId, page: p, pageSize: ps }),
      });
      const result = await response.json();
      if (result.success) {
        setLogs(result.data || []);
        setLogsTotal(result.total || 0);
      }
    } catch {
      // 静默
    } finally {
      setLogsLoading(false);
    }
  };

  // ============================================
  // 表格列定义
  // ============================================

  const columns = [
    {
      title: '计划名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (text: string, record: InspectionSchedule) => (
        <Space orientation="horizontal" size={4}>
          <Badge status={record.is_enabled ? 'success' : 'default'} />
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: '信息系统',
      dataIndex: 'system_name',
      key: 'system_name',
      width: 160,
      ellipsis: true,
    },
    {
      title: 'Cron 表达式',
      dataIndex: 'cron_expression',
      key: 'cron_expression',
      width: 130,
      render: (text: string) => <Tag>{text}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'is_enabled',
      key: 'is_enabled',
      width: 80,
      render: (val: number) =>
        val ? <Tag color="success">启用</Tag> : <Tag color="default">暂停</Tag>,
    },
    {
      title: '上次执行',
      dataIndex: 'last_run_at',
      key: 'last_run_at',
      width: 140,
      render: (text: string | null) =>
        text ? <FriendlyTime date={text} /> : <Text type="secondary">-</Text>,
    },
    {
      title: '下次执行',
      dataIndex: 'next_run_at',
      key: 'next_run_at',
      width: 140,
      render: (text: string | null) =>
        text ? <FriendlyTime date={text} /> : <Text type="secondary">-</Text>,
    },
    {
      title: '执行次数',
      dataIndex: 'total_runs',
      key: 'total_runs',
      width: 80,
      align: 'center' as const,
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: unknown, record: InspectionSchedule) => (
        <Space orientation="horizontal" size={2}>
          <ActionButton
            icon={<PlayCircleOutlined />}
            tooltip="立即执行"
            onClick={() => handleRunNow(record.id)}
          />
          <ActionButton
            icon={record.is_enabled ? <PauseCircleOutlined /> : <CheckCircleOutlined />}
            tooltip={record.is_enabled ? '暂停' : '启用'}
            onClick={() => handleToggleEnable(record)}
          />
          <ActionButton
            icon={<HistoryOutlined />}
            tooltip="执行日志"
            onClick={() => handleViewLogs(record)}
          />
          <ActionButton
            icon={<EditOutlined />}
            tooltip="编辑"
            onClick={() => handleOpenEdit(record)}
          />
          <ActionButton
            icon={<DeleteOutlined />}
            tooltip="删除"
            danger
            confirmTitle="确认删除"
            confirmDescription={`确定要删除巡检计划「${record.name}」吗？`}
            onConfirm={() => handleDelete(record.id)}
          />
        </Space>
      ),
    },
  ];

  // ============================================
  // 日志抽屉的 Timeline items
  // ============================================

  const logTimelineItems: TimelineProps['items'] = logs.map((log) => {
    let color = 'blue';
    let dot = null;
    if (log.status === 'completed') {
      color = 'green';
      dot = <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    } else if (log.status === 'failed') {
      color = 'red';
      dot = <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
    } else if (log.status === 'running') {
      color = 'blue';
      dot = <ReloadOutlined spin style={{ color: '#1890ff' }} />;
    }

    return {
      color,
      icon: dot,
      content: (
        <div>
          <Space orientation="horizontal" size={4} style={{ marginBottom: 4 }}>
            <Tag
              color={
                log.status === 'completed'
                  ? 'success'
                  : log.status === 'failed'
                  ? 'error'
                  : 'processing'
              }
            >
              {log.status === 'completed'
                ? '✓ 完成'
                : log.status === 'failed'
                ? '✗ 失败'
                : '⏳ 运行中'}
            </Tag>
            {log.duration_ms !== null && <Text type="secondary">耗时: {(log.duration_ms / 1000).toFixed(1)}s</Text>}
          </Space>
          {log.result_summary && (
            <Paragraph
              ellipsis={{ rows: 2, expandable: true }}
              type="secondary"
              style={{ fontSize: 12, marginBottom: 4 }}
            >
              {log.result_summary}
            </Paragraph>
          )}
          {log.error_message && (
            <Alert title="错误信息" type="error" showIcon message={log.error_message} style={{ marginBottom: 8 }} />
          )}
          <div style={{ color: '#999', fontSize: 12 }}>
            <FriendlyTime date={log.started_at} />
            {log.completed_at && ` → ${log.started_at.slice(11, 19)}`}
          </div>
        </div>
      ),
    };
  });

  // ============================================
  // 渲染
  // ============================================

  return (
    <div>
      {/* 顶部操作栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space orientation="horizontal" size={8}>
              <FieldTimeOutlined style={{ fontSize: 18, color: '#1890ff' }} />
              <Text strong style={{ fontSize: 16 }}>巡检计划管理</Text>
              <Text type="secondary">
                共 {total} 个计划
              </Text>
            </Space>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenCreate}
            >
              创建巡检计划
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 计划列表 */}
      <Card styles={{ body: { padding: 24 } }}>
        <Spin spinning={loading} description="加载中...">
          <Table
            columns={columns}
            dataSource={schedules}
            rowKey="id"
            loading={loading}
            size="middle"
            scroll={{ x: 1100 }}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (t) => `共 ${t} 个计划`,
              onChange: (p, ps) => {
                setPage(p);
                setPageSize(ps || 10);
              },
            }}
            locale={{ emptyText: <Empty description="暂无巡检计划，点击上方按钮创建" /> }}
          />
        </Spin>
      </Card>

      {/* 创建/编辑弹窗 */}
      <Modal
        title={
          <Space orientation="horizontal">
            <SettingOutlined />
            <span>{editingSchedule ? '编辑巡检计划' : '创建巡检计划'}</span>
          </Space>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        width={600}
        okText={editingSchedule ? '保存' : '创建'}
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label="计划名称"
            rules={[{ required: true, message: '请输入计划名称' }]}
          >
            <Input placeholder="例如：每日上午巡检" maxLength={100} />
          </Form.Item>

          <Form.Item
            name="systemId"
            label="信息系统"
            rules={[{ required: true, message: '请选择信息系统' }]}
          >
            <Select
              placeholder="选择要巡检的信息系统"
              showSearch
              optionFilterProp="label"
              options={systems.map((s) => ({
                label: s.name,
                value: s.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="ruleIds"
            label="合规规则"
            extra="如不选择规则，仅生成资产描述到配置管理，不执行合规检查"
          >
            <Select
              mode="multiple"
              placeholder="选择要执行的合规规则（可选）"
              allowClear
              options={rules.map((r) => ({
                label: r.name,
                value: r.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="cronExpression"
            label="定时表达式 (Cron)"
            rules={[{ required: true, message: '请输入 Cron 表达式' }]}
            extra={<pre style={{ fontSize: 12, color: '#888', margin: '4px 0 0 0', lineHeight: 1.6 }}>{CRON_HELP_TEXT}</pre>}
          >
            <Input placeholder="例如: 0 9 * * *" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="可选的计划描述" maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 执行日志抽屉 */}
      <Drawer
        title={
          <Space orientation="horizontal">
            <HistoryOutlined />
            <span>执行日志</span>
            <Text type="secondary">— {logScheduleName}</Text>
          </Space>
        }
        size="large"
        open={logDrawerOpen}
        onClose={() => setLogDrawerOpen(false)}
      >
        <Spin spinning={logsLoading}>
          {logs.length === 0 ? (
            <Empty description="暂无执行日志" />
          ) : (
            <>
              <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                共 {logsTotal} 条执行记录
              </Paragraph>
              <Timeline mode="start" items={logTimelineItems} />
              {logsTotal > logsPage * 10 && (
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <Button
                    type="link"
                    onClick={() => {
                      const newPage = logsPage + 1;
                      setLogsPage(newPage);
                      // 从当前 schedule 的 ID 重新获取 logs
                      const schedule = schedules.find((s) => s.name === logScheduleName);
                      if (schedule) fetchLogs(schedule.id, newPage, 10);
                    }}
                  >
                    加载更多
                  </Button>
                </div>
              )}
            </>
          )}
        </Spin>
      </Drawer>
    </div>
  );
}