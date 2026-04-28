'use client';

import React, { useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Alert,
} from 'antd';

interface CreateSheetModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: { title: string }) => void;
  submitting?: boolean;
}

export default function CreateSheetModal({
  open,
  onCancel,
  onSubmit,
  submitting = false,
}: CreateSheetModalProps) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      form.resetFields();
    }
  }, [open, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSubmit(values);
    } catch (error) {
      // 验证失败，不执行提交
    }
  };

  return (
    <Modal
      title="新建工作表"
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
        <Alert
          title="新建工作表"
          description="将在当前智能表格中创建一个新的智能表"
          type="info"
          style={{ marginBottom: 16 }}
        />

        <Form.Item
          name="title"
          label="工作表名称"
          rules={[
            { required: true, message: '请输入工作表名称' },
            { max: 100, message: '工作表名称最多100个字符' },
          ]}
        >
          <Input placeholder="请输入工作表名称" disabled={submitting} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
