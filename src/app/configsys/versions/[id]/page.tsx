'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, Button, Tag, Space, Descriptions, App, Select, Modal, Alert, Menu, Typography, theme } from 'antd';
import type { MenuProps } from 'antd';
import { RobotOutlined, FileTextOutlined, SafetyOutlined, InfoCircleOutlined, MessageOutlined, DiffOutlined, ProfileOutlined } from '@ant-design/icons';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import ActionButton from '@/app/tags/components/ActionButton';
import FriendlyTime from '@/components/FriendlyTime';
import { AIChatPanel } from '@/components/ai-chat';

const { Option } = Select;
const { Text, Title } = Typography;

interface Version {
  id: string;
  config_id: string;
  config_name: string;
  version_number: string;
  content: string;
  ai_summary: string;
  ai_full_analysis: any;
  compliance_report: any;
  diff_report: any;
  created_by: string;
  created_at: string;
  isOwner: boolean;
  otherVersions: Array<{ id: string; version_number: string; created_at: string }>;
}

export default function VersionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const versionId = params.id as string;
  const { message } = App.useApp();
  const { token } = theme.useToken();
  
  const [version, setVersion] = useState<Version | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [complianceLoading, setComplianceLoading] = useState(false);
  const [isCompareModalVisible, setIsCompareModalVisible] = useState(false);
  const [compareVersionId, setCompareVersionId] = useState<string>('');
  const [compareResult, setCompareResult] = useState<any>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [aiCompareLoading, setAiCompareLoading] = useState(false);
  const [aiCompareResult, setAiCompareResult] = useState<any>(null);
  const [aiCompareVersionId, setAiCompareVersionId] = useState<string>('');

  useEffect(() => {
    fetchVersionDetail();
  }, [versionId]);

  // 从 URL 参数同步当前菜单（?tab=xxx），与左侧菜单联动
  useEffect(() => {
    const tab = searchParams.get('tab');
    setActiveTab(tab && ['ai', 'compliance', 'ai-compare', 'chat'].includes(tab) ? tab : 'basic');
  }, [searchParams]);

  // 切换菜单：同步写入 URL（如 ?tab=ai），刷新/分享后状态保持
  const switchTab = useCallback((key: string) => {
    setActiveTab(key);
    const p = new URLSearchParams(searchParams.toString());
    if (key === 'basic') p.delete('tab'); else p.set('tab', key);
    const qs = p.toString();
    router.push(`/configsys/versions/${versionId}${qs ? `?${qs}` : ''}`);
  }, [router, searchParams, versionId]);

  const fetchVersionDetail = async () => {
    try {
      const response = await fetch(`/api/configsys/versions/${versionId}?t=${Date.now()}`);
      const data = await response.json();
      if (data.success) {
        setVersion(data.data);
      } else {
        message.error(data.message || '获取版本详情失败');
      }
    } catch (error) {
      message.error('网络错误');
    }
  };

  const handleAIInterpret = async () => {
    setAiLoading(true);
    try {
      const response = await fetch(`/api/configsys/versions/${versionId}/interpret`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        message.success('AI解读完成');
        // 立即更新本地状态显示结果
        setVersion(prev => prev ? { ...prev, ai_full_analysis: data.data, ai_summary: data.data.summary } : null);
        // 然后重新获取完整数据
        await fetchVersionDetail();
        // 切换到AI解读菜单
        switchTab('ai');
      } else {
        message.error(data.message || '解读失败');
      }
    } catch (error) {
      message.error('解读失败');
    } finally {
      setAiLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!compareVersionId) {
      message.error('请选择要对比的版本');
      return;
    }
    setCompareLoading(true);
    try {
      const response = await fetch(`/api/configsys/versions/${versionId}/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetVersionId: compareVersionId }),
      });
      const data = await response.json();
      if (data.success) {
        setCompareResult(data.data);
        message.success('对比完成');
      } else {
        message.error(data.message || '对比失败');
      }
    } catch (error) {
      message.error('对比失败');
    } finally {
      setCompareLoading(false);
    }
  };

  const handleComplianceCheck = async () => {
    setComplianceLoading(true);
    try {
      const response = await fetch(`/api/configsys/versions/${versionId}/compliance`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        message.success('合规检查完成');
        fetchVersionDetail();
        // 切换到合规检查菜单
        switchTab('compliance');
      } else {
        message.error(data.message || '检查失败');
      }
    } catch (error) {
      message.error('检查失败');
    } finally {
      setComplianceLoading(false);
    }
  };

  const handleAICompare = async () => {
    if (!aiCompareVersionId) {
      message.error('请选择要对比的版本');
      return;
    }
    setAiCompareLoading(true);
    try {
      const response = await fetch(`/api/configsys/versions/${versionId}/ai-compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetVersionId: aiCompareVersionId }),
      });
      const data = await response.json();
      if (data.success) {
        setAiCompareResult(data.data);
        message.success('AI比对完成');
      } else {
        message.error(data.message || '比对失败');
      }
    } catch (error) {
      message.error('比对失败');
    } finally {
      setAiCompareLoading(false);
    }
  };

  if (!version) {
    return <Card loading />;
  }

  // 小节标题：Swiss 风格区块头，标题居左、操作居右，无卡片边框
  const SectionHeader = ({ title, extra }: { title: React.ReactNode; extra?: React.ReactNode }) => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
        marginBottom: 12,
      }}
    >
      <Text strong style={{ fontSize: 15 }}>{title}</Text>
      {extra}
    </div>
  );

  // 空状态：发丝边框扁平提示块
  const EmptyState = ({ text, hint }: { text: string; hint?: string }) => (
    <div style={{ border: `1px solid ${token.colorBorderSecondary}`, padding: '40px 24px', textAlign: 'center' }}>
      <Text type="secondary">{text}</Text>
      {hint && (
        <div style={{ marginTop: 4 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>{hint}</Text>
        </div>
      )}
    </div>
  );

  // 基本信息Tab内容
  const BasicInfoTab = () => (
    <>
      {/* 版本对比结果 */}
      {compareResult && (
        <div style={{ marginBottom: 24 }}>
          <SectionHeader title="版本对比结果" />
          <p style={{ margin: '0 0 12px', lineHeight: 1.7 }}>{compareResult.summary}</p>
          {compareResult.changes && compareResult.changes.map((change: any, index: number) => (
            <Alert
              key={index}
              type={change.type === 'add' ? 'success' : change.type === 'remove' ? 'error' : 'warning'}
              title={`${change.category} - ${change.type === 'add' ? '新增' : change.type === 'remove' ? '删除' : '修改'}`}
              description={
                <div>
                  <p>{change.description}</p>
                  <p><strong>风险：</strong>
                    <Tag color={change.risk === 'high' ? 'red' : change.risk === 'medium' ? 'orange' : 'green'}>
                      {change.risk}
                    </Tag>
                  </p>
                  <p><strong>建议：</strong>{change.suggestion}</p>
                </div>
              }
              style={{ marginBottom: 8 }}
            />
          ))}
        </div>
      )}

      {/* 配置内容 */}
      <div style={compareResult ? { marginTop: 24, paddingTop: 24, borderTop: `1px solid ${token.colorBorderSecondary}` } : undefined}>
        <SectionHeader title="配置内容" />
        <pre
          style={{
            margin: 0,
            padding: 16,
            border: `1px solid ${token.colorBorderSecondary}`,
            background: token.colorFillQuaternary,
            overflow: 'auto',
            maxHeight: 500,
            fontSize: 13,
            lineHeight: 1.7,
          }}
        >
          {version.content}
        </pre>
      </div>
    </>
  );

  // AI解读Tab内容
  const AIInterpretTab = () => (
    <>
      <SectionHeader
        title="AI 解读"
        extra={
          <Button
            icon={<RobotOutlined />}
            onClick={handleAIInterpret}
            loading={aiLoading}
            type="primary"
          >
            {version.ai_full_analysis ? '重新解读' : '开始AI解读'}
          </Button>
        }
      />

      {version.ai_full_analysis ? (
        <>
          <Descriptions column={2}>
            <Descriptions.Item label="识别类型">{version.ai_full_analysis.detectedType}</Descriptions.Item>
            <Descriptions.Item label="风险等级">
              <Tag color={version.ai_full_analysis.riskAssessment?.level === 'high' ? 'red' : version.ai_full_analysis.riskAssessment?.level === 'medium' ? 'orange' : 'green'}>
                {version.ai_full_analysis.riskAssessment?.level}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="配置概述" span={2}>{version.ai_full_analysis.summary}</Descriptions.Item>
          </Descriptions>

          {version.ai_full_analysis.keyItems && version.ai_full_analysis.keyItems.length > 0 && (
            <div style={{ marginTop: 24, paddingTop: 24, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
              <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 12 }}>关键配置项</Text>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {version.ai_full_analysis.keyItems.map((item: any, index: number) => (
                  <li key={index} style={{ marginBottom: 4, lineHeight: 1.7 }}>
                    <strong>{item.name}</strong>: {item.value} - {item.description}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {version.ai_full_analysis.riskAssessment?.findings && version.ai_full_analysis.riskAssessment.findings.length > 0 && (
            <div style={{ marginTop: 24, paddingTop: 24, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
              <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 12 }}>风险发现</Text>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {version.ai_full_analysis.riskAssessment.findings.map((finding: string, index: number) => (
                  <li key={index} style={{ color: '#cf1322', marginBottom: 4, lineHeight: 1.7 }}>
                    {finding}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <EmptyState text="尚未进行AI解读" hint="点击右上角「开始AI解读」，AI 将分析配置内容" />
      )}
    </>
  );

  // 合规检查Tab内容
  const ComplianceTab = () => (
    <>
      <SectionHeader
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            合规检查
            {version.compliance_report?.ruleName && (
              <Tag color="blue">规则: {version.compliance_report.ruleName}</Tag>
            )}
          </span>
        }
        extra={
          <Button
            icon={<SafetyOutlined />}
            onClick={handleComplianceCheck}
            loading={complianceLoading}
            type="primary"
          >
            {version.compliance_report ? '重新检查' : '开始合规检查'}
          </Button>
        }
      />

      {version.compliance_report ? (
        <>
          <Alert
            type={
              version.compliance_report.overallStatus === 'pass'
                ? 'success'
                : version.compliance_report.overallStatus === 'warning'
                  ? 'warning'
                  : 'error'
            }
            title={
              version.compliance_report.overallStatus === 'pass'
                ? '✅ 合规'
                : version.compliance_report.overallStatus === 'warning'
                  ? '⚠️ 警告'
                  : '❌ 不合规'
            }
            description={version.compliance_report.summary}
          />

          {version.compliance_report.findings && version.compliance_report.findings.length > 0 && (
            <div style={{ marginTop: 24, paddingTop: 24, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
              <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 12 }}>详细检查结果</Text>
              {version.compliance_report.findings.map((finding: any, index: number) => (
                <Alert
                  key={index}
                  type={
                    finding.status === 'pass'
                      ? 'success'
                      : finding.status === 'warning'
                        ? 'warning'
                        : 'error'
                  }
                  title={
                    <Space size={6}>
                      <span>{finding.rule}</span>
                      {finding.severity && finding.status !== 'pass' && (
                        <Tag
                          color={
                            finding.severity === 'high'
                              ? 'red'
                              : finding.severity === 'medium'
                                ? 'orange'
                                : 'green'
                          }
                        >
                          {finding.severity === 'high'
                            ? '高风险'
                            : finding.severity === 'medium'
                              ? '中风险'
                              : '低风险'}
                        </Tag>
                      )}
                    </Space>
                  }
                  description={
                    <div>
                      <p>{finding.details}</p>
                      {finding.suggestion && <p><strong>建议：</strong>{finding.suggestion}</p>}
                    </div>
                  }
                  style={{ marginBottom: 8 }}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <EmptyState text="尚未进行合规检查" hint="点击右上角「开始合规检查」，检查配置合规性" />
      )}
    </>
  );

  // AI问答Tab内容 - 使用AIChatPanel组件
  const AIChatTab = () => (
    <AIChatPanel
      apiEndpoint={`/api/configsys/versions/${versionId}/chat`}
      title="AI智能问答"
      description="我是AI助手，可以帮您解答关于此配置文件的各种问题，如配置项含义、作用、优化建议等。"
      placeholder="请输入您关于配置文件的问题..."
      storageKey={`configsys_chat_${versionId}`}
      extraParams={{ configContent: version.content }}
      enableTypingEffect={true}
      enableMarkdown={true}
      enableThinkCollapse={true}
      enableLocalStorage={true}
      enableChart={false}
      cardStyle={{ height: 'calc(100vh - 300px)', minHeight: 500 }}
    />
  );

  // AI比对Tab内容
  const AICompareTab = () => (
    <>
      <SectionHeader
        title="AI 比对"
        extra={
          <Space>
            <Select
              style={{ width: 260 }}
              placeholder="选择要对比的目标版本"
              onChange={(value) => setAiCompareVersionId(value)}
              value={aiCompareVersionId || undefined}
            >
              {version.otherVersions.map((v) => (
                <Option key={v.id} value={v.id}>
                  {v.version_number} (<FriendlyTime date={v.created_at} />)
                </Option>
              ))}
            </Select>
            <Button
              type="primary"
              icon={<DiffOutlined />}
              onClick={handleAICompare}
              loading={aiCompareLoading}
              disabled={!aiCompareVersionId}
            >
              开始AI比对
            </Button>
          </Space>
        }
      />

      {aiCompareResult ? (
        <>
          <p style={{ margin: 0, lineHeight: 1.7 }}>{aiCompareResult.summary}</p>

          {aiCompareResult.changes && aiCompareResult.changes.length > 0 && (
            <div style={{ marginTop: 24, paddingTop: 24, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
              <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 12 }}>详细变更</Text>
              {aiCompareResult.changes.map((change: any, index: number) => (
                <Alert
                  key={index}
                  type={change.type === 'add' ? 'success' : change.type === 'remove' ? 'error' : 'warning'}
                  title={
                    <Space size={6}>
                      <span>{change.category}</span>
                      <Tag color={change.type === 'add' ? 'green' : change.type === 'remove' ? 'red' : 'orange'}>
                        {change.type === 'add' ? '新增' : change.type === 'remove' ? '删除' : '修改'}
                      </Tag>
                      <Tag color={change.risk === 'high' ? 'red' : change.risk === 'medium' ? 'orange' : 'green'}>
                        {change.risk === 'high' ? '高风险' : change.risk === 'medium' ? '中风险' : '低风险'}
                      </Tag>
                    </Space>
                  }
                  description={
                    <div>
                      <p><strong>变更内容:</strong> {change.description}</p>
                      <p><strong>建议:</strong> {change.suggestion}</p>
                    </div>
                  }
                  style={{ marginBottom: 8 }}
                />
              ))}
            </div>
          )}

          {aiCompareResult.impact && (
            <div style={{ marginTop: 24, paddingTop: 24, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
              <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>整体影响评估</Text>
              <p style={{ margin: 0, lineHeight: 1.7 }}>{aiCompareResult.impact}</p>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          text="尚未进行AI比对"
          hint="选择右上角目标版本，点击「开始AI比对」，AI 将分析两个版本之间的差异"
        />
      )}
    </>
  );

  // 左侧菜单：顶部「配置详情」返回配置详情页，其余为功能菜单
  const menuItems: MenuProps['items'] = [
    {
      key: 'config-detail',
      icon: <ProfileOutlined />,
      label: '配置详情',
    },
    { type: 'divider' },
    {
      key: 'basic',
      icon: <InfoCircleOutlined />,
      label: '基本信息',
    },
    {
      key: 'ai',
      icon: <RobotOutlined />,
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          AI解读
          {version.ai_full_analysis && <Tag color="success" style={{ marginInlineEnd: 0 }}>已完成</Tag>}
        </span>
      ),
    },
    {
      key: 'compliance',
      icon: <SafetyOutlined />,
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          合规检查
          {version.compliance_report && (
            <Tag
              color={
                version.compliance_report.overallStatus === 'pass'
                  ? 'success'
                  : version.compliance_report.overallStatus === 'warning'
                    ? 'warning'
                    : 'error'
              }
              style={{ marginInlineEnd: 0 }}
            >
              {version.compliance_report.overallStatus === 'pass'
                ? '通过'
                : version.compliance_report.overallStatus === 'warning'
                  ? '警告'
                  : '不合规'}
            </Tag>
          )}
        </span>
      ),
    },
    {
      key: 'ai-compare',
      icon: <DiffOutlined />,
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          AI比对
          {aiCompareResult && <Tag color="success" style={{ marginInlineEnd: 0 }}>已比对</Tag>}
        </span>
      ),
    },
    {
      key: 'chat',
      icon: <MessageOutlined />,
      label: 'AI问答',
    },
  ];

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    // 「配置详情」：返回配置详情页 /configsys/[id]
    if (key === 'config-detail') {
      router.push(`/configsys/${version.config_id}`);
      return;
    }
    switchTab(key);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        background: token.colorBgContainer,
      }}
    >
      {/* 左侧菜单：白色同色画布，右侧发丝分割线，无边框 */}
      <div
        style={{
          width: 208,
          flexShrink: 0,
          borderRight: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <div style={{ position: 'sticky', top: 80 }}>
          <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
            <Text
              strong
              style={{ fontSize: 15, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              title={version.config_name}
            >
              {version.config_name}
            </Text>
          </div>
          <Menu
            mode="inline"
            selectedKeys={[activeTab]}
            items={menuItems}
            onClick={handleMenuClick}
            style={{ borderInlineEnd: 'none', paddingTop: 8 }}
          />
        </div>
      </div>

      {/* 右侧 main */}
      <div style={{ flex: 1, minWidth: 0, padding: '0 0 24px 24px' }}>
        {/* 页头：标题 + 操作，发丝分割 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            padding: '16px 0 12px',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <Title
              level={4}
              style={{ margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {version.config_name}
            </Title>
            <Text type="secondary">版本 {version.version_number}</Text>
          </div>
          {version.otherVersions.length > 0 && (
            <Button
              icon={<FileTextOutlined />}
              onClick={() => setIsCompareModalVisible(true)}
            >
              版本比对
            </Button>
          )}
        </div>

        {/* 当前菜单内容 */}
        <div style={{ paddingTop: 16 }}>
          {activeTab === 'basic' && <BasicInfoTab />}
          {activeTab === 'ai' && <AIInterpretTab />}
          {activeTab === 'compliance' && <ComplianceTab />}
          {activeTab === 'ai-compare' && <AICompareTab />}
          {activeTab === 'chat' && <AIChatTab />}
        </div>
      </div>

      {/* 版本比对选择模态框 */}
      <Modal
        title="选择要对比的版本"
        open={isCompareModalVisible}
        onCancel={() => setIsCompareModalVisible(false)}
        onOk={handleCompare}
        confirmLoading={compareLoading}
      >
        <Select
          style={{ width: '100%' }}
          placeholder="选择目标版本"
          onChange={(value) => setCompareVersionId(value)}
        >
          {version.otherVersions.map((v) => (
            <Option key={v.id} value={v.id}>
              {v.version_number} ({new Date(v.created_at).toLocaleDateString()})
            </Option>
          ))}
        </Select>
      </Modal>
    </div>
  );
}
