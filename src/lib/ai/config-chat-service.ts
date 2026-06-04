/**
 * 配置文件 AI 问答服务
 * 基于配置文件内容进行智能问答
 */

import { BaseAIQueryService, BaseAIQueryResult, AIConfig } from './base-ai-query-service';
import { getConfigSysConfig } from '@/lib/config/configsys';
import { getConfig } from '@/lib/config';

export interface ConfigChatResult extends BaseAIQueryResult {
  answer?: string;
  suggestions?: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class ConfigChatService extends BaseAIQueryService {
  /**
   * 获取日志前缀
   */
  protected getLogPrefix(): string {
    return 'ConfigChat';
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
   * 构建系统提示词
   */
  private buildSystemPrompt(configContent: string, configName?: string): string {
    return `你是一位专业的配置文件分析助手。用户正在查看一个配置文件，并想基于配置内容向你提问。

配置文件名称: ${configName || '未命名'}

配置文件内容:
\`\`\`
${configContent}
\`\`\`

请基于上述配置文件内容回答用户的问题。如果问题与配置内容无关，请礼貌地告知用户你只能回答与当前配置相关的问题。

回答要求:
1. 回答要准确、简洁、专业
2. 如果涉及配置项，请明确指出配置项名称和值
3. 如果用户询问配置的作用或影响，请详细解释
4. 如果用户询问配置的最佳实践或改进建议，请提供专业的建议
5. 使用中文回答

在回答结束后，你可以根据对话上下文，提供2-3个相关的后续问题建议。`;
  }

  /**
   * 配置文件问答
   * @param question 用户问题
   * @param configContent 配置文件内容
   * @param configName 配置文件名称
   * @param history 对话历史
   */
  async chat(
    question: string,
    configContent: string,
    configName?: string,
    history?: ChatMessage[]
  ): Promise<ConfigChatResult> {
    try {
      const systemPrompt = this.buildSystemPrompt(configContent, configName);
      
      // 转换历史消息格式
      const formattedHistory = history?.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await this.callAI(question, 0.7, formattedHistory, systemPrompt);

      // 解析响应，提取回答和建议问题
      const { answer, suggestions } = this.parseResponse(response);

      return {
        success: true,
        question,
        answer,
        suggestions,
      };
    } catch (error) {
      console.error(`[${this.getLogPrefix()}] 问答失败:`, error);
      return {
        success: false,
        question,
        error: String(error),
        userMessage: 'AI问答失败，请稍后重试',
      };
    }
  }

  /**
   * 解析AI响应
   */
  private parseResponse(response: string): { answer: string; suggestions: string[] } {
    // 清理think标签
    const cleanedResponse = this.cleanThinkTags(response);

    // 尝试提取建议问题（通常在回答末尾，以"建议问题:"、"后续问题:"等标识）
    const suggestionPatterns = [
      /(?:建议问题|后续问题|相关问题|您可能还想问)[：:]\s*([\s\S]*)/i,
      /(?:Suggested Questions|Follow-up Questions)[：:]\s*([\s\S]*)/i,
    ];

    let answer = cleanedResponse;
    let suggestions: string[] = [];

    for (const pattern of suggestionPatterns) {
      const match = cleanedResponse.match(pattern);
      if (match) {
        answer = cleanedResponse.substring(0, match.index).trim();
        const suggestionsText = match[1].trim();
        // 解析建议问题列表
        suggestions = suggestionsText
          .split(/\n/)
          .map(line => line.trim())
          .filter(line => line && (line.match(/^\d+[.．、]/) || line.match(/^[-•*]/)))
          .map(line => line.replace(/^\d+[.．、]\s*/, '').replace(/^[-•*]\s*/, ''))
          .filter(q => q.length > 0);
        break;
      }
    }

    // 如果没有找到建议问题，尝试从最后几行提取
    if (suggestions.length === 0) {
      const lines = cleanedResponse.split('\n').filter(line => line.trim());
      const lastLines = lines.slice(-5);
      const questionLines = lastLines.filter(line => 
        line.includes('?') || line.includes('？') || line.match(/^(如何|什么|为什么|怎样|是否|可以)/)
      );
      if (questionLines.length > 0) {
        answer = lines.slice(0, lines.length - questionLines.length).join('\n').trim();
        suggestions = questionLines.slice(0, 3);
      }
    }

    return {
      answer: answer || cleanedResponse,
      suggestions: suggestions.slice(0, 3), // 最多返回3个建议
    };
  }
}

// 导出单例
export const configChatService = new ConfigChatService();
