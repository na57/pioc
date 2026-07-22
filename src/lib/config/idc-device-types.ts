/**
 * IDC设备类型配置
 * 包含所有设备类型定义，包括预留空间类型
 */

export interface DeviceTypeConfig {
  value: number;
  label: string;
  color: string;
  /** 用户上架设备时是否可选择 */
  selectable: boolean;
  /** 在U位视图中显示的背景色 */
  bgColor: string;
  /** 在U位视图中显示的边框色 */
  borderColor: string;
  /** 描述信息 */
  description?: string;
}

/**
 * 设备类型映射表
 * 5-预留空间：用于散热/维护预留，不计入设备数量统计
 */
export const DEVICE_TYPES: Record<number, DeviceTypeConfig> = {
  1: {
    value: 1,
    label: '服务器',
    color: 'blue',
    selectable: true,
    bgColor: '#e6f4ff',
    borderColor: '#91caff',
    description: '计算服务器、应用服务器等',
  },
  2: {
    value: 2,
    label: '网络设备',
    color: 'green',
    selectable: true,
    bgColor: '#f6ffed',
    borderColor: '#b7eb8f',
    description: '交换机、路由器、防火墙等',
  },
  3: {
    value: 3,
    label: '安全设备',
    color: 'orange',
    selectable: true,
    bgColor: '#fff7e6',
    borderColor: '#ffd591',
    description: '安全网关、入侵检测等',
  },
  4: {
    value: 4,
    label: '其他',
    color: 'default',
    selectable: true,
    bgColor: '#f5f5f5',
    borderColor: '#d9d9d9',
    description: '其他类型设备',
  },
  6: {
    value: 6,
    label: '存储设备',
    color: 'purple',
    selectable: true,
    bgColor: '#f9f0ff',
    borderColor: '#d3adf7',
    description: '磁盘阵列、存储阵列、NAS/SAN等',
  },
  5: {
    value: 5,
    label: '预留空间',
    color: 'default',
    selectable: false,
    bgColor: '#f5f5f5',
    borderColor: '#d9d9d9',
    description: '散热预留、维护预留空间',
  },
};

/**
 * 获取所有设备类型
 */
export function getAllDeviceTypes(): DeviceTypeConfig[] {
  return Object.values(DEVICE_TYPES);
}

/**
 * 获取用户可选择的设备类型（上架设备用）
 */
export function getSelectableDeviceTypes(): DeviceTypeConfig[] {
  return Object.values(DEVICE_TYPES).filter(t => t.selectable);
}

/**
 * 获取设备类型配置
 */
export function getDeviceTypeConfig(type: number): DeviceTypeConfig {
  return DEVICE_TYPES[type] || DEVICE_TYPES[4]; // 默认返回"其他"
}

/**
 * 判断是否为真实设备（非预留空间）
 */
export function isRealDevice(deviceType: number): boolean {
  return deviceType !== 5;
}

/**
 * 判断是否为预留空间
 */
export function isReservedSpace(deviceType: number): boolean {
  return deviceType === 5;
}

/**
 * 获取设备类型标签映射（兼容旧代码）
 */
export const deviceTypeMap: Record<number, { label: string; color: string }> = {
  1: { label: '服务器', color: 'blue' },
  2: { label: '网络设备', color: 'green' },
  3: { label: '安全设备', color: 'orange' },
  4: { label: '其他', color: 'default' },
  5: { label: '预留空间', color: 'gold' },
  6: { label: '存储设备', color: 'purple' },
};

/**
 * 预留空间原因选项
 */
export const RESERVED_REASONS = [
  { value: 'cooling', label: '散热预留' },
  { value: 'maintenance', label: '维护预留' },
  { value: 'expansion', label: '扩容预留' },
  { value: 'infrastructure', label: '基础设施' },
  { value: 'other', label: '其他' },
] as const;

/**
 * 获取预留空间原因标签
 */
export function getReservedReasonLabel(reason: string): string {
  const found = RESERVED_REASONS.find(r => r.value === reason);
  return found?.label || reason;
}
