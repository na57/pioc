'use client';

import React, { useEffect, useState } from 'react';
import { Card, Button, Tag, Space, Descriptions, App, Select, Modal, Alert } from 'antd';
import { RobotOutlined, FileTextOutlined, SafetyOutlined, DeleteOutlined } from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
import ActionButton from '@/app/tags/components/ActionButton';
import FriendlyTime from '@/components/FriendlyTime';

const { Option } = Select;

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
  const versionId = params.id as string;
  const { message } = App.useApp();
  
  const [version, setVersion] = useState<Version | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [complianceLoading, setComplianceLoading] = useState(false);
  const [isCompareModalVisible, setIsCompareModalVisible] = useState(false);
  const [compareVersionId, setCompareVersionId] = useState<string>('');
  const [compareResult, setCompareResult] = useState<any>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  useEffect(() => {
    fetchVersionDetail();
  }, [versionId]);

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
      } else {
        message.error(data.message || '检查失败');
      }
    } catch (error) {
      message.error('检查失败');
    } finally {
      setComplianceLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/configsys/versions/${versionId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        message.success('删除成功');
        router.push(`/configsys/${version?.config_id}`);
      } else {
        message.error(data.message || '删除失败');
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  if (!version) {
    return <Card loading />;
  }

  return (
    <>
      <Card
        title={`${version.config_name} - ${version.version_number}`}
        extra={
          <Space>
            <Button
              icon={<RobotOutlined />}
              onClick={handleAIInterpret}
              loading={aiLoading}
            >
              AI解读
            </Button>
            {version.otherVersions.length > 0 && (
              <Button
                icon={<FileTextOutlined />}
                onClick={() => setIsCompareModalVisible(true)}
              >
                版本比对
              </Button>
            )}
            <Button
              icon={<SafetyOutlined />}
              onClick={handleComplianceCheck}
              loading={complianceLoading}
            >
              合规检查
            </Button>
            {version.isOwner && (
              <ActionButton
                icon={<DeleteOutlined />}
                tooltip="删除版本"
                danger
                confirmTitle="确认删除"
                confirmDescription="确定要删除此版本吗？"
                onConfirm={handleDelete}
              />
            )}
          </Space>
        }
      >
        {/* AI解读结果 */}
        {version.ai_full_analysis ? (
          <Card title="AI解读结果" style={{ marginBottom: 16 }}>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="识别类型">{version.ai_full_analysis.detectedType}</Descriptions.Item>
              <Descriptions.Item label="风险等级">
                <Tag color={version.ai_full_analysis.riskAssessment?.level === 'high' ? 'red' : version.ai_full_analysis.riskAssessment?.level === 'medium' ? 'orange' : 'green'}>
                  {version.ai_full_analysis.riskAssessment?.level}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="配置概述" span={2}>{version.ai_full_analysis.summary}</Descriptions.Item>
            </Descriptions>
            {version.ai_full_analysis.keyItems && version.ai_full_analysis.keyItems.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h4>关键配置项：</h4>
                <ul>
                  {version.ai_full_analysis.keyItems.map((item: any, index: number) => (
                    <li key={index}>
                      <strong>{item.name}</strong>: {item.value} - {item.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {version.ai_full_analysis.riskAssessment?.findings && version.ai_full_analysis.riskAssessment.findings.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h4>风险发现：</h4>
                <ul>
                  {version.ai_full_analysis.riskAssessment.findings.map((finding: string, index: number) => (
                    <li key={index} style={{ color: '#cf1322', marginBottom: 4 }}>
                      {finding}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        ) : (
          <Card title="AI解读" style={{ marginBottom: 16 }}>
            <Alert
              type="info"
              title="尚未进行AI解读"
              description="点击上方的'AI解读'按钮开始分析配置内容"
            />
          </Card>
        )}

        {/* 合规检查报告 */}
        {version.compliance_report && (
          <Card
            title={
              <Space>
                <span>合规检查报告</span>
                {version.compliance_report.ruleName && (
                  <Tag color="blue">规则: {version.compliance_report.ruleName}</Tag>
                )}
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
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
              <div style={{ marginTop: 16 }}>
                <h4>详细检查结果：</h4>
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
                      <Space>
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
          </Card>
        )}

        {/* 差异报告 */}
        {compareResult && (
          <Card title="版本对比结果" style={{ marginBottom: 16 }}>
            <Alert title={compareResult.summary} type="info" />
            {compareResult.changes && (
              <div style={{ marginTop: 16 }}>
                {compareResult.changes.map((change: any, index: number) => (
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
          </Card>
        )}

        {/* 配置内容 */}
        <Card title="配置内容">
          <pre style={{ 
            background: '#f5f5f5', 
            padding: 16, 
            borderRadius: 4,
            overflow: 'auto',
            maxHeight: 500,
          }}>
            {version.content}
          </pre>
        </Card>
      </Card>

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
    </>
  );
}
