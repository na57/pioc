/**
 * 教师中心配置
 * 全 API 迁移后仅保留 provider 与 ai 配置
 */

import { AIConfig, createAppConfigBundle } from '@/lib/data-framework';

// ============================================
// 教师中心配置类型
// ============================================

export interface TeacherCenterConfig {
  ai?: AIConfig;
  /** 数据提供者名称，用于确定使用哪个数据提供者实现 */
  provider?: string;
}

// ============================================
// 默认配置
// ============================================

const defaultConfig: TeacherCenterConfig = {
  provider: 'ynu',
  ai: {
    providerId: 'local-minimax',
  },
};

// ============================================
// 使用工厂创建应用配置包
// ============================================

const appBundle = createAppConfigBundle<TeacherCenterConfig>({
  defaultConfig,
  configFileName: 'teacher-center.yaml',
  legacyConfigPath: 'apps.teacherCenter',
});

const { configLoader } = appBundle;

// ============================================
// 向后兼容的 API
// ============================================

/**
 * 加载教师中心配置
 * @deprecated 使用 configLoader.load() 替代
 */
export function loadTeacherCenterConfig(): TeacherCenterConfig {
  return appBundle.loadConfig();
}

/**
 * 获取教师中心配置
 * @deprecated 使用 configLoader.getConfig() 替代
 */
export function getTeacherCenterConfig(): TeacherCenterConfig {
  return appBundle.getConfig();
}

// ============================================
// 新的便捷 API
// ============================================

/**
 * 获取配置加载器实例
 */
export function getTeacherCenterConfigLoader() {
  return configLoader;
}

export default configLoader;
