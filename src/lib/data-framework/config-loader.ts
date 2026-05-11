/**
 * 通用数据访问框架 - 配置加载器
 * 提供统一的配置加载、合并和管理功能
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { AppBaseConfig, ConfigLoadOptions } from './types';
import { deepMerge, getNestedValue } from './utils';
import { getConfig } from '../config';

/**
 * 通用配置加载器类
 * 支持从 YAML 文件加载配置，与默认配置合并
 */
export class ConfigLoader<T extends AppBaseConfig> {
  private config: T | null = null;
  private defaultConfig: T;
  private options: ConfigLoadOptions;

  /**
   * 创建配置加载器实例
   * @param defaultConfig 默认配置对象
   * @param options 加载选项
   */
  constructor(defaultConfig: T, options: ConfigLoadOptions) {
    this.defaultConfig = defaultConfig;
    this.options = {
      configDir: 'config',
      ...options,
    };
  }

  /**
   * 加载配置
   * 优先从单独配置文件加载，如果不存在则尝试从主配置加载（向后兼容）
   */
  load(): T {
    if (this.config) {
      return this.config;
    }

    const configPath = path.join(
      process.cwd(),
      this.options.configDir!,
      this.options.configFileName
    );

    // 尝试从单独配置文件加载
    if (fs.existsSync(configPath)) {
      try {
        const fileContents = fs.readFileSync(configPath, 'utf8');
        const userConfig = yaml.load(fileContents) as Partial<T>;

        // 深度合并用户配置和默认配置
        this.config = deepMerge(
          this.defaultConfig as Record<string, unknown>,
          userConfig as Record<string, unknown>
        ) as T;
        return this.config;
      } catch (error) {
        console.warn(
          `加载 ${this.options.configFileName} 失败，使用默认配置:`,
          error
        );
      }
    }

    // 尝试从主配置文件加载（向后兼容）
    if (this.options.legacyConfigPath) {
      try {
        const legacyConfig = this.loadFromLegacyConfig();
        if (legacyConfig) {
          this.config = legacyConfig;
          return this.config;
        }
      } catch (error) {
        console.warn('从主配置文件加载配置失败:', error);
      }
    }

    // 使用默认配置
    this.config = this.defaultConfig;
    return this.config;
  }

  /**
   * 获取配置（如果未加载则自动加载）
   */
  getConfig(): T {
    if (!this.config) {
      return this.load();
    }
    return this.config;
  }

  /**
   * 重新加载配置
   */
  reload(): T {
    this.config = null;
    return this.load();
  }

  /**
   * 获取全局数据源ID
   */
  getDataSourceId(): string | undefined {
    return this.getConfig().dataSourceId;
  }

  /**
   * 获取指定表的配置
   */
  getTableConfig<K extends Record<string, string>>(
    tableName: keyof T['tables']
  ): { dataObjectId?: number; name?: string; dataSourceId?: string; fields: K } {
    const tables = this.getConfig().tables;
    const tableConfig = tables[tableName as string];

    if (!tableConfig) {
      throw new Error(`表配置不存在: ${String(tableName)}`);
    }

    return tableConfig as { dataObjectId?: number; name?: string; dataSourceId?: string; fields: K };
  }

  /**
   * 获取所有表名
   */
  getTableNames(): string[] {
    return Object.keys(this.getConfig().tables);
  }

  /**
   * 检查表配置是否存在
   */
  hasTableConfig(tableName: string): boolean {
    return tableName in this.getConfig().tables;
  }

  /**
   * 获取AI配置
   */
  getAIConfig(): { providerId?: string; model?: string } | undefined {
    return this.getConfig().ai;
  }

  /**
   * 从主配置文件加载（向后兼容）
   * 子类可以重写此方法以支持特定的向后兼容逻辑
   */
  protected loadFromLegacyConfig(): T | null {
    if (!this.options.legacyConfigPath) {
      return null;
    }

    try {
      const mainConfig = getConfig();
      const legacyConfig = getNestedValue<Record<string, unknown>>(
        mainConfig as unknown as Record<string, unknown>,
        this.options.legacyConfigPath
      );

      if (!legacyConfig) {
        return null;
      }

      // 子类应该重写此方法以处理特定的向后兼容逻辑
      // 这里返回默认配置
      return this.defaultConfig;
    } catch (error) {
      console.warn('读取主配置失败:', error);
      return null;
    }
  }

  /**
   * 获取配置文件路径
   */
  getConfigPath(): string {
    return path.join(
      process.cwd(),
      this.options.configDir!,
      this.options.configFileName
    );
  }

  /**
   * 检查配置文件是否存在
   */
  configExists(): boolean {
    return fs.existsSync(this.getConfigPath());
  }
}

/**
 * 创建配置加载器的工厂函数
 */
export function createConfigLoader<T extends AppBaseConfig>(
  defaultConfig: T,
  options: ConfigLoadOptions
): ConfigLoader<T> {
  return new ConfigLoader<T>(defaultConfig, options);
}
