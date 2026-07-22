/**
 * IT资产中心 - 模拟数据提供者
 * 用于本地开发和演示，生成合理的模拟资产数据
 */

import {
  IItAssetDataProvider,
  InformationSystem,
  ITAsset,
  AssetRelationship,
  SystemAssetStats,
  AssetType,
  AssetCategory,
  QuerySystemsParams,
  QueryAssetsParams,
  PaginatedResult,
  InformationSystemStatus,
  InformationSystemLevel,
  MiddlewareName,
  Middleware,
} from '../types';
import { ASSET_TYPE_META, CATEGORY_LABELS, MIDDLEWARE_NAME_META } from '../constants';

// ============================================
// 模拟数据生成器
// ============================================

class MockDataGenerator {
  private systems: InformationSystem[] = [];
  private assets: ITAsset[] = [];
  private relationships: AssetRelationship[] = [];

  constructor() {
    this.generateData();
  }

  private generateData() {
    const systemTemplates: Array<{
      code: string;
      name: string;
      level: InformationSystemLevel;
      status: InformationSystemStatus;
    }> = [
      { code: 'edu', name: '教务管理系统', level: 'core', status: 'running' },
      { code: 'finance', name: '财务管理系统', level: 'core', status: 'running' },
      { code: 'oa', name: '办公自动化系统', level: 'important', status: 'running' },
      { code: 'library', name: '图书管理系统', level: 'important', status: 'running' },
      { code: 'portal', name: '信息门户', level: 'core', status: 'running' },
      { code: 'hr', name: '人力资源系统', level: 'important', status: 'running' },
      { code: 'research', name: '科研管理系统', level: 'general', status: 'running' },
      { code: 'dorm', name: '宿舍管理系统', level: 'general', status: 'stopped' },
      { code: 'meeting', name: '会议预约系统', level: 'general', status: 'running' },
      { code: 'asset', name: '资产管理系统', level: 'important', status: 'running' },
    ];

    this.systems = systemTemplates.map((tpl, index) => ({
      id: `sys-${tpl.code}`,
      code: tpl.code,
      name: tpl.name,
      description: `${tpl.name}，支撑学校日常业务运行`,
      owner: `负责人${index + 1}`,
      owner_department: ['信息中心', '教务处', '财务处', '图书馆'][index % 4],
      status: tpl.status,
      level: tpl.level,
      created_at: '2023-01-15T08:00:00Z',
      updated_at: '2024-06-20T10:30:00Z',
    }));

    this.systems.forEach((system) => {
      this.generateAssetsForSystem(system);
    });
  }

  private generateAssetsForSystem(system: InformationSystem) {
    const baseDate = '2024-01-01T00:00:00Z';
    const assetCounts: Record<AssetCategory, number> = {
      infrastructure: system.level === 'core' ? 8 : system.level === 'important' ? 5 : 3,
      network: system.level === 'core' ? 6 : 4,
      data: system.level === 'core' ? 3 : 2,
      application: system.level === 'core' ? 8 : 5,
      software: 3,
      operations: system.level === 'core' ? 4 : 2,
      external: system.level === 'core' ? 3 : 1,
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

  private createAsset(
    systemId: string,
    type: AssetType,
    sequence: number,
    baseDate: string,
    overrides: Partial<ITAsset> = {}
  ): ITAsset {
    const meta = ASSET_TYPE_META[type];
    const id = `asset-${systemId}-${type}-${sequence}`;
    const base: ITAsset = {
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

  private fillAssetDetails(base: ITAsset, type: AssetType, sequence: number): ITAsset {
    switch (type) {
      case 'physical_device':
        return {
          ...base,
          asset_type: 'physical_device',
          brand: ['Dell', 'HPE', 'Lenovo', 'Huawei'][sequence % 4],
          model: `PowerEdge R${750 + (sequence % 5)}`,
          sn: `SN${Date.now()}${sequence}`,
          room: '核心机房A',
          cabinet: `A-${(sequence % 10) + 1}`,
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
      case 'network_device':
        return {
          ...base,
          asset_type: 'network_device',
          device_type: ['交换机', '防火墙', '路由器'][sequence % 3],
          management_ip: `10.0.0.${(sequence % 254) + 1}`,
          brand: ['Cisco', 'H3C', 'Huawei'][sequence % 3],
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
      case 'web_server':
        return {
          ...base,
          asset_type: 'web_server',
          server_type: ['Nginx', 'Apache', 'IIS'][sequence % 3],
          version: '1.24',
          listen_ports: [80, 443],
        };
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
      default:
        return base;
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
}

const mockData = new MockDataGenerator();

// ============================================
// 模拟数据提供者实现
// ============================================

export class MockDataProvider implements IItAssetDataProvider {
  private systems = mockData.getSystems();
  private assets = mockData.getAssets();
  private relationships = mockData.getRelationships();

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

    if (params.status) {
      result = result.filter((s) => s.status === params.status);
    }
    if (params.level) {
      result = result.filter((s) => s.level === params.level);
    }
    if (params.department) {
      result = result.filter((s) => s.owner_department === params.department);
    }

    result = this.filterByKeyword(result, params.keyword);

    // 按等级和状态排序
    const levelOrder = { core: 0, important: 1, general: 2 };
    result.sort(
      (a, b) =>
        (levelOrder[a.level || 'general'] || 99) - (levelOrder[b.level || 'general'] || 99) ||
        a.name.localeCompare(b.name, 'zh-CN')
    );

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

  async queryAssetById(id: string): Promise<ITAsset | null> {
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
    const byTypeMap = new Map<AssetType, number>();
    const byCategory: Record<AssetCategory, number> = {
      infrastructure: 0,
      network: 0,
      data: 0,
      application: 0,
      software: 0,
      operations: 0,
      external: 0,
    };

    systemAssets.forEach((asset) => {
      byTypeMap.set(asset.asset_type, (byTypeMap.get(asset.asset_type) || 0) + 1);
      byCategory[asset.category] = (byCategory[asset.category] || 0) + 1;
    });

    const by_type: SystemAssetStats['by_type'] = Array.from(byTypeMap.entries()).map(([type, count]) => ({
      asset_type: type,
      category: ASSET_TYPE_META[type].category,
      label: ASSET_TYPE_META[type].label,
      count,
    }));

    return {
      total: systemAssets.length,
      by_type,
      by_category: byCategory,
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
}

