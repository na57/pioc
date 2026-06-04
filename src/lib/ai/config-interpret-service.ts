/**
 * 配置文件AI解读服务
 * 提供配置文件的智能分析、类型识别、风险评估等功能
 */

import { BaseAIQueryService, BaseAIQueryResult, AIConfig } from './base-ai-query-service';
import { getConfigSysConfig } from '@/lib/config/configsys';
import { getConfig } from '@/lib/config';

export interface ConfigInterpretResult extends BaseAIQueryResult {
  detectedType?: string;
  summary?: string;
  keyItems?: Array<{
    name: string;
    value: string;
    description: string;
  }>;
  riskAssessment?: {
    level: 'low' | 'medium' | 'high';
    findings: string[];
  };
}

export class ConfigInterpretService extends BaseAIQueryService {
  /**
   * 获取日志前缀
   */
  protected getLogPrefix(): string {
    return 'ConfigInterpret';
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
   * 构建配置解读的prompt
   */
  private buildInterpretPrompt(configContent: string, configName?: string): string {
    return `
你是一位专业的配置文件分析专家。请分析以下配置文件，提供详细的解读报告。

配置文件名称: ${configName || '未命名'}
配置文件内容:
\`\`\`
${configContent}
\`\`\`

请按以下JSON格式返回分析结果:
{
  "detectedType": "检测到的配置类型（如 Nginx, Apache, MySQL, Redis, Kubernetes, Docker, etc.）",
  "summary": "配置的总体概述，包括主要用途和功能",
  "keyItems": [
    {
      "name": "配置项名称",
      "value": "配置项值",
      "description": "该配置项的作用说明"
    }
  ],
  "riskAssessment": {
    "level": "low|medium|high",
    "findings": ["发现的风险点或安全建议"]
  }
}

要求:
1. detectedType: 准确识别配置类型
2. summary: 简洁明了，不超过200字
3. keyItems: 提取5-10个关键配置项，包含名称、值和说明
4. riskAssessment:
   - level 根据风险程度选择 low/medium/high
   - findings 列出所有发现的安全风险和改进建议

只返回JSON格式数据，不要有其他说明文字。
`;
  }

  /**
   * 解读配置文件
   */
  async interpretConfig(
    configContent: string,
    configName?: string
  ): Promise<ConfigInterpretResult> {
    try {
      const prompt = this.buildInterpretPrompt(configContent, configName);
      const response = await this.callAI(prompt, 0.2);

      // 解析AI响应
      const result = this.parseInterpretResponse(response);

      return {
        success: true,
        question: `解读配置文件: ${configName || '未命名'}`,
        ...result,
      };
    } catch (error) {
      console.error(`[${this.getLogPrefix()}] 配置解读失败:`, error);
      return {
        success: false,
        question: `解读配置文件: ${configName || '未命名'}`,
        error: String(error),
        userMessage: 'AI解读失败，请稍后重试',
      };
    }
  }

  /**
   * 解析AI解读响应
   */
  private parseInterpretResponse(response: string): Omit<ConfigInterpretResult, 'success' | 'question' | 'error' | 'userMessage'> {
    try {
      // 清理think标签
      const cleanedResponse = this.cleanThinkTags(response);

      // 尝试提取JSON
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return {
          detectedType: data.detectedType || 'Unknown',
          summary: data.summary || '',
          keyItems: data.keyItems || [],
          riskAssessment: data.riskAssessment || { level: 'low', findings: [] },
        };
      }

      // 如果无法解析JSON，返回默认值
      return {
        detectedType: 'Unknown',
        summary: '无法解析AI响应',
        keyItems: [],
        riskAssessment: { level: 'low', findings: [] },
      };
    } catch (e) {
      console.error(`[${this.getLogPrefix()}] 解析响应失败:`, e);
      return {
        detectedType: 'Unknown',
        summary: '解析响应失败',
        keyItems: [],
        riskAssessment: { level: 'low', findings: [] },
      };
    }
  }
}

// 导出单例
export const configInterpretService = new ConfigInterpretService();
