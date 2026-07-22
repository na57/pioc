/**
 * IDC机房AI查询服务
 * 支持Text-to-SQL查询，包含实体解析和模糊匹配
 */

import { entityResolver, EntityResolutionResult, EntityMatch } from './entity-resolver';
import { query } from '@/lib/database/connection';
import { getConfig } from '@/lib/config';
import { loadIdcRoomConfig } from '@/lib/config/idc-room';
import {
  BaseAIQueryService,
  BaseAIQueryResult,
  AIConfig,
} from './base-ai-query-service';

// 数据库Schema描述
const idcDatabaseSchema = `
数据库包含以下表：

1. pioc_idc_room (机房表)
   - id: VARCHAR(36) 机房ID，主键
   - name: VARCHAR(100) 机房名称，如"呈贡图书馆机房"
   - code: VARCHAR(50) 机房编号
   - location: VARCHAR(200) 所在位置
   - floor: VARCHAR(50) 楼层
   - area: DECIMAL(10,2) 面积(m²)
   - fire_protection_info: TEXT 消防系统信息
   - security_info: TEXT 门禁/监控信息
   - contact_person: VARCHAR(50) 负责人
   - contact_phone: VARCHAR(50) 联系电话
   - built_date: DATE 建成时间
   - remark: TEXT 备注
   - status: TINYINT 状态(1启用,0停用)
   - sort_order: INT 排序
   - created_at: DATETIME 创建时间
   - updated_at: DATETIME 更新时间

2. pioc_idc_cabinet (机柜表)
   - id: VARCHAR(36) 机柜ID，主键
   - room_id: VARCHAR(36) 所属机房ID，外键
   - name: VARCHAR(100) 机柜名称
   - code: VARCHAR(50) 机柜编号
   - total_u: INT 总U数(如42)
   - used_u: INT 已用U数
   - rated_power: DECIMAL(10,2) 额定功率(W)
   - used_power: DECIMAL(10,2) 已用功率(W)
   - position: VARCHAR(100) 位置描述
   - pdu_info: VARCHAR(200) PDU信息
   - status: TINYINT 状态(1启用,0停用)
   - remark: TEXT 备注
   - sort_order: INT 排序
   - created_at: DATETIME 创建时间
   - updated_at: DATETIME 更新时间

3. pioc_idc_device (设备表)
   - id: VARCHAR(36) 设备ID，主键
   - cabinet_id: VARCHAR(36) 所属机柜ID，外键
   - name: VARCHAR(100) 设备名称
   - device_type: TINYINT 设备类型(1服务器,2网络设备,3安全设备,4其他,5预留空间,6存储设备)
   - brand_model: VARCHAR(100) 品牌型号
   - asset_no: VARCHAR(100) 资产编号
   - start_u: INT 起始U位
   - occupy_u: INT 占用U数
   - rated_power: DECIMAL(10,2) 额定功率(W)
   - status: TINYINT 状态(1在线,2离线,3维修中,4已报废)
   - online_date: DATE 上线日期
   - remark: TEXT 备注
   - sort_order: INT 排序
   - created_at: DATETIME 创建时间
   - updated_at: DATETIME 更新时间

4. pioc_idc_room_ac (机房空调表)
   - id: VARCHAR(36) 空调ID
   - room_id: VARCHAR(36) 所属机房ID
   - name: VARCHAR(100) 空调名称
   - model: VARCHAR(100) 型号
   - cooling_capacity: VARCHAR(50) 制冷量
   - asset_no: VARCHAR(100) 资产编号
   - status: TINYINT 状态
   - remark: TEXT 备注

5. pioc_idc_room_ups (机房UPS表)
   - id: VARCHAR(36) UPS ID
   - room_id: VARCHAR(36) 所属机房ID
   - name: VARCHAR(100) UPS名称
   - model: VARCHAR(100) 型号
   - capacity: VARCHAR(50) 容量
   - asset_no: VARCHAR(100) 资产编号
   - status: TINYINT 状态
   - remark: TEXT 备注

6. pioc_idc_room_battery (机房电池组表)
   - id: VARCHAR(36) 电池组ID
   - room_id: VARCHAR(36) 所属机房ID
   - name: VARCHAR(100) 电池组名称
   - battery_count: INT 电池数量
   - total_capacity: VARCHAR(50) 总容量
   - asset_no: VARCHAR(100) 资产编号
   - status: TINYINT 状态
   - remark: TEXT 备注

7. pioc_idc_room_generator (机房发电机表)
   - id: VARCHAR(36) 发电机ID
   - room_id: VARCHAR(36) 所属机房ID
   - name: VARCHAR(100) 发电机名称
   - model: VARCHAR(100) 型号
   - power: VARCHAR(50) 功率
   - asset_no: VARCHAR(100) 资产编号
   - status: TINYINT 状态
   - remark: TEXT 备注

表关系：
- 一个机房(pioc_idc_room)有多个机柜(pioc_idc_cabinet)，通过room_id关联
- 一个机柜(pioc_idc_cabinet)有多个设备(pioc_idc_device)，通过cabinet_id关联
- 一个机房有多个空调、UPS、电池组、发电机，通过room_id关联
`;

export interface AIQueryResult extends BaseAIQueryResult {
  entities?: EntityResolutionResult;
  needsClarification?: boolean;
  clarificationMessage?: string;
  candidates?: EntityMatch[];
}

// SQL生成结果类型
interface SQLGenerationResult {
  success: boolean;
  sql?: string;
  error?: string;
  rawResponse?: string;
}

export class IdcAIQueryService extends BaseAIQueryService {
  /**
   * 获取AI配置
   */
  protected async getAIConfig(): Promise<AIConfig> {
    // 获取IDC应用配置
    const idcConfig = loadIdcRoomConfig();
    // 获取全局配置
    const mainConfig = getConfig();

    // 从IDC配置中获取providerId，如果没有则使用全局默认
    const providerId = idcConfig.ai?.providerId || mainConfig.ai?.defaultModel || 'openai';

    // 从全局配置中查找对应的provider
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
   * 生成SQL（带重试机制，支持多轮对话）
   */
  private async generateSQLWithRetry(
    extraction: {
      intent: string;
      entities: {
        room?: string;
        cabinet?: string;
        device?: string;
        deviceType?: string;
      };
      queryType: string;
      conditions: Record<string, unknown>;
    },
    entityResult: EntityResolutionResult,
    history?: Array<{ role: string; content: string }>
  ): Promise<SQLGenerationResult> {
    // 构建实体信息
    const entityInfo: string[] = [];
    if (entityResult.room) {
      entityInfo.push(`机房ID: ${entityResult.room.id} (名称: ${entityResult.room.matched})`);
    }
    if (entityResult.cabinet) {
      entityInfo.push(`机柜ID: ${entityResult.cabinet.id} (名称: ${entityResult.cabinet.matched})`);
    }
    if (entityResult.device) {
      entityInfo.push(`设备ID: ${entityResult.device.id} (名称: ${entityResult.device.matched})`);
    }

    const basePrompt = `
你是一个IDC机房数据查询SQL生成助手。请根据用户意图和已解析的实体生成MySQL查询语句。

数据库Schema:
${idcDatabaseSchema}

用户意图: ${extraction.intent}
查询类型: ${extraction.queryType}
已解析实体:
${entityInfo.join('\n') || '无特定实体'}

设备类型映射:
- 服务器: device_type = 1
- 网络设备(交换机/路由器/防火墙等): device_type = 2
- 安全设备: device_type = 3
- 其他: device_type = 4
- 预留空间: device_type = 5 (用于散热/维护预留，不计入设备数量统计)
- 存储设备(磁盘阵列/NAS/SAN等): device_type = 6

要求:
1. 只使用SELECT查询，禁止INSERT/UPDATE/DELETE/DROP等操作
2. 使用标准的MySQL语法
3. 表名使用实际的数据库表名(pioc_idc_xxx)
4. 字段名使用下划线命名法
5. 只查询启用的记录(status=1)，除非用户明确要求查询所有
6. 如果需要关联查询，使用JOIN
`;

    let lastError: string | undefined;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        // 构建prompt，要求JSON格式输出
        const prompt = basePrompt + `

重要：必须以JSON格式返回，格式如下：
{
  "sql": "生成的SQL语句（不要包含markdown代码块标记）",
  "explanation": "SQL的简要说明（可选）"
}

只返回JSON，不要其他内容。
`;

        console.log(`[IDC AI] SQL生成尝试 ${attempt}/${this.MAX_RETRIES}`);
        const response = await this.callAI(prompt, 0.1, history);
        console.log(`[IDC AI] AI原始响应:`, response.substring(0, 500));

        // 提取SQL
        const extractResult = this.extractSQL(response);

        if (!extractResult.success) {
          lastError = extractResult.error;
          console.warn(`[IDC AI] 第${attempt}次尝试提取SQL失败:`, extractResult.error);
          continue;
        }

        let sql = extractResult.sql!;

        // 安全检查
        const safetyCheck = this.validateSQLSafety(sql);
        if (!safetyCheck.valid) {
          lastError = safetyCheck.error;
          console.warn(`[IDC AI] 第${attempt}次尝试SQL安全检查失败:`, safetyCheck.error);
          continue;
        }

        // 替换实体ID
        if (entityResult.room) {
          sql = sql.replace(/room_id\s*=\s*['"]%?[^'"%]+%?['"]/i, `room_id = '${entityResult.room.id}'`);
        }
        if (entityResult.cabinet) {
          sql = sql.replace(/cabinet_id\s*=\s*['"]%?[^'"%]+%?['"]/i, `cabinet_id = '${entityResult.cabinet.id}'`);
        }

        console.log(`[IDC AI] SQL生成成功:`, sql.substring(0, 200));
        return { success: true, sql };

      } catch (error) {
        lastError = String(error);
        console.error(`[IDC AI] 第${attempt}次尝试异常:`, error);
      }
    }

    // 所有重试都失败了
    console.error(`[IDC AI] SQL生成失败，已重试${this.MAX_RETRIES}次，最后错误:`, lastError);
    return {
      success: false,
      error: lastError || 'SQL生成失败',
    };
  }

  /**
   * 处理用户查询（支持多轮对话）
   */
  async processQuery(
    question: string,
    history?: Array<{ role: string; content: string }>
  ): Promise<AIQueryResult> {
    try {
      // 步骤1: AI提取查询意图和实体（支持上下文）
      const extraction = await this.extractIntentAndEntities(question, history);

      // 步骤2: 解析实体（模糊匹配）
      const entityResult = await entityResolver.resolveEntities(
        extraction.entities.room,
        extraction.entities.cabinet,
        extraction.entities.device
      );

      // 步骤3: 如果有歧义，返回需要确认
      if (entityResult.hasAmbiguity && entityResult.candidates.length > 0) {
        return {
          success: true,
          question,
          needsClarification: true,
          clarificationMessage: `您是指"${entityResult.candidates[0].matched}"吗？`,
          candidates: entityResult.candidates,
          entities: entityResult,
        };
      }

      // 步骤4: 生成SQL（带重试机制，支持多轮对话）
      const sqlResult = await this.generateSQLWithRetry(extraction, entityResult, history);

      if (!sqlResult.success) {
        return {
          success: false,
          question,
          error: sqlResult.error,
          userMessage: '抱歉，AI生成查询语句时遇到问题，请换个问题试试。',
        };
      }

      const sql = sqlResult.sql!;

      // 步骤5: 执行SQL
      let queryResult: unknown;
      try {
        queryResult = await query(sql);
      } catch (dbError) {
        console.error('[IDC AI] SQL执行失败:', dbError, 'SQL:', sql);
        return {
          success: false,
          question,
          sql,
          error: `SQL执行失败: ${String(dbError)}`,
          userMessage: '抱歉，查询执行时遇到数据库错误，请换个问题试试。',
        };
      }

      // 步骤6: AI生成自然语言回答和图表配置
      const { answer, chartRecommendation } = await this.generateAnswerAndChartConfig(question, sql, queryResult);

      return {
        success: true,
        question,
        answer,
        sql,
        result: queryResult,
        entities: entityResult,
        chartRecommendation,
      };
    } catch (error) {
      console.error('[IDC AI] 查询处理失败:', error);
      return {
        success: false,
        question,
        error: String(error),
        userMessage: '抱歉，处理您的问题时出现错误，请稍后重试。',
      };
    }
  }

  /**
   * 提取查询意图和实体（支持多轮对话上下文）
   */
  private async extractIntentAndEntities(
    question: string,
    history?: Array<{ role: string; content: string }>
  ): Promise<{
    intent: string;
    entities: {
      room?: string;
      cabinet?: string;
      device?: string;
      deviceType?: string;
    };
    queryType: string;
    conditions: Record<string, unknown>;
  }> {
    // 构建上下文提示
    let contextPrompt = '';
    if (history && history.length > 0) {
      contextPrompt = '\n这是多轮对话，历史对话如下（供参考）：\n';
      history.slice(-6).forEach((msg, idx) => {
        const role = msg.role === 'user' ? '用户' : '助手';
        contextPrompt += `${role}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}\n`;
      });
      contextPrompt += '\n当前用户问题可能引用之前的内容，请结合上下文理解。\n';
    }

    const prompt = `
你是一个IDC机房数据查询分析助手。请分析用户的问题，提取查询意图和涉及的实体。

数据库Schema:
${idcDatabaseSchema}
${contextPrompt}
当前用户问题: "${question}"

请分析并返回JSON格式的结果：
{
  "intent": "查询意图描述",
  "entities": {
    "room": "提取的机房名称或简称，如果没有则省略",
    "cabinet": "提取的机柜名称或编号，如果没有则省略",
    "device": "提取的设备名称，如果没有则省略",
    "deviceType": "提取的设备类型(服务器/交换机/路由器/存储设备/防火墙)，如果没有则省略"
  },
  "queryType": "查询类型: count/sum/avg/list/detail/rank",
  "conditions": {
    "status": "状态条件，如'online'/'all'等"
  }
}

注意：
1. 用户可能使用简称，如"图书馆机房"可能是"呈贡图书馆机房"的简称
2. 如果是多轮对话，用户可能使用"刚才"、"之前"、"那个"等指代之前的查询，请结合上下文理解
3. 只返回JSON，不要其他解释
4. 如果无法确定某个字段，可以省略或设为null
`;

    let content = await this.callAI(prompt, 0.1, history);

    // 移除 <think> 标签及其内容
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // 提取JSON部分
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : '{}';

    return JSON.parse(jsonStr);
  }

  /**
   * 获取日志前缀
   */
  protected getLogPrefix(): string {
    return 'IDC AI';
  }

  /**
   * 构建生成回答和图表配置的 prompt 模板
   */
  protected buildAnswerChartPrompt(
    question: string,
    sql: string,
    result: unknown
  ): string {
    return `
你是一个IDC机房数据查询助手。请根据查询结果回答用户的问题，并推荐合适的图表展示方式。

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
- 如果是列表类查询（如"有哪些设备"），showChart应为false
- 如果是统计类查询（如"各机房设备数量"），showChart应为true
- 横轴标签字段应选择有意义的名称字段（如name、code等），避免使用id字段
- 数值字段应选择统计值或数量字段

必须以JSON格式返回，格式如下：
{
  "answer": "自然语言回答",
  "chartRecommendation": {
    "showChart": true/false,
    "reason": "推荐理由",
    "labelField": "横轴标签字段名（如name、code等，避免id）",
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

只返回JSON，不要其他内容。
`;
  }

  /**
   * 使用已确认的实体重新查询（支持多轮对话）
   */
  async queryWithConfirmedEntity(
    question: string,
    confirmedEntity: EntityMatch,
    history?: Array<{ role: string; content: string }>
  ): Promise<AIQueryResult> {
    try {
      // 重新提取意图（支持上下文）
      const extraction = await this.extractIntentAndEntities(question, history);

      // 构建实体结果
      const entityResult: EntityResolutionResult = {
        hasAmbiguity: false,
        candidates: [],
      };

      if (confirmedEntity.type === 'room') {
        entityResult.room = confirmedEntity;
      } else if (confirmedEntity.type === 'cabinet') {
        entityResult.cabinet = confirmedEntity;
      } else if (confirmedEntity.type === 'device') {
        entityResult.device = confirmedEntity;
      }

      // 生成SQL（带重试机制，支持多轮对话）
      const sqlResult = await this.generateSQLWithRetry(extraction, entityResult, history);

      if (!sqlResult.success) {
        return {
          success: false,
          question,
          error: sqlResult.error,
          userMessage: '抱歉，AI生成查询语句时遇到问题，请换个问题试试。',
        };
      }

      const sql = sqlResult.sql!;

      // 执行SQL
      let queryResult: unknown;
      try {
        queryResult = await query(sql);
      } catch (dbError) {
        console.error('[IDC AI] SQL执行失败:', dbError, 'SQL:', sql);
        return {
          success: false,
          question,
          sql,
          error: `SQL执行失败: ${String(dbError)}`,
          userMessage: '抱歉，查询执行时遇到数据库错误，请换个问题试试。',
        };
      }

      // 生成回答和图表配置
      const { answer, chartRecommendation } = await this.generateAnswerAndChartConfig(question, sql, queryResult);

      return {
        success: true,
        question,
        answer,
        sql,
        result: queryResult,
        entities: entityResult,
        chartRecommendation,
      };
    } catch (error) {
      console.error('[IDC AI] 确认实体后查询失败:', error);
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
export const idcAIQueryService = new IdcAIQueryService();
