'use client';

import React, { useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  ColorPicker,
  Checkbox,
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

interface TagItem {
  id: number;
  name: string;
  code: string;
  color: string;
  description: string | null;
  status: number;
  groups: { id: number; name: string }[];
}

interface TagModalProps {
  title: string;
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  initialValues: TagItem | null;
  groups: TagGroup[];
}

export default function TagModal({
  title,
  open,
  onCancel,
  onSuccess,
  initialValues,
  groups,
}: TagModalProps) {
  const [form] = Form.useForm();
  const isEdit = !!initialValues;

  useEffect(() => {
    if (open) {
      if (initialValues) {
        form.setFieldsValue({
          name: initialValues.name,
          code: initialValues.code,
          color: initialValues.color,
          description: initialValues.description,
          status: initialValues.status,
          group_ids: initialValues.groups?.map(g => g.id) || [],
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          color: '#1890ff',
          status: 1,
          group_ids: [],
        });
      }
    }
  }, [open, initialValues, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const url = isEdit ? `/api/tags/${initialValues.id}` : '/api/tags';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          color: typeof values.color === 'string' ? values.color : values.color?.toHexString?.() || '#1890ff',
        }),
      });

      const data = await response.json();
      if (data.success) {
        message.success(isEdit ? '标签更新成功' : '标签创建成功');
        onSuccess();
      } else {
        message.error(data.message || (isEdit ? '更新标签失败' : '创建标签失败'));
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
          label="标签名称"
          rules={[{ required: true, message: '请输入标签名称' }]}
        >
          <Input placeholder="请输入标签名称" maxLength={100} showCount />
        </Form.Item>

        <Form.Item
          name="code"
          label="标签编码"
          rules={[
            { required: true, message: '请输入标签编码' },
            { pattern: /^[a-zA-Z0-9_]+$/, message: '编码只能包含字母、数字和下划线' },
          ]}
        >
          <Input placeholder="请输入标签编码" maxLength={50} showCount disabled={isEdit} />
        </Form.Item>

        <Form.Item
          name="color"
          label="标签颜色"
          rules={[{ required: true, message: '请选择标签颜色' }]}
        >
          <ColorPicker showText />
        </Form.Item>

        <Form.Item name="group_ids" label="所属分组">
          <Checkbox.Group options={groups.map(g => ({ label: g.name, value: g.id }))} />
        </Form.Item>

        <Form.Item name="description" label="标签描述">
          <TextArea rows={3} placeholder="请输入标签描述" maxLength={500} showCount />
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
