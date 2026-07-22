/**
 * IT资产中心 - 类型定义
 * 定义 IItAssetDataProvider 接口和所有相关类型
 */

// ============================================
// 基础枚举与类型
// ============================================

/**
 * 系统状态
 */
export type InformationSystemStatus = 'running' | 'stopped' | 'deprecated' | 'planning';

/**
 * 系统等级
 */
export type InformationSystemLevel = 'core' | 'important' | 'general';

/**
 * 资产状态
 */
export type AssetStatus = 'active' | 'inactive' | 'unknown';

/**
 * 资产类型
 */
export type AssetType =
  | 'physical_device'
  | 'virtual_machine'
  | 'container'
  | 'cluster'
  | 'network_device'
  | 'ip_address'
  | 'domain'
  | 'dns_record'
  | 'ssl_certificate'
  | 'security_group'
  | 'database'
  | 'storage'
  | 'backup'
  | 'web_server'
  | 'middleware'
  | 'api_gateway'
  | 'load_balancer'
  | 'microservice'
  | 'operating_system'
  | 'runtime'
  | 'software_package'
  | 'monitoring'
  | 'logging'
  | 'pipeline'
  | 'code_repository'
  | 'third_party_service'
  | 'external_api';

/**
 * 中间件名称枚举
 * 通过名称字段区分不同类型的中间件
 */
export type MiddlewareName =
  | 'redis'
  | 'memcached'
  | 'rabbitmq'
  | 'kafka'
  | 'rocketmq'
  | 'activemq'
  | 'nacos'
  | 'consul'
  | 'etcd'
  | 'zookeeper'
  | 'tomcat'
  | 'jetty'
  | 'weblogic'
  | 'websphere'
  | 'solr'
  | 'elasticsearch';

/**
 * 资产类型分组
 */
export type AssetCategory =
  | 'infrastructure'
  | 'network'
  | 'data'
  | 'application'
  | 'software'
  | 'operations'
  | 'external';

// ============================================
// 信息系统
// ============================================

/**
 * 信息系统
 */
export interface InformationSystem {
  id: string;
  code: string;
  name: string;
  description?: string;
  owner?: string;
  owner_department?: string;
  status: InformationSystemStatus;
  level?: InformationSystemLevel;
  created_at: string;
  updated_at: string;
}

// ============================================
// IT 资产基础类型
// ============================================

/**
 * 通用资产基类
 */
export interface ITAssetBase {
  id: string;
  system_id: string;
  asset_type: AssetType;
  category: AssetCategory;
  name: string;
  code?: string;
  status: AssetStatus;
  description?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * 基础设施层资产
 */
export interface PhysicalDevice extends ITAssetBase {
  asset_type: 'physical_device';
  brand?: string;
  model?: string;
  sn?: string;
  room?: string;
  cabinet?: string;
  cpu?: string;
  memory?: string;
  disk?: string;
}

export interface VirtualMachine extends ITAssetBase {
  asset_type: 'virtual_machine';
  host?: string;
  cpu?: number;
  memory_gb?: number;
  disk_gb?: number;
  ip?: string;
  os?: string;
  hypervisor?: string;
  physical_device_id?: string;
}

export interface Container extends ITAssetBase {
  asset_type: 'container';
  image?: string;
  namespace?: string;
  replicas?: number;
  cluster_id?: string;
}

export interface Cluster extends ITAssetBase {
  asset_type: 'cluster';
  cluster_type?: string;
  node_count?: number;
  version?: string;
}

export interface NetworkDevice extends ITAssetBase {
  asset_type: 'network_device';
  device_type?: string;
  management_ip?: string;
  brand?: string;
  location?: string;
}

// ============================================
// 网络层资产
// ============================================

export interface IPAddress extends ITAssetBase {
  asset_type: 'ip_address';
  ip: string;
  ip_type?: 'public' | 'private';
  subnet?: string;
  allocation_status?: string;
}

export interface Domain extends ITAssetBase {
  asset_type: 'domain';
  domain: string;
  record_count?: number;
  ssl_certificate_id?: string;
  ip_address_id?: string;
}

export interface DNSRecord extends ITAssetBase {
  asset_type: 'dns_record';
  domain_id?: string;
  record_type?: string;
  host_record?: string;
  record_value?: string;
  ttl?: number;
}

export interface SSLCertificate extends ITAssetBase {
  asset_type: 'ssl_certificate';
  domain?: string;
  issuer?: string;
  valid_from?: string;
  valid_to?: string;
  days_until_expiry?: number;
}

export interface SecurityGroup extends ITAssetBase {
  asset_type: 'security_group';
  direction?: 'inbound' | 'outbound';
  protocol?: string;
  port?: string;
  source?: string;
  destination?: string;
}

// ============================================
// 数据层资产
// ============================================

export interface Database extends ITAssetBase {
  asset_type: 'database';
  db_type?: string;
  version?: string;
  host?: string;
  port?: number;
  charset?: string;
  instance_name?: string;
}

export interface Storage extends ITAssetBase {
  asset_type: 'storage';
  storage_type?: string;
  capacity_gb?: number;
  protocol?: string;
  mount_point?: string;
}

export interface Backup extends ITAssetBase {
  asset_type: 'backup';
  target?: string;
  strategy?: string;
  retention_days?: number;
  last_backup_at?: string;
}

// ============================================
// 应用层资产
// ============================================

export interface WebServer extends ITAssetBase {
  asset_type: 'web_server';
  server_type?: string;
  version?: string;
  listen_ports?: number[];
  config_file?: string;
}

export interface Middleware extends ITAssetBase {
  asset_type: 'middleware';
  middleware_name: MiddlewareName;
  version?: string;
  host?: string;
  port?: number;
  node_count?: number;
  capacity_mb?: number;
  mode?: 'standalone' | 'cluster' | 'sentinel';
  topics?: string[];
}

export interface APIGateway extends ITAssetBase {
  asset_type: 'api_gateway';
  gateway_type?: string;
  route_count?: number;
  backend_services?: string[];
}

export interface LoadBalancer extends ITAssetBase {
  asset_type: 'load_balancer';
  lb_type?: string;
  vip?: string;
  backend_nodes?: string[];
}

export interface Microservice extends ITAssetBase {
  asset_type: 'microservice';
  service_name?: string;
  version?: string;
  owner?: string;
  interface_count?: number;
  dependencies?: string[];
}

// ============================================
// 软件层资产
// ============================================

export interface OperatingSystem extends ITAssetBase {
  asset_type: 'operating_system';
  os_type?: string;
  version?: string;
  architecture?: string;
  patch_level?: string;
}

export interface Runtime extends ITAssetBase {
  asset_type: 'runtime';
  runtime_type?: string;
  version?: string;
  install_path?: string;
}

export interface SoftwarePackage extends ITAssetBase {
  asset_type: 'software_package';
  package_type?: string;
  version?: string;
  purpose?: string;
}

// ============================================
// 运维支撑层资产
// ============================================

export interface Monitoring extends ITAssetBase {
  asset_type: 'monitoring';
  monitor_type?: string;
  scope?: string;
  alert_rule_count?: number;
}

export interface Logging extends ITAssetBase {
  asset_type: 'logging';
  log_type?: string;
  collection_scope?: string;
  retention_days?: number;
}

export interface Pipeline extends ITAssetBase {
  asset_type: 'pipeline';
  pipeline_type?: string;
  repository?: string;
  trigger?: string;
}

export interface CodeRepository extends ITAssetBase {
  asset_type: 'code_repository';
  repo_type?: string;
  url?: string;
  tech_stack?: string[];
  maintainer?: string;
}

// ============================================
// 外部依赖层资产
// ============================================

export interface ThirdPartyService extends ITAssetBase {
  asset_type: 'third_party_service';
  provider?: string;
  endpoint?: string;
  expiry_date?: string;
}

export interface ExternalAPI extends ITAssetBase {
  asset_type: 'external_api';
  interface_name?: string;
  provider_system?: string;
  consumer_system?: string;
  protocol?: string;
}

// ============================================
// 资产联合类型
// ============================================

export type ITAsset =
  | PhysicalDevice
  | VirtualMachine
  | Container
  | Cluster
  | NetworkDevice
  | IPAddress
  | Domain
  | DNSRecord
  | SSLCertificate
  | SecurityGroup
  | Database
  | Storage
  | Backup
  | WebServer
  | Middleware
  | APIGateway
  | LoadBalancer
  | Microservice
  | OperatingSystem
  | Runtime
  | SoftwarePackage
  | Monitoring
  | Logging
  | Pipeline
  | CodeRepository
  | ThirdPartyService
  | ExternalAPI;

// ============================================
// 关系与统计
// ============================================

/**
 * 资产关系
 */
export interface AssetRelationship {
  id: string;
  source_id: string;
  source_type: AssetType;
  target_id: string;
  target_type: AssetType;
  relation_type: string;
}

/**
 * 资产类型统计
 */
export interface AssetTypeStat {
  asset_type: AssetType;
  category: AssetCategory;
  label: string;
  count: number;
}

/**
 * 系统资产统计
 */
export interface SystemAssetStats {
  total: number;
  by_type: AssetTypeStat[];
  by_category: Record<AssetCategory, number>;
}

// ============================================
// 查询参数与结果
// ============================================

/**
 * 查询系统列表参数
 */
export interface QuerySystemsParams {
  keyword?: string;
  status?: InformationSystemStatus;
  level?: InformationSystemLevel;
  department?: string;
  page?: number;
  pageSize?: number;
}

/**
 * 查询资产列表参数
 */
export interface QueryAssetsParams {
  keyword?: string;
  system_id?: string;
  asset_type?: AssetType;
  category?: AssetCategory;
  status?: AssetStatus;
  page?: number;
  pageSize?: number;
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
}

// ============================================
// 数据提供者接口
// ============================================

/**
 * IT 资产数据提供者接口
 * 所有数据源实现都需要实现此接口
 */
export interface IItAssetDataProvider {
  /**
   * 查询信息系统列表
   */
  querySystems(params: QuerySystemsParams): Promise<PaginatedResult<InformationSystem>>;

  /**
   * 根据 ID 查询信息系统
   */
  querySystemById(id: string): Promise<InformationSystem | null>;

  /**
   * 查询资产列表
   */
  queryAssets(params: QueryAssetsParams): Promise<PaginatedResult<ITAsset>>;

  /**
   * 根据 ID 查询资产
   */
  queryAssetById(id: string): Promise<ITAsset | null>;

  /**
   * 查询指定系统下的资产
   */
  queryAssetsBySystemId(
    systemId: string,
    params?: Omit<QueryAssetsParams, 'system_id'>
  ): Promise<PaginatedResult<ITAsset>>;

  /**
   * 查询系统资产统计
   */
  querySystemAssetStats(systemId: string): Promise<SystemAssetStats>;

  /**
   * 查询资产关系
   */
  queryAssetRelationships(assetId: string): Promise<AssetRelationship[]>;

  /**
   * 查询所有资产类型
   */
  queryAssetTypes(): Promise<{ type: AssetType; category: AssetCategory; label: string }[]>;

  /**
   * 查询所属部门列表（用于筛选）
   */
  queryDepartments(): Promise<string[]>;
}
