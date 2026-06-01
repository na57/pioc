/**
 * 基础 AI 查询服务
 * 提供 Text-to-SQL 查询的通用功能
 */

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
   * 子类必须实现此方法
   */
  protected abstract getAIConfig(): Promise<AIConfig>;

  /**
   * 获取系统提示词
   * 子类可以覆盖此方法自定义系统提示
   */
  protected getSystemPrompt(): string {
    return '你是一个数据查询助手。请理解对话上下文，回答用户的问题。如果用户提到"刚才"、"之前"等词语，请参考历史对话理解其意图。';
  }

  /**
   * 调用AI服务（支持多轮对话）
   */
  protected async callAI(
    prompt: string,
    temperature: number = 0.1,
    history?: Array<{ role: string; content: string }>
  ): Promise<string> {
    const { aiModel, aiApiUrl, aiApiKey } = await this.getAIConfig();

    const messages: Array<{ role: string; content: string }> = [];

    messages.push({
      role: 'system',
      content: this.getSystemPrompt(),
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
        max_tokens: 2000,
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

    if (!upperSQL.startsWith('SELECT')) {
      return { valid: false, error: '只允许执行SELECT查询' };
    }

    const dangerousKeywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'TRUNCATE', 'ALTER', 'CREATE', 'GRANT', 'REVOKE'];
    for (const keyword of dangerousKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(sql)) {
        return { valid: false, error: `SQL包含禁止的操作: ${keyword}` };
      }
    }

    if (sql.length > 5000) {
      return { valid: false, error: 'SQL语句过长' };
    }

    return { valid: true };
  }

  /**
   * 从AI响应中提取SQL
   */
  protected extractSQL(response: string): SQLGenerationResult {
    const content = response.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

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

    const codeBlockMatch = content.match(/```(?:sql)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      return { success: true, sql: codeBlockMatch[1].trim() };
    }

    const sqlMatch = content.match(/\bSELECT\b[\s\S]*?;/i);
    if (sqlMatch) {
      return { success: true, sql: sqlMatch[0].trim() };
    }

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
  protected addLimitToSQL(sql: string, defaultLimit: number = 20, maxLimit: number = 100): string {
    let cleanedSQL = sql.trim();

    cleanedSQL = cleanedSQL.replace(/;+$/, '');

    const hasLimit = /\bLIMIT\s+\d+/i.test(cleanedSQL);

    if (hasLimit) {
      const limitMatch = cleanedSQL.match(/\bLIMIT\s+(\d+)/i);
      if (limitMatch) {
        const limitValue = parseInt(limitMatch[1], 10);
        if (limitValue > maxLimit) {
          cleanedSQL = cleanedSQL.replace(/(\bLIMIT\s+)\d+/i, `$1${maxLimit}`);
        }
      }
      return cleanedSQL;
    }

    const isAggregate = /\b(COUNT|SUM|AVG|MAX|MIN)\s*\(/i.test(cleanedSQL);

    if (isAggregate) {
      return cleanedSQL;
    }

    return `${cleanedSQL} LIMIT ${defaultLimit}`;
  }

  /**
   * 清理AI响应中的思考过程标签
   */
  protected cleanThinkTags(content: string): string {
    return content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  }

  /**
   * 生成自然语言回答和图表配置
   */
  protected async generateAnswerAndChartConfig(
    question: string,
    sql: string,
    result: unknown,
    contextDescription?: string
  ): Promise<{ answer: string; chartRecommendation?: BaseAIQueryResult['chartRecommendation'] }> {
    const contextPrompt = contextDescription ? `\n${contextDescription}` : '';

    const prompt = `
你是一个数据查询助手。请根据查询结果回答用户的问题，并推荐合适的图表展示方式。

用户问题: "${question}"

执行的SQL: ${sql}

查询结果: ${JSON.stringify(result, null, 2)}

要求:
1. 用自然语言回答用户的问题
2. 基于查询结果给出准确的数据
3. 回答要简洁明了
4. 如果结果是空数组，说明没有找到相关数据
5. 可以适当补充一些分析或建议

图表配置推荐:
请分析查询结果，判断是否应该显示图表，以及如何选择合适的图表配置：
- 如果是列表类查询（如"有哪些记录"、"显示前10条"），showChart应为false
- 如果是统计类查询（如"各分类数量"、"平均值"、"总计"），showChart应为true
- 横轴标签字段应选择有意义的名称字段（如name、title、code等），避免使用id字段
- 数值字段应选择统计值或数量字段

必须以JSON格式返回，格式如下：
{
  "answer": "自然语言回答",
  "chartRecommendation": {
    "showChart": true/false,
    "reason": "推荐理由",
    "labelField": "横轴标签字段名（如name、title、code等，避免id）",
    "valueFields": ["数值字段1", "数值字段2"],
    "seriesNames": {
      "project_count": "项目数量",
      "device_count": "设备数量",
      "total_count": "总数",
      "avg_value": "平均值"
    },
    "suggestedType": "bar/line/pie/area",
    "title": "图表标题",
    "xAxisTitle": "X轴标题",
    "yAxisTitle": "Y轴标题"
  }
}

注意：
- seriesNames用于将SQL字段名映射为友好的中文显示名称
- 常见的数值字段如count、sum、avg等应该映射为"数量"、"总和"、"平均值"等
- 如果字段名本身就很清晰（如"temperature"），可以保持原样或映射为"温度"

只返回JSON，不要其他内容。${contextPrompt}
`;

    const response = await this.callAI(prompt, 0.3);

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        const answer = data.answer || response;
        if (!answer || answer.trim() === '') {
          return {
            answer: `查询已完成。共找到 ${Array.isArray(result) ? result.length : 0} 条数据。`,
            chartRecommendation: data.chartRecommendation,
          };
        }
        return {
          answer,
          chartRecommendation: data.chartRecommendation,
        };
      }
    } catch (e) {
      console.warn('[AI] 解析图表配置失败:', e);
    }

    return { answer: response };
  }

}
