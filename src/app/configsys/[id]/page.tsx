'use client';

import React, { useEffect, useState } from 'react';
import { Card, Button, Tag, Space, Descriptions, Table, App, Modal, Form, Input, Drawer } from 'antd';
import { PlusOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
import ActionButton from '@/app/tags/components/ActionButton';
import FriendlyTime from '@/components/FriendlyTime';


const { TextArea } = Input;

interface Config {
  id: string;
  name: string;
  description: string;
  compliance_rule_id?: number;
  compliance_rule_name?: string;
  compliance_rule_content?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  isOwner: boolean;
}

interface RuleDetail {
  id: number;
  name: string;
  description: string | null;
  content: string;
  status: number;
  created_by?: number;
  creator_name?: string;
  created_at: string;
  updated_at: string;
}

interface Version {
  id: string;
  version_number: string;
  ai_summary: string;
  hasComplianceReport: boolean;
  created_by: string;
  created_at: string;
  isOwner: boolean;
}



export default function ConfigDetailPage() {
  const router = useRouter();
  const params = useParams();
  const configId = params.id as string;
  const { message } = App.useApp();
  
  const [config, setConfig] = useState<Config | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [isVersionModalVisible, setIsVersionModalVisible] = useState(false);
  const [versionForm] = Form.useForm();
  const [ruleDrawerVisible, setRuleDrawerVisible] = useState(false);
  const [ruleDetail, setRuleDetail] = useState<RuleDetail | null>(null);
  const [ruleLoading, setRuleLoading] = useState(false);

  useEffect(() => {
    fetchConfigDetail();
    fetchVersions();
  }, [configId]);

  const fetchConfigDetail = async () => {
    try {
      const response = await fetch(`/api/configsys/configs/${configId}`);
      const data = await response.json();
      if (data.success) {
        setConfig(data.data);
      } else {
        message.error(data.message || '获取配置详情失败');
      }
    } catch (error) {
      message.error('网络错误');
    }
  };

  const fetchVersions = async () => {
    try {
      const response = await fetch(`/api/configsys/versions?configId=${configId}`);
      const data = await response.json();
      if (data.success) {
        setVersions(data.data);
      }
    } catch (error) {
      console.error('获取版本列表失败:', error);
    }
  };

  const handleAddVersion = async (values: any) => {
    try {
      const response = await fetch('/api/configsys/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configId,
          versionNumber: values.versionNumber,
          content: values.content,
        }),
      });
      const data = await response.json();
      if (data.success) {
        message.success('版本创建成功');
        setIsVersionModalVisible(false);
        versionForm.resetFields();
        fetchVersions();
      } else {
        message.error(data.message || '创建失败');
      }
    } catch (error) {
      message.error('创建失败');
    }
  };

  const handleDeleteVersion = async (versionId: string) => {
    try {
      const response = await fetch(`/api/configsys/versions/${versionId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        message.success('删除成功');
        fetchVersions();
      } else {
        message.error(data.message || '删除失败');
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleShowRuleDetail = async (ruleId: number) => {
    setRuleLoading(true);
    setRuleDrawerVisible(true);
    try {
      const response = await fetch(`/api/rules/${ruleId}`);
      const data = await response.json();
      if (data.success) {
        setRuleDetail(data.data);
      } else {
        message.error(data.message || '获取规则详情失败');
      }
    } catch (error) {
      message.error('获取规则详情失败');
    } finally {
      setRuleLoading(false);
    }
  };

  const versionColumns = [
    {
      title: '版本号',
      dataIndex: 'version_number',
      key: 'version_number',
      render: (text: string, record: Version) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => router.push(`/configsys/versions/${record.id}`)}>
          {text}
        </Button>
      ),
    },
    {
      title: 'AI摘要',
      dataIndex: 'ai_summary',
      key: 'ai_summary',
      ellipsis: true,
      render: (text: string) => text || '未解读',
    },
    {
      title: '合规检查',
      key: 'compliance',
      render: (_: any, record: Version) => (
        record.hasComplianceReport ? 
          <Tag color="success">已检查</Tag> : 
          <Tag>未检查</Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (text: string) => <FriendlyTime date={text} />,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Version) => (
        <Space size="small">
          {record.isOwner && (
            <ActionButton
              icon={<DeleteOutlined />}
              tooltip="删除版本"
              danger
              confirmTitle="确认删除"
              confirmDescription="确定要删除此版本吗？删除后不可恢复。"
              onConfirm={() => handleDeleteVersion(record.id)}
            />
          )}
        </Space>
      ),
    },
  ];

  if (!config) {
    return <Card loading />;
  }

  return (
    <>
      <Card title={config.name}>
        {/* 基本信息 */}
        <Descriptions bordered column={2}>
          <Descriptions.Item label="配置名称">{config.name}</Descriptions.Item>
          <Descriptions.Item label="创建时间">
            <FriendlyTime date={config.created_at} />
          </Descriptions.Item>
          <Descriptions.Item label="描述" span={2}>{config.description}</Descriptions.Item>
          <Descriptions.Item label="合规规则" span={2}>
            {config.compliance_rule_id ? (
              <Button
                type="link"
                style={{ padding: 0 }}
                onClick={() => handleShowRuleDetail(config.compliance_rule_id!)}
              >
                {config.compliance_rule_name}
              </Button>
            ) : (
              <span style={{ color: '#999' }}>未设置</span>
            )}
          </Descriptions.Item>
        </Descriptions>

        {/* 版本历史 */}
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>版本历史 ({versions.length})</h3>
            {config.isOwner && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsVersionModalVisible(true)}
              >
                新增版本
              </Button>
            )}
          </div>
          <Table
            dataSource={versions}
            columns={versionColumns}
            rowKey="id"
            pagination={false}
          />
        </div>
      </Card>

      {/* 新增版本模态框 */}
      <Modal
        title="新增版本"
        open={isVersionModalVisible}
        onCancel={() => setIsVersionModalVisible(false)}
        onOk={() => versionForm.submit()}
        width={800}
      >
        <Form form={versionForm} onFinish={handleAddVersion} layout="vertical">
          <Form.Item
            name="versionNumber"
            label="版本号"
            rules={[{ required: true, message: '请输入版本号' }]}
          >
            <Input placeholder="例如：v1.0.0" />
          </Form.Item>
          <Form.Item
            name="content"
            label="配置内容"
            rules={[{ required: true, message: '请输入配置内容' }]}
          >
            <TextArea rows={15} placeholder="在此粘贴配置内容..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* 合规规则详情抽屉 */}
      <Drawer
        title="合规规则详情"
        size="large"
        open={ruleDrawerVisible}
        onClose={() => setRuleDrawerVisible(false)}
      >
        {ruleLoading ? (
          <Card loading />
        ) : ruleDetail ? (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="规则名称">{ruleDetail.name}</Descriptions.Item>
            <Descriptions.Item label="创建者">{ruleDetail.creator_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={ruleDetail.status === 1 ? 'green' : 'red'}>
                {ruleDetail.status === 1 ? '启用' : '禁用'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              <FriendlyTime date={ruleDetail.created_at} />
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              <FriendlyTime date={ruleDetail.updated_at} />
            </Descriptions.Item>
            <Descriptions.Item label="描述">
              {ruleDetail.description || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="规则内容">
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 400, overflow: 'auto' }}>
                {ruleDetail.content}
              </pre>
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </Drawer>
    </>
  );
}
