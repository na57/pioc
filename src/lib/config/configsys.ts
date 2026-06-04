/**
 * 配置管理应用配置
 * ConfigSys - 配置管理系统
 * 使用通用数据访问框架 - 工厂模式
 */

import {
  AppBaseConfig,
  AIConfig,
  TableConfig,
  createAppConfigBundle,
  createConfigGetter,
} from '@/lib/data-framework';

// ============================================
// 配置类型定义
// ============================================

export interface ConfigSysRoles {
  admin?: string;
  user?: string;
}

export interface ConfigSysConfig extends AppBaseConfig {
  roles?: ConfigSysRoles;
  ai?: AIConfig;
}

// ============================================
// 默认配置
// ============================================

const defaultConfig: ConfigSysConfig = {
  roles: {
    admin: '系统管理员',
    user: '普通用户',
  },
  tables: {},
};

// ============================================
// 使用工厂创建应用配置包
// ============================================

const appBundle = createAppConfigBundle<ConfigSysConfig>({
  defaultConfig,
  configFileName: 'configsys.yaml',
  legacyConfigPath: 'apps.configsys',
});

const { configLoader } = appBundle;

// ============================================
// 向后兼容的 API
// ============================================

/**
 * 获取配置管理应用配置
 * 优先从独立配置文件加载，如果不存在则从主配置读取
 */
export function getConfigSysConfig(): ConfigSysConfig {
  return configLoader.getConfig();
}

/**
 * 重新加载配置
 */
export function reloadConfigSysConfig(): ConfigSysConfig {
  return configLoader.reload();
}

// ============================================
// 便捷函数
// ============================================

export function isAdmin(userRoles: string[]): boolean {
  const config = getConfigSysConfig();
  return userRoles.includes(config.roles?.admin || '系统管理员');
}

export function getAdminRoleName(): string {
  return getConfigSysConfig().roles?.admin || '系统管理员';
}

export function getUserRoleName(): string {
  return getConfigSysConfig().roles?.user || '普通用户';
}

export function getAIProviderId(): string | undefined {
  return getConfigSysConfig().ai?.providerId;
}

// ============================================
// 导出工厂创建的实例
// ============================================

export { appBundle, configLoader };
export default getConfigSysConfig;
