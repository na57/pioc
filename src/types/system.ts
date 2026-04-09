/**
 * 系统配置类型定义
 */

export interface SystemConfig {
  /** 系统名称 */
  name: string;
  /** 系统简称/英文标识 */
  shortName: string;
  /** 系统描述 */
  description: string;
  /** 系统版本 */
  version: string;
  /** 版权信息 */
  copyright: string;
}
