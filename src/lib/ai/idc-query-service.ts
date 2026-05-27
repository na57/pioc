/**
 * IDC机房AI查询服务
 * 支持Text-to-SQL查询，包含实体解析和模糊匹配
 */

import { entityResolver, EntityResolutionResult, EntityMatch } from './entity-resolver';
import { query } from '@/lib/database/connection';
import { getConfig } from '@/lib/config';
import { loadIdcRoomConfig } from '@/lib/config/idc-room';

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
   - device_type: TINYINT 设备类型(1服务器,2交换机,3路由器,4存储设备,5防火墙,6其他)
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

export interface AIQueryResult {
  success: boolean;
  question: string;
  answer?: string;
  sql?: string;
  result?: unknown;
  entities?: EntityResolutionResult;
  needsClarification?: boolean;
  clarificationMessage?: string;
  candidates?: EntityMatch[];
  error?: string;
}

export class IdcAIQueryService {
  /**
   * 获取AI配置
   */
  private async getAIConfig() {
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
   * 调用AI服务
   */
  private async callAI(prompt: string, temperature: number = 0.1): Promise<string> {
    const { aiModel, aiApiUrl, aiApiKey } = await this.getAIConfig();

    const response = await fetch(aiApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aiApiKey}`,
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [{ role: 'user', content: prompt }],
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
   * 处理用户查询
   */
  async processQuery(question: string): Promise<AIQueryResult> {
    try {
      // 步骤1: AI提取查询意图和实体
      const extraction = await this.extractIntentAndEntities(question);

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

      // 步骤4: 生成SQL
      const sql = await this.generateSQL(extraction, entityResult);

      // 步骤5: 执行SQL
      const queryResult = await query(sql);

      // 步骤6: AI生成自然语言回答
      const answer = await this.generateAnswer(question, sql, queryResult);

      return {
        success: true,
        question,
        answer,
        sql,
        result: queryResult,
        entities: entityResult,
      };
    } catch (error) {
      console.error('AI查询处理失败:', error);
      return {
        success: false,
        question,
        error: String(error),
      };
    }
  }

  /**
   * 提取查询意图和实体
   */
  private async extractIntentAndEntities(question: string): Promise<{
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
    const prompt = `
你是一个IDC机房数据查询分析助手。请分析用户的问题，提取查询意图和涉及的实体。

数据库Schema:
${idcDatabaseSchema}

用户问题: "${question}"

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
2. 只返回JSON，不要其他解释
3. 如果无法确定某个字段，可以省略或设为null
`;

    let content = await this.callAI(prompt, 0.1);
    
    // 移除 <think> 标签及其内容
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    
    // 提取JSON部分
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : '{}';
    
    return JSON.parse(jsonStr);
  }

  /**
   * 生成SQL查询
   */
  private async generateSQL(
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
    entityResult: EntityResolutionResult
  ): Promise<string> {
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

    const prompt = `
你是一个IDC机房数据查询SQL生成助手。请根据用户意图和已解析的实体生成MySQL查询语句。

数据库Schema:
${idcDatabaseSchema}

用户意图: ${extraction.intent}
查询类型: ${extraction.queryType}
已解析实体:
${entityInfo.join('\n') || '无特定实体'}

设备类型映射:
- 服务器: device_type = 1
- 交换机: device_type = 2
- 路由器: device_type = 3
- 存储设备: device_type = 4
- 防火墙: device_type = 5
- 其他: device_type = 6

要求:
1. 只返回SQL语句，不要其他解释
2. 使用标准的MySQL语法
3. 表名使用实际的数据库表名(pioc_idc_xxx)
4. 字段名使用下划线命名法
5. 如果涉及机房名称模糊匹配，使用LIKE '%关键词%'
6. 对于聚合查询，使用有意义的别名
7. 只查询启用的记录(status=1)，除非用户明确要求查询所有
8. 如果需要关联查询，使用JOIN

SQL:
`;

    let sql = await this.callAI(prompt, 0.1);
    sql = sql.trim();
    
    // 移除 <think> 标签及其内容（先移除，避免影响后续处理）
    sql = sql.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    
    // 清理SQL（去除markdown代码块标记）
    // 匹配 ```sql 或 ``` 开头，``` 结尾的代码块
    const codeBlockMatch = sql.match(/```(?:sql)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      sql = codeBlockMatch[1].trim();
    } else {
      // 如果没有匹配到代码块格式，尝试直接移除标记
      sql = sql.replace(/^```sql\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/g, '').trim();
    }
    
    // 如果解析到了具体实体ID，替换SQL中的条件
    if (entityResult.room) {
      sql = sql.replace(/room_id\s*=\s*['"]%?[^'"%]+%?['"]/i, `room_id = '${entityResult.room.id}'`);
    }
    if (entityResult.cabinet) {
      sql = sql.replace(/cabinet_id\s*=\s*['"]%?[^'"%]+%?['"]/i, `cabinet_id = '${entityResult.cabinet.id}'`);
    }

    return sql;
  }

  /**
   * 生成自然语言回答
   */
  private async generateAnswer(
    question: string,
    sql: string,
    result: unknown
  ): Promise<string> {
    const prompt = `
你是一个IDC机房数据查询助手。请根据查询结果回答用户的问题。

用户问题: "${question}"

执行的SQL: ${sql}

查询结果: ${JSON.stringify(result, null, 2)}

要求:
1. 用自然语言回答用户的问题
2. 基于查询结果给出准确的数据
3. 回答要简洁明了
4. 如果结果是空数组，说明没有找到相关数据
5. 可以适当补充一些分析或建议

回答:
`;

    return await this.callAI(prompt, 0.3);
  }

  /**
   * 使用已确认的实体重新查询
   */
  async queryWithConfirmedEntity(
    question: string,
    confirmedEntity: EntityMatch
  ): Promise<AIQueryResult> {
    try {
      // 重新提取意图
      const extraction = await this.extractIntentAndEntities(question);

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

      // 生成SQL
      const sql = await this.generateSQL(extraction, entityResult);

      // 执行SQL
      const queryResult = await query(sql);

      // 生成回答
      const answer = await this.generateAnswer(question, sql, queryResult);

      return {
        success: true,
        question,
        answer,
        sql,
        result: queryResult,
        entities: entityResult,
      };
    } catch (error) {
      console.error('确认实体后查询失败:', error);
      return {
        success: false,
        question,
        error: String(error),
      };
    }
  }
}

// 导出单例
export const idcAIQueryService = new IdcAIQueryService();
