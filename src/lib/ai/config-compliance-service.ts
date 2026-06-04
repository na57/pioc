/**
 * 配置合规检查服务
 * 使用AI对配置文件进行合规性检查
 */

import { BaseAIQueryService, BaseAIQueryResult, AIConfig } from './base-ai-query-service';
import { getConfigSysConfig } from '@/lib/config/configsys';
import { getConfig } from '@/lib/config';

export interface ComplianceFinding {
  rule: string;
  status: 'pass' | 'fail' | 'warning';
  details: string;
  suggestion: string;
  severity?: 'low' | 'medium' | 'high';
}

export interface ConfigComplianceResult extends BaseAIQueryResult {
  ruleId?: number;
  ruleName?: string;
  ruleSummary?: string;
  overallStatus?: 'pass' | 'fail' | 'warning';
  findings?: ComplianceFinding[];
  summary?: string;
}

export class ConfigComplianceService extends BaseAIQueryService {
  /**
   * 获取日志前缀
   */
  protected getLogPrefix(): string {
    return 'ConfigCompliance';
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
   * 构建合规检查的prompt
   */
  private buildCompliancePrompt(
    configContent: string,
    complianceRule: string,
    configName?: string
  ): string {
    return `
你是一位专业的配置合规检查专家。请根据以下合规规则，检查配置文件是否符合要求。

## 配置文件名称
${configName || '未命名'}

## 配置文件内容
\`\`\`
${configContent}
\`\`\`

## 合规规则
${complianceRule}

## 检查要求
请根据合规规则，逐一检查配置文件中的相关配置项。对于每条规则：
1. 判断是否合规（pass/fail/warning）
2. 说明检查详情
3. 如不合规，提供具体的改进建议
4. 评估严重程度（low/medium/high）

## 输出格式
请以JSON格式返回检查结果：
{
  "overallStatus": "pass|fail|warning",
  "findings": [
    {
      "rule": "规则描述",
      "status": "pass|fail|warning",
      "details": "检查详情说明",
      "suggestion": "改进建议（如通过则为'继续保持'）",
      "severity": "low|medium|high"
    }
  ],
  "summary": "总体评估摘要，包括通过项数、失败项数、警告项数"
}

注意：
- overallStatus 规则：有任何 fail 则为 fail；无 fail 但有 warning 则为 warning；全部 pass 则为 pass
- 必须逐条检查合规规则中的每一项
- 对于未明确涉及的配置项，可以标记为 warning 并说明
- 只返回JSON格式数据，不要有其他说明文字
`;
  }

  /**
   * 执行合规检查
   */
  async checkCompliance(
    configContent: string,
    complianceRule: string,
    ruleId?: number,
    ruleName?: string,
    configName?: string
  ): Promise<ConfigComplianceResult> {
    try {
      const prompt = this.buildCompliancePrompt(configContent, complianceRule, configName);
      const response = await this.callAI(prompt, 0.2);

      // 解析AI响应
      const result = this.parseComplianceResponse(response);

      return {
        success: true,
        question: `合规检查: ${configName || '未命名配置'}`,
        ruleId,
        ruleName,
        ruleSummary: complianceRule.substring(0, 100) + '...',
        ...result,
      };
    } catch (error) {
      console.error(`[${this.getLogPrefix()}] 合规检查失败:`, error);
      return {
        success: false,
        question: `合规检查: ${configName || '未命名配置'}`,
        ruleId,
        ruleName,
        error: String(error),
        userMessage: 'AI合规检查失败，请稍后重试',
      };
    }
  }

  /**
   * 解析AI合规检查响应
   */
  private parseComplianceResponse(
    response: string
  ): Omit<ConfigComplianceResult, 'success' | 'question' | 'error' | 'userMessage' | 'ruleId' | 'ruleName' | 'ruleSummary'> {
    try {
      // 清理think标签
      const cleanedResponse = this.cleanThinkTags(response);

      // 尝试提取JSON
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        console.log(`[${this.getLogPrefix()}] 提取的JSON内容:`, jsonMatch[0]);
        const data = JSON.parse(jsonMatch[0]);
        return {
          overallStatus: data.overallStatus || 'warning',
          findings: data.findings || [],
          summary: data.summary || '检查完成',
        };
      }

      // 如果无法解析JSON，返回默认值
      return {
        overallStatus: 'warning',
        findings: [
          {
            rule: '解析检查',
            status: 'warning',
            details: '无法解析AI响应，请检查配置格式',
            suggestion: '请稍后重试或联系管理员',
            severity: 'medium',
          },
        ],
        summary: '检查响应解析失败',
      };
    } catch (e) {
      console.error(`[${this.getLogPrefix()}] 解析响应失败:`, e);
      return {
        overallStatus: 'warning',
        findings: [
          {
            rule: '解析检查',
            status: 'warning',
            details: '解析AI响应时发生错误',
            suggestion: '请稍后重试',
            severity: 'medium',
          },
        ],
        summary: '解析响应失败',
      };
    }
  }
}

// 导出单例
export const configComplianceService = new ConfigComplianceService();
