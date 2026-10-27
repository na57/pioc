/**
 * ITC 网络天气图配置加载器
 * YAML 只管 SNMP 设备凭证和全局参数；节点/链路/视图定义写死在 topology.ts。
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { getTopoView, getAllViewIds, TopoNode, TopoLink } from './topology';

// ========== 类型 ==========

export interface DeviceConfig {
  id: string;
  ip: string;
  name: string;
  description?: string;
  snmpCommunity: string;
}

export interface ViewMeta {
  id: string;
  title: string;
  description: string;
  deviceIds: string[];
}

// ========== YAML 配置（只管 SNMP 设备） ==========

interface RawYaml {
  refreshPeriod: number;
  hotThreshold: number;
  views?: Record<string, { roles?: string }>;
  devices: DeviceConfig[];
}

let cachedConfig: RawYaml | null = null;
let cacheMtime: number = 0;

function getConfigPath(): string {
  return path.join(process.cwd(), 'config', 'itc-weathermap.yaml');
}

export function loadYamlConfig(): RawYaml {
  const configPath = getConfigPath();
  try {
    const stat = fs.statSync(configPath);
    if (cachedConfig && stat.mtimeMs === cacheMtime) return cachedConfig;
    const content = fs.readFileSync(configPath, 'utf-8');
    cachedConfig = yaml.load(content) as RawYaml;
    cacheMtime = stat.mtimeMs;
    return cachedConfig;
  } catch (error) {
    console.error('[ITCWeathermap] 加载配置失败:', error);
    throw new Error(`无法加载配置文件: ${configPath}`);
  }
}

export function reloadConfig(): RawYaml {
  cachedConfig = null;
  cacheMtime = 0;
  return loadYamlConfig();
}

// ========== 查询函数 ==========

export function getDeviceConfig(deviceId: string): DeviceConfig | undefined {
  return loadYamlConfig().devices.find((d) => d.id === deviceId);
}

export function getAllDeviceConfigs(): DeviceConfig[] {
  return loadYamlConfig().devices;
}

export function getRefreshPeriod(): number {
  return loadYamlConfig().refreshPeriod || 30;
}

export function getHotThreshold(): number {
  return loadYamlConfig().hotThreshold || 30;
}

/**
 * 获取视图允许访问的角色名称列表。
 * 未配置或为空字符串表示所有登录用户均可访问（返回空数组）。
 */
export function getViewRoles(viewId: string): string[] {
  const raw = loadYamlConfig().views?.[viewId]?.roles ?? '';
  return raw
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);
}

/** 视图元数据（从 topology.ts 取） */
export function getViewMeta(viewId: string): ViewMeta | undefined {
  const v = getTopoView(viewId);
  if (!v) return undefined;
  return { id: v.id, title: v.title, description: v.description, deviceIds: v.deviceIds };
}

export function getAllViews(): ViewMeta[] {
  return getAllViewIds()
    .map(getViewMeta)
    .filter((v): v is ViewMeta => !!v);
}

/** 视图关联的设备配置（按 topology 中 deviceIds 顺序，跳过 YAML 未配置的） */
export function getDeviceConfigsForView(viewId: string): DeviceConfig[] {
  const v = getTopoView(viewId);
  if (!v) return [];
  const all = loadYamlConfig().devices;
  return v.deviceIds
    .map((id) => all.find((d) => d.id === id))
    .filter((d): d is DeviceConfig => !!d);
}

/** 节点列表（从 topology.ts 取） */
export function getNodesForView(viewId: string): TopoNode[] {
  return getTopoView(viewId)?.nodes ?? [];
}

/** 链路列表（从 topology.ts 取） */
export function getLinksForView(viewId: string): TopoLink[] {
  return getTopoView(viewId)?.links ?? [];
}

export function getCanvasSizeForView(viewId: string): { width: number; height: number } {
  const v = getTopoView(viewId);
  return { width: v?.canvasWidth ?? 1280, height: v?.canvasHeight ?? 800 };
}

export function getNodeStylePresetForView(viewId: string): 'core' | 'hci' | 'lb' {
  return getTopoView(viewId)?.nodeStylePreset ?? 'core';
}

export function getNodeOrderForView(viewId: string): string[] {
  return getTopoView(viewId)?.nodeOrder ?? [];
}
