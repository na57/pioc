/**
 * IT资产中心 - 数据提供者工厂
 * 根据配置动态加载对应的数据提供者实现
 */

import { IItAssetDataProvider } from './types';
import { getItAssetCenterConfig } from '@/lib/config/it-asset-center';

// Provider 缓存
const providerCache = new Map<string, IItAssetDataProvider>();

/**
 * 创建 IT 资产数据提供者
 * 根据配置文件中的 provider 字段动态加载对应的实现
 * 例如：provider: 'mock' -> 加载 providers/mock-provider.ts
 * @param providerName 可选，直接指定提供者名称。如果不传，则从配置中读取
 * @returns IItAssetDataProvider 实例
 */
export async function createItAssetDataProvider(
  providerName?: string
): Promise<IItAssetDataProvider> {
  const name = providerName || getItAssetCenterConfig().provider || 'mock';

  // 检查缓存
  if (providerCache.has(name)) {
    return providerCache.get(name)!;
  }

  try {
    // 动态导入对应的 Provider 模块
    // 约定：provider 名称对应文件 providers/{name}-provider.ts
    const module = await import(`./providers/${name}-provider`);

    // 约定：Provider 类名为 {Name}DataProvider
    // 例如：mock -> MockDataProvider, cmdb -> CmdbDataProvider
    const className = `${name.charAt(0).toUpperCase()}${name.slice(1).toLowerCase()}DataProvider`;

    const ProviderClass = module[className];

    if (!ProviderClass) {
      throw new Error(
        `Provider 类 ${className} 未在文件 providers/${name}-provider.ts 中找到`
      );
    }

    const provider = new ProviderClass();
    providerCache.set(name, provider);

    return provider;
  } catch (error) {
    console.error(`加载 Provider 失败: ${name}`, error);

    // 如果加载失败，回退到默认的 mock provider
    if (name !== 'mock') {
      console.warn('回退到默认 Provider: mock');
      return createItAssetDataProvider('mock');
    }

    throw new Error(`无法加载 Provider: ${name}`);
  }
}

/**
 * 清除 Provider 缓存
 * 用于配置重新加载后刷新 Provider
 */
export function clearProviderCache(): void {
  providerCache.clear();
}
