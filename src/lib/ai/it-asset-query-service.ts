/**
 * IT资产中心AI查询服务
 * 支持自然语言查询，通过调用 Provider API 获取数据
 * 
 * 与 IDC 机房的 Text-to-SQL 不同，IT 资产中心使用 Provider 模式，
 * 数据来源是外部 API（数据中台），因此需要 AI 将自然语言转换为 API 调用计划。
 */

import { getConfig } from '@/lib/config';
import { createItAssetDataProvider } from '@/lib/services/it-asset-center/factory';
import type { IItAssetDataProvider } from '@/lib/services/it-asset-center/types';

// ============================================
// 类型定义
// ============================================

export interface ItAssetAIQueryResult {
  success: boolean;
  question: string;
  answer?: string;
  apiCalls?: APICallDescription[];
  result?: unknown;
  /** 格式化的图表数据，用于前端直接渲染图表 */
  chartData?: unknown;
  error?: string;
  userMessage?: string;
  chartRecommendation?: {
    showChart: boolean;
    reason?: string;
    labelField?: string;
    valueFields?: string[];
    seriesNames?: Record<string, string>;
    suggestedType?: 'bar' | 'line' | 'pie' | 'scatter' | 'area';
    title?: string;
    xAxisTitle?: string;
    yAxisTitle?: string;
  };
}

export interface APICallDescription {
  method: string;
  description: string;
  params?: Record<string, unknown>;
  resultSummary?: string;
}

// ============================================
// AI 配置
// ============================================

interface AIConfig {
  aiModel: string;
  aiApiUrl: string;
  aiApiKey: string;
  maxTokens?: number;
}

// ============================================
// Provider API 能力描述（给 AI 看的）
// 列出 IItAssetDataProvider 的所有方法、参数和返回类型
// ============================================

const providerAPICapabilities = `
你是一个 IT 资产中心数据查询助手。你需要根据用户的自然语言问题，规划出需要调用的数据查询 API。

以下是 IT 资产中心数据提供者（IItAssetDataProvider）支持的 API 方法：

## 可用的 API 方法

### 1. querySystems - 查询信息系统列表
- 功能：获取所有信息系统的列表
- 参数（可选）：
  - keyword: 关键词搜索（系统名称、代码、描述、负责人等）
  - status: 系统状态（active/inactive/planning）
  - department: 所属部门
  - parent: 上级系统名称或ID
  - page: 页码（默认1）
  - pageSize: 每页数量（默认10）
- 返回：{ data: InformationSystem[], total: number }
- 适用场景：
  - "有哪些信息系统？"
  - "查询运行中的系统"
  - "统计核心系统数量"
  - "按部门筛选系统"

### 2. querySystemById - 根据ID查询信息系统详情
- 功能：获取单个信息系统的详细信息
- 参数：id（必需）
- 返回：InformationSystem | null
- 适用场景：
  - 查询特定系统的详细信息（通常在已知系统ID时使用）

### 3. queryAssets - 查询资产列表
- 功能：获取所有资产的列表
- 参数（可选）：
  - keyword: 关键词搜索
  - system_id: 所属系统ID
  - asset_type: 资产类型（physical_device/web_server/domain/dns_record等）
  - category: 资产分类（infrastructure/network/data/application/software/operations/external）
  - status: 资产状态
  - page: 页码（默认1）
  - pageSize: 每页数量（默认10，统计时可设大值如10000）
- 返回：{ data: ITAsset[], total: number }
- 适用场景：
  - "有哪些域名资产？"
  - "查询所有网络资产"
  - "统计资产总数"
  - "物理设备按类型分别统计数量"
  - "有哪些Web服务器？"
  - "Web应用按站点类型统计"

### 4. queryAssetById - 根据ID查询资产详情
- 功能：获取单个资产的详细信息
- 参数：id（必需）
- 返回：ITAsset | null
- 适用场景：查询特定资产的详细信息

### 5. queryAssetsBySystemId - 查询指定系统下的资产
- 功能：获取某个信息系统下的所有资产
- 参数：
  - systemId（必需）：信息系统ID
  - 可选：asset_type, category, status, page, pageSize
- 返回：{ data: ITAsset[], total: number }
- 适用场景：
  - "XX系统有哪些资产？"
  - "XX系统下的域名资产"

### 6. querySystemAssetStats - 查询系统资产统计
- 功能：获取某个系统的资产统计数据
- 参数：systemId（必需）
- 返回：SystemAssetStats { total, active_total, by_type, by_category }
- 适用场景：
  - "XX系统有多少资产？"
  - "XX系统的资产统计"

### 7. queryAssetTypes - 查询所有资产类型
- 功能：获取系统支持的所有资产类型列表
- 返回：{ type, category, label }[]
- 适用场景：了解可用的资产类型

### 8. queryDepartments - 查询部门列表
- 功能：获取所有部门列表（用于筛选）
- 返回：string[]
- 适用场景：获取部门选项

### 9. queryDNSRecords - 查询DNS记录列表
- 功能：获取所有DNS记录
- 参数（可选）：domain（域名）
- 返回：{ data: DNSRecordDetail[], total: number }
- 适用场景：
  - "查询所有DNS记录"
  - "查询example.com的DNS记录"

### 10. queryDNSRecordById - 根据ID查询DNS记录详情
- 功能：获取单个DNS记录详情
- 参数：id（必需）
- 返回：DNSRecordDetail | null
- 适用场景：查询特定DNS记录详情

## 重要说明

1. **当前支持的数据**：
   - 信息系统（InformationSystem）：完整支持
   - 物理设备（PhysicalDevice）：完整支持，asset_type 为 "physical_device"
   - Web 服务器（WebServer）：完整支持，中台称 "Web 应用"，asset_type 为 "web_server"，所属分层为 "application"
   - 域名资产（Domain）：完整支持，asset_type 为 "domain"
   - DNS记录（DNSRecord）：完整支持
   - 其他资产类型（数据库、中间件、容器等）：暂不支持，会返回空结果

2. **查询策略**：
   - 对于统计类查询（如"总数"、"平均"等），先获取数据，再在回答中计算
   - 对于列表类查询，返回前1000条数据进行分析
   - 对于需要多步查询的问题（如先查系统再查资产），可以组合多个API调用

3. **数据字段说明**：
   - InformationSystem 主要字段：id, code, name, description, owner, owner_department, status, parent_id, parent_name
   - ITAsset 主要字段：id, system_id, asset_type, category, name, status, description
   - PhysicalDevice（物理设备）特有字段：device_type（设备类型，如服务器/交换机/防火墙/路由器等）, brand, model, sn, ip_address, management_ip, manufacturer, warranty_expiry, department, owner, owner_employee_id, system_name
   - WebServer（Web 服务器 / Web 应用）抽象字段：server_type（Web服务器类型）, ip_address（IP地址）, purpose（用途）
   - WebServer provider 扩展字段（存放在 metadata 中）：agent_id（AgentID）, site_type（站点类型）, app_version（应用版本）, version（版本）, listen_ports（监听端口）, source（来源）, config_file（配置文件）
   - DNSRecordDetail 主要字段：id, domain, record_type, record_value, ttl, domain_status

4. **状态映射**：
   - InformationSystemStatus: active(活跃), inactive(停用), planning(规划中)
   - AssetStatus: active(活跃), inactive(停用), faulty(故障), idle(闲置), unknown(未知)
   - WebServer 默认状态为 active（活跃）
   - AssetCategory: infrastructure(基础设施), network(网络), data(数据), application(应用), software(软件), operations(运维), external(外部)

## 输出格式

请以JSON格式返回API调用计划：
{
  "plan": [
    {
      "step": 1,
      "method": "方法名",
      "params": {...},
      "purpose": "该步骤的目的",
      "dependsOn": 0  // 依赖第0步（即无依赖），或依赖的步骤编号
    }
  ],
  "explanation": "对查询计划的简要说明"
}

注意：
- method 必须是上述列出的方法名
- params 必须符合该方法的参数要求
- 如果需要先获取系统ID再查询资产，可以分两步
- 只返回JSON，不要其他内容
`;

// ============================================
// 服务实现
// ============================================

export class ItAssetAIQueryService {
  private readonly MAX_RETRIES = 3;

  /**
   * 获取AI配置
   */
  private async getAIConfig(): Promise<AIConfig> {
    const mainConfig = getConfig();

    const firstProvider = mainConfig.ai?.providers?.[0];
    if (!firstProvider) {
      throw new Error('未配置AI provider，请在 config.yaml 中配置 ai.providers');
    }

    const firstModel = firstProvider.models?.[0];
    const aiModel = firstModel?.modelId || 'gpt-4o';
    const aiApiUrl = `${firstProvider.baseUrl}/chat/completions`;
    const aiApiKey = firstProvider.apiKey;
    const maxTokens = firstModel?.maxTokens;

    return { aiModel, aiApiUrl, aiApiKey, maxTokens };
  }

  /**
   * 调用AI服务（支持多轮对话）
   */
  private async callAI(
    prompt: string,
    temperature: number = 0.1,
    history?: Array<{ role: string; content: string }>,
    systemPrompt?: string
  ): Promise<string> {
    const { aiModel, aiApiUrl, aiApiKey, maxTokens } = await this.getAIConfig();

    const messages: Array<{ role: string; content: string }> = [];

    messages.push({
      role: 'system',
      content: systemPrompt || '你是一个IT资产中心数据查询助手。',
    });

    if (history && history.length > 0) {
      messages.push(...history.slice(-10));
    }

    messages.push({ role: 'user', content: prompt });

    const response = await fetch(aiApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aiApiKey}`,
      },
      body: JSON.stringify({
        model: aiModel,
        messages,
        stream: false,
        temperature,
        max_tokens: maxTokens || 8000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API请求失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  /**
   * 清理AI响应中的思考过程标签
   */
  private cleanThinkTags(content: string): string {
    return content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  }

  /**
   * 从AI响应中提取JSON
   */
  private extractJSON(content: string): unknown | null {
    const cleaned = this.cleanThinkTags(content);
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * 解析用户意图，生成API调用计划
   */
  private async parseIntent(
    question: string,
    history?: Array<{ role: string; content: string }>
  ): Promise<{
    plan: Array<{ method: string; params: Record<string, unknown>; purpose: string; dependsOn: number }>;
    explanation: string;
  }> {
    let contextPrompt = '';
    if (history && history.length > 0) {
      contextPrompt = '\n这是多轮对话，历史对话如下（供参考）：\n';
      history.slice(-6).forEach((msg) => {
        const role = msg.role === 'user' ? '用户' : '助手';
        contextPrompt += `${role}: ${msg.content.substring(0, 100)}\n`;
      });
      contextPrompt += '\n当前用户问题可能引用之前的内容，请结合上下文理解。\n';
    }

    const prompt = `
${providerAPICapabilities}
${contextPrompt}
当前用户问题: "${question}"

请根据用户问题，规划出需要调用的API方法和参数。
`;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const response = await this.callAI(prompt, 0.1, history);
        const jsonData = this.extractJSON(response);

        if (jsonData && typeof jsonData === 'object') {
          const plan = (jsonData as { plan: Array<{ method: string; params: Record<string, unknown>; purpose: string; dependsOn: number }>; explanation: string });
          if (plan.plan && Array.isArray(plan.plan)) {
            return plan;
          }
        }

        console.warn(`[IT资产 AI] 第${attempt}次尝试解析意图失败，响应:`, response.substring(0, 200));
      } catch (error) {
        console.warn(`[IT资产 AI] 第${attempt}次尝试异常:`, error);
      }
    }

    throw new Error('AI意图解析失败，请尝试更具体的问题');
  }

  /**
   * 执行单个API调用
   */
  private async executeAPICall(
    provider: IItAssetDataProvider,
    method: string,
    params: Record<string, unknown>
  ): Promise<unknown> {
    console.log(`[IT资产 AI] 执行API调用: ${method}`, params);

    const methodMap: Record<string, keyof IItAssetDataProvider> = {
      querySystems: 'querySystems',
      querySystemById: 'querySystemById',
      queryAssets: 'queryAssets',
      queryAssetById: 'queryAssetById',
      queryAssetsBySystemId: 'queryAssetsBySystemId',
      querySystemAssetStats: 'querySystemAssetStats',
      queryAssetTypes: 'queryAssetTypes',
      queryDepartments: 'queryDepartments',
      queryDNSRecords: 'queryDNSRecords',
      queryDNSRecordById: 'queryDNSRecordById',
    };

    const providerMethod = methodMap[method];
    if (!providerMethod || typeof provider[providerMethod] !== 'function') {
      throw new Error(`未知的API方法: ${method}`);
    }

    switch (method) {
      case 'querySystems':
        return await provider.querySystems(params as any);
      case 'querySystemById':
        return await provider.querySystemById(params.id as string);
      case 'queryAssets':
        return await provider.queryAssets(params as any);
      case 'queryAssetById':
        return await provider.queryAssetById(params.id as string);
      case 'queryAssetsBySystemId':
        return await provider.queryAssetsBySystemId(
          params.systemId as string,
          params as any
        );
      case 'querySystemAssetStats':
        return await provider.querySystemAssetStats(params.systemId as string);
      case 'queryAssetTypes':
        return await provider.queryAssetTypes();
      case 'queryDepartments':
        return await provider.queryDepartments();
      case 'queryDNSRecords':
        return await provider.queryDNSRecords(params.domain as string | undefined);
      case 'queryDNSRecordById':
        return await provider.queryDNSRecordById(params.id as string);
      default:
        throw new Error(`未实现的API方法: ${method}`);
    }
  }

  /**
   * 执行API调用计划
   */
  private async executePlan(
    plan: Array<{ method: string; params: Record<string, unknown>; dependsOn: number }>
  ): Promise<{ results: unknown[]; descriptions: APICallDescription[] }> {
    const provider = await createItAssetDataProvider();
    const results: unknown[] = [];
    const descriptions: APICallDescription[] = [];

    for (const step of plan) {
      try {
        const result = await this.executeAPICall(provider, step.method, step.params);
        results.push(result);

        // 生成结果摘要
        let summary = '';
        if (result && typeof result === 'object') {
          if ('data' in result && Array.isArray((result as any).data)) {
            summary = `返回 ${(result as any).data.length} 条记录`;
          } else if ('total' in result) {
            summary = `总共 ${(result as any).total} 条`;
          } else {
            summary = '查询成功';
          }
        } else {
          summary = '查询成功';
        }

        descriptions.push({
          method: step.method,
          description: `调用 ${step.method}(${JSON.stringify(step.params)})`,
          params: step.params,
          resultSummary: summary,
        });
      } catch (error) {
        console.error(`[IT资产 AI] API调用失败: ${step.method}`, error);
        descriptions.push({
          method: step.method,
          description: `调用 ${step.method}(${JSON.stringify(step.params)})`,
          params: step.params,
          resultSummary: `失败: ${String(error)}`,
        });
        results.push(null);
      }
    }

    return { results, descriptions };
  }

  /**
   * 从API结果中提取所有ITAsset对象
   */
  private extractAssetsFromResults(results: unknown[]): any[] {
    const assets: any[] = [];
    results.forEach((result) => {
      if (result && typeof result === 'object' && 'data' in result && Array.isArray((result as any).data)) {
        assets.push(...(result as any).data);
      }
    });
    return assets;
  }

  /**
   * 按指定维度对资产进行分组统计
   */
  private aggregateAssets(assets: any[], dimension: string): Array<{ name: string; 数量: number }> {
    const counts = new Map<string, number>();
    assets.forEach((asset) => {
      const value = String(asset?.[dimension] ?? '未知').trim() || '未知';
      counts.set(value, (counts.get(value) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, 数量]) => ({ name, 数量 }))
      .sort((a, b) => b.数量 - a.数量);
  }

  /**
   * 根据用户问题检测分组统计维度
   */
  private detectAggregation(
    question: string,
    results: unknown[]
  ): { chartData: unknown[]; chartRecommendation: ItAssetAIQueryResult['chartRecommendation'] } | null {
    const q = question.toLowerCase();
    const assets = this.extractAssetsFromResults(results);
    if (assets.length === 0) return null;

    let dimension: string | null = null;
    let title = '';

    if (q.includes('物理设备') && (q.includes('按类型') || q.includes('分别统计') || q.includes('类型统计') || q.includes('类型分布') || q.includes('分别有多少'))) {
      dimension = 'device_type';
      title = '物理设备按类型统计';
    } else if (q.includes('资产') && (q.includes('按类型') || q.includes('分别统计') || q.includes('类型统计') || q.includes('类型分布') || q.includes('分别有多少'))) {
      dimension = 'asset_type';
      title = '资产按类型统计';
    } else if (q.includes('按状态') || q.includes('状态统计') || q.includes('状态分布')) {
      dimension = 'status';
      title = '资产按状态统计';
    } else if (q.includes('按系统') || q.includes('系统统计') || q.includes('按所属系统') || q.includes('系统分布')) {
      dimension = 'system_name';
      title = '资产按所属系统统计';
    } else if (q.includes('按部门') || q.includes('部门统计') || q.includes('部门分布')) {
      dimension = 'department';
      title = '资产按部门统计';
    }

    if (!dimension) return null;

    const chartData = this.aggregateAssets(assets, dimension);
    if (chartData.length === 0) return null;

    return {
      chartData,
      chartRecommendation: {
        showChart: true,
        reason: `按${dimension}维度统计资产数量`,
        labelField: 'name',
        valueFields: ['数量'],
        seriesNames: { 数量: '数量' },
        suggestedType: chartData.length > 6 ? 'bar' : 'pie',
        title,
      },
    };
  }

  /**
   * 构建生成回答和图表配置的prompt
   */
  private buildAnswerPrompt(
    question: string,
    apiCalls: APICallDescription[],
    results: unknown[],
    precomputed?: { chartData: unknown[]; chartRecommendation: ItAssetAIQueryResult['chartRecommendation'] }
  ): string {
    const precomputedSection = precomputed
      ? `
【重要】我已经为你预先计算好了分组统计结果，请严格基于以下数据生成回答，不要重新分组、不要修改数据：
- 统计维度：${precomputed.chartRecommendation!.title}
- 统计结果：${JSON.stringify(precomputed.chartData)}
- 图表配置：${JSON.stringify(precomputed.chartRecommendation)}

你只需做两件事：
1. 用自然语言描述上述统计结果（总数、各类别数量等）
2. 将上述 chartData 和 chartRecommendation 原样返回
`
      : '';

    return `
你是一个IT资产中心数据查询助手。请根据API调用结果回答用户的问题。

用户问题: "${question}"
${precomputedSection ? `\n${precomputedSection}\n` : '\n'}执行的API调用:
${apiCalls.map((call, i) => `${i + 1}. ${call.description} → ${call.resultSummary}`).join('\n')}

API调用结果（${results.length}个结果）:
${results.map((result, i) => {
  try {
    const jsonStr = JSON.stringify(result, null, 2);
    return `结果${i + 1}: ${jsonStr.length > 2000 ? jsonStr.substring(0, 2000) + '...(截断)' : jsonStr}`;
  } catch {
    return `结果${i + 1}: (无法序列化)`;
  }
}).join('\n\n')}

要求:
1. 用自然语言回答用户的问题
2. 基于API调用结果给出准确的数据
3. 回答要简洁明了
4. 如果结果是空数组，说明没有找到相关数据
5. 可以适当补充一些分析或建议

分组统计说明:
当用户要求"按XX统计"或"分别统计"时，请按以下规则处理：
- 如果问题是关于"物理设备按类型"，则按 ITAsset 的 device_type 字段分组统计数量
- 如果问题是关于"按状态"，则按 status 字段分组统计数量
- 如果问题是关于"按所属系统"，则按 system_name 或 system_id 字段分组统计数量
- 分组统计时，先调用 queryAssets 获取全部数据（建议 pageSize=10000），然后在结果中按字段分组计数
- 分组结果用于生成图表时，标签字段为分组字段值（如 device_type），数值字段为"数量"或"总数"

图表配置推荐:
请分析查询结果，判断是否应该显示图表，以及如何选择合适的图表配置：
- 如果是列表类查询（如"有哪些系统"），showChart应为false
- 如果是统计类查询（如"各系统资产数量"、"物理设备按类型统计"），showChart应为true
- 横轴标签字段应选择有意义的名称字段（如name、device_type、system_name等），避免使用id字段
- 数值字段应选择统计值或数量字段

图表数据格式:
如果需要显示图表，请将数据转换为以下格式之一：
1. 数组格式（推荐）: [{"name": "标签1", "value": 10}, {"name": "标签2", "value": 20}]
   - name: 标签名称字段（如系统名、设备类型、部门名等）
   - value: 数值字段（如数量、总数等）
   - 多系列可以使用多个数值字段: [{"name": "标签1", "total": 10, "running": 5}]
   - 注意：字段名要清晰，可以用"总数"、"运行中"、"数量"等中文

物理设备按类型统计示例:
当用户问"物理设备按类型分别统计数量"时，调用 queryAssets({ asset_type: "physical_device", pageSize: 10000 }) 获取数据，
然后按 device_type 分组计数，最终返回如下格式：
{
  "answer": "当前系统中物理设备共XX台，其中服务器XX台、交换机XX台、防火墙XX台、路由器XX台。",
  "chartData": [
    {"name": "服务器", "数量": 10},
    {"name": "交换机", "数量": 5},
    {"name": "防火墙", "数量": 2},
    {"name": "路由器", "数量": 3}
  ],
  "chartRecommendation": {
    "showChart": true,
    "labelField": "name",
    "valueFields": ["数量"],
    "seriesNames": {"数量": "设备数量"},
    "suggestedType": "bar",
    "title": "物理设备按类型统计"
  }
}

必须以JSON格式返回，格式如下：
{
  "answer": "自然语言回答",
  "chartData": [
    {"name": "系统名1", "总数": 10, "运行中": 8},
    {"name": "系统名2", "总数": 5, "运行中": 3}
  ],
  "chartRecommendation": {
    "showChart": true,
    "reason": "推荐理由",
    "labelField": "name",
    "valueFields": ["总数", "运行中"],
    "seriesNames": {
      "总数": "总数",
      "运行中": "运行中数量"
    },
    "suggestedType": "bar",
    "title": "图表标题"
  }
}

注意：
- chartData 必须是一个对象数组，每个对象包含标签字段和数值字段
- 标签字段一般是系统名、部门名等名称字段
- 数值字段一般是数量、总数等统计字段
- 如果不需要显示图表，chartData 可以为 null
- seriesNames用于将字段名映射为友好的中文显示名称
- 常见的数值字段如total、count等应该映射为"总数"、"数量"等
- 如果字段名本身就很清晰，可以保持原样

只返回JSON，不要其他内容。
`;
  }

  /**
   * 生成自然语言回答和图表配置
   */
  private async generateAnswer(
    question: string,
    apiCalls: APICallDescription[],
    results: unknown[],
    precomputed?: { chartData: unknown[]; chartRecommendation: ItAssetAIQueryResult['chartRecommendation'] }
  ): Promise<{ answer: string; chartData?: unknown; chartRecommendation?: ItAssetAIQueryResult['chartRecommendation'] }> {
    const prompt = this.buildAnswerPrompt(question, apiCalls, results, precomputed);

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const response = await this.callAI(prompt, 0.3);

        const thinkMatch = response.match(/<think>([\s\S]*?)<\/think>/i);
        const thinkContent = thinkMatch ? thinkMatch[1].trim() : '';

        const cleanedResponse = this.cleanThinkTags(response);
        const jsonData = this.extractJSON(cleanedResponse);

        if (jsonData && typeof jsonData === 'object') {
          const data = jsonData as { answer?: string; chartData?: unknown; chartRecommendation?: ItAssetAIQueryResult['chartRecommendation'] };

          const finalAnswer = thinkContent
            ? `<think>\n${thinkContent}\n</think>\n\n${data.answer || ''}`
            : (data.answer || cleanedResponse);

          if (finalAnswer && finalAnswer.trim() !== '') {
            return {
              answer: finalAnswer,
              chartData: data.chartData,
              chartRecommendation: data.chartRecommendation,
            };
          }
        }

        return { answer: cleanedResponse };
      } catch (error) {
        console.warn(`[IT资产 AI] 第${attempt}次尝试生成回答失败:`, error);
      }
    }

    return { answer: '抱歉，生成回答时出现错误，请稍后重试。' };
  }

  /**
   * 处理用户查询（主流程）
   */
  async processQuery(
    question: string,
    history?: Array<{ role: string; content: string }>
  ): Promise<ItAssetAIQueryResult> {
    try {
      console.log(`[IT资产 AI] 处理查询: "${question}"`);

      // 步骤1: AI解析用户意图，生成API调用计划
      const { plan, explanation } = await this.parseIntent(question, history);
      console.log(`[IT资产 AI] 查询计划:`, explanation);

      // 步骤2: 执行API调用计划
      const { results, descriptions } = await this.executePlan(plan);

      // 步骤3: 检测是否需要分组统计，并预先计算分组结果
      const aggregation = this.detectAggregation(question, results);

      // 步骤4: AI生成自然语言回答和图表配置
      const { answer, chartData, chartRecommendation } = await this.generateAnswer(
        question,
        descriptions,
        results,
        aggregation || undefined
      );

      return {
        success: true,
        question,
        answer,
        apiCalls: descriptions,
        result: results,
        // 优先使用后端预计算的分组统计结果，确保数据准确性
        chartData: aggregation?.chartData || chartData,
        chartRecommendation: aggregation?.chartRecommendation || chartRecommendation,
      };
    } catch (error) {
      console.error('[IT资产 AI] 查询处理失败:', error);
      return {
        success: false,
        question,
        error: String(error),
        userMessage: '抱歉，处理您的问题时出现错误，请稍后重试。',
      };
    }
  }
}

// 导出单例
export const itAssetAIQueryService = new ItAssetAIQueryService();
