/**
 * 通用数据访问框架 - 工具函数
 */

/**
 * 深度合并两个对象
 * 用于合并默认配置和用户自定义配置
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };

  for (const key in source) {
    if (source[key] !== undefined && source[key] !== null) {
      if (
        typeof source[key] === 'object' &&
        !Array.isArray(source[key]) &&
        source[key] !== null
      ) {
        result[key] = deepMerge(
          (result[key] as Record<string, unknown>) || {},
          source[key] as Record<string, unknown>
        ) as T[Extract<keyof T, string>];
      } else {
        result[key] = source[key] as T[Extract<keyof T, string>];
      }
    }
  }

  return result;
}

/**
 * 构建 SELECT 语句的字段列表
 * 支持字段别名映射
 */
export function buildSelectFields(
  fields: Record<string, string>,
  aliases?: Record<string, string>
): string {
  return Object.entries(fields)
    .map(([key, dbField]) => {
      // 如果有别名映射，使用别名
      if (aliases && aliases[key]) {
        return `${dbField} as ${aliases[key]}`;
      }
      return dbField;
    })
    .join(', ');
}

/**
 * 将数据库行数据映射为应用对象
 */
export function mapRowToObject<T extends Record<string, unknown>>(
  row: Record<string, unknown>,
  fieldMapping: Record<string, string>,
  aliases?: Record<string, string>
): T {
  const result: Record<string, unknown> = {};

  for (const [appKey, dbField] of Object.entries(fieldMapping)) {
    // 优先使用别名作为结果键，否则使用应用键
    const resultKey = aliases?.[appKey] || appKey;
    result[resultKey] = row[dbField];
  }

  return result as T;
}

/**
 * 验证表配置是否有效
 */
export function validateTableConfig(config: {
  dataObjectId?: number;
  name?: string;
  fields?: Record<string, string>;
}): { valid: boolean; error?: string } {
  if (!config.dataObjectId && !config.name) {
    return {
      valid: false,
      error: '表配置错误：必须指定 dataObjectId 或 name',
    };
  }

  if (!config.fields || Object.keys(config.fields).length === 0) {
    return {
      valid: false,
      error: '表配置错误：fields 不能为空',
    };
  }

  return { valid: true };
}

/**
 * 构建 WHERE 条件子句
 */
export function buildWhereClause(
  conditions: Record<string, unknown>,
  fieldMapping?: Record<string, string>
): { clause: string; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];

  for (const [key, value] of Object.entries(conditions)) {
    if (value !== undefined && value !== null) {
      // 使用字段映射或原始键
      const dbField = fieldMapping?.[key] || key;
      clauses.push(`${dbField} = ?`);
      params.push(value);
    }
  }

  return {
    clause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

/**
 * 安全地获取嵌套对象属性
 */
export function getNestedValue<T>(
  obj: Record<string, unknown>,
  path: string,
  defaultValue?: T
): T | undefined {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return defaultValue;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return (current as T) ?? defaultValue;
}

/**
 * 缓存管理器（简单的内存缓存）
 */
export class SimpleCache<T> {
  private cache = new Map<string, { value: T; expiry: number }>();
  private defaultTTL: number;

  constructor(defaultTTLMs: number = 5 * 60 * 1000) {
    // 默认5分钟
    this.defaultTTL = defaultTTLMs;
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    return item.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    const expiry = Date.now() + (ttlMs ?? this.defaultTTL);
    this.cache.set(key, { value, expiry });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}
