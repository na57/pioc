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
  Alert,
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
  const [errorInfo, setErrorInfo] = React.useState<{ message: string; suggestion?: string } | null>(null);
  const isEdit = !!initialValues;

  useEffect(() => {
    if (open) {
      setErrorInfo(null);
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
      setErrorInfo(null);
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
        // 显示详细的错误信息
        setErrorInfo({
          message: data.message || (isEdit ? '更新标签失败' : '创建标签失败'),
          suggestion: data.suggestion,
        });
        
        // 如果是编码重复错误，高亮编码字段
        if (data.message?.includes('编码') && data.message?.includes('已存在')) {
          form.setFields([
            {
              name: 'code',
              errors: [data.message],
            },
          ]);
        }
      }
    } catch (error) {
      console.error('提交失败:', error);
      setErrorInfo({
        message: '网络错误，请检查网络连接后重试',
      });
    }
  };

  const handleCancel = () => {
    setErrorInfo(null);
    onCancel();
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={handleCancel}
      onOk={handleSubmit}
      width={560}
      destroyOnClose
    >
      {errorInfo && (
        <Alert
          message={errorInfo.message}
          description={errorInfo.suggestion}
          type="error"
          showIcon
          closable
          onClose={() => setErrorInfo(null)}
          style={{ marginBottom: 16, marginTop: 16 }}
        />
      )}
      <Form
        form={form}
        layout="horizontal"
        labelCol={{ span: 4 }}
        wrapperCol={{ span: 20 }}
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
          extra="编码唯一，创建后不可修改"
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
