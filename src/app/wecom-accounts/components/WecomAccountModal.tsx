'use client';

import React, { useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Switch,
} from 'antd';
import { App } from 'antd';

const { TextArea } = Input;

interface WecomAccountModalProps {
  title: string;
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  initialValues?: WecomAccountItem | null;
}

interface WecomAccountItem {
  id: number;
  name: string;
  corp_id: string;
  corp_secret: string | null;
  description: string | null;
  status: number;
}

export default function WecomAccountModal({
  title,
  open,
  onCancel,
  onSuccess,
  initialValues,
}: WecomAccountModalProps) {
  const [form] = Form.useForm();
  const { message } = App.useApp();

  useEffect(() => {
    if (open) {
      if (initialValues) {
        form.setFieldsValue({
          name: initialValues.name,
          corp_id: initialValues.corp_id,
          corp_secret: initialValues.corp_secret,
          description: initialValues.description,
          status: initialValues.status === 1,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ status: true });
      }
    }
  }, [open, initialValues, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const submitData = {
        name: values.name,
        corp_id: values.corp_id,
        corp_secret: values.corp_secret,
        description: values.description,
        status: values.status ? 1 : 0,
      };

      const url = initialValues ? `/api/wecom-accounts/${initialValues.id}` : '/api/wecom-accounts';
      const method = initialValues ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (data.success) {
        message.success(initialValues ? '账号更新成功' : '账号创建成功');
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
          name="name"
          label="账号名称"
          rules={[
            { required: true, message: '请输入账号名称' },
            { max: 100, message: '账号名称最多100个字符' },
          ]}
        >
          <Input placeholder="请输入账号名称" />
        </Form.Item>

        <Form.Item
          name="corp_id"
          label="CorpId"
          rules={[
            { required: true, message: '请输入CorpId' },
            { max: 100, message: 'CorpId最多100个字符' },
          ]}
        >
          <Input placeholder="请输入企业微信CorpId" />
        </Form.Item>

        <Form.Item
          name="corp_secret"
          label="CorpSecret"
        >
          <Input.Password placeholder="请输入企业微信CorpSecret（可选）" />
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
