'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  App,
  Popconfirm,
  Card,
  Typography,
  Steps,
  Radio,
  Alert,
  Table as AntTable,
  Descriptions,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  DatabaseOutlined,
  CodeOutlined,
  FormatPainterOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import type { TableProps } from 'antd';
import Image from 'next/image';

const { Title, Text } = Typography;
const { Option } = Select;

const { TextArea } = Input;

// Database icon component
const DbIcon = ({ type }: { type: string }) => {
  const iconSrc = type === 'mongodb' ? '/mongodb.svg' : '/mysql.svg';
  const alt = type === 'mongodb' ? 'MongoDB' : 'MySQL';
  return (
    <Image
      src={iconSrc}
      alt={alt}
      width={20}
      height={20}
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    />
  );
};

interface DataObject {
  id: number;
  name: string;
  description: string | null;
  data_source_id: string;
  data_source_name?: string;
  data_source_type?: string;
  query_statement: string;
  primary_key: string;
  display_template: string;
  status: number;
  created_at: string;
  updated_at: string;
}

interface DataSource {
  id: string;
  name: string;
  type: 'mysql' | 'mongodb';
}

interface QueryResult {
  display_template: string;
  primary_key: string;
  list: Record<string, unknown>[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export default function DataObjectsPage() {
  const [dataObjects, setDataObjects] = useState<DataObject[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [queryModalVisible, setQueryModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editingDataObject, setEditingDataObject] = useState<DataObject | null>(null);
  const [selectedDataObject, setSelectedDataObject] = useState<DataObject | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewColumns, setPreviewColumns] = useState<{ title: string; dataIndex: string; key: string; ellipsis: boolean }[]>([]);
  const [form] = Form.useForm();
  const { message } = App.useApp();

  // 搜索表单 - 使用useMemo确保只创建一次
  const [searchForm] = Form.useForm();

  useEffect(() => {
    fetchDataObjects();
    fetchDataSources();
  }, []);

  // 当编辑弹窗打开且有编辑对象时，设置表单值
  useEffect(() => {
    if (modalVisible && editingDataObject) {
      form.setFieldsValue({
        name: editingDataObject.name,
        description: editingDataObject.description,
        data_source_id: editingDataObject.data_source_id,
        query_statement: editingDataObject.query_statement,
        primary_key: editingDataObject.primary_key,
        display_template: editingDataObject.display_template,
        status: editingDataObject.status,
      });
    }
  }, [modalVisible, editingDataObject, form]);

  const fetchDataObjects = async (params?: { name?: string; dataSourceId?: string; status?: number }) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (params?.name) queryParams.append('name', params.name);
      if (params?.dataSourceId) queryParams.append('dataSourceId', params.dataSourceId);
      if (params?.status !== undefined) queryParams.append('status', String(params.status));

      const response = await fetch(`/api/data-objects?${queryParams.toString()}`);
      const data = await response.json();
      if (data.success) {
        setDataObjects(data.data.list);
      } else if (response.status === 403) {
        message.error('您没有权限访问数据对象管理');
      } else {
        message.error('获取数据对象列表失败');
      }
    } catch {
      message.error('获取数据对象列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchDataSources = async () => {
    try {
      const response = await fetch('/api/data-sources');
      const data = await response.json();
      if (data.success) {
        setDataSources(data.data);
      }
    } catch {
      console.error('获取数据源列表失败');
    }
  };

  const handleSearch = (values: { name?: string; dataSourceId?: string; status?: number }) => {
    fetchDataObjects(values);
  };

  const handleReset = () => {
    searchForm.resetFields();
    fetchDataObjects();
  };

  const handleAdd = () => {
    setEditingDataObject(null);
    setCurrentStep(0);
    form.resetFields();
    form.setFieldsValue({
      status: 1,
      display_template: '{{id}}',
    });
    setPreviewData([]);
    setPreviewColumns([]);
    setModalVisible(true);
  };

  const handleEdit = (record: DataObject) => {
    setEditingDataObject(record);
    setCurrentStep(0);
    setPreviewData([]);
    setPreviewColumns([]);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/data-objects/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        message.success('删除数据对象成功');
        fetchDataObjects();
      } else {
        message.error(data.message || '删除数据对象失败');
      }
    } catch {
      message.error('删除数据对象失败');
    }
  };

  const handleShowDetail = (record: DataObject) => {
    setSelectedDataObject(record);
    setDetailModalVisible(true);
  };

  const handleQuery = async (record: DataObject) => {
    try {
      setSelectedDataObject(record);
      setQueryModalVisible(true);
      setQueryResult(null);

      const response = await fetch(`/api/data-objects/${record.id}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: 1, pageSize: 20 }),
      });

      const data = await response.json();
      if (data.success) {
        setQueryResult(data.data);
      } else {
        message.error(data.message || '查询失败');
      }
    } catch {
      message.error('查询失败');
    }
  };

  const handlePreviewQuery = async () => {
    const values = form.getFieldsValue();
    if (!values.data_source_id || !values.query_statement) {
      message.warning('请先选择数据源并输入查询语句');
      return;
    }

    try {
      setPreviewLoading(true);
      const response = await fetch(`/api/data-sources/${values.data_source_id}/preview-query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query_statement: values.query_statement }),
      });

      const data = await response.json();
      if (data.success && data.data.length > 0) {
        setPreviewData(data.data);
        // 动态生成列
        const firstRow = data.data[0];
        const columns = Object.keys(firstRow).map((key) => ({
          title: key,
          dataIndex: key,
          key,
          ellipsis: true,
        }));
        setPreviewColumns(columns);

        // 自动设置主键字段建议
        if (!values.primary_key) {
          const commonPkFields = ['id', 'ID', 'Id', '_id', 'uuid', 'code'];
          const foundPk = commonPkFields.find((pk) => Object.keys(firstRow).includes(pk));
          if (foundPk) {
            form.setFieldsValue({ primary_key: foundPk });
          }
        }

        message.success('查询预览成功');
      } else if (data.success) {
        setPreviewData([]);
        setPreviewColumns([]);
        message.info('查询成功，但无数据返回');
      } else {
        message.error(data.message || '查询预览失败');
      }
    } catch {
      message.error('查询预览失败');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleNextStep = async () => {
    try {
      // 根据当前步骤验证相应字段
      let fieldsToValidate: string[] = [];
      
      if (currentStep === 0) {
        fieldsToValidate = ['name', 'data_source_id'];
      } else if (currentStep === 1) {
        fieldsToValidate = ['query_statement', 'primary_key'];
      }

      const values = await form.validateFields(fieldsToValidate);

      if (currentStep === 0) {
        // 步骤1验证：基本信息
        if (!values.name || !values.data_source_id) {
          message.warning('请填写完整的基本信息');
          return;
        }
      } else if (currentStep === 1) {
        // 步骤2验证：查询配置
        if (!values.query_statement || !values.primary_key) {
          message.warning('请配置查询语句和主键字段');
          return;
        }
        // 如果没有预览过数据，提示先预览
        if (previewData.length === 0) {
          message.warning('请先执行查询预览以验证查询语句');
          return;
        }
      }

      setCurrentStep(currentStep + 1);
    } catch {
      // 表单验证失败
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const submitData = {
        ...values,
        status: values.status ?? 1,
      };

      if (editingDataObject) {
        // 编辑模式
        const response = await fetch(`/api/data-objects/${editingDataObject.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData),
        });

        const data = await response.json();
        if (data.success) {
          message.success('更新数据对象成功');
          setModalVisible(false);
          fetchDataObjects();
        } else {
          message.error(data.message || '更新数据对象失败');
        }
      } else {
        // 新增模式
        const response = await fetch('/api/data-objects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData),
        });

        const data = await response.json();
        if (data.success) {
          message.success('创建数据对象成功');
          setModalVisible(false);
          fetchDataObjects();
        } else {
          message.error(data.message || '创建数据对象失败');
        }
      }
    } catch {
      message.error('操作失败');
    }
  };

  // 获取字段建议
  const getFieldSuggestions = () => {
    if (previewData.length === 0) return [];
    const firstRow = previewData[0];
    return Object.keys(firstRow);
  };

  // 渲染模板预览
  const renderTemplatePreview = () => {
    const template = form.getFieldValue('display_template') || '{{id}}';
    if (previewData.length === 0) return null;

    return (
      <div style={{ marginTop: 16 }}>
        <Text type="secondary">模板预览效果：</Text>
        <div style={{ marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
          {previewData.slice(0, 3).map((row, index) => {
            let display = template;
            Object.keys(row).forEach((key) => {
              display = display.replace(new RegExp(`{{${key}}}`, 'g'), String(row[key] ?? ''));
            });
            return (
              <div key={index} style={{ marginBottom: 4 }}>
                <Tag color="blue">{display}</Tag>
              </div>
            );
          })}
          {previewData.length > 3 && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              还有 {previewData.length - 3} 条...
            </Text>
          )}
        </div>
      </div>
    );
  };

  const columns: TableProps<DataObject>['columns'] = [
    {
      title: '数据对象名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string, record: DataObject) => (
        <Button type="link" onClick={() => handleShowDetail(record)} style={{ padding: 0 }}>
          {name}
        </Button>
      ),
    },
    {
      title: '数据源',
      key: 'data_source',
      width: 220,
      render: (_, record: DataObject) => (
        <Space>
          {record.data_source_type && <DbIcon type={record.data_source_type} />}
          <span>{record.data_source_name || '-'}</span>
        </Space>
      ),
    },
    {
      title: '主键字段',
      dataIndex: 'primary_key',
      key: 'primary_key',
      width: 120,
    },
    {
      title: '显示模板',
      dataIndex: 'display_template',
      key: 'display_template',
      width: 200,
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: number) => (
        <Tag color={status === 1 ? 'green' : 'red'}>{status === 1 ? '启用' : '禁用'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => handleQuery(record)}>
            查询
          </Button>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定删除此数据对象？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 步骤1：基本信息
  const renderStep1 = () => (
    <>
      <Form.Item
        name="name"
        label="数据对象名称"
        rules={[{ required: true, message: '请输入数据对象名称' }]}
      >
        <Input placeholder="请输入数据对象名称" />
      </Form.Item>

      <Form.Item name="description" label="描述">
        <TextArea placeholder="请输入数据对象描述" rows={3} />
      </Form.Item>

      <Form.Item
        name="data_source_id"
        label="数据源"
        rules={[{ required: true, message: '请选择数据源' }]}
      >
        <Select placeholder="请选择数据源" disabled={!!editingDataObject}>
          {dataSources.map((ds) => (
            <Option key={ds.id} value={ds.id}>
              {ds.name} ({ds.type.toUpperCase()})
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item name="status" label="状态" initialValue={1}>
        <Radio.Group>
          <Radio value={1}>启用</Radio>
          <Radio value={0}>禁用</Radio>
        </Radio.Group>
      </Form.Item>
    </>
  );

  // 步骤2：配置查询
  const renderStep2 = () => (
    <>
      <Alert
        title="查询语句说明"
        description={
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            <li>MySQL：请输入完整的SELECT查询语句</li>
            <li>MongoDB：请输入集合名称或聚合管道，如 db.users.find() 或 db.users.aggregate([...])</li>
            <li>建议先点击&quot;查询预览&quot;按钮验证查询语句是否正确</li>
          </ul>
        }
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form.Item
        name="query_statement"
        label="查询语句"
        rules={[{ required: true, message: '请输入查询语句' }]}
      >
        <TextArea
          placeholder={
            form.getFieldValue('data_source_id')
              ? dataSources.find((ds) => ds.id === form.getFieldValue('data_source_id'))?.type ===
                'mysql'
                ? "SELECT * FROM users WHERE status = 'active'"
                : 'db.users.find({status: "active"})'
              : '请先选择数据源'
          }
          rows={4}
          disabled={!form.getFieldValue('data_source_id')}
        />
      </Form.Item>

      <Form.Item>
        <Button
          type="dashed"
          icon={<PlayCircleOutlined />}
          onClick={handlePreviewQuery}
          loading={previewLoading}
          disabled={!form.getFieldValue('data_source_id')}
        >
          查询预览
        </Button>
      </Form.Item>

      {previewData.length > 0 && (
        <>
          <Alert title="查询预览结果（前10条）" type="success" showIcon style={{ marginBottom: 16 }} />
          <AntTable
            dataSource={previewData}
            columns={previewColumns}
            pagination={false}
            size="small"
            scroll={{ x: 'max-content' }}
            style={{ marginBottom: 16 }}
            rowKey={(record) => {
              // 尝试使用常见的id字段，如果没有则使用JSON字符串
              const id = (record.id ?? record._id ?? record.ID ?? record.uuid ?? JSON.stringify(record)) as string;
              return String(id);
            }}
          />
        </>
      )}

      <Form.Item
        name="primary_key"
        label="主键字段"
        rules={[{ required: true, message: '请输入主键字段名' }]}
        help="用于唯一标识每条记录的字段名"
      >
        <Select
          placeholder="请选择或输入主键字段"
          showSearch
          allowClear
          options={getFieldSuggestions().map((field) => ({ label: field, value: field }))}
        />
      </Form.Item>
    </>
  );

  // 步骤3：设置模板
  const renderStep3 = () => (
    <>
      <Alert
        title="显示模板说明"
        description={
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            <li>使用 {'{{字段名}}'} 语法插入字段值</li>
            <li>示例：{'{{name}}({{gender}})'} 将渲染为 &quot;张三(男)&quot;</li>
            <li>默认模板为 {'{{id}}'}</li>
          </ul>
        }
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form.Item
        name="display_template"
        label="显示模板"
        rules={[{ required: true, message: '请输入显示模板' }]}
        initialValue="{{id}}"
      >
        <Input placeholder="如：{{name}}({{email}})" />
      </Form.Item>

      {renderTemplatePreview()}

      {previewData.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">可用字段：</Text>
          <div style={{ marginTop: 8 }}>
            {getFieldSuggestions().map((field) => (
              <Tag
                key={field}
                style={{ cursor: 'pointer', marginBottom: 4 }}
                onClick={() => {
                  const currentTemplate = form.getFieldValue('display_template') || '';
                  const newTemplate = currentTemplate
                    ? `${currentTemplate} {{${field}}}`
                    : `{{${field}}}`;
                  form.setFieldsValue({ display_template: newTemplate });
                }}
              >
                {field}
              </Tag>
            ))}
          </div>
        </div>
      )}
    </>
  );

  const steps = [
    {
      title: '基本信息',
      icon: <DatabaseOutlined />,
    },
    {
      title: '配置查询',
      icon: <CodeOutlined />,
    },
    {
      title: '设置模板',
      icon: <FormatPainterOutlined />,
    },
  ];

  return (
    <div>
      <Card
        title={<Title level={4} style={{ margin: 0 }}>数据对象管理</Title>}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            创建数据对象
          </Button>
        }
      >
        {/* 搜索区域 */}
        <Form
          form={searchForm}
          layout="inline"
          onFinish={handleSearch}
          style={{ marginBottom: 24 }}
        >
          <Form.Item name="name" label="名称">
            <Input placeholder="请输入名称" allowClear prefix={<SearchOutlined />} />
          </Form.Item>
          <Form.Item name="dataSourceId" label="数据源">
            <Select placeholder="请选择数据源" allowClear style={{ width: 180 }}>
              {dataSources.map((ds) => (
                <Option key={ds.id} value={ds.id}>
                  {ds.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select placeholder="请选择状态" allowClear style={{ width: 120 }}>
              <Option value={1}>启用</Option>
              <Option value={0}>禁用</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                搜索
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </Form.Item>
        </Form>

        <Table
          columns={columns}
          dataSource={dataObjects}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 900 }}
        />
      </Card>

      {/* 创建/编辑弹窗 */}
      <Modal
        title={editingDataObject ? '编辑数据对象' : '创建数据对象'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
        destroyOnHidden
      >
        <Steps
          current={currentStep}
          style={{ marginBottom: 24 }}
          items={steps.map((step) => ({ title: step.title, icon: step.icon }))}
        />

        {modalVisible && (
          <Form form={form} layout="vertical" preserve={false}>
            <div style={{ minHeight: 300 }}>
              {/* 所有步骤的字段都渲染，但根据当前步骤显示/隐藏 */}
              <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>{renderStep1()}</div>
              <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>{renderStep2()}</div>
              <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>{renderStep3()}</div>
            </div>

            <div style={{ textAlign: 'right', marginTop: 24 }}>
              <Space>
                {currentStep > 0 && <Button onClick={handlePrevStep}>上一步</Button>}
                {currentStep < steps.length - 1 && (
                  <Button type="primary" onClick={handleNextStep}>
                    下一步
                  </Button>
                )}
                {currentStep === steps.length - 1 && (
                  <Button type="primary" onClick={handleSubmit}>
                    {editingDataObject ? '更新' : '创建'}
                  </Button>
                )}
                <Button onClick={() => setModalVisible(false)}>取消</Button>
              </Space>
            </div>
          </Form>
        )}
      </Modal>

      {/* 查询结果弹窗 */}
      <Modal
        title={`查询数据 - ${selectedDataObject?.name || ''}`}
        open={queryModalVisible}
        onCancel={() => setQueryModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setQueryModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={900}
      >
        {queryResult ? (
          <>
            <Alert
              title={`显示模板: ${queryResult.display_template} | 主键字段: ${queryResult.primary_key}`}
              type="info"
              style={{ marginBottom: 16 }}
            />
            <AntTable
              dataSource={queryResult.list}
              columns={
                queryResult.list.length > 0
                  ? Object.keys(queryResult.list[0])
                      .filter((key) => !key.startsWith('_'))
                      .map((key) => ({
                        title: key,
                        dataIndex: key,
                        key,
                        ellipsis: true,
                      }))
                  : []
              }
              rowKey={(record) => {
                const pkValue = record[queryResult.primary_key];
                return pkValue !== undefined ? String(pkValue) : JSON.stringify(record);
              }}
              pagination={{
                pageSize: queryResult.pagination.pageSize,
                total: queryResult.pagination.total,
              }}
              scroll={{ x: 'max-content' }}
            />
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Text type="secondary">正在查询...</Text>
          </div>
        )}
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title="数据对象详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={600}
      >
        {selectedDataObject && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="ID">{selectedDataObject.id}</Descriptions.Item>
            <Descriptions.Item label="名称">{selectedDataObject.name}</Descriptions.Item>
            <Descriptions.Item label="描述">
              {selectedDataObject.description || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="数据源">
              {selectedDataObject.data_source_name || '-'} (
              {selectedDataObject.data_source_type?.toUpperCase() || '-'})
            </Descriptions.Item>
            <Descriptions.Item label="查询语句">
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {selectedDataObject.query_statement}
              </pre>
            </Descriptions.Item>
            <Descriptions.Item label="主键字段">{selectedDataObject.primary_key}</Descriptions.Item>
            <Descriptions.Item label="显示模板">
              <code>{selectedDataObject.display_template}</code>
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={selectedDataObject.status === 1 ? 'green' : 'red'}>
                {selectedDataObject.status === 1 ? '启用' : '禁用'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {new Date(selectedDataObject.created_at).toLocaleString('zh-CN')}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {new Date(selectedDataObject.updated_at).toLocaleString('zh-CN')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
