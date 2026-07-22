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
  network_device: { label: '网络设备', category: 'infrastructure', icon: 'ApartmentOutlined' },
  ip_address: { label: 'IP 地址', category: 'network', icon: 'GlobalOutlined' },
  domain: { label: '域名', category: 'network', icon: 'ChromeOutlined' },
  dns_record: { label: 'DNS 记录', category: 'network', icon: 'FileTextOutlined' },
  ssl_certificate: { label: 'SSL 证书', category: 'network', icon: 'SafetyCertificateOutlined' },
  security_group: { label: '安全组', category: 'network', icon: 'SecurityScanOutlined' },
  database: { label: '数据库', category: 'data', icon: 'DatabaseOutlined' },
  storage: { label: '存储系统', category: 'data', icon: 'FolderOpenOutlined' },
  backup: { label: '备份系统', category: 'data', icon: 'CloudUploadOutlined' },
  web_server: { label: 'Web 服务器', category: 'application', icon: 'DeploymentUnitOutlined' },
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
  third_party_service: { label: '第三方服务', category: 'external', icon: 'CloudOutlined' },
  external_api: { label: '外部接口', category: 'external', icon: 'ApiOutlined' },
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
};
