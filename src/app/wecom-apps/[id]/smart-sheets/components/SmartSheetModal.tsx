'use client';

import React, { useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  Modal,
  Form,
  Input,
  Alert,
} from 'antd';

interface SmartSheetModalProps {
  title: string;
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: { docid?: string; doc_name?: string; admin_users?: string[]; create_new?: boolean }) => void;
  type: 'existing' | 'create';
  submitting?: boolean;
}

export interface SmartSheetModalRef {
  getValues: () => Promise<{ docid?: string; doc_name?: string; admin_users?: string[]; create_new?: boolean }>;
  validateFields: () => Promise<{ docid?: string; doc_name?: string; admin_users?: string[]; create_new?: boolean }>;
}

const SmartSheetModal = forwardRef<SmartSheetModalRef, SmartSheetModalProps>(function SmartSheetModal({
  title,
  open,
  onCancel,
  onSubmit,
  type,
  submitting = false,
}, ref) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      form.resetFields();
    }
  }, [open, form]);

  useImperativeHandle(ref, () => ({
    getValues: async () => {
      return form.getFieldsValue();
    },
    validateFields: async () => {
      return await form.validateFields();
    },
  }));

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSubmit({
        ...values,
        admin_users: values.admin_users ? values.admin_users.split(',').map((id: string) => id.trim()).filter(Boolean) : [],
        create_new: type === 'create',
      });
    } catch (error) {
      // 验证失败，不执行提交
    }
  };

  // 添加现有表格的表单
  const existingForm = (
    <>
      <Alert
        title="添加现有表格"
        description="输入DocId后，系统会自动从企业微信获取表格信息"
        type="info"
        style={{ marginBottom: 16 }}
      />

      <Form.Item
        name="docid"
        label="DocId"
        rules={[
          { required: true, message: '请输入DocId' },
          { max: 100, message: 'DocId最多100个字符' },
        ]}
      >
        <Input placeholder="请输入智能表格DocId" disabled={submitting} />
      </Form.Item>
    </>
  );

  // 创建新表格的表单
  const createForm = (
    <>
      <Alert
        title="创建新智能表格"
        description="将在企业微信中创建一个新的智能表格，并自动添加到系统中"
        type="info"
        style={{ marginBottom: 16 }}
      />

      <Form.Item
        name="doc_name"
        label="文档名称"
        rules={[
          { required: true, message: '请输入文档名称' },
          { max: 255, message: '文档名称最多255个字符' },
        ]}
      >
        <Input placeholder="请输入智能表格名称" disabled={submitting} />
      </Form.Item>

      <Form.Item
        name="admin_users"
        label="管理员ID"
        extra="多个管理员请用逗号分隔，如：ZhangSan,LiSi"
      >
        <Input placeholder="请输入管理员UserID，多个用逗号分隔" disabled={submitting} />
      </Form.Item>
    </>
  );

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      okText="确定"
      cancelText="取消"
      width={500}
      confirmLoading={submitting}
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 24 }}
      >
        {type === 'existing' ? existingForm : createForm}
      </Form>
    </Modal>
  );
});

export default SmartSheetModal;
