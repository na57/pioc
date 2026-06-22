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

// ============================================
// 应用配置类型
// ============================================

export interface ListeningTrainingConfig extends AppBaseConfig {
  tables: {
    wordbooks: TableConfig<WordbookFieldMapping>;
    items: TableConfig<ItemFieldMapping>;
    userItems: TableConfig<UserItemFieldMapping>;
    userSettings: TableConfig<UserSettingsFieldMapping>;
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
   * 查询待复习的词条
   * @param wordbookId 词书ID，如果提供则只查询该词书的词条
   * @param userId 用户ID
   * @param dailyLimit 每日限制数量（用于限制返回的词条数量）
   */
  async queryPracticeItems(wordbookId: string | null, userId: number, dailyLimit?: number) {
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
    
    // 构建查询条件
    const wordbookCondition = wordbookId ? 'AND i.wordbook_id = ?' : '';
    const params = wordbookId ? [userId, userId, wordbookId, limit] : [userId, userId, limit];
    
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
       AND (ui.status IS NULL OR ui.next_review_at <= NOW())
       ${wordbookCondition}
       ORDER BY ui.next_review_at ASC, i.created_at ASC
       LIMIT ?`,
      params
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
}

// 导出默认实例
export const listeningTrainingDataService = new ListeningTrainingDataService(configLoader, queryService);

export default configLoader;
