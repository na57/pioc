'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Drawer,
  Button,
  Select,
  Space,
  Descriptions,
  Tag,
  Timeline,
  Alert,
  Spin,
  Typography,
  Divider,
  Empty,
  Card,
} from 'antd';
import type { TimelineProps } from 'antd';
import {
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  LinkOutlined,
  HistoryOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import ActionButton from '@/app/tags/components/ActionButton';
import FriendlyTime from '@/components/FriendlyTime';

const { Text, Paragraph, Title } = Typography;

// ============================================
// 类型定义
// ============================================

interface RuleOption {
  id: number;
  name: string;
  description?: string;
}

interface ComplianceFinding {
  rule: string;
  status: 'pass' | 'fail' | 'warning';
  details: string;
  suggestion: string;
  severity?: 'low' | 'medium' | 'high';
}

interface ComplianceSummary {
  overallStatus: 'pass' | 'fail' | 'warning';
  findings: ComplianceFinding[];
  summary: string;
}

interface InspectionRecord {
  id: string;
  system_id: string;
  system_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  config_id: string | null;
  latest_version_id: string | null;
  result_summary: string | null;
  error_message: string | null;
  created_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface InspectionResult {
  record: InspectionRecord;
  /** 配置管理页面的跳转链接 */
  configUrl: string | null;
  /** 合规检查结果摘要 */
  complianceSummary: ComplianceSummary | null;
}

/** 版本历史条目（来自配置管理） */
interface VersionHistoryItem {
  id: string;
  versionNumber: string;
  createdBy: string;
  createdAt: string;
  hasComplianceReport: boolean;
  complianceSummary: {
    overallStatus?: string;
    summary?: string;
    ruleName?: string;
  } | null;
}

// ============================================
// 组件
// ============================================

interface ComplianceInspectionDrawerProps {
  open: boolean;
  systemId: string;
  systemName: string;
  onClose: () => void;
  onInspectionComplete?: () => void;
}

export default function ComplianceInspectionDrawer({
  open,
  systemId,
  systemName,
  onClose,
  onInspectionComplete,
}: ComplianceInspectionDrawerProps) {
  // 规则列表
  const [rules, setRules] = useState<RuleOption[]>([]);
  const [selectedRuleIds, setSelectedRuleIds] = useState<number[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);

  // 巡检状态
  const [running, setRunning] = useState(false);
  const [currentResult, setCurrentResult] = useState<InspectionResult | null>(null);
  const [history, setHistory] = useState<VersionHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 当前展示的 tab: result | history
  const [viewMode, setViewMode] = useState<'result' | 'history'>('result');

  // 加载规则列表
  const fetchRules = useCallback(async () => {
    setRulesLoading(true);
    try {
      const response = await fetch('/api/rules/accessible');
      const result = await response.json();
      if (result.success) {
        setRules(result.data);
      }
    } catch {
      // 静默失败
    } finally {
      setRulesLoading(false);
    }
  }, []);

  // 获取配置版本历史（从配置管理）
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch(
        `/api/it-asset-center/inspection?systemId=${encodeURIComponent(systemId)}`
      );
      const result = await response.json();
      if (result.success) {
        setHistory(result.data);
      }
    } catch {
      // 静默失败
    } finally {
      setHistoryLoading(false);
    }
  }, [systemId]);

  // 打开时加载数据和历史
  useEffect(() => {
    if (open) {
      fetchRules();
      fetchHistory();
      setCurrentResult(null);
      setError(null);
      setViewMode('result');
    }
  }, [open, fetchRules, fetchHistory]);

  // 执行巡检
  const handleRunInspection = async () => {
    setRunning(true);
    setError(null);
    setCurrentResult(null);

    try {
      const response = await fetch('/api/it-asset-center/inspection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemId,
          ruleIds: selectedRuleIds,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setCurrentResult(result.data);
        // 刷新历史
        fetchHistory();
        // 通知父页面刷新系统列表状态
        onInspectionComplete?.();
      } else {
        setError(result.error || '巡检执行失败');
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  };

  // 构建 Timeline items
  const timelineItems: TimelineProps['items'] = history.map((item) => {
    const status =
      item.complianceSummary?.overallStatus === 'pass'
        ? 'pass'
        : item.complianceSummary?.overallStatus === 'fail'
        ? 'fail'
        : item.complianceSummary?.overallStatus === 'warning'
        ? 'warning'
        : null;

    const color = status === 'pass' ? 'green' : status === 'fail' ? 'red' : 'blue';

    return {
      color,
      content: (
        <div>
          <div>
            <Tag color="blue">{item.versionNumber}</Tag>
            {status && (
              <Tag
                color={
                  status === 'pass' ? 'success' : status === 'fail' ? 'error' : 'warning'
                }
              >
                {status === 'pass'
                  ? '✓ 通过'
                  : status === 'fail'
                  ? '✗ 未通过'
                  : '! 警告'}
              </Tag>
            )}
            {!status && <Tag color="default">未执行合规检查</Tag>}
            <Link
              href={`/configsys/versions/${item.id}`}
              target="_blank"
              style={{ marginLeft: 8 }}
            >
              <FileTextOutlined /> 查看详情
            </Link>
          </div>
          {item.complianceSummary?.summary && (
            <div style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {item.complianceSummary.summary.substring(0, 60)}
                {item.complianceSummary.summary.length > 60 ? '...' : ''}
              </Text>
            </div>
          )}
          <div style={{ marginTop: 4, color: '#999', fontSize: 12 }}>
            <FriendlyTime date={item.createdAt} />
            {item.createdBy && ` by ${item.createdBy}`}
          </div>
        </div>
      ),
    };
  });

  // 获取状态标签
  const getStatusTag = useCallback((status: string) => {
    const map: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
      pass: { color: 'success', text: '通过', icon: <CheckCircleOutlined /> },
      fail: { color: 'error', text: '未通过', icon: <CloseCircleOutlined /> },
      warning: { color: 'warning', text: '警告', icon: <WarningOutlined /> },
      pending: { color: 'default', text: '等待中', icon: null },
      running: { color: 'processing', text: '进行中', icon: null },
      completed: { color: 'success', text: '已完成', icon: <CheckCircleOutlined /> },
      failed: { color: 'error', text: '失败', icon: <CloseCircleOutlined /> },
    };
    const item = map[status] || { color: 'default', text: status, icon: null };
    return <Tag color={item.color}>{item.icon} {item.text}</Tag>;
  }, []);

  return (
    <Drawer
      title={
        <Space orientation="horizontal">
          <SafetyCertificateOutlined />
          <span>合规巡检</span>
          <Text type="secondary" style={{ fontSize: 14 }}>— {systemName}</Text>
        </Space>
      }
      size="large"
      open={open}
      onClose={onClose}
      extra={
        <Space orientation="horizontal" size="small">
          <ActionButton
            icon={<HistoryOutlined />}
            tooltip="历史记录"
            onClick={() => setViewMode(viewMode === 'history' ? 'result' : 'history')}
          />
        </Space>
      }
    >
      {viewMode === 'history' ? (
        // ========== 历史记录视图（配置版本列表） ==========
        <>
          <Title level={5}><HistoryOutlined /> 配置版本历史</Title>
          <Paragraph type="secondary" style={{ marginBottom: 16 }}>
            每次巡检会在配置管理中创建一个新的配置版本，以下是该信息系统对应的所有配置版本记录
          </Paragraph>
          <Spin spinning={historyLoading}>
            {history.length === 0 ? (
              <Empty description="暂未执行过合规巡检" />
            ) : (
              <Timeline mode="start" items={timelineItems} />
            )}
          </Spin>
        </>
      ) : (
        // ========== 巡检结果视图 ==========
        <>
          {/* 规则选择 + 触发按钮 */}
          <div style={{ marginBottom: 16 }}>
            <Text strong>选择合规规则</Text>
            <div style={{ marginTop: 8, marginBottom: 8 }}>
              <Select
                mode="multiple"
                placeholder="选择要检查的合规规则（可选）"
                loading={rulesLoading}
                style={{ width: '100%' }}
                value={selectedRuleIds}
                onChange={setSelectedRuleIds}
                options={rules.map((r) => ({
                  label: r.name,
                  value: r.id,
                }))}
                allowClear
              />
              <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                如不选择规则，仅生成资产描述到配置管理，不执行合规检查
              </div>
            </div>
            <Button
              type="primary"
              icon={<SafetyCertificateOutlined />}
              onClick={handleRunInspection}
              loading={running}
              disabled={running}
              block
              size="large"
            >
              {running ? '正在巡检...' : '开始合规巡检'}
            </Button>
          </div>

          <Divider />

          {/* 运行状态 */}
          {running && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin description="正在采集资产数据、生成资产描述、推送到配置管理..." />
              <div style={{ marginTop: 16, color: '#999' }}>
                <div>此过程可能持续几十秒，请耐心等待</div>
                <div style={{ marginTop: 8, fontSize: 12 }}>
                  步骤: 获取系统及子系统资产 → 生成资产描述 → 推送到配置管理 → AI合规检查
                </div>
              </div>
            </div>
          )}

          {/* 错误信息 */}
          {error && (
            <Alert
              title="巡检失败"
              type="error"
              showIcon
              message={error}
              style={{ marginBottom: 16 }}
              closable
              onClose={() => setError(null)}
            />
          )}

          {/* 巡检结果 */}
          {currentResult && !running && (
            <div>
              {/* 总体状态 */}
              <Alert
                title={
                  currentResult.record.status === 'completed'
                    ? '巡检完成'
                    : '巡检失败'
                }
                type={
                  currentResult.record.status === 'completed'
                    ? currentResult.complianceSummary?.overallStatus === 'pass'
                      ? 'success'
                      : currentResult.complianceSummary?.overallStatus === 'fail'
                      ? 'error'
                      : 'warning'
                    : 'error'
                }
                showIcon
                description={
                  currentResult.record.status === 'completed'
                    ? currentResult.complianceSummary?.summary || '巡检完成，未执行合规检查'
                    : currentResult.record.error_message || '未知错误'
                }
                style={{ marginBottom: 16 }}
              />

              {/* 跳转链接 */}
              {currentResult.configUrl && (
                <Alert
                  title="查看完整报告"
                  type="info"
                  showIcon
                  icon={<LinkOutlined />}
                  description={
                    <Link href={currentResult.configUrl} target="_blank">
                      点击跳转到配置管理查看完整的合规检查报告（包含配置版本详情、AI解读等）
                    </Link>
                  }
                  style={{ marginBottom: 16 }}
                />
              )}

              {/* 合规检查详情 */}
              {currentResult.complianceSummary && (
                <>
                  <Title level={5}>
                    合规检查结果
                    <Tag
                      color={
                        currentResult.complianceSummary.overallStatus === 'pass'
                          ? 'success'
                          : currentResult.complianceSummary.overallStatus === 'fail'
                          ? 'error'
                          : 'warning'
                      }
                      style={{ marginLeft: 8 }}
                    >
                      {currentResult.complianceSummary.overallStatus === 'pass'
                        ? '全部通过'
                        : currentResult.complianceSummary.overallStatus === 'fail'
                        ? '有未通过项'
                        : '有警告项'}
                    </Tag>
                  </Title>

                  <div style={{ marginTop: 12 }}>
                    {currentResult.complianceSummary.findings.map((finding, index) => (
                      <div
                        key={index}
                        style={{
                          padding: 12,
                          marginBottom: 8,
                          borderRadius: 6,
                          border: '1px solid',
                          borderColor:
                            finding.status === 'pass'
                              ? '#d9f7be'
                              : finding.status === 'fail'
                              ? '#ffa39e'
                              : '#ffe58f',
                          background:
                            finding.status === 'pass'
                              ? '#f6ffed'
                              : finding.status === 'fail'
                              ? '#fff2f0'
                              : '#fffbe6',
                        }}
                      >
                        <div style={{ marginBottom: 4 }}>
                          {finding.status === 'pass' ? (
                            <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 6 }} />
                          ) : finding.status === 'fail' ? (
                            <CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: 6 }} />
                          ) : (
                            <WarningOutlined style={{ color: '#faad14', marginRight: 6 }} />
                          )}
                          <Text strong>{finding.rule}</Text>
                          {finding.severity && (
                            <Tag
                              color={
                                finding.severity === 'high'
                                  ? 'red'
                                  : finding.severity === 'medium'
                                  ? 'orange'
                                  : 'blue'
                              }
                              style={{ marginLeft: 8 }}
                            >
                              {finding.severity === 'high'
                                ? '严重'
                                : finding.severity === 'medium'
                                ? '中等'
                                : '轻微'}
                            </Tag>
                          )}
                        </div>
                        <Paragraph style={{ margin: '4px 0 0 20px', fontSize: 13, color: '#666' }}>
                          {finding.details}
                        </Paragraph>
                        <Paragraph
                          style={{
                            margin: '4px 0 0 20px',
                            fontSize: 12,
                            color: finding.status === 'pass' ? '#52c41a' : '#1890ff',
                          }}
                        >
                          <Text type="secondary">建议: </Text>
                          {finding.suggestion}
                        </Paragraph>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* 执行概要 */}
              <Card style={{ marginTop: 16 }}>
                <Descriptions title="执行概要" column={1} size="small">
                  <Descriptions.Item label="巡检状态">
                    {getStatusTag(currentResult.record.status)}
                  </Descriptions.Item>
                  <Descriptions.Item label="信息系统">
                    {currentResult.record.system_name}
                  </Descriptions.Item>
                  <Descriptions.Item label="开始时间">
                    <FriendlyTime date={currentResult.record.started_at!} />
                  </Descriptions.Item>
                  <Descriptions.Item label="完成时间">
                    <FriendlyTime date={currentResult.record.completed_at!} />
                  </Descriptions.Item>
                  <Descriptions.Item label="发起人">
                    {currentResult.record.created_by || '-'}
                  </Descriptions.Item>
                  {currentResult.configUrl && (
                    <Descriptions.Item label="配置管理">
                      <Link href={currentResult.configUrl} target="_blank">
                        查看配置详情 <LinkOutlined />
                      </Link>
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Card>
            </div>
          )}
        </>
      )}
    </Drawer>
  );
}