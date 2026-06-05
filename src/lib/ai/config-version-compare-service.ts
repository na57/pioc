/**
 * 配置版本AI比对服务
 * 提供两个配置版本的智能差异分析功能
 */

import { BaseAIQueryService, BaseAIQueryResult, AIConfig } from './base-ai-query-service';
import { getConfigSysConfig } from '@/lib/config/configsys';
import { getConfig } from '@/lib/config';

export interface ConfigVersionCompareResult extends BaseAIQueryResult {
  summary?: string;
  changes?: Array<{
    type: 'add' | 'remove' | 'modify';
    category: string;
    description: string;
    risk: 'low' | 'medium' | 'high';
    suggestion: string;
  }>;
  impact?: string;
}

export class ConfigVersionCompareService extends BaseAIQueryService {
  /**
   * 获取日志前缀
   */
  protected getLogPrefix(): string {
    return 'ConfigVersionCompare';
  }

  /**
   * 获取AI配置
   * 优先级：
   * 1. configsys.yaml 中的 ai.providerId
   * 2. config.yaml 中 ai.providers 的第一个配置
   */
  protected async getAIConfig(): Promise<AIConfig> {
    const mainConfig = getConfig();

    // 1. 首先尝试获取配置管理应用的专用AI配置
    const configsysConfig = getConfigSysConfig();
    let providerId = configsysConfig?.ai?.providerId;

    // 2. 如果没有专用配置，使用全局默认配置
    if (!providerId) {
      // 使用 ai.providers 的第一个 provider 的 providerId
      const firstProvider = mainConfig.ai?.providers?.[0];
      if (firstProvider) {
        providerId = firstProvider.providerId;
      }
    }

    if (!providerId) {
      throw new Error('未配置AI provider，请在 config.yaml 中配置 ai.providers');
    }

    // 3. 在全局 providers 中查找对应的 provider
    const provider = mainConfig.ai?.providers?.find((p) => p.providerId === providerId);

    if (!provider) {
      throw new Error(`未找到AI provider: ${providerId}`);
    }

    const aiModel = provider.models?.[0]?.modelId || 'gpt-4o';
    const aiApiUrl = `${provider.baseUrl}/chat/completions`;
    const aiApiKey = provider.apiKey;

    return { aiModel, aiApiUrl, aiApiKey };
  }

  /**
   * 构建生成回答的prompt模板（此服务不使用此方法，但基类要求实现）
   */
  protected buildAnswerChartPrompt(
    question: string,
    sql: string,
    result: unknown
  ): string {
    return '';
  }

  /**
   * 构建版本比对分析的prompt
   */
  private buildComparePrompt(
    baseVersion: { version_number: string; content: string },
    targetVersion: { version_number: string; content: string },
    configName?: string
  ): string {
    return `
你是一位专业的配置文件差异分析专家。请对比以下两个版本的配置文件，提供详细的差异分析报告。

配置文件名称: ${configName || '未命名'}

当前版本 (${baseVersion.version_number}):
\`\`\`
${baseVersion.content}
\`\`\`

对比版本 (${targetVersion.version_number}):
\`\`\`
${targetVersion.content}
\`\`\`

请按以下JSON格式返回分析结果:
{
  "summary": "版本差异的总体概述，说明主要变更内容和目的",
  "changes": [
    {
      "type": "add|remove|modify",
      "category": "变更类别（如 performance, security, feature, bugfix, config 等）",
      "description": "具体的变更描述",
      "risk": "low|medium|high",
      "suggestion": "针对此变更的建议或注意事项"
    }
  ],
  "impact": "此次变更对系统的整体影响评估，包括性能、安全性、兼容性等方面"
}

要求:
1. summary: 简洁明了，概括主要变更，不超过200字
2. changes: 
   - type: add(新增)、remove(删除)、modify(修改)
   - category: 根据变更性质分类
   - description: 详细描述变更内容
   - risk: 评估变更风险等级
   - suggestion: 提供实用的建议
3. impact: 评估对系统的整体影响

只返回JSON格式数据，不要有其他说明文字。
`;
  }

  /**
   * 比对两个配置版本
   */
  async compareVersions(
    baseVersion: { version_number: string; content: string },
    targetVersion: { version_number: string; content: string },
    configName?: string
  ): Promise<ConfigVersionCompareResult> {
    try {
      const prompt = this.buildComparePrompt(baseVersion, targetVersion, configName);
      const response = await this.callAI(prompt, 0.2);

      // 解析AI响应
      const result = this.parseCompareResponse(response);

      return {
        success: true,
        question: `比对版本: ${baseVersion.version_number} vs ${targetVersion.version_number}`,
        ...result,
      };
    } catch (error) {
      console.error(`[${this.getLogPrefix()}] 版本比对失败:`, error);
      return {
        success: false,
        question: `比对版本: ${baseVersion.version_number} vs ${targetVersion.version_number}`,
        error: String(error),
        userMessage: 'AI版本比对失败，请稍后重试',
      };
    }
  }

  /**
   * 解析AI比对响应
   */
  private parseCompareResponse(response: string): Omit<ConfigVersionCompareResult, 'success' | 'question' | 'error' | 'userMessage'> {
    try {
      // 清理think标签
      const cleanedResponse = this.cleanThinkTags(response);

      // 尝试提取JSON
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return {
          summary: data.summary || '',
          changes: data.changes || [],
          impact: data.impact || '',
        };
      }

      // 如果无法解析JSON，返回默认值
      return {
        summary: '无法解析AI响应',
        changes: [],
        impact: '',
      };
    } catch (e) {
      console.error(`[${this.getLogPrefix()}] 解析响应失败:`, e);
      return {
        summary: '解析响应失败',
        changes: [],
        impact: '',
      };
    }
  }
}

// 导出单例
export const configVersionCompareService = new ConfigVersionCompareService();
