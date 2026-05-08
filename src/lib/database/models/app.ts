import { query } from '../connection';

// 内置应用ID常量
export const BUILTIN_APPS = {
  USER_MANAGEMENT: 1,    // 用户管理
  ROLE_MANAGEMENT: 2,    // 角色管理
  APP_MANAGEMENT: 3,     // 应用管理
  MENU_MANAGEMENT: 4,    // 菜单管理
  MY_APPS: 5,            // 我的应用
  DATA_SOURCE_MANAGEMENT: 6,  // 数据源管理
  KEY_MANAGEMENT: 7,     // 密钥管理
  TEACHER_TEACHING: 8,   // 本科教师授课情况
  MY_TEACHING: 9,        // 我的授课
  DATA_OBJECT_MANAGEMENT: 10,  // 数据对象管理
  TAG_MANAGEMENT: 11,    // 标签管理
  LABELING_TASKS: 12,    // 打标作业
  COURSE_CENTER: 13,     // 课程中心
  WECOM_ACCOUNTS: 14,    // 企微账号
  WECOM_APPS: 15,        // 企微应用
  TEACHER_CENTER: 16,    // 教师中心
} as const;

// 内置应用URL映射
export const BUILTIN_APP_URLS = {
  '/users': BUILTIN_APPS.USER_MANAGEMENT,
  '/roles': BUILTIN_APPS.ROLE_MANAGEMENT,
  '/apps': BUILTIN_APPS.APP_MANAGEMENT,
  '/menus': BUILTIN_APPS.MENU_MANAGEMENT,
  '/my-apps': BUILTIN_APPS.MY_APPS,
  '/data-sources': BUILTIN_APPS.DATA_SOURCE_MANAGEMENT,
  '/key-management': BUILTIN_APPS.KEY_MANAGEMENT,
  '/teacher-teaching': BUILTIN_APPS.TEACHER_TEACHING,
  '/my-teaching': BUILTIN_APPS.MY_TEACHING,
  '/data-objects': BUILTIN_APPS.DATA_OBJECT_MANAGEMENT,
  '/tags': BUILTIN_APPS.TAG_MANAGEMENT,
  '/labeling-tasks': BUILTIN_APPS.LABELING_TASKS,
  '/course-center': BUILTIN_APPS.COURSE_CENTER,
  '/wecom-accounts': BUILTIN_APPS.WECOM_ACCOUNTS,
  '/wecom-apps': BUILTIN_APPS.WECOM_APPS,
  '/teacher-center': BUILTIN_APPS.TEACHER_CENTER,
} as const;

export interface App {
  id: number;
  name: string;
  description: string;
  icon: string;
  url: string;
  status: number;
  created_at: Date;
  updated_at: Date;
}

// 检查是否为内置应用
export function isBuiltinApp(appId: number): boolean {
  return Object.values(BUILTIN_APPS).includes(appId as any);
}

// 根据URL获取内置应用ID
export function getBuiltinAppIdByUrl(url: string): number | null {
  return BUILTIN_APP_URLS[url as keyof typeof BUILTIN_APP_URLS] || null;
}



export interface CreateAppData {
  name: string;
  description?: string;
  icon?: string;
  url?: string;
  status?: number;
}

export interface UpdateAppData {
  name?: string;
  description?: string;
  icon?: string;
  url?: string;
  status?: number;
}

export async function findAll(): Promise<App[]> {
  return query<App[]>('SELECT * FROM pioc_apps ORDER BY created_at DESC');
}

export async function findById(id: number): Promise<App | null> {
  const results = await query<App[]>('SELECT * FROM pioc_apps WHERE id = ?', [id]);
  return results[0] || null;
}

export async function findByName(name: string): Promise<App | null> {
  const results = await query<App[]>('SELECT * FROM pioc_apps WHERE name = ?', [name]);
  return results[0] || null;
}

export async function findByStatus(status: number): Promise<App[]> {
  return query<App[]>('SELECT * FROM pioc_apps WHERE status = ? ORDER BY created_at DESC', [status]);
}

export async function create(data: CreateAppData): Promise<number> {
  const result = await query<{ insertId: number }>(
    'INSERT INTO pioc_apps (name, description, icon, url, status) VALUES (?, ?, ?, ?, ?)',
    [data.name, data.description || '', data.icon || '', data.url || '', data.status ?? 1]
  );
  return result.insertId;
}

export async function update(id: number, data: UpdateAppData): Promise<boolean> {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) {
    fields.push('name = ?');
    values.push(data.name);
  }
  if (data.description !== undefined) {
    fields.push('description = ?');
    values.push(data.description);
  }
  if (data.icon !== undefined) {
    fields.push('icon = ?');
    values.push(data.icon);
  }
  if (data.url !== undefined) {
    fields.push('url = ?');
    values.push(data.url);
  }
  if (data.status !== undefined) {
    fields.push('status = ?');
    values.push(data.status);
  }

  if (fields.length === 0) return false;

  fields.push('updated_at = NOW()');
  values.push(id);

  const result = await query<{ affectedRows: number }>(
    `UPDATE pioc_apps SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  return result.affectedRows > 0;
}

export async function remove(id: number): Promise<boolean> {
  const result = await query<{ affectedRows: number }>('DELETE FROM pioc_apps WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

export async function findUsersByAppId(appId: number): Promise<number[]> {
  const results = await query<{ user_id: number }[]>(
    `SELECT DISTINCT ur.user_id FROM pioc_user_roles ur
     INNER JOIN pioc_role_apps ra ON ur.role_id = ra.role_id
     WHERE ra.app_id = ?`,
    [appId]
  );
  return results.map(r => r.user_id);
}

export async function findRolesByAppId(appId: number): Promise<number[]> {
  const results = await query<{ role_id: number }[]>(
    'SELECT role_id FROM pioc_role_apps WHERE app_id = ?',
    [appId]
  );
  return results.map(r => r.role_id);
}

// 获取用户有权限访问的所有应用
export async function findAppsByUserId(userId: number): Promise<App[]> {
  return query<App[]>(
    `SELECT DISTINCT a.* FROM pioc_apps a
     INNER JOIN pioc_role_apps ra ON a.id = ra.app_id
     INNER JOIN pioc_user_roles ur ON ra.role_id = ur.role_id
     WHERE ur.user_id = ? AND a.status = 1
     ORDER BY a.created_at DESC`,
    [userId]
  );
}

// 检查用户是否有权限访问指定应用
export async function checkUserAppPermission(userId: number, appId: number): Promise<boolean> {
  const results = await query<{ count: number }[]>(
    `SELECT COUNT(*) as count FROM pioc_role_apps ra
     INNER JOIN pioc_user_roles ur ON ra.role_id = ur.role_id
     WHERE ur.user_id = ? AND ra.app_id = ?`,
    [userId, appId]
  );
  return results[0]?.count > 0;
}

// 检查用户是否有权限访问指定URL（用于内置应用）
export async function checkUserUrlPermission(userId: number, url: string): Promise<boolean> {
  const appId = getBuiltinAppIdByUrl(url);
  if (!appId) {
    // 如果不是内置应用URL，默认允许访问
    return true;
  }
  return checkUserAppPermission(userId, appId);
}
