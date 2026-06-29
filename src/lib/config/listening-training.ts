/**
 * 听力训练应用配置
 * 使用通用数据访问框架 - 工厂模式
 */

import {
  TableConfig,
  AppBaseConfig,
  createAppConfigBundle,
  createQueryFunction,
  BaseDataService,
  QueryOptions,
  QueryResult,
} from '@/lib/data-framework';

// ============================================
// 字段映射类型定义
// ============================================

export interface WordbookFieldMapping extends Record<string, string> {
  id: string;
  userId: string;
  name: string;
  description: string;
  source: string;
  totalItems: string;
  createdAt: string;
  updatedAt: string;
}

// 基础词条表（只包含词条内容）
export interface ItemFieldMapping extends Record<string, string> {
  id: string;
  wordbookId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// 用户词条学习状态表
export interface UserItemFieldMapping extends Record<string, string> {
  id: string;
  userId: string;
  itemId: string;
  status: string;
  reviewCount: string;
  lastReviewAt: string;
  nextReviewAt: string;
  history: string;
  createdAt: string;
  updatedAt: string;
}

// 用户设置表
export interface UserSettingsFieldMapping extends Record<string, string> {
  id: string;
  userId: string;
  dailyLimit: string;
  itemOrder: string;
  autoPlay: string;
  reviewUnknownFirst: string;
  playCount: string;
  playInterval: string;
  extraSettings: string;
  createdAt: string;
  updatedAt: string;
}

// 每日学习清单表
export interface DailyPlanFieldMapping extends Record<string, string> {
  id: string;
  userId: string;
  planDate: string;
  itemId: string;
  wordbookId: string;
  itemType: string;
  status: string;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// 应用配置类型
// ============================================

export interface ListeningTrainingConfig extends AppBaseConfig {
  tables: {
    wordbooks: TableConfig<WordbookFieldMapping>;
    items: TableConfig<ItemFieldMapping>;
    userItems: TableConfig<UserItemFieldMapping>;
    userSettings: TableConfig<UserSettingsFieldMapping>;
    dailyPlan: TableConfig<DailyPlanFieldMapping>;
  };
}

// ============================================
// 默认配置
// ============================================

const defaultConfig: ListeningTrainingConfig = {
  // 不使用外部数据源，直接使用主数据库
  tables: {
    wordbooks: {
      name: 'pioc_lt_wordbooks',
      fields: {
        id: 'id',
        userId: 'user_id',
        name: 'name',
        description: 'description',
        source: 'source',
        totalItems: 'total_items',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    },
    items: {
      name: 'pioc_lt_items',
      fields: {
        id: 'id',
        wordbookId: 'wordbook_id',
        content: 'content',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    },
    userItems: {
      name: 'pioc_lt_user_items',
      fields: {
        id: 'id',
        userId: 'user_id',
        itemId: 'item_id',
        status: 'status',
        reviewCount: 'review_count',
        lastReviewAt: 'last_review_at',
        nextReviewAt: 'next_review_at',
        history: 'history',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    },
    userSettings: {
      name: 'pioc_lt_user_settings',
      fields: {
        id: 'id',
        userId: 'user_id',
        dailyLimit: 'daily_limit',
        itemOrder: 'item_order',
        autoPlay: 'auto_play',
        reviewUnknownFirst: 'review_unknown_first',
        playCount: 'play_count',
        playInterval: 'play_interval',
        extraSettings: 'extra_settings',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    },
    dailyPlan: {
      name: 'pioc_lt_daily_plan',
      fields: {
        id: 'id',
        userId: 'user_id',
        planDate: 'plan_date',
        itemId: 'item_id',
        wordbookId: 'wordbook_id',
        itemType: 'item_type',
        status: 'status',
        completedAt: 'completed_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    },
  },
};

// ============================================
// 使用工厂创建应用配置包
// ============================================

const appBundle = createAppConfigBundle<ListeningTrainingConfig>({
  defaultConfig,
  configFileName: 'listening-training.yaml',
  legacyConfigPath: 'apps.listeningTraining',
});

const { configLoader, queryService } = appBundle;

// ============================================
// 创建通用查询函数
// ============================================

const queryTable = createQueryFunction<ListeningTrainingConfig>(configLoader, queryService);

// ============================================
// 便捷 API
// ============================================

export function getListeningTrainingConfigLoader() {
  return configLoader;
}

export function getListeningTrainingQueryService() {
  return queryService;
}

/**
 * 加载听力训练配置
 */
export function loadListeningTrainingConfig(): ListeningTrainingConfig {
  return appBundle.loadConfig();
}

/**
 * 获取听力训练配置
 */
export function getListeningTrainingConfig(): ListeningTrainingConfig {
  return appBundle.getConfig();
}

/**
 * 通用查询接口
 */
export async function queryListeningTrainingTable<T = Record<string, unknown>>(
  tableName: keyof ListeningTrainingConfig['tables'],
  options: QueryOptions = {}
): Promise<QueryResult<T>> {
  return queryTable<T>(tableName, options);
}

// ============================================
// 数据服务类
// ============================================

export class ListeningTrainingDataService extends BaseDataService<ListeningTrainingConfig> {
  /**
   * 查询用户的词书列表
   */
  async queryWordbooks(userId: number, page = 1, pageSize = 10) {
    return queryListeningTrainingTable('wordbooks', {
      page,
      perPage: pageSize,
      where: { userId: String(userId) },
      orderBy: 'created_at DESC',
    });
  }

  /**
   * 根据ID查询词书
   */
  async queryWordbookById(id: string) {
    return queryListeningTrainingTable('wordbooks', {
      where: { id },
    });
  }

  /**
   * 查询词书的所有词条（带用户学习状态）
   */
  async queryItemsByWordbook(wordbookId: string, userId: number, page = 1, pageSize = 100) {
    const tableConfig = this.configLoader.getTableConfig('items');
    const userItemsConfig = this.configLoader.getTableConfig('userItems');
    const dataSourceId = tableConfig.dataSourceId || this.configLoader.getDataSourceId() || '1';
    
    // 使用 JOIN 查询词条和用户学习状态
    const result = await this.queryService.executeRawQuery(
      dataSourceId,
      `SELECT 
        i.id, i.wordbook_id, i.content, i.created_at,
        ui.status, ui.review_count, ui.last_review_at, ui.next_review_at, ui.history
       FROM ${tableConfig.name} i
       LEFT JOIN ${userItemsConfig.name} ui ON i.id = ui.item_id AND ui.user_id = ?
       WHERE i.wordbook_id = ?
       ORDER BY i.created_at ASC
       LIMIT ? OFFSET ?`,
      [userId, wordbookId, pageSize, (page - 1) * pageSize]
    );
    
    return result;
  }

  /**
   * 按状态查询词条
   */
  async queryItemsByStatus(wordbookId: string, userId: number, status: string, page = 1, pageSize = 100) {
    const tableConfig = this.configLoader.getTableConfig('items');
    const userItemsConfig = this.configLoader.getTableConfig('userItems');
    const dataSourceId = tableConfig.dataSourceId || this.configLoader.getDataSourceId() || '1';
    
    const result = await this.queryService.executeRawQuery(
      dataSourceId,
      `SELECT 
        i.id, i.wordbook_id, i.content, i.created_at,
        ui.status, ui.review_count, ui.last_review_at, ui.next_review_at, ui.history
       FROM ${tableConfig.name} i
       JOIN ${userItemsConfig.name} ui ON i.id = ui.item_id
       WHERE i.wordbook_id = ? AND ui.user_id = ? AND ui.status = ?
       ORDER BY i.created_at ASC
       LIMIT ? OFFSET ?`,
      [wordbookId, userId, status, pageSize, (page - 1) * pageSize]
    );
    
    return result;
  }

  /**
   * 查询各状态的词条数量统计
   */
  async queryItemCountsByStatus(wordbookId: string, userId: number) {
    const tableConfig = this.configLoader.getTableConfig('items');
    const userItemsConfig = this.configLoader.getTableConfig('userItems');
    const dataSourceId = tableConfig.dataSourceId || this.configLoader.getDataSourceId() || '1';
    
    // 查询总数
    const allResult = await this.queryService.executeRawQuery(
      dataSourceId,
      `SELECT COUNT(*) as count FROM ${tableConfig.name} WHERE wordbook_id = ?`,
      [wordbookId]
    );
    
    // 查询各状态数量
    const statusResult = await this.queryService.executeRawQuery(
      dataSourceId,
      `SELECT 
        COALESCE(ui.status, 'unknown') as status,
        COUNT(*) as count
       FROM ${tableConfig.name} i
       LEFT JOIN ${userItemsConfig.name} ui ON i.id = ui.item_id AND ui.user_id = ?
       WHERE i.wordbook_id = ?
       GROUP BY ui.status`,
      [userId, wordbookId]
    );
    
    const counts = {
      all: allResult.success && allResult.data ? allResult.data[0]?.count || 0 : 0,
      unknown: 0,
      known: 0,
      familiar: 0,
    };
    
    if (statusResult.success && Array.isArray(statusResult.data)) {
      statusResult.data.forEach((row: any) => {
        if (row.status === 'unknown') counts.unknown = row.count;
        else if (row.status === 'known') counts.known = row.count;
        else if (row.status === 'familiar') counts.familiar = row.count;
        else counts.unknown += row.count; // NULL 或未知状态计入 unknown
      });
    }
    
    return { success: true, data: counts };
  }

  /**
   * 查询待复习的词条（不区分词书，按待复习时间先后读取）
   * @param userId 用户ID
   * @param dailyLimit 每日限制数量（用于限制返回的词条数量）
   * @param excludeWordbookId 要排除的词书ID（可选，用于更换词书时）
   */
  async queryPracticeItems(userId: number, dailyLimit?: number, excludeWordbookId?: string) {
    const tableConfig = this.configLoader.getTableConfig('items');
    const userItemsConfig = this.configLoader.getTableConfig('userItems');
    const wordbooksConfig = this.configLoader.getTableConfig('wordbooks');
    const dataSourceId = tableConfig.dataSourceId || this.configLoader.getDataSourceId() || '1';

    // 如果没有提供 dailyLimit，从用户设置中获取
    let limit = dailyLimit;
    if (limit === undefined) {
      const settingsResult = await this.getOrCreateUserSettings(userId);
      if (settingsResult.success && settingsResult.data) {
        limit = (settingsResult.data as { daily_limit?: number }).daily_limit;
      } else {
        limit = 20; // 默认限制
      }
    }

    // 构建排除条件
    const excludeCondition = excludeWordbookId ? 'AND i.wordbook_id != ?' : '';
    const params = excludeWordbookId ? [userId, userId, excludeWordbookId, limit] : [userId, userId, limit];

    // 使用 UTC 时间，确保时区一致性
    const nowUTC = new Date().toISOString();

    const result = await this.queryService.executeRawQuery(
      dataSourceId,
      `SELECT
        i.id, i.content,
        COALESCE(ui.status, 'unknown') as status,
        COALESCE(ui.review_count, 0) as review_count,
        w.id as wordbook_id, w.name as wordbook_name
       FROM ${tableConfig.name} i
       JOIN ${wordbooksConfig.name} w ON i.wordbook_id = w.id AND w.user_id = ?
       LEFT JOIN ${userItemsConfig.name} ui ON i.id = ui.item_id AND ui.user_id = ?
       WHERE (ui.status IS NULL OR ui.status NOT IN ('familiar'))
       AND (ui.next_review_at IS NULL OR ui.next_review_at <= ?)
       ${excludeCondition}
       ORDER BY
         CASE WHEN ui.next_review_at IS NULL THEN 0 ELSE 1 END,
         ui.next_review_at ASC,
         i.created_at ASC
       LIMIT ?`,
      excludeWordbookId ? [userId, userId, nowUTC, excludeWordbookId, limit] : [userId, userId, nowUTC, limit]
    );

    return result;
  }

  /**
   * 获取新词条（从未学习过的词条）
   * @param userId 用户ID
   * @param limit 获取数量
   * @param wordbookId 指定词书ID（可选，不指定则从所有词书中获取）
   */
  async queryNewItems(userId: number, limit: number, wordbookId?: string) {
    const tableConfig = this.configLoader.getTableConfig('items');
    const userItemsConfig = this.configLoader.getTableConfig('userItems');
    const wordbooksConfig = this.configLoader.getTableConfig('wordbooks');
    const dataSourceId = tableConfig.dataSourceId || this.configLoader.getDataSourceId() || '1';

    // 构建词书条件
    const wordbookCondition = wordbookId ? 'AND i.wordbook_id = ?' : '';
    const params = wordbookId ? [userId, userId, wordbookId, limit] : [userId, userId, limit];

    const result = await this.queryService.executeRawQuery(
      dataSourceId,
      `SELECT
        i.id, i.content,
        'new' as status,
        0 as review_count,
        w.id as wordbook_id, w.name as wordbook_name
       FROM ${tableConfig.name} i
       JOIN ${wordbooksConfig.name} w ON i.wordbook_id = w.id AND w.user_id = ?
       LEFT JOIN ${userItemsConfig.name} ui ON i.id = ui.item_id AND ui.user_id = ?
       WHERE ui.id IS NULL
       ${wordbookCondition}
       ORDER BY i.created_at ASC
       LIMIT ?`,
      params
    );

    return result;
  }

  /**
   * 获取用户的其他词书列表（排除指定词书）
   * @param userId 用户ID
   * @param excludeWordbookId 要排除的词书ID
   */
  async queryOtherWordbooks(userId: number, excludeWordbookId: string) {
    const wordbooksConfig = this.configLoader.getTableConfig('wordbooks');
    const dataSourceId = wordbooksConfig.dataSourceId || this.configLoader.getDataSourceId() || '1';

    const result = await this.queryService.executeRawQuery(
      dataSourceId,
      `SELECT
        w.id, w.name, w.total_items,
        COUNT(i.id) as new_items_count
       FROM ${wordbooksConfig.name} w
       LEFT JOIN pioc_lt_items i ON w.id = i.wordbook_id
       LEFT JOIN pioc_lt_user_items ui ON i.id = ui.item_id AND ui.user_id = ?
       WHERE w.user_id = ?
       AND w.id != ?
       AND ui.id IS NULL
       GROUP BY w.id
       HAVING new_items_count > 0
       ORDER BY new_items_count DESC`,
      [userId, userId, excludeWordbookId]
    );

    return result;
  }

  /**
   * 获取或创建用户词条学习状态
   */
  async getOrCreateUserItem(userId: number, itemId: string) {
    const userItemsConfig = this.configLoader.getTableConfig('userItems');
    const dataSourceId = userItemsConfig.dataSourceId || this.configLoader.getDataSourceId() || '1';
    
    // 先查询是否已存在
    const existing = await this.queryService.executeRawQuery(
      dataSourceId,
      `SELECT * FROM ${userItemsConfig.name} WHERE user_id = ? AND item_id = ?`,
      [userId, itemId]
    );
    
    if (existing.success && Array.isArray(existing.data) && existing.data.length > 0) {
      return { success: true, data: existing.data[0], isNew: false };
    }
    
    // 不存在则创建新记录
    const insertResult = await this.queryService.executeRawQuery(
      dataSourceId,
      `INSERT INTO ${userItemsConfig.name} (user_id, item_id, status, review_count) VALUES (?, ?, 'unknown', 0)`,
      [userId, itemId]
    );
    
    if (insertResult.success) {
      // 查询新创建的记录
      const newRecord = await this.queryService.executeRawQuery(
        dataSourceId,
        `SELECT * FROM ${userItemsConfig.name} WHERE user_id = ? AND item_id = ?`,
        [userId, itemId]
      );
      return { 
        success: true, 
        data: newRecord.success && Array.isArray(newRecord.data) ? newRecord.data[0] : null,
        isNew: true 
      };
    }
    
    return { success: false, error: insertResult.error };
  }

  /**
   * 更新用户词条学习状态
   */
  async updateUserItem(userId: number, itemId: string, updateData: {
    status?: string;
    reviewCount?: number;
    lastReviewAt?: Date;
    nextReviewAt?: Date | null;
    history?: any;
  }) {
    const userItemsConfig = this.configLoader.getTableConfig('userItems');
    const dataSourceId = userItemsConfig.dataSourceId || this.configLoader.getDataSourceId() || '1';
    
    const fields: string[] = [];
    const values: any[] = [];
    
    if (updateData.status !== undefined) {
      fields.push('status = ?');
      values.push(updateData.status);
    }
    if (updateData.reviewCount !== undefined) {
      fields.push('review_count = ?');
      values.push(updateData.reviewCount);
    }
    if (updateData.lastReviewAt !== undefined) {
      fields.push('last_review_at = ?');
      values.push(updateData.lastReviewAt);
    }
    if (updateData.nextReviewAt !== undefined) {
      fields.push('next_review_at = ?');
      values.push(updateData.nextReviewAt);
    }
    if (updateData.history !== undefined) {
      fields.push('history = ?');
      values.push(JSON.stringify(updateData.history));
    }
    
    if (fields.length === 0) {
      return { success: true };
    }
    
    values.push(userId, itemId);
    
    const result = await this.queryService.executeRawQuery(
      dataSourceId,
      `UPDATE ${userItemsConfig.name} SET ${fields.join(', ')} WHERE user_id = ? AND item_id = ?`,
      values
    );
    
    return result;
  }

  // ============================================
  // 公共方法：查询待复习词条
  // ============================================

  /**
   * 查询待复习词条（统一的核心逻辑）
   * 查询所有非熟识状态且需要复习的词条（包括已过期的）
   * @param userId 用户ID
   * @param options 查询选项
   * @returns 待复习词条列表
   */
  async queryPendingReviewItems(userId: number, options: {
    limit?: number;
    includeExpired?: boolean;
  } = {}): Promise<{ success: boolean; data?: any[]; error?: string }> {
    const itemsConfig = this.configLoader.getTableConfig('items');
    const userItemsConfig = this.configLoader.getTableConfig('userItems');
    const wordbooksConfig = this.configLoader.getTableConfig('wordbooks');
    const dataSourceId = itemsConfig.dataSourceId || this.configLoader.getDataSourceId() || '1';

    const { limit, includeExpired = true } = options;

    // 使用 UTC 时间，确保时区一致性
    const nowUTC = new Date().toISOString();

    let sql = `SELECT
        i.id, i.content, i.wordbook_id,
        w.name as wordbook_name,
        COALESCE(ui.status, 'unknown') as status,
        COALESCE(ui.review_count, 0) as review_count,
        ui.next_review_at,
        ui.last_review_at
       FROM ${itemsConfig.name} i
       JOIN ${wordbooksConfig.name} w ON i.wordbook_id = w.id AND w.user_id = ?
       LEFT JOIN ${userItemsConfig.name} ui ON i.id = ui.item_id AND ui.user_id = ?
       WHERE (ui.status IS NULL OR ui.status NOT IN ('familiar'))
       AND (ui.next_review_at IS NULL OR ui.next_review_at <= ?)`;

    const params: any[] = [userId, userId, nowUTC];

    if (!includeExpired) {
      // 如果不包含已过期的，只查询未来24小时内的
      sql += ` AND ui.next_review_at >= DATE_SUB(?, INTERVAL 1 DAY)`;
      params.push(nowUTC);
    }

    sql += ` ORDER BY ui.next_review_at ASC, i.created_at ASC`;

    if (limit) {
      sql += ` LIMIT ?`;
      params.push(limit);
    }

    return await this.queryService.executeRawQuery(dataSourceId, sql, params);
  }

  // ============================================
  // 用户设置相关方法
  // ============================================

  /**
   * 获取或创建用户设置
   */
  async getOrCreateUserSettings(userId: number) {
    const userSettingsConfig = this.configLoader.getTableConfig('userSettings');
    const dataSourceId = userSettingsConfig.dataSourceId || this.configLoader.getDataSourceId() || '1';
    
    // 先查询是否已存在
    const existing = await this.queryService.executeRawQuery(
      dataSourceId,
      `SELECT * FROM ${userSettingsConfig.name} WHERE user_id = ?`,
      [userId]
    );
    
    if (existing.success && Array.isArray(existing.data) && existing.data.length > 0) {
      return { success: true, data: existing.data[0], isNew: false };
    }
    
    // 不存在则创建默认设置
    const insertResult = await this.queryService.executeRawQuery(
      dataSourceId,
      `INSERT INTO ${userSettingsConfig.name} 
       (user_id, daily_limit, item_order, auto_play, review_unknown_first, play_count, play_interval) 
       VALUES (?, 20, 'sequential', true, true, 1, 1)`,
      [userId]
    );
    
    if (insertResult.success) {
      // 查询新创建的记录
      const newRecord = await this.queryService.executeRawQuery(
        dataSourceId,
        `SELECT * FROM ${userSettingsConfig.name} WHERE user_id = ?`,
        [userId]
      );
      return { 
        success: true, 
        data: newRecord.success && Array.isArray(newRecord.data) ? newRecord.data[0] : null,
        isNew: true 
      };
    }
    
    return { success: false, error: insertResult.error };
  }

  /**
   * 更新用户设置
   */
  async updateUserSettings(userId: number, updateData: {
    dailyLimit?: number;
    itemOrder?: string;
    autoPlay?: boolean;
    reviewUnknownFirst?: boolean;
    playCount?: number;
    playInterval?: number;
    extraSettings?: any;
  }) {
    const userSettingsConfig = this.configLoader.getTableConfig('userSettings');
    const dataSourceId = userSettingsConfig.dataSourceId || this.configLoader.getDataSourceId() || '1';
    
    const fields: string[] = [];
    const values: any[] = [];
    
    if (updateData.dailyLimit !== undefined) {
      fields.push('daily_limit = ?');
      values.push(updateData.dailyLimit);
    }
    if (updateData.itemOrder !== undefined) {
      fields.push('item_order = ?');
      values.push(updateData.itemOrder);
    }
    if (updateData.autoPlay !== undefined) {
      fields.push('auto_play = ?');
      values.push(updateData.autoPlay);
    }
    if (updateData.reviewUnknownFirst !== undefined) {
      fields.push('review_unknown_first = ?');
      values.push(updateData.reviewUnknownFirst);
    }
    if (updateData.playCount !== undefined) {
      fields.push('play_count = ?');
      values.push(updateData.playCount);
    }
    if (updateData.playInterval !== undefined) {
      fields.push('play_interval = ?');
      values.push(updateData.playInterval);
    }
    if (updateData.extraSettings !== undefined) {
      fields.push('extra_settings = ?');
      values.push(JSON.stringify(updateData.extraSettings));
    }
    
    if (fields.length === 0) {
      return { success: true };
    }
    
    values.push(userId);
    
    const result = await this.queryService.executeRawQuery(
      dataSourceId,
      `UPDATE ${userSettingsConfig.name} SET ${fields.join(', ')} WHERE user_id = ?`,
      values
    );
    
    return result;
  }

  // ============================================
  // 每日学习清单相关方法
  // ============================================

  /**
   * 获取或创建今日学习清单
   * 只自动添加待复习词条，新词条需要用户手动选择添加
   * @param userId 用户ID
   * @param dailyLimit 每日学习数量
   */
  async getOrCreateDailyPlan(userId: number, dailyLimit: number) {
    const dailyPlanConfig = this.configLoader.getTableConfig('dailyPlan');
    const itemsConfig = this.configLoader.getTableConfig('items');
    const userItemsConfig = this.configLoader.getTableConfig('userItems');
    const wordbooksConfig = this.configLoader.getTableConfig('wordbooks');
    const dataSourceId = dailyPlanConfig.dataSourceId || this.configLoader.getDataSourceId() || '1';

    const today = new Date().toISOString().split('T')[0];
    // 使用 UTC 时间，确保时区一致性
    const nowUTC = new Date().toISOString();

    // 1. 检查今日是否已有学习清单
    const existingPlan = await this.queryService.executeRawQuery(
      dataSourceId,
      `SELECT dp.item_id as id, i.content, dp.wordbook_id, w.name as wordbook_name,
              dp.item_type, dp.status
       FROM ${dailyPlanConfig.name} dp
       JOIN ${itemsConfig.name} i ON dp.item_id = i.id
       JOIN ${wordbooksConfig.name} w ON dp.wordbook_id = w.id
       WHERE dp.user_id = ? AND dp.plan_date = ?
       ORDER BY dp.item_type DESC, dp.created_at ASC`,
      [userId, today]
    );

    if (existingPlan.success && Array.isArray(existingPlan.data) && existingPlan.data.length > 0) {
      return { success: true, data: existingPlan.data, isNew: false };
    }

    // 2. 没有清单，需要创建
    // 2.1 获取待复习词条（使用统一的查询逻辑）
    const reviewItemsResult = await this.queryPendingReviewItems(userId, {
      limit: dailyLimit,
      includeExpired: true, // 包含已过期的词条
    });

    const reviewItems = reviewItemsResult.success && Array.isArray(reviewItemsResult.data) 
      ? reviewItemsResult.data 
      : [];

    // 2.2 创建学习清单记录（只添加待复习词条）
    const planItems: any[] = [];

    for (const item of reviewItems) {
      await this.queryService.executeRawQuery(
        dataSourceId,
        `INSERT INTO ${dailyPlanConfig.name} 
         (user_id, plan_date, item_id, wordbook_id, item_type, status)
         VALUES (?, ?, ?, ?, 'review', 'pending')`,
        [userId, today, item.id, item.wordbook_id]
      );
      planItems.push({ ...item, item_type: 'review', status: 'pending' });
    }

    // 注意：新词条不再自动添加，需要用户手动选择

    return { success: true, data: planItems, isNew: true, reviewCount: reviewItems.length };
  }

  /**
   * 获取今日学习清单（不自动创建）
   * @param userId 用户ID
   */
  async getTodayPlan(userId: number) {
    const dailyPlanConfig = this.configLoader.getTableConfig('dailyPlan');
    const itemsConfig = this.configLoader.getTableConfig('items');
    const wordbooksConfig = this.configLoader.getTableConfig('wordbooks');
    const dataSourceId = dailyPlanConfig.dataSourceId || this.configLoader.getDataSourceId() || '1';

    const today = new Date().toISOString().split('T')[0];

    const result = await this.queryService.executeRawQuery(
      dataSourceId,
      `SELECT dp.*, i.content, w.name as wordbook_name
       FROM ${dailyPlanConfig.name} dp
       JOIN ${itemsConfig.name} i ON dp.item_id = i.id
       JOIN ${wordbooksConfig.name} w ON dp.wordbook_id = w.id
       WHERE dp.user_id = ? AND dp.plan_date = ?
       ORDER BY dp.item_type DESC, dp.created_at ASC`,
      [userId, today]
    );

    return result;
  }

  /**
   * 更新学习清单中词条的状态
   * @param userId 用户ID
   * @param itemId 词条ID
   * @param status 新状态
   */
  async updatePlanItemStatus(userId: number, itemId: string, status: 'completed' | 'skipped') {
    const dailyPlanConfig = this.configLoader.getTableConfig('dailyPlan');
    const dataSourceId = dailyPlanConfig.dataSourceId || this.configLoader.getDataSourceId() || '1';

    const today = new Date().toISOString().split('T')[0];
    // 使用 UTC 时间，确保时区一致性
    const nowUTC = new Date().toISOString();

    const result = await this.queryService.executeRawQuery(
      dataSourceId,
      `UPDATE ${dailyPlanConfig.name} 
       SET status = ?, completed_at = ?
       WHERE user_id = ? AND plan_date = ? AND item_id = ?`,
      [status, nowUTC, userId, today, itemId]
    );

    return result;
  }

  /**
   * 用户自选词条添加到今日学习清单
   * @param userId 用户ID
   * @param itemIds 词条ID数组
   */
  async addItemsToDailyPlan(userId: number, itemIds: string[]) {
    const dailyPlanConfig = this.configLoader.getTableConfig('dailyPlan');
    const itemsConfig = this.configLoader.getTableConfig('items');
    const dataSourceId = dailyPlanConfig.dataSourceId || this.configLoader.getDataSourceId() || '1';

    const today = new Date().toISOString().split('T')[0];

    // 获取词条信息
    const itemsResult = await this.queryService.executeRawQuery(
      dataSourceId,
      `SELECT id, wordbook_id FROM ${itemsConfig.name} WHERE id IN (${itemIds.map(() => '?').join(',')})`,
      itemIds
    );

    if (!itemsResult.success || !Array.isArray(itemsResult.data)) {
      return { success: false, error: '获取词条信息失败' };
    }

    // 批量插入
    for (const item of itemsResult.data) {
      await this.queryService.executeRawQuery(
        dataSourceId,
        `INSERT IGNORE INTO ${dailyPlanConfig.name} 
         (user_id, plan_date, item_id, wordbook_id, item_type, status)
         VALUES (?, ?, ?, ?, 'new', 'pending')`,
        [userId, today, item.id, item.wordbook_id]
      );
    }

    return { success: true, addedCount: itemsResult.data.length };
  }

  /**
   * 获取词书中所有词条（包括已选择的和未选择的）
   * @param userId 用户ID
   * @param wordbookId 词书ID
   */
  async getSelectableItems(userId: number, wordbookId: string) {
    const dailyPlanConfig = this.configLoader.getTableConfig('dailyPlan');
    const itemsConfig = this.configLoader.getTableConfig('items');
    const userItemsConfig = this.configLoader.getTableConfig('userItems');
    const dataSourceId = dailyPlanConfig.dataSourceId || this.configLoader.getDataSourceId() || '1';

    const today = new Date().toISOString().split('T')[0];

    // 查询所有词条，标记是否已在今日清单中
    const result = await this.queryService.executeRawQuery(
      dataSourceId,
      `SELECT 
        i.id, i.content,
        CASE 
          WHEN dp.id IS NOT NULL THEN 'selected'
          WHEN ui.id IS NOT NULL THEN 'learned'
          ELSE 'available'
        END as select_status,
        COALESCE(ui.status, 'new') as status,
        COALESCE(ui.review_count, 0) as review_count,
        i.created_at
       FROM ${itemsConfig.name} i
       LEFT JOIN ${dailyPlanConfig.name} dp ON i.id = dp.item_id 
         AND dp.user_id = ? AND dp.plan_date = ?
       LEFT JOIN ${userItemsConfig.name} ui ON i.id = ui.item_id AND ui.user_id = ?
       WHERE i.wordbook_id = ?
       ORDER BY 
         CASE 
           WHEN dp.id IS NOT NULL THEN 2
           WHEN ui.id IS NOT NULL THEN 3
           ELSE 1
         END,
         i.created_at ASC`,
      [userId, today, userId, wordbookId]
    );

    return result;
  }

  /**
   * 查询未来复习计划统计
   * 根据艾宾浩斯遗忘曲线模拟未来每天需要复习的词条数量
   * @param userId 用户ID
   * @param days 查询未来多少天
   */
  async queryReviewSchedule(userId: number, days: number) {
    const userItemsConfig = this.configLoader.getTableConfig('userItems');
    const itemsConfig = this.configLoader.getTableConfig('items');
    const wordbooksConfig = this.configLoader.getTableConfig('wordbooks');
    const dataSourceId = userItemsConfig.dataSourceId || this.configLoader.getDataSourceId() || '1';

    // 获取用户设置
    const settingsResult = await this.getOrCreateUserSettings(userId);
    const dailyLimit = settingsResult.success && settingsResult.data
      ? (settingsResult.data as { daily_limit?: number }).daily_limit || 20
      : 20;

    // 艾宾浩斯复习间隔（天）- 用于模拟未来的复习时间点
    const REVIEW_INTERVALS = [1, 2, 4, 7, 15, 30];

    // 1. 查询所有非熟识状态的词条（包括已有学习记录的和全新的）
    const allItemsResult = await this.queryService.executeRawQuery(
      dataSourceId,
      `SELECT 
        i.id,
        COALESCE(ui.status, 'new') as status,
        COALESCE(ui.review_count, 0) as review_count,
        ui.next_review_at,
        ui.last_review_at
       FROM ${itemsConfig.name} i
       JOIN ${wordbooksConfig.name} w ON i.wordbook_id = w.id AND w.user_id = ?
       LEFT JOIN ${userItemsConfig.name} ui ON i.id = ui.item_id AND ui.user_id = ?
       WHERE ui.status IS NULL OR ui.status NOT IN ('familiar')`,
      [userId, userId]
    );

    // 2. 查询今日已完成数量
    // 使用 UTC 时间，确保时区一致性
    const todayUTC = new Date().toISOString().split('T')[0];
    const todayCompletedResult = await this.queryService.executeRawQuery(
      dataSourceId,
      `SELECT COUNT(*) as count
       FROM ${userItemsConfig.name}
       WHERE user_id = ?
       AND last_review_at >= ?`,
      [userId, todayUTC]
    );

    if (!allItemsResult.success) {
      return allItemsResult;
    }

    // 生成从今天开始的日期序列
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const schedule: Array<{ date: string; count: number; newItems: number; reviewItems: number }> = [];

    // 初始化每天的计数
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      schedule.push({
        date: date.toISOString().split('T')[0],
        count: 0,
        newItems: 0,
        reviewItems: 0,
      });
    }

    // 计算新词条和复习词条
    const items = allItemsResult.data || [];
    let totalNewItems = 0;
    let newItemsToDistribute: Array<{ id: string; startDay: number }> = [];

    // 先处理所有词条，计算它们在未来每天的复习时间点
    items.forEach((item: any) => {
      const status = item.status;
      const reviewCount = item.review_count || 0;
      const nextReviewAt = item.next_review_at ? new Date(item.next_review_at) : null;
      const lastReviewAt = item.last_review_at ? new Date(item.last_review_at) : null;

      if (status === 'new' || status === null) {
        // 全新词条，需要安排首次学习
        totalNewItems++;
        newItemsToDistribute.push({ id: item.id, startDay: 0 });
      } else {
        // 已有学习记录的词条，模拟未来的复习时间点
        // 从 next_review_at 开始，按照艾宾浩斯曲线计算后续复习时间
        let currentReviewDate = nextReviewAt;
        let currentReviewCount = reviewCount;

        while (currentReviewDate && currentReviewDate < new Date(today.getTime() + days * 24 * 60 * 60 * 1000)) {
          // 计算这个复习日期对应的是第几天
          const dayIndex = Math.floor((currentReviewDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

          if (dayIndex >= 0 && dayIndex < days) {
            // 复习日期在未来或今天，计入对应日期
            schedule[dayIndex].reviewItems++;
            schedule[dayIndex].count++;
          } else if (dayIndex < 0) {
            // 复习日期已过期（< 今天），计入今天的待复习数量
            schedule[0].reviewItems++;
            schedule[0].count++;
          }

          // 模拟这次复习后的下一次复习（假设用户点击"懂了"）
          currentReviewCount++;
          if (currentReviewCount - 1 < REVIEW_INTERVALS.length) {
            const interval = REVIEW_INTERVALS[currentReviewCount - 1];
            currentReviewDate = new Date(currentReviewDate.getTime() + interval * 24 * 60 * 60 * 1000);
          } else {
            currentReviewDate = null;
          }
        }
      }
    });

    // 计算今日已完成数量
    const todayCompleted = todayCompletedResult.success && todayCompletedResult.data
      ? todayCompletedResult.data[0]?.count || 0
      : 0;

    // 分配新词条到各天（考虑每日上限）
    let accumulatedNewItems = 0;
    const remainingNewItems = totalNewItems;

    for (let i = 0; i < days; i++) {
      const daySchedule = schedule[i];

      // 计算今天还能学习多少新词条
      const availableSlots = Math.max(0, dailyLimit - daySchedule.count);
      const newItemsForDay = Math.min(
        remainingNewItems - accumulatedNewItems,
        availableSlots
      );

      if (newItemsForDay > 0) {
        daySchedule.newItems = newItemsForDay;
        daySchedule.count += newItemsForDay;
        accumulatedNewItems += newItemsForDay;

        // 模拟这些新词条在未来日期的复习（假设用户点击"懂了"）
        for (let j = 0; j < newItemsForDay; j++) {
          let reviewCount = 1; // 今天学习后，review_count 变为 1
          let nextReviewDay = i + REVIEW_INTERVALS[0]; // 第1次复习间隔1天

          while (nextReviewDay < days && reviewCount <= REVIEW_INTERVALS.length) {
            schedule[nextReviewDay].reviewItems++;
            schedule[nextReviewDay].count++;

            reviewCount++;
            if (reviewCount - 1 < REVIEW_INTERVALS.length) {
              nextReviewDay += REVIEW_INTERVALS[reviewCount - 1];
            } else {
              break;
            }
          }
        }
      }
    }

    return {
      success: true,
      data: schedule,
      summary: {
        totalNewItems,
        todayCompleted,
        dailyLimit,
      }
    };
  }
}

// 导出默认实例
export const listeningTrainingDataService = new ListeningTrainingDataService(configLoader, queryService);

export default configLoader;
