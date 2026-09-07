/**
 * IT资产中心 - 资产类型元数据
 * 客户端安全可引入的常量定义（不含服务端模块依赖）
 */

import type { AssetType, AssetCategory } from './types';

export const ASSET_TYPE_META: Record<
  AssetType,
  { label: string; category: AssetCategory; icon: string }
> = {
  physical_device: { label: '物理设备', category: 'infrastructure', icon: 'HddOutlined' },
  virtual_machine: { label: '虚拟机', category: 'infrastructure', icon: 'CloudServerOutlined' },
  container: { label: '容器 / Pod', category: 'infrastructure', icon: 'CodeSandboxOutlined' },
  cluster: { label: '集群', category: 'infrastructure', icon: 'ClusterOutlined' },
  ip_address: { label: 'IP 地址', category: 'network', icon: 'GlobalOutlined' },
  domain: { label: '域名', category: 'network', icon: 'ChromeOutlined' },
  dns_record: { label: 'DNS 记录', category: 'network', icon: 'FileTextOutlined' },
  ssl_certificate: { label: 'SSL 证书', category: 'network', icon: 'SafetyCertificateOutlined' },
  security_group: { label: '安全组', category: 'network', icon: 'SecurityScanOutlined' },
  database: { label: '数据库', category: 'data', icon: 'DatabaseOutlined' },
  storage: { label: '存储系统', category: 'data', icon: 'FolderOpenOutlined' },
  backup: { label: '备份系统', category: 'data', icon: 'CloudUploadOutlined' },
  web_server: { label: 'Web 服务器', category: 'application', icon: 'DeploymentUnitOutlined' },
  web_app: { label: 'Web 应用', category: 'application', icon: 'AppstoreOutlined' },
  middleware: { label: '中间件', category: 'application', icon: 'ToolOutlined' },
  api_gateway: { label: 'API 网关', category: 'application', icon: 'GatewayOutlined' },
  load_balancer: { label: '负载均衡', category: 'application', icon: 'BlockOutlined' },
  microservice: { label: '微服务', category: 'application', icon: 'NodeIndexOutlined' },
  operating_system: { label: '操作系统', category: 'software', icon: 'DesktopOutlined' },
  runtime: { label: '运行时', category: 'software', icon: 'CodeOutlined' },
  software_package: { label: '软件包', category: 'software', icon: 'AppstoreOutlined' },
  monitoring: { label: '监控系统', category: 'operations', icon: 'LineChartOutlined' },
  logging: { label: '日志系统', category: 'operations', icon: 'ProfileOutlined' },
  pipeline: { label: 'CI/CD 流水线', category: 'operations', icon: 'BranchesOutlined' },
  code_repository: { label: '代码仓库', category: 'operations', icon: 'GitlabOutlined' },
  ops_access_control: { label: '运维访问控制', category: 'operations', icon: 'SafetyOutlined' },
  third_party_service: { label: '第三方服务', category: 'external', icon: 'CloudOutlined' },
  external_api: { label: '外部接口', category: 'external', icon: 'ApiOutlined' },
  data_source: { label: '数据采集源', category: 'governance', icon: 'DatabaseOutlined' },
  web_site_monitor: { label: 'Web站点监控', category: 'operations', icon: 'EyeOutlined' },
  port_monitor: { label: '端口监控', category: 'operations', icon: 'ApiOutlined' },
};

import type { MiddlewareName } from './types';

export const MIDDLEWARE_NAME_META: Record<MiddlewareName, { label: string; icon: string }> = {
  redis: { label: 'Redis 缓存', icon: 'ThunderboltOutlined' },
  memcached: { label: 'Memcached', icon: 'ThunderboltOutlined' },
  rabbitmq: { label: 'RabbitMQ', icon: 'SwapOutlined' },
  kafka: { label: 'Kafka', icon: 'SwapOutlined' },
  rocketmq: { label: 'RocketMQ', icon: 'SwapOutlined' },
  activemq: { label: 'ActiveMQ', icon: 'SwapOutlined' },
  nacos: { label: 'Nacos', icon: 'ClusterOutlined' },
  consul: { label: 'Consul', icon: 'ClusterOutlined' },
  etcd: { label: 'etcd', icon: 'ClusterOutlined' },
  zookeeper: { label: 'ZooKeeper', icon: 'ClusterOutlined' },
  tomcat: { label: 'Tomcat', icon: 'DeploymentUnitOutlined' },
  jetty: { label: 'Jetty', icon: 'DeploymentUnitOutlined' },
  weblogic: { label: 'WebLogic', icon: 'DeploymentUnitOutlined' },
  websphere: { label: 'WebSphere', icon: 'DeploymentUnitOutlined' },
  solr: { label: 'Solr', icon: 'SearchOutlined' },
  elasticsearch: { label: 'Elasticsearch', icon: 'SearchOutlined' },
};

export const CATEGORY_LABELS: Record<AssetCategory, string> = {
  infrastructure: '基础设施层',
  network: '网络层',
  data: '数据层',
  application: '应用层',
  software: '软件层',
  operations: '运维支撑层',
  external: '外部依赖层',
  governance: '数据治理层',
};

/**
 * 资产状态标签
 */
export const STATUS_LABELS: Record<string, string> = {
  active: '活跃',
  inactive: '停用',
  unknown: '未知',
  faulty: '故障',
  idle: '闲置',
  planning: '规划中',
};

/**
 * 物理设备字段中文标签映射（对应中台API字段）
 */
export const PHYSICAL_DEVICE_FIELD_LABELS: Record<string, string> = {
  id: '唯一标识',
  system_id: '信息系统唯一标识',
  asset_type: '资产类型',
  category: '所属分层',
  name: '设备名称',
  code: '设备唯一标识',
  status: '运行状态',
  device_type: '设备类型',
  brand: '品牌',
  model: '规格型号',
  sn: '设备序列号',
  ip_address: 'IP地址',
  management_ip: '带外管理地址',
  manufacturer: '生产厂家',
  warranty_expiry: '维保到期时间',
  department: '所属单位',
  owner: '负责人',
  owner_employee_id: '负责人工号',
  system_name: '信息系统名称',
  description: '备注',
  remark: '备注',
  created_at: '创建时间',
  updated_at: '更新时间',
};

/**
 * Web 服务器抽象字段中文标签映射
 */
export const WEB_SERVER_FIELD_LABELS: Record<string, string> = {
  id: '唯一标识',
  system_id: '信息系统唯一标识',
  asset_type: '资产类型',
  category: '所属分层',
  name: '服务器名称',
  code: '服务器编码',
  status: '运行状态',
  server_type: 'Web服务器类型',
  ip_address: 'IP地址',
  purpose: '用途',
  description: '备注',
  created_at: '创建时间',
  updated_at: '更新时间',
};

/**
 * Web 服务器 provider 扩展字段中文标签映射（存放在 metadata 中）
 */
export const WEB_SERVER_METADATA_LABELS: Record<string, string> = {
  version: '版本',
  listen_ports: '监听端口',
  source: '来源',
  config_file: '配置文件',
  physical_addr: '物理地址',
  virtual_addr: '虚拟地址',
  hostname: '主机名',
  protocol: '协议',
  port: '端口',
  pid: 'PID',
};

/**
 * Web 应用抽象字段中文标签映射
 */
export const WEB_APP_FIELD_LABELS: Record<string, string> = {
  id: '唯一标识',
  system_id: '信息系统唯一标识',
  asset_type: '资产类型',
  category: '所属分层',
  name: '应用名称',
  code: '应用编码',
  status: '运行状态',
  ip_address: 'IP地址',
  server_type: 'Web服务器类型',
  app_name: '应用名称',
  app_version: '应用版本',
  description: '备注',
  created_at: '创建时间',
  updated_at: '更新时间',
};

/**
 * Web 应用 provider 扩展字段中文标签映射（存放在 metadata 中）
 */
export const WEB_APP_METADATA_LABELS: Record<string, string> = {
  agent_id: 'AgentID',
  source: '来源',
  timestamp: '时间戳',
  physical_addr: '物理地址',
  virtual_addr: '虚拟地址',
  hostname: '主机名',
  protocol: '协议',
  port: '端口',
  pid: 'PID',
};

/**
 * 第三方服务抽象字段中文标签映射
 */
export const THIRD_PARTY_SERVICE_FIELD_LABELS: Record<string, string> = {
  id: '唯一标识',
  system_id: '信息系统唯一标识',
  asset_type: '资产类型',
  category: '所属分层',
  name: '服务名称',
  code: '服务编码',
  status: '运行状态',
  service_type: '服务类型',
  provider: '提供方',
  endpoint: '接口地址',
  expiry_date: '到期时间',
  description: '备注',
  created_at: '创建时间',
  updated_at: '更新时间',
};

/**
 * 第三方服务 provider 扩展字段中文标签映射（存放在 metadata 中）
 */
export const THIRD_PARTY_SERVICE_METADATA_LABELS: Record<string, string> = {
  mbid: '模板ID',
  mbmc: '模板名称',
  mbnr: '模板内容',
  lx: '类型',
  tjsj: '提交时间',
};

/**
 * 运维访问控制抽象字段中文标签映射
 */
export const OPS_ACCESS_CONTROL_FIELD_LABELS: Record<string, string> = {
  id: '唯一标识',
  system_id: '信息系统唯一标识',
  asset_type: '资产类型',
  category: '所属分层',
  name: '名称',
  code: '编码',
  status: '运行状态',
  source: '数据来源',
  controller_type: '管控系统类型',
  target_type: '被管控目标类型',
  ip_address: '被管控目标IP地址',
  hostname: '被管控目标主机名',
  access_protocol: '访问协议',
  description: '备注',
  created_at: '创建时间',
  updated_at: '更新时间',
};

/**
 * 运维访问控制 provider 扩展字段中文标签映射（存放在 metadata 中）
 */
export const OPS_ACCESS_CONTROL_METADATA_LABELS: Record<string, string> = {
  account: '纳管账号',
  policy_group: '策略组',
  last_login_time: '最近登录时间',
  password_rotate_days: '改密周期(天)',
  sql_audit: 'SQL审计',
};

/**
 * 虚拟机 provider 扩展字段中文标签映射（存放在 metadata 中）
 */
export const VIRTUAL_MACHINE_METADATA_LABELS: Record<string, string> = {
  system_name: '信息系统名称',
  department: '所属单位',
  department_code: '单位号',
  owner: '负责人',
  owner_employee_id: '负责人工号',
};

/**
 * 数据采集源抽象字段中文标签映射
 */
export const DATA_SOURCE_FIELD_LABELS: Record<string, string> = {
  id: '唯一标识',
  system_id: '信息系统唯一标识',
  asset_type: '资产类型',
  category: '所属分层',
  name: '采集源名称',
  code: '采集源编码',
  status: '运行状态',
  connection_target: '连接目标',
  connection_host: '连接主机',
  connection_port: '连接端口',
  source_type: '技术类型',
  data_category: '业务分类',
  business_system_id: '所属业务系统ID',
  business_system_name: '所属业务系统',
  department: '归属部门',
  technical_owner: '技术负责人',
  last_sync_time: '最后同步时间',
  sync_interval: '同步频率',
  security_level: '安全等级',
  description: '备注',
  created_at: '创建时间',
  updated_at: '更新时间',
};

/**
 * 数据采集源 provider 扩展字段中文标签映射（存放在 metadata 中）
 */
export const DATA_SOURCE_METADATA_LABELS: Record<string, string> = {
  vendor_name: '厂商名称',
  vendor_id: '厂商ID',
  system_developer: '系统开发者',
  system_developer_phone: '系统开发者电话',
  unit_owner: '单位负责人',
  unit_owner_phone: '单位负责人电话',
  data_source_category: '数据源类别',
  icon_path: '图标路径',
  connection_alias: '连接别名',
  enabled: '是否启用',
  deleted: '是否删除',
};

/**
 * Web 站点监控抽象字段中文标签映射
 */
export const WEB_SITE_MONITOR_FIELD_LABELS: Record<string, string> = {
  id: '唯一标识',
  system_id: '信息系统唯一标识',
  asset_type: '资产类型',
  category: '所属分层',
  name: '监控名称',
  code: '监控编码',
  status: '运行状态',
  domain: '目标域名',
  ip: '目标IP地址',
  port: '目标端口',
  path: '目标路径',
  protocol: '监控协议',
  expected_status_code: '期望状态码',
  collection_interval: '采集间隔(秒)',
  source_system: '来源监控系统',
  source_monitor_id: '来源监控任务ID',
  last_check_time: '最近检测时间',
  last_check_status: '最近检测状态',
  description: '备注',
  created_at: '创建时间',
  updated_at: '更新时间',
};

/**
 * 端口监控抽象字段中文标签映射
 */
export const PORT_MONITOR_FIELD_LABELS: Record<string, string> = {
  id: '唯一标识',
  system_id: '信息系统唯一标识',
  asset_type: '资产类型',
  category: '所属分层',
  name: '监控名称',
  code: '监控编码',
  status: '运行状态',
  ip: '目标IP地址',
  port: '目标端口',
  protocol: '传输协议',
  collection_interval: '采集间隔(秒)',
  source_system: '来源监控系统',
  source_monitor_id: '来源监控任务ID',
  last_check_time: '最近检测时间',
  last_check_status: '最近检测状态',
  description: '备注',
  created_at: '创建时间',
  updated_at: '更新时间',
};
