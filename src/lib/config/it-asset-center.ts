/**
 * IT资产中心配置
 */

import { createAppConfigBundle } from '@/lib/data-framework';

// ============================================
// IT资产中心配置类型
// ============================================

export interface ItAssetCenterConfig {
  /** 数据提供者名称，用于确定使用哪个数据提供者实现 */
  provider?: string;
}

// ============================================
// 默认配置
// ============================================

const defaultConfig: ItAssetCenterConfig = {
  provider: 'mock',
};

// ============================================
// 使用工厂创建应用配置包
// ============================================

const appBundle = createAppConfigBundle<ItAssetCenterConfig>({
  defaultConfig,
  configFileName: 'it-asset-center.yaml',
  legacyConfigPath: 'apps.itAssetCenter',
});

const { configLoader } = appBundle;

// ============================================
// 向后兼容的 API
// ============================================

/**
 * 加载 IT 资产中心配置
 * @deprecated 使用 configLoader.load() 替代
 */
export function loadItAssetCenterConfig(): ItAssetCenterConfig {
  return appBundle.loadConfig();
}

/**
 * 获取 IT 资产中心配置
 * @deprecated 使用 configLoader.getConfig() 替代
 */
export function getItAssetCenterConfig(): ItAssetCenterConfig {
  return appBundle.getConfig();
}

// ============================================
// 新的便捷 API
// ============================================

/**
 * 获取配置加载器实例
 */
export function getItAssetCenterConfigLoader() {
  return configLoader;
}

export default configLoader;
