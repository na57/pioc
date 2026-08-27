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
export type InformationSystemStatus = 'active' | 'inactive' | 'planning';

/**
 * 资产状态
 */
export type AssetStatus = 'active' | 'inactive' | 'unknown' | 'faulty' | 'idle';

/**
 * 资产类型
 */
export type AssetType =
  | 'physical_device'
  | 'virtual_machine'
  | 'container'
  | 'cluster'
  | 'ip_address'
  | 'domain'
  | 'dns_record'
  | 'ssl_certificate'
  | 'security_group'
  | 'database'
  | 'storage'
  | 'backup'
  | 'web_server'
  | 'web_app'
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
  | 'ops_access_control'
  | 'third_party_service'
  | 'external_api'
  | 'data_source'
  | 'web_site_monitor'
  | 'port_monitor';

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
  | 'external'
  | 'governance';

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
  parent_id?: string;
  parent_name?: string;
  custom_fields?: Record<string, string>;
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
  device_type?: string;
  brand?: string;
  model?: string;
  sn?: string;
  ip_address?: string;
  management_ip?: string;
  manufacturer?: string;
  warranty_expiry?: string;
  department?: string;
  owner?: string;
  owner_employee_id?: string;
  system_name?: string;
  remark?: string;
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
  ip_address_id?: string;
  department?: string;
  owner?: string;
}

export interface DNSRecord extends ITAssetBase {
  asset_type: 'dns_record';
  domain_id?: string;
  record_type?: string;
  host_record?: string;
  record_value?: string;
  ttl?: number;
}

/**
 * DNS 记录详情（从中台 DNS 记录 API 返回）
 */
export interface DNSRecordDetail {
  id: string;
  domain: string;
  record_type: string;
  network_category?: string;
  ttl?: string;
  record_value?: string;
  reverse_domain?: string;
  domain_status?: string;
  audit_status?: string;
  expiry_date?: string;
  expiry_policy?: string;
  created_at?: string;
  enable_validity?: string;
  remark?: string;
  updated_at?: string;
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
  // 抽象业务字段
  server_type?: string;
  ip_address?: string;
  purpose?: string;
}

/**
 * Web 应用
 * 从数据中台 "EDR系统WEB应用信息" 接口获取
 * 抽象业务字段：IP地址、Web服务器类型、应用名称、应用版本
 */
export interface WebApp extends ITAssetBase {
  asset_type: 'web_app';
  // 抽象业务字段
  ip_address?: string;
  server_type?: string;
  app_name?: string;
  app_version?: string;
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

/**
 * Web 站点监控
 * 监控系统（Hertzbeat / Nightingale 等）中对 Web 站点的一条监控记录
 * 核心属性按五个维度组织：
 * 1. 监控目标：定义"监控谁"（domain / ip + port + path）
 * 2. 监控协议：定义"用什么协议"（http / https）
 * 3. 判定方式：定义"怎么算正常"（expected_status_code）
 * 4. 调度：定义"多久查一次"（collection_interval）
 * 5. 来源与状态：定义"从哪来、现在咋样"（source_* + last_check_*）
 */
export interface WebSiteMonitor extends ITAssetBase {
  asset_type: 'web_site_monitor';

  // 一、监控目标识别
  /** 目标域名（规范化：去尾部点、小写） */
  domain?: string;
  /** 目标 IP 地址 */
  ip?: string;
  /** 目标端口，如 443、80 */
  port?: number;
  /** 目标路径，如 /healthz */
  path?: string;

  // 二、监控协议
  /** 监控协议：http / https */
  protocol?: string;

  // 三、判定
  /** 期望状态码，如 200 */
  expected_status_code?: number;

  // 四、调度
  /** 采集间隔（秒） */
  collection_interval?: number;

  // 五、来源
  /** 监控系统：hertzbeat / nightingale / prometheus / zabbix */
  source_system?: string;
  /** 在来源系统中的监控任务 ID */
  source_monitor_id?: string;

  // 六、状态快照
  /** 最近检测时间 */
  last_check_time?: string;
  /** 最近检测状态：ok / fail / unknown */
  last_check_status?: string;
}

/**
 * 端口监控
 * 监控系统（Hertzbeat / Nightingale 等）中对 IP+端口连通性的一条监控记录
 * 核心属性按五个维度组织：
 * 1. 监控目标：定义"监控谁"（ip + port）
 * 2. 监控协议：定义"用什么协议"（tcp / udp）
 * 3. 调度：定义"多久查一次"（collection_interval）
 * 4. 来源：定义"从哪来"（source_*）
 * 5. 状态：定义"现在咋样"（last_check_*）
 */
export interface PortMonitor extends ITAssetBase {
  asset_type: 'port_monitor';

  // 一、监控目标识别
  /** 目标 IP 地址 */
  ip?: string;
  /** 目标端口，如 22、3306、6379 */
  port?: number;

  // 二、监控协议
  /** 传输协议：tcp / udp */
  protocol?: string;

  // 三、调度
  /** 采集间隔（秒） */
  collection_interval?: number;

  // 四、来源
  /** 监控系统：hertzbeat / nightingale / prometheus / zabbix */
  source_system?: string;
  /** 在来源系统中的监控任务 ID */
  source_monitor_id?: string;

  // 五、状态快照
  /** 最近检测时间 */
  last_check_time?: string;
  /** 最近检测状态：ok / fail / unknown */
  last_check_status?: string;
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

/**
 * 运维访问控制
 * 记录被访问控制系统（堡垒机、数据库访问网关等）纳管的资源
 * 本质是"受控的访问目标"，而非管控系统本身
 */
export interface OpsAccessControl extends ITAssetBase {
  asset_type: 'ops_access_control';
  /** 数据来源系统：堡垒机 / 数据库访问网关 / 其他 */
  source?: 'bastion' | 'database_gateway' | 'other';
  /** 管控系统类型：堡垒机 / 数据库访问网关 / 其他 */
  controller_type?: 'bastion' | 'database_gateway' | 'other';
  /** 被管控目标类型 */
  target_type?:
    | 'virtual_machine'
    | 'physical_device'
    | 'network_device'
    | 'database'
    | 'application'
    | 'other';
  /** 被管控目标 IP 地址（用于关联到现有资产） */
  ip_address?: string;
  /** 被管控目标主机名 */
  hostname?: string;
  /** 访问协议：SSH / RDP / Telnet / VNC / MySQL / Oracle 等 */
  access_protocol?: string;
}

// ============================================
// 数据治理层资产
// ============================================

/**
 * 数据采集源
 * 数据中台对外的一条采集连接配置，是数据从业务系统流向数据中台的管道入口
 * 核心属性按五个维度组织：
 * 1. 连接目标：定义"采的是什么"
 * 2. 类型分类：定义"这是什么类型的数据"
 * 3. 归属关系：定义"归谁管"
 * 4. 运行状态：定义"活不活跃"
 * 5. 安全级别：定义"敏感程度"
 */
export interface DataSource extends ITAssetBase {
  asset_type: 'data_source';
  category: 'governance';

  // 一、连接目标（最核心）
  /** 连接目标标识：数据库名 / Topic 名 / API 路径 / 文件路径等 */
  connection_target: string;
  /** 连接主机：IP 或域名 */
  connection_host: string;
  /** 连接端口 */
  connection_port?: number;

  // 二、类型分类（治理维度）
  /** 技术类型：MySQL / Oracle / Kafka / API / File / Redis 等 */
  source_type: string;
  /** 业务分类：交易数据 / 日志数据 / 配置数据 / 监控数据 / 主数据 等 */
  data_category: string;

  // 三、归属关系（治理责任）
  /** 所属业务系统 ID */
  business_system_id: string;
  /** 所属业务系统名称 */
  business_system_name?: string;
  /** 归属部门 */
  department?: string;
  /** 技术负责人 */
  technical_owner?: string;

  // 四、运行状态（活性判断）
  /** 最后同步时间 */
  last_sync_time?: string;
  /** 同步频率：如 "5min"、"1h"、"1day" */
  sync_interval?: string;

  // 五、安全级别
  /** 安全等级：公开 / 内部 / 机密 / 绝密 */
  security_level?: 'public' | 'internal' | 'confidential' | 'secret';
}

// ============================================
// 外部依赖层资产
// ============================================

export interface ThirdPartyService extends ITAssetBase {
  asset_type: 'third_party_service';
  service_type?: string;
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
  | IPAddress
  | Domain
  | DNSRecord
  | SSLCertificate
  | SecurityGroup
  | Database
  | Storage
  | Backup
  | WebServer
  | WebApp
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
  | OpsAccessControl
  | ThirdPartyService
  | ExternalAPI
  | DataSource
  | WebSiteMonitor
  | PortMonitor;

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
  active_count: number;
}

/**
 * 系统资产统计
 */
export interface SystemAssetStats {
  total: number;
  active_total: number;
  by_type: AssetTypeStat[];
  by_category: Record<AssetCategory, number>;
  by_category_active: Record<AssetCategory, number>;
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
  department?: string;
  parent?: string;
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
  queryAssetById(id: string, assetType?: AssetType): Promise<ITAsset | null>;

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

  /**
   * 查询 DNS 记录列表
   */
  queryDNSRecords(domain?: string): Promise<PaginatedResult<DNSRecordDetail>>;

  /**
   * 根据 ID 查询 DNS 记录详情
   */
  queryDNSRecordById(id: string): Promise<DNSRecordDetail | null>;

  /**
   * 查询指定 Web 服务器关联的 Web 应用列表
   * 通过 IP 地址和服务器类型关联
   */
  queryWebAppsByServer(ipAddress: string, serverType: string): Promise<PaginatedResult<WebApp>>;
}
