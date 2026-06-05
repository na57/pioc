/**
 * AI 查询服务基类
 * 提供通用的 AI 查询功能，支持 Text-to-SQL
 */

import { getConfig } from '@/lib/config';

export interface BaseAIQueryResult {
  success: boolean;
  question: string;
  answer?: string;
  sql?: string;
  result?: unknown;
  error?: string;
  userMessage?: string;
  chartRecommendation?: {
    showChart: boolean;
    reason?: string;
    labelField?: string;
    valueFields?: string[];
    suggestedType?: 'bar' | 'line' | 'pie' | 'scatter' | 'area';
    title?: string;
    xAxisTitle?: string;
    yAxisTitle?: string;
  };
}

export interface SQLGenerationResult {
  success: boolean;
  sql?: string;
  error?: string;
  rawResponse?: string;
}

export interface AIConfig {
  aiModel: string;
  aiApiUrl: string;
  aiApiKey: string;
}

export abstract class BaseAIQueryService {
  protected readonly MAX_RETRIES = 3;

  /**
   * 获取AI配置
   * 子类可以覆盖此方法以提供自定义配置逻辑
   */
  protected async getAIConfig(): Promise<AIConfig> {
    const mainConfig = getConfig();

    // 使用 ai.providers 的第一个 provider 的 providerId
    const firstProvider = mainConfig.ai?.providers?.[0];
    if (!firstProvider) {
      throw new Error('未配置AI provider，请在 config.yaml 中配置 ai.providers');
    }

    const aiModel = firstProvider.models?.[0]?.modelId || 'gpt-4o';
    const aiApiUrl = `${firstProvider.baseUrl}/chat/completions`;
    const aiApiKey = firstProvider.apiKey;
    const maxTokens = firstProvider.maxTokens;

    return { aiModel, aiApiUrl, aiApiKey, maxTokens };
  }

  /**
   * 调用AI服务（支持多轮对话）
   */
  protected async callAI(
    prompt: string,
    temperature: number = 0.1,
    history?: Array<{ role: string; content: string }>,
    systemPrompt?: string
  ): Promise<string> {
    const { aiModel, aiApiUrl, aiApiKey, maxTokens } = await this.getAIConfig();

    // 构建消息列表，包含历史对话
    const messages: Array<{ role: string; content: string }> = [];

    // 添加系统提示
    messages.push({
      role: 'system',
      content: systemPrompt || '你是一个数据查询助手。请理解对话上下文，回答用户的问题。',
    });

    // 添加历史消息（最多保留5轮对话）
    if (history && history.length > 0) {
      messages.push(...history.slice(-10)); // 保留最近10条消息（5轮）
    }

    // 添加当前用户消息
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
   * 验证SQL安全性
   * 只允许SELECT语句，禁止其他操作
   */
  protected validateSQLSafety(sql: string): { valid: boolean; error?: string } {
    const upperSQL = sql.trim().toUpperCase();

    // 必须是SELECT开头
    if (!upperSQL.startsWith('SELECT')) {
      return { valid: false, error: '只允许执行SELECT查询' };
    }

    // 禁止危险关键字
    const dangerousKeywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'TRUNCATE', 'ALTER', 'CREATE', 'GRANT', 'REVOKE'];
    for (const keyword of dangerousKeywords) {
      // 使用正则匹配完整的单词
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(sql)) {
        return { valid: false, error: `SQL包含禁止的操作: ${keyword}` };
      }
    }

    // 限制SQL长度
    if (sql.length > 5000) {
      return { valid: false, error: 'SQL语句过长' };
    }

    return { valid: true };
  }

  /**
   * 从AI响应中提取SQL
   */
  protected extractSQL(response: string): SQLGenerationResult {
    // 移除think标签
    const content = response.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // 尝试提取JSON格式
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        if (data.sql && typeof data.sql === 'string') {
          return { success: true, sql: data.sql.trim() };
        }
      }
    } catch (e) {
      // JSON解析失败，继续尝试其他方式
    }

    // 尝试提取代码块
    const codeBlockMatch = content.match(/```(?:sql)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      return { success: true, sql: codeBlockMatch[1].trim() };
    }

    // 尝试查找SELECT语句
    const sqlMatch = content.match(/\bSELECT\b[\s\S]*?;/i);
    if (sqlMatch) {
      return { success: true, sql: sqlMatch[0].trim() };
    }

    // 清理后返回
    const cleaned = content
      .replace(/```sql/gi, '')
      .replace(/```/g, '')
      .trim();

    if (cleaned.toUpperCase().startsWith('SELECT')) {
      return { success: true, sql: cleaned };
    }

    return {
      success: false,
      error: '无法从AI响应中提取有效的SQL语句',
      rawResponse: response,
    };
  }

  /**
   * 自动为SQL添加LIMIT限制
   */
  protected addLimitToSQL(sql: string, defaultLimit: number = 1000, maxLimit: number = 10000): string {
    // 清理SQL
    let cleanedSQL = sql.trim();

    // 移除末尾的分号
    cleanedSQL = cleanedSQL.replace(/;+$/, '');

    // 检查是否已经有 LIMIT
    const hasLimit = /\bLIMIT\s+\d+/i.test(cleanedSQL);

    if (hasLimit) {
      // 如果已有 LIMIT，检查是否超过最大值
      const limitMatch = cleanedSQL.match(/\bLIMIT\s+(\d+)/i);
      if (limitMatch) {
        const limitValue = parseInt(limitMatch[1], 10);
        if (limitValue > maxLimit) {
          // 限制最大值
          cleanedSQL = cleanedSQL.replace(/(\bLIMIT\s+)\d+/i, `$1${maxLimit}`);
        }
      }
      return cleanedSQL;
    }

    // 检查是否是聚合查询（COUNT, SUM, AVG等）
    const isAggregate = /\b(COUNT|SUM|AVG|MAX|MIN)\s*\(/i.test(cleanedSQL);

    if (isAggregate) {
      // 聚合查询通常返回单行，不需要 LIMIT
      return cleanedSQL;
    }

    // 添加默认 LIMIT
    return `${cleanedSQL} LIMIT ${defaultLimit}`;
  }

  /**
   * 清理AI响应中的思考过程标签
   * 移除 <think>...</think> 标签及其内容
   */
  protected cleanThinkTags(content: string): string {
    // 移除 <think>...</think> 标签及其内容（支持多行）
    return content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  }

  /**
   * 获取日志前缀
   * 子类必须实现此方法提供日志前缀
   */
  protected abstract getLogPrefix(): string;

  /**
   * 构建生成回答和图表配置的 prompt 模板
   * 子类必须实现此方法提供自己的 prompt
   */
  protected abstract buildAnswerChartPrompt(
    question: string,
    sql: string,
    result: unknown
  ): string;

  /**
   * 生成自然语言回答和图表配置（通用实现）
   */
  protected async generateAnswerAndChartConfig(
    question: string,
    sql: string,
    result: unknown
  ): Promise<{ answer: string; chartRecommendation?: BaseAIQueryResult['chartRecommendation'] }> {
    const prompt = this.buildAnswerChartPrompt(question, sql, result);
    const logPrefix = this.getLogPrefix();

    let response = await this.callAI(prompt, 0.3);

    try {
      // 先提取思考过程（如果有的话）
      const thinkMatch = response.match(/<think>([\s\S]*?)<\/think>/i);
      const thinkContent = thinkMatch ? thinkMatch[1].trim() : '';

      // 移除思考过程标签，保留其他内容
      response = response.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

      // 提取JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        // 如果有思考过程，将其添加到回答中
        const finalAnswer = thinkContent
          ? `<think>\n${thinkContent}\n</think>\n\n${data.answer || ''}`
          : (data.answer || response);
        // 如果回答为空，返回默认回答
        if (!finalAnswer || finalAnswer.trim() === '' || finalAnswer.trim() === '<think>\n\n</think>\n\n') {
          return {
            answer: `查询已完成。共找到 ${Array.isArray(result) ? result.length : 0} 条数据。`,
            chartRecommendation: data.chartRecommendation,
          };
        }
        return {
          answer: finalAnswer,
          chartRecommendation: data.chartRecommendation,
        };
      }
    } catch (e) {
      console.warn(`[${logPrefix}] 解析图表配置失败:`, e);
    }

    // 如果解析失败，返回原始回答
    return { answer: response };
  }
}
