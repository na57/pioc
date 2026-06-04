/**
 * 配置管理应用配置
 * ConfigSys - 配置管理系统
 */

import { getConfig } from '@/lib/config';

// ============================================
// 配置类型定义
// ============================================

export interface ConfigSysConfig {
  roles?: {
    admin?: string;
    user?: string;
  };
  ai?: {
    providerId?: string;
  };
}

// ============================================
// 默认配置
// ============================================

const defaultConfig: ConfigSysConfig = {
  roles: {
    admin: '系统管理员',
    user: '普通用户',
  },
};

// ============================================
// 配置加载函数
// ============================================

export function getConfigSysConfig(): ConfigSysConfig {
  try {
    const globalConfig = getConfig();
    const appConfig = globalConfig.apps?.configsys;
    
    if (!appConfig) {
      console.warn('ConfigSys: 未找到应用配置，使用默认配置');
      return defaultConfig;
    }

    return {
      ...defaultConfig,
      ...appConfig,
      roles: {
        ...defaultConfig.roles,
        ...appConfig.roles,
      },
    };
  } catch (error) {
    console.warn('ConfigSys: 加载配置失败，使用默认配置', error);
    return defaultConfig;
  }
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

export default getConfigSysConfig;
