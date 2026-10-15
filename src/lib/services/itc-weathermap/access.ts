/**
 * ITC 网络天气图视图级访问控制
 *
 * 角色配置在 config/itc-weathermap.yaml 的 views.<id>.roles：
 * - 留空/未配置：所有登录用户可访问；
 * - 配置角色名（逗号分隔）：用户需拥有其中任一角色（匹配 pioc_roles.name）。
 */

import { findUserRoles } from '@/lib/database/models/user';
import { getViewRoles } from './config-loader';

/** 获取用户拥有的角色名称列表 */
export async function getUserRoleNames(userId: number): Promise<string[]> {
  const roles = await findUserRoles(userId);
  return roles.map((r) => r.name);
}

/** 判断用户是否可访问指定视图 */
export async function canAccessView(viewId: string, userId: number): Promise<boolean> {
  const required = getViewRoles(viewId);
  if (required.length === 0) return true;

  const userRoles = await getUserRoleNames(userId);
  return required.some((r) => userRoles.includes(r));
}
