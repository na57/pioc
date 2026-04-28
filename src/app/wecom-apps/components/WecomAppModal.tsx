'use client';

import React, { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Switch,
} from 'antd';
import { App } from 'antd';

const { TextArea } = Input;
const { Option } = Select;

interface WecomAccount {
  id: number;
  name: string;
}

interface WecomAppModalProps {
  title: string;
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  initialValues?: WecomAppItem | null;
}

interface WecomAppItem {
  id: number;
  account_id: number;
  account_name?: string;
  name: string;
  agent_id: string;
  secret: string | null;
  description: string | null;
  status: number;
}

export default function WecomAppModal({
  title,
  open,
  onCancel,
  onSuccess,
  initialValues,
}: WecomAppModalProps) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [accounts, setAccounts] = useState<WecomAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  useEffect(() => {
    if (open) {
      fetchAccounts();
      if (initialValues) {
        form.setFieldsValue({
          account_id: initialValues.account_id,
          name: initialValues.name,
          agent_id: initialValues.agent_id,
          secret: initialValues.secret,
          description: initialValues.description,
          status: initialValues.status === 1,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ status: true });
      }
    }
  }, [open, initialValues, form]);

  const fetchAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const response = await fetch('/api/wecom-accounts?all=true');
      const data = await response.json();
      if (data.success) {
        setAccounts(data.data.list);
      }
    } catch (error) {
      console.error('获取账号列表失败:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const submitData = {
        account_id: values.account_id,
        name: values.name,
        agent_id: values.agent_id,
        secret: values.secret,
        description: values.description,
        status: values.status ? 1 : 0,
      };

      const url = initialValues ? `/api/wecom-apps/${initialValues.id}` : '/api/wecom-apps';
      const method = initialValues ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (data.success) {
        message.success(initialValues ? '应用更新成功' : '应用创建成功');
        onSuccess();
      } else {
        message.error(data.message || (initialValues ? '更新失败' : '创建失败'));
      }
    } catch (error) {
      console.error('提交失败:', error);
    }
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      okText="保存"
      cancelText="取消"
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 24 }}
      >
        <Form.Item
          name="account_id"
          label="所属企微账号"
          rules={[{ required: true, message: '请选择所属企微账号' }]}
        >
          <Select
            placeholder="请选择所属企微账号"
            loading={loadingAccounts}
            showSearch
            optionFilterProp="children"
          >
            {accounts.map(account => (
              <Option key={account.id} value={account.id}>
                {account.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="name"
          label="应用名称"
          rules={[
            { required: true, message: '请输入应用名称' },
            { max: 100, message: '应用名称最多100个字符' },
          ]}
        >
          <Input placeholder="请输入应用名称" />
        </Form.Item>

        <Form.Item
          name="agent_id"
          label="AgentId"
          rules={[
            { required: true, message: '请输入AgentId' },
            { max: 50, message: 'AgentId最多50个字符' },
          ]}
        >
          <Input placeholder="请输入应用AgentId" />
        </Form.Item>

        <Form.Item
          name="secret"
          label="应用Secret"
        >
          <Input.Password placeholder="请输入应用Secret（可选）" />
        </Form.Item>

        <Form.Item
          name="description"
          label="描述"
        >
          <TextArea
            rows={3}
            placeholder="请输入描述信息（可选）"
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Form.Item
          name="status"
          label="状态"
          valuePropName="checked"
        >
          <Switch checkedChildren="启用" unCheckedChildren="禁用" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
