/**
 * IT资产中心 - 模拟数据提供者
 * 用于本地开发和演示，生成合理的模拟资产数据
 */

import {
  IItAssetDataProvider,
  InformationSystem,
  ITAsset,
  ITAssetBase,
  AssetRelationship,
  SystemAssetStats,
  AssetType,
  AssetCategory,
  QuerySystemsParams,
  QueryAssetsParams,
  PaginatedResult,
  InformationSystemStatus,
  MiddlewareName,
  Middleware,
  DNSRecordDetail,
  Domain,
  WebApp,
  DataSource,
  WebSiteMonitor,
  PortMonitor,
} from '../types';
import { ASSET_TYPE_META, CATEGORY_LABELS, MIDDLEWARE_NAME_META } from '../constants';

// ============================================
// 模拟数据生成器
// ============================================

class MockDataGenerator {
  private systems: InformationSystem[] = [];
  private assets: ITAsset[] = [];
  private relationships: AssetRelationship[] = [];
  private dnsRecords: DNSRecordDetail[] = [];

  constructor() {
    this.generateData();
  }

  private generateData() {
    const systemTemplates: Array<{
      code: string;
      name: string;
      status: InformationSystemStatus;
    }> = [
      { code: 'edu', name: '教务管理系统', status: 'active' },
      { code: 'finance', name: '财务管理系统', status: 'active' },
      { code: 'oa', name: '办公自动化系统', status: 'active' },
      { code: 'library', name: '图书管理系统', status: 'active' },
      { code: 'portal', name: '信息门户', status: 'active' },
      { code: 'hr', name: '人力资源系统', status: 'active' },
      { code: 'research', name: '科研管理系统', status: 'active' },
      { code: 'dorm', name: '宿舍管理系统', status: 'inactive' },
      { code: 'meeting', name: '会议预约系统', status: 'active' },
      { code: 'asset', name: '资产管理系统', status: 'active' },
    ];

    this.systems = systemTemplates.map((tpl, index) => ({
      id: `sys-${tpl.code}`,
      code: tpl.code,
      name: tpl.name,
      description: `${tpl.name}，支撑学校日常业务运行`,
      owner: `负责人${index + 1}`,
      owner_department: ['信息中心', '教务处', '财务处', '图书馆'][index % 4],
      status: tpl.status,
      parent_id: index === 0 ? undefined : 'sys-portal',
      parent_name: index === 0 ? undefined : '信息门户',
      custom_fields: {
        'IDS是否对接': index % 2 === 0 ? '是' : '否',
        '数据源是否采集': index % 3 === 0 ? '是' : '否',
        '系统基础架构': ['B/S', 'C/S', '微服务'][index % 3],
        '开发语言': ['Java', 'Python', 'Node.js'][index % 3],
        '中间件': ['Nginx', 'Redis', 'Kafka'][index % 3],
        '数据库版本': ['MySQL 8.0', 'PostgreSQL 14', 'Oracle 19c'][index % 3],
        '用户群体': ['教职工', '学生', '全体师生'][index % 3],
        '用户规模': `${1000 + index * 500}人`,
      },
      created_at: '2023-01-15T08:00:00Z',
      updated_at: '2024-06-20T10:30:00Z',
    }));

    this.systems.forEach((system) => {
      this.generateAssetsForSystem(system);
    });

    this.generateDNSRecords();
  }

  private generateAssetsForSystem(system: InformationSystem) {
    const baseDate = '2024-01-01T00:00:00Z';
    const assetCounts: Record<AssetCategory, number> = {
      infrastructure: 5,
      network: 4,
      data: 2,
      application: 6,
      software: 3,
      operations: 3,
      external: 2,
      governance: 2,
    };

    const assetTypesByCategory = Object.entries(ASSET_TYPE_META).reduce(
      (acc, [type, meta]) => {
        if (!acc[meta.category]) acc[meta.category] = [];
        acc[meta.category].push(type as AssetType);
        return acc;
      },
      {} as Record<AssetCategory, AssetType[]>
    );

    let sequence = 1;
    Object.entries(assetCounts).forEach(([category, count]) => {
      const types = assetTypesByCategory[category as AssetCategory];
      for (let i = 0; i < count; i++) {
        const type = types[i % types.length];
        const asset = this.createAsset(system.id, type, sequence++, baseDate);
        this.assets.push(asset);
      }
    });

    // 生成一些跨系统共享资产（如域名、外部服务）
    if (system.code === 'portal') {
      this.assets.push(
        this.createAsset(system.id, 'domain', sequence++, baseDate, {
          domain: 'www.example.edu.cn',
          ip_address_id: `asset-${system.id}-ip_address-1`,
        })
      );
    }
  }

  private generateDNSRecords() {
    const domainAssets = this.assets.filter(
      (asset): asset is Domain => asset.asset_type === 'domain'
    );
    const domainToSystemId = new Map(
      domainAssets.map((asset) => [(asset as Domain).domain?.replace(/\.+$/, ''), asset.system_id])
    );
    const domains = domainAssets.map((asset) => (asset as Domain).domain);

    const uniqueDomains = Array.from(new Set(domains));
    const recordTypes = ['A', 'CNAME', 'MX', 'TXT', 'NS'];
    let sequence = 1;

    uniqueDomains.forEach((domain) => {
      const count = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < count; i++) {
        const type = recordTypes[i % recordTypes.length];
        const dnsRecord: DNSRecordDetail = {
          id: `dns-${sequence.toString().padStart(4, '0')}`,
          domain: `${domain}.`,
          record_type: type,
          network_category: ['IN', 'OUT'][i % 2],
          ttl: String([300, 600, 3600, 86400][i % 4]),
          record_value: this.generateDNSRecordValue(type, domain, i),
          reverse_domain: type === 'A' ? `${i + 1}.${domain}` : undefined,
          domain_status: i % 3 === 0 ? '停用' : '启用',
          audit_status: ['已审核', '待审核', '未审核'][i % 3],
          expiry_date: '2025-12-31T00:00:00Z',
          expiry_policy: ['保留', '删除'][i % 2],
          created_at: '2024-01-01T00:00:00Z',
          enable_validity: i % 2 === 0 ? '是' : '否',
          remark: `DNS ${type} 记录`,
          updated_at: '2024-06-20T00:00:00Z',
        };
        this.dnsRecords.push(dnsRecord);
        // 同时作为 dns_record 资产加入资产列表（去除末尾点号后进行匹配）
        this.assets.push(this.dnsDetailToAsset(dnsRecord, domainToSystemId.get(domain.replace(/\.+$/, '')) || 'unknown'));
        sequence++;
      }
    });
  }

  private dnsDetailToAsset(dns: DNSRecordDetail, systemId: string): ITAsset {
    return {
      id: dns.id,
      system_id: systemId,
      asset_type: 'dns_record',
      category: 'network',
      name: `${dns.record_type} - ${dns.domain}`,
      status: dns.domain_status === '启用' ? 'active' : 'inactive',
      description: `记录值: ${dns.record_value}`,
      tags: ['dns', dns.record_type],
      metadata: {
        ttl: dns.ttl,
        record_value: dns.record_value,
        reverse_domain: dns.reverse_domain,
        audit_status: dns.audit_status,
      },
      created_at: dns.created_at || '2024-01-01T00:00:00Z',
      updated_at: dns.updated_at || '2024-01-01T00:00:00Z',
    } as ITAsset;
  }

  private generateDNSRecordValue(type: string, domain: string, index: number): string {
    switch (type) {
      case 'A':
        return `10.0.${index % 256}.${(index % 254) + 1}`;
      case 'CNAME':
        return `cname-${index + 1}.${domain}`;
      case 'MX':
        return `${10 + index} mail.${domain}`;
      case 'TXT':
        return `v=spf${index + 1} include:${domain}`;
      case 'NS':
        return `ns${index + 1}.${domain}`;
      default:
        return domain;
    }
  }

  private createAsset(
    systemId: string,
    type: AssetType,
    sequence: number,
    baseDate: string,
    overrides: Partial<ITAsset> = {}
  ): ITAsset {
    const meta = ASSET_TYPE_META[type];
    const id = `asset-${systemId}-${type}-${sequence}`;
    const base: ITAssetBase = {
      id,
      system_id: systemId,
      asset_type: type,
      category: meta.category,
      name: `${meta.label}-${sequence}`,
      code: `${type.toUpperCase().replace(/_/g, '-')}-${sequence.toString().padStart(3, '0')}`,
      status: Math.random() > 0.1 ? 'active' : 'inactive',
      description: `${meta.label}资产，归属系统 ${systemId}`,
      tags: [meta.category, meta.label],
      metadata: {},
      created_at: baseDate,
      updated_at: baseDate,
    };

    const typedAsset = this.fillAssetDetails(base, type, sequence);
    return { ...typedAsset, ...overrides } as ITAsset;
  }

  private fillAssetDetails(base: ITAssetBase, type: AssetType, sequence: number): ITAsset {
    switch (type) {
      case 'physical_device':
        return {
          ...base,
          asset_type: 'physical_device',
          device_type: ['服务器', '交换机', '防火墙', '路由器', '存储阵列'][sequence % 5],
          management_ip: `10.0.0.${(sequence % 254) + 1}`,
          ip_address: `192.168.${sequence % 256}.${(sequence % 254) + 1}`,
          manufacturer: ['Dell', 'HPE', 'Lenovo', 'Huawei', 'Cisco'][sequence % 5],
          department: ['信息中心', '网络中心', '计算中心'][sequence % 3],
          owner: ['张三', '李四', '王五'][sequence % 3],
          system_name: `系统-${sequence}`,
          brand: ['Dell', 'HPE', 'Lenovo', 'Huawei'][sequence % 4],
          model: `PowerEdge R${750 + (sequence % 5)}`,
          sn: `SN${Date.now()}${sequence}`,
        };
      case 'virtual_machine':
        return {
          ...base,
          asset_type: 'virtual_machine',
          host: `esxi-${(sequence % 3) + 1}.example.edu.cn`,
          cpu: 4 + (sequence % 4),
          memory_gb: 8 + (sequence % 8) * 4,
          disk_gb: 100 + (sequence % 5) * 50,
          ip: `10.0.${sequence % 256}.${(sequence % 254) + 1}`,
          os: ['CentOS 7', 'Ubuntu 22.04', 'Windows Server 2022'][sequence % 3],
          hypervisor: 'VMware ESXi',
        };
      case 'container':
        return {
          ...base,
          asset_type: 'container',
          image: `app-service-${sequence}:v1.0`,
          namespace: 'production',
          replicas: 2 + (sequence % 4),
        };
      case 'cluster':
        return {
          ...base,
          asset_type: 'cluster',
          cluster_type: ['Kubernetes', 'Redis Cluster', 'MySQL Cluster'][sequence % 3],
          node_count: 3 + (sequence % 5),
          version: 'v1.28.0',
        };
      case 'ip_address':
        return {
          ...base,
          asset_type: 'ip_address',
          ip: `10.0.${sequence % 256}.${(sequence % 254) + 1}`,
          ip_type: sequence % 10 === 0 ? 'public' : 'private',
          subnet: `10.0.${sequence % 256}.0/24`,
        };
      case 'domain':
        return {
          ...base,
          asset_type: 'domain',
          domain: `${base.system_id === 'sys-portal' ? 'www' : base.system_id.replace('sys-', '')}.example.edu.cn`,
          record_count: 3 + (sequence % 5),
        };
      case 'database':
        return {
          ...base,
          asset_type: 'database',
          db_type: ['MySQL', 'PostgreSQL', 'Oracle'][sequence % 3],
          version: '8.0',
          host: `db-${sequence}.example.edu.cn`,
          port: 3306,
          instance_name: `db-${base.system_id}-${sequence}`,
        };
      case 'web_server': {
        const serverType = ['Nginx', 'Apache', 'IIS'][sequence % 3];
        const ip = `10.0.${sequence % 256}.${(sequence % 254) + 1}`;
        const appName = `Web应用-${sequence}`;
        return {
          ...base,
          id: `${ip}@@${serverType}`,
          code: `${ip}@@${serverType}`,
          asset_type: 'web_server',
          name: `${ip} 上的 ${serverType}`,
          server_type: serverType,
          ip_address: ip,
          purpose: `运行 ${appName}`,
          description: `Web服务器: ${serverType} (${ip})`,
          metadata: {
            version: '1.24',
            listen_ports: [80, 443],
            source: ['EDR', 'CMDB', '手工录入'][sequence % 3],
            apps: [appName],
          },
        };
      }
      case 'middleware': {
        const middlewareNames: MiddlewareName[] = ['redis', 'kafka', 'nacos', 'rabbitmq', 'zookeeper', 'tomcat'];
        const name = middlewareNames[sequence % middlewareNames.length];
        const configs: Record<MiddlewareName, Partial<Middleware>> = {
          redis: { version: '7.0', node_count: 3 + (sequence % 3), capacity_mb: 2048, mode: 'cluster' },
          kafka: { version: '3.6', node_count: 3 + (sequence % 3), topics: ['topic-a', 'topic-b'] },
          nacos: { version: '2.2', node_count: 3, port: 8848 },
          rabbitmq: { version: '3.12', node_count: 1, port: 5672 },
          zookeeper: { version: '3.8', node_count: 3 },
          tomcat: { version: '10.1', port: 8080 + sequence },
          memcached: { version: '1.6', node_count: 2, capacity_mb: 1024 },
          rocketmq: { version: '5.1', node_count: 3, topics: ['topic-a'] },
          activemq: { version: '5.18', node_count: 1, port: 61616 },
          consul: { version: '1.17', node_count: 3 },
          etcd: { version: '3.5', node_count: 3 },
          weblogic: { version: '14.1', port: 7001 },
          websphere: { version: '9.0', port: 9443 },
          jetty: { version: '12.0', port: 8080 + sequence },
          solr: { version: '9.4', node_count: 3 },
          elasticsearch: { version: '8.13', node_count: 3 },
        };
        return {
          ...base,
          asset_type: 'middleware',
          middleware_name: name,
          name: `${MIDDLEWARE_NAME_META[name].label}-${sequence}`,
          ...configs[name],
        } as ITAsset;
      }
      case 'api_gateway':
        return {
          ...base,
          asset_type: 'api_gateway',
          gateway_type: ['Kong', 'Spring Cloud Gateway'][sequence % 2],
          route_count: 20 + (sequence % 30),
        };
      case 'load_balancer':
        return {
          ...base,
          asset_type: 'load_balancer',
          lb_type: ['F5', 'Nginx', 'HAProxy'][sequence % 3],
          vip: `10.0.0.${(sequence % 254) + 1}`,
        };
      case 'microservice':
        return {
          ...base,
          asset_type: 'microservice',
          service_name: `svc-${base.system_id.replace('sys-', '')}-${sequence}`,
          version: 'v1.0.0',
          interface_count: 5 + (sequence % 10),
        };
      case 'monitoring':
        return {
          ...base,
          asset_type: 'monitoring',
          monitor_type: ['Prometheus', 'Zabbix', 'Grafana'][sequence % 3],
          alert_rule_count: 10 + (sequence % 20),
        };
      case 'logging':
        return {
          ...base,
          asset_type: 'logging',
          log_type: ['ELK', 'Loki'][sequence % 2],
          retention_days: 30 + (sequence % 60),
        };
      case 'pipeline':
        return {
          ...base,
          asset_type: 'pipeline',
          pipeline_type: ['Jenkins', 'GitLab CI'][sequence % 2],
          trigger: 'git-push',
        };
      case 'code_repository':
        return {
          ...base,
          asset_type: 'code_repository',
          repo_type: ['GitLab', 'GitHub'][sequence % 2],
          url: `https://git.example.edu.cn/${base.system_id.replace('sys-', '')}/repo-${sequence}`,
          tech_stack: ['TypeScript', 'Java', 'Python'][sequence % 3].split(','),
        };
      case 'third_party_service':
        return {
          ...base,
          asset_type: 'third_party_service',
          provider: ['阿里云', '腾讯云', '华为云'][sequence % 3],
          endpoint: `https://api-vendor-${sequence}.example.com`,
        };
      case 'ops_access_control': {
        const sourceTypes = ['bastion', 'database_gateway', 'other'] as const;
        const controllerTypes = ['bastion', 'database_gateway', 'other'] as const;
        const targetTypes = ['virtual_machine', 'physical_device', 'network_device', 'database', 'application', 'other'] as const;
        const protocols = ['SSH', 'RDP', 'VNC', 'MySQL', 'Oracle', 'Telnet'];
        const src = sourceTypes[sequence % sourceTypes.length];
        const ctrl = controllerTypes[sequence % controllerTypes.length];
        const tgt = targetTypes[sequence % targetTypes.length];
        const ip = `10.0.${sequence % 256}.${(sequence % 254) + 1}`;
        return {
          ...base,
          asset_type: 'ops_access_control',
          name: `${src === 'bastion' ? '堡垒机' : src === 'database_gateway' ? '数据库访问网关' : '其他'}-${ip}`,
          source: src,
          controller_type: ctrl,
          target_type: tgt,
          ip_address: ip,
          hostname: `host-${sequence}.example.edu.cn`,
          access_protocol: protocols[sequence % protocols.length],
          metadata: {
            account: `opsadmin-${sequence}`,
            policy_group: `策略组-${(sequence % 4) + 1}`,
            last_login_time: '2024-06-20T10:30:00Z',
            password_rotate_days: 90,
          },
        };
      }
      case 'data_source': {
        const sourceTypes = ['MySQL', 'PostgreSQL', 'Oracle', 'SQL Server', 'Redis', 'Kafka', 'API', '文件'];
        const dataCategories = ['教务数据', '财务数据', '人事数据', '科研数据', '资产数据', '图书数据'];
        const sourceType = sourceTypes[sequence % sourceTypes.length];
        const dataCategory = dataCategories[sequence % dataCategories.length];
        const host = `10.0.${(sequence % 256) + 1}.${(sequence % 254) + 1}`;
        const ports: Record<string, number> = {
          'MySQL': 3306,
          'PostgreSQL': 5432,
          'Oracle': 1521,
          'SQL Server': 1433,
          'Redis': 6379,
          'Kafka': 9092,
          'API': 443,
          '文件': 0,
        };
        return {
          ...base,
          asset_type: 'data_source',
          category: 'governance',
          name: `${dataCategory}采集源-${sequence}`,
          code: `DS-${base.system_id.replace('sys-', '').toUpperCase()}-${sequence.toString().padStart(3, '0')}`,
          connection_target: `${host}${ports[sourceType] ? ':' + ports[sourceType] : ''}`,
          connection_host: host,
          connection_port: ports[sourceType] || undefined,
          source_type: sourceType,
          data_category: dataCategory,
          business_system_id: base.system_id,
          business_system_name: base.description?.split('，')[0] || undefined,
          department: ['信息中心', '教务处', '财务处', '人事处'][sequence % 4],
          technical_owner: ['张三', '李四', '王五'][sequence % 3],
          last_sync_time: '2024-06-20T10:30:00Z',
          sync_interval: ['每小时', '每天', '每周', '实时'][sequence % 4],
          security_level: (['public', 'internal', 'confidential'] as const)[sequence % 3],
          metadata: {
            vendor_name: ['Oracle', 'Microsoft', '阿里云'][sequence % 3],
            data_source_category: dataCategory,
            connection_alias: `ds_alias_${sequence}`,
            enabled: sequence % 5 !== 0 ? '是' : '否',
          },
        } as DataSource;
      }
      case 'web_site_monitor': {
        const protocols = ['http', 'https'];
        const statusCodes = [200, 200, 200, 301, 404];
        const intervals = [30, 60, 60, 120, 300];
        const sources = ['hertzbeat', 'nightingale', 'prometheus'];
        const paths = ['/', '/healthz', '/api/status', '/login', '/'];
        const useDomain = sequence % 3 !== 0;
        const domain = useDomain
          ? `${['www', 'api', 'mail', 'portal'][sequence % 4]}.${base.system_id.replace('sys-', '')}.example.edu.cn`
          : undefined;
        const ip = !useDomain ? `10.0.${sequence % 256}.${(sequence % 254) + 1}` : undefined;
        const port = [443, 80, 8080, 8443][sequence % 4];
        const protocol = protocols[sequence % protocols.length];
        const path = paths[sequence % paths.length];
        const expectedCode = statusCodes[sequence % statusCodes.length];
        const interval = intervals[sequence % intervals.length];
        const source = sources[sequence % sources.length];
        const checkStatus = sequence % 10 === 0 ? 'fail' : sequence % 5 === 0 ? 'unknown' : 'ok';
        return {
          ...base,
          asset_type: 'web_site_monitor',
          category: 'operations',
          name: `${domain || ip}:${port}${path}`,
          code: `WSM-${base.system_id.replace('sys-', '').toUpperCase()}-${sequence.toString().padStart(3, '0')}`,
          domain,
          ip,
          port,
          path,
          protocol,
          expected_status_code: expectedCode,
          collection_interval: interval,
          source_system: source,
          source_monitor_id: `${source}-monitor-${sequence}`,
          last_check_time: '2024-06-20T10:30:00Z',
          last_check_status: checkStatus,
          metadata: {
            timeout_ms: 5000,
            retry_count: 3,
          },
        } as WebSiteMonitor;
      }
      case 'port_monitor': {
        const ports = [22, 3306, 5432, 6379, 27017, 8080, 8443, 9090];
        const protocols = ['tcp', 'tcp', 'tcp', 'udp'];
        const intervals = [30, 60, 60, 120];
        const sources = ['hertzbeat', 'nightingale', 'prometheus'];
        const ip = `10.${sequence % 256}.${(sequence % 254) + 1}.${(sequence * 7) % 254}`;
        const port = ports[sequence % ports.length];
        const protocol = protocols[sequence % protocols.length];
        const interval = intervals[sequence % intervals.length];
        const source = sources[sequence % sources.length];
        const checkStatus = sequence % 10 === 0 ? 'fail' : sequence % 5 === 0 ? 'unknown' : 'ok';
        return {
          ...base,
          asset_type: 'port_monitor',
          category: 'operations',
          name: `${ip}:${port}`,
          code: `PM-${base.system_id.replace('sys-', '').toUpperCase()}-${sequence.toString().padStart(3, '0')}`,
          ip,
          port,
          protocol,
          collection_interval: interval,
          source_system: source,
          source_monitor_id: `${source}-port-${sequence}`,
          last_check_time: '2024-06-20T10:30:00Z',
          last_check_status: checkStatus,
          metadata: {
            timeout_ms: 3000,
            retry_count: 2,
          },
        } as PortMonitor;
      }
      default:
        return base as ITAsset;
    }
  }

  getSystems(): InformationSystem[] {
    return this.systems;
  }

  getAssets(): ITAsset[] {
    return this.assets;
  }

  getRelationships(): AssetRelationship[] {
    return this.relationships;
  }

  getDNSRecords(): DNSRecordDetail[] {
    return this.dnsRecords;
  }
}

const mockData = new MockDataGenerator();

// ============================================
// 模拟数据提供者实现
// ============================================

export class MockDataProvider implements IItAssetDataProvider {
  private systems = mockData.getSystems();
  private assets = mockData.getAssets();
  private relationships = mockData.getRelationships();
  private dnsRecords = mockData.getDNSRecords();

  private filterByKeyword<T extends { name?: string; code?: string; description?: string }>(
    items: T[],
    keyword?: string
  ): T[] {
    if (!keyword?.trim()) return items;
    const lower = keyword.toLowerCase();
    return items.filter(
      (item) =>
        item.name?.toLowerCase().includes(lower) ||
        item.code?.toLowerCase().includes(lower) ||
        item.description?.toLowerCase().includes(lower)
    );
  }

  private paginate<T>(items: T[], page = 1, pageSize = 10): PaginatedResult<T> {
    const start = (page - 1) * pageSize;
    return {
      data: items.slice(start, start + pageSize),
      total: items.length,
    };
  }

  async querySystems(params: QuerySystemsParams): Promise<PaginatedResult<InformationSystem>> {
    let result = [...this.systems];

    // 解析上级系统名称：确保所有 parent_id 都有对应的 parent_name
    if (result.length > 0) {
      const idToNameMap = new Map(result.map((s) => [s.id, s.name]));
      result = result.map((s) => ({
        ...s,
        parent_name: s.parent_id ? idToNameMap.get(s.parent_id) || s.parent_name || s.parent_id : undefined,
      }));
    }

    if (params.status) {
      result = result.filter((s) => s.status === params.status);
    }
    if (params.department) {
      result = result.filter((s) => s.owner_department === params.department);
    }
    if (params.parent) {
      const lowerParent = params.parent.toLowerCase();
      result = result.filter(
        (s) =>
          s.parent_id?.toLowerCase().includes(lowerParent) ||
          s.parent_name?.toLowerCase().includes(lowerParent)
      );
    }

    if (params.keyword?.trim()) {
      const lower = params.keyword.toLowerCase();
      result = result.filter(
        (s) =>
          s.name?.toLowerCase().includes(lower) ||
          s.code?.toLowerCase().includes(lower) ||
          s.description?.toLowerCase().includes(lower) ||
          s.owner?.toLowerCase().includes(lower) ||
          s.owner_department?.toLowerCase().includes(lower) ||
          s.parent_name?.toLowerCase().includes(lower)
      );
    }

    // 按名称排序
    result.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

    return this.paginate(result, params.page, params.pageSize);
  }

  async querySystemById(id: string): Promise<InformationSystem | null> {
    return this.systems.find((s) => s.id === id) || null;
  }

  async queryAssets(params: QueryAssetsParams): Promise<PaginatedResult<ITAsset>> {
    let result = [...this.assets];

    if (params.system_id) {
      result = result.filter((a) => a.system_id === params.system_id);
    }
    if (params.asset_type) {
      result = result.filter((a) => a.asset_type === params.asset_type);
    }
    if (params.category) {
      result = result.filter((a) => a.category === params.category);
    }
    if (params.status) {
      result = result.filter((a) => a.status === params.status);
    }

    result = this.filterByKeyword(result, params.keyword);

    result.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name, 'zh-CN'));

    return this.paginate(result, params.page, params.pageSize);
  }

  async queryAssetById(id: string, _assetType?: AssetType): Promise<ITAsset | null> {
    return this.assets.find((a) => a.id === id) || null;
  }

  async queryAssetsBySystemId(
    systemId: string,
    params: Omit<QueryAssetsParams, 'system_id'> = {}
  ): Promise<PaginatedResult<ITAsset>> {
    return this.queryAssets({ ...params, system_id: systemId });
  }

  async querySystemAssetStats(systemId: string): Promise<SystemAssetStats> {
    const systemAssets = this.assets.filter((a) => a.system_id === systemId);
    const runningAssets = systemAssets.filter((a) => a.status === 'active');

    const byTypeMap = new Map<AssetType, { count: number; active_count: number }>();
    const byCategory: Record<AssetCategory, number> = {
      infrastructure: 0,
      network: 0,
      data: 0,
      application: 0,
      software: 0,
      operations: 0,
      external: 0,
      governance: 0,
    };
    const byCategoryActive: Record<AssetCategory, number> = {
      infrastructure: 0,
      network: 0,
      data: 0,
      application: 0,
      software: 0,
      operations: 0,
      external: 0,
      governance: 0,
    };

    systemAssets.forEach((asset) => {
      const running = asset.status === 'active';

      const typeStat = byTypeMap.get(asset.asset_type) || { count: 0, active_count: 0 };
      typeStat.count += 1;
      if (running) typeStat.active_count += 1;
      byTypeMap.set(asset.asset_type, typeStat);

      byCategory[asset.category] = (byCategory[asset.category] || 0) + 1;
      if (running) byCategoryActive[asset.category] = (byCategoryActive[asset.category] || 0) + 1;
    });

    const by_type: SystemAssetStats['by_type'] = Array.from(byTypeMap.entries()).map(([type, stat]) => ({
      asset_type: type,
      category: ASSET_TYPE_META[type].category,
      label: ASSET_TYPE_META[type].label,
      count: stat.count,
      active_count: stat.active_count,
    }));

    return {
      total: systemAssets.length,
      active_total: runningAssets.length,
      by_type,
      by_category: byCategory,
      by_category_active: byCategoryActive,
    };
  }

  async queryAssetRelationships(assetId: string): Promise<AssetRelationship[]> {
    // 模拟生成一些关系数据
    const asset = this.assets.find((a) => a.id === assetId);
    if (!asset) return [];

    const relations: AssetRelationship[] = [];

    // 微服务依赖数据库/中间件
    if (asset.asset_type === 'microservice') {
      const deps = this.assets
        .filter(
          (a) =>
            a.system_id === asset.system_id &&
            (a.asset_type === 'database' || a.asset_type === 'middleware')
        )
        .slice(0, 2);
      deps.forEach((dep, idx) => {
        relations.push({
          id: `rel-${asset.id}-${idx}`,
          source_id: asset.id,
          source_type: asset.asset_type,
          target_id: dep.id,
          target_type: dep.asset_type,
          relation_type: 'depends_on',
        });
      });
    }

    // Web 服务器服务域名
    if (asset.asset_type === 'web_server') {
      const domains = this.assets
        .filter((a) => a.system_id === asset.system_id && a.asset_type === 'domain')
        .slice(0, 1);
      domains.forEach((domain, idx) => {
        relations.push({
          id: `rel-${asset.id}-domain-${idx}`,
          source_id: asset.id,
          source_type: asset.asset_type,
          target_id: domain.id,
          target_type: domain.asset_type,
          relation_type: 'serves',
        });
      });
    }

    // Web 站点监控关联域名 / Web 服务器
    if (asset.asset_type === 'web_site_monitor') {
      const monitor = asset as WebSiteMonitor;
      // 按域名匹配域名资产
      if (monitor.domain) {
        const matchingDomains = this.assets
          .filter(
            (a) =>
              a.asset_type === 'domain' &&
              (a as Domain).domain?.replace(/\.+$/, '').toLowerCase() ===
                monitor.domain!.replace(/\.+$/, '').toLowerCase()
          )
          .slice(0, 3);
        matchingDomains.forEach((domain, idx) => {
          relations.push({
            id: `rel-${asset.id}-monitor-domain-${idx}`,
            source_id: asset.id,
            source_type: 'web_site_monitor',
            target_id: domain.id,
            target_type: 'domain',
            relation_type: 'monitors',
          });
        });
      }
      // 按 IP 匹配 Web 服务器资产
      if (monitor.ip) {
        const matchingServers = this.assets
          .filter(
            (a) =>
              a.asset_type === 'web_server' &&
              (a as any).ip_address === monitor.ip
          )
          .slice(0, 3);
        matchingServers.forEach((server, idx) => {
          relations.push({
            id: `rel-${asset.id}-monitor-server-${idx}`,
            source_id: asset.id,
            source_type: 'web_site_monitor',
            target_id: server.id,
            target_type: 'web_server',
            relation_type: 'monitors',
          });
        });
      }
    }

    // 端口监控关联 Web 服务器（按 IP 匹配）
    if (asset.asset_type === 'port_monitor') {
      const monitor = asset as PortMonitor;
      if (monitor.ip) {
        const matchingServers = this.assets
          .filter(
            (a) =>
              a.asset_type === 'web_server' &&
              (a as any).ip_address === monitor.ip
          )
          .slice(0, 3);
        matchingServers.forEach((server, idx) => {
          relations.push({
            id: `rel-${asset.id}-port-monitor-server-${idx}`,
            source_id: asset.id,
            source_type: 'port_monitor',
            target_id: server.id,
            target_type: 'web_server',
            relation_type: 'monitors',
          });
        });
      }
    }

    return relations;
  }

  async queryAssetTypes(): Promise<{ type: AssetType; category: AssetCategory; label: string }[]> {
    return Object.entries(ASSET_TYPE_META).map(([type, meta]) => ({
      type: type as AssetType,
      category: meta.category,
      label: meta.label,
    }));
  }

  async queryDepartments(): Promise<string[]> {
    const departments = new Set<string>();
    this.systems.forEach((s) => {
      if (s.owner_department) {
        departments.add(s.owner_department);
      }
    });
    return Array.from(departments).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  }

  async queryDNSRecords(domain?: string): Promise<PaginatedResult<DNSRecordDetail>> {
    let records = [...this.dnsRecords];
    if (domain) {
      const lowerDomain = domain.replace(/\.+$/, '').toLowerCase();
      records = records.filter((r) => r.domain?.replace(/\.+$/, '').toLowerCase() === lowerDomain);
    }
    return { data: records, total: records.length };
  }

  async queryDNSRecordById(id: string): Promise<DNSRecordDetail | null> {
    return this.dnsRecords.find((r) => r.id === id) || null;
  }

  async queryWebAppsByServer(ipAddress: string, serverType: string): Promise<PaginatedResult<WebApp>> {
    // Mock实现：返回空列表
    return { data: [], total: 0 };
  }
}

