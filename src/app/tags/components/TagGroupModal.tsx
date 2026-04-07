'use client';

import React, { useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  ColorPicker,
  InputNumber,
  Radio,
  message,
} from 'antd';

const { TextArea } = Input;

interface TagGroup {
  id: number;
  name: string;
  code: string;
  description: string | null;
  color: string | null;
  sort_order: number;
  status: number;
}

interface TagGroupModalProps {
  title: string;
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  initialValues: TagGroup | null;
}

export default function TagGroupModal({
  title,
  open,
  onCancel,
  onSuccess,
  initialValues,
}: TagGroupModalProps) {
  const [form] = Form.useForm();
  const isEdit = !!initialValues;

  useEffect(() => {
    if (open) {
      if (initialValues) {
        form.setFieldsValue({
          name: initialValues.name,
          code: initialValues.code,
          description: initialValues.description,
          color: initialValues.color,
          sort_order: initialValues.sort_order,
          status: initialValues.status,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          status: 1,
          sort_order: 0,
        });
      }
    }
  }, [open, initialValues, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const url = isEdit ? `/api/tag-groups/${initialValues.id}` : '/api/tag-groups';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          color: values.color ? (typeof values.color === 'string' ? values.color : values.color?.toHexString?.()) : null,
        }),
      });

      const data = await response.json();
      if (data.success) {
        message.success(isEdit ? '分组更新成功' : '分组创建成功');
        onSuccess();
      } else {
        message.error(data.message || (isEdit ? '更新分组失败' : '创建分组失败'));
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
      width={560}
      destroyOnClose
    >
      <Form
        form={form}
        layout="horizontal"
        labelCol={{ span: 4 }}
        wrapperCol={{ span: 20 }}
        style={{ marginTop: 16 }}
      >
        <Form.Item
          name="name"
          label="分组名称"
          rules={[{ required: true, message: '请输入分组名称' }]}
        >
          <Input placeholder="请输入分组名称" maxLength={100} showCount />
        </Form.Item>

        <Form.Item
          name="code"
          label="分组编码"
          rules={[
            { required: true, message: '请输入分组编码' },
            { pattern: /^[a-zA-Z0-9_]+$/, message: '编码只能包含字母、数字和下划线' },
          ]}
        >
          <Input placeholder="请输入分组编码" maxLength={50} showCount disabled={isEdit} />
        </Form.Item>

        <Form.Item name="color" label="分组颜色">
          <ColorPicker showText allowClear />
        </Form.Item>

        <Form.Item name="sort_order" label="排序顺序">
          <InputNumber min={0} style={{ width: '100%' }} placeholder="数字越小越靠前" />
        </Form.Item>

        <Form.Item name="description" label="分组描述">
          <TextArea rows={3} placeholder="请输入分组描述" maxLength={500} showCount />
        </Form.Item>

        <Form.Item name="status" label="状态">
          <Radio.Group>
            <Radio value={1}>启用</Radio>
            <Radio value={0}>禁用</Radio>
          </Radio.Group>
        </Form.Item>
      </Form>
    </Modal>
  );
}
