import { query } from '../connection';

// 应用级菜单：应用自己的侧边导航（与系统菜单 pioc_menus 相互独立）
export interface AppMenu {
  id: number;
  app_id: number;
  name: string;
  path: string;
  icon: string | null;
  sort_order: number;
  status: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateAppMenuData {
  app_id: number;
  name: string;
  path: string;
  icon?: string;
  sort_order?: number;
  status?: number;
}

export interface UpdateAppMenuData {
  name?: string;
  path?: string;
  icon?: string;
  sort_order?: number;
  status?: number;
}

// 查询应用下的全部菜单（按 sort_order 排序）
export async function findByAppId(appId: number): Promise<AppMenu[]> {
  return query<AppMenu[]>(
    'SELECT * FROM pioc_app_menus WHERE app_id = ? ORDER BY sort_order, id',
    [appId]
  );
}

// 查询应用下已启用的菜单（供侧边栏渲染）
export async function findEnabledByAppId(appId: number): Promise<AppMenu[]> {
  return query<AppMenu[]>(
    'SELECT * FROM pioc_app_menus WHERE app_id = ? AND status = 1 ORDER BY sort_order, id',
    [appId]
  );
}

export async function findById(id: number): Promise<AppMenu | null> {
  const results = await query<AppMenu[]>('SELECT * FROM pioc_app_menus WHERE id = ?', [id]);
  return results[0] || null;
}

export async function create(data: CreateAppMenuData): Promise<number> {
  const result = await query<{ insertId: number }>(
    'INSERT INTO pioc_app_menus (app_id, name, path, icon, sort_order, status) VALUES (?, ?, ?, ?, ?, ?)',
    [data.app_id, data.name, data.path, data.icon || null, data.sort_order ?? 0, data.status ?? 1]
  );
  return result.insertId;
}

export async function update(id: number, data: UpdateAppMenuData): Promise<boolean> {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) {
    fields.push('name = ?');
    values.push(data.name);
  }
  if (data.path !== undefined) {
    fields.push('path = ?');
    values.push(data.path);
  }
  if (data.icon !== undefined) {
    fields.push('icon = ?');
    values.push(data.icon);
  }
  if (data.sort_order !== undefined) {
    fields.push('sort_order = ?');
    values.push(data.sort_order);
  }
  if (data.status !== undefined) {
    fields.push('status = ?');
    values.push(data.status);
  }

  if (fields.length === 0) return false;

  values.push(id);
  const result = await query<{ affectedRows: number }>(
    `UPDATE pioc_app_menus SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  return result.affectedRows > 0;
}

export async function remove(id: number): Promise<boolean> {
  const result = await query<{ affectedRows: number }>(
    'DELETE FROM pioc_app_menus WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
}

// 删除应用下全部菜单（应用删除时级联清理）
export async function removeByAppId(appId: number): Promise<void> {
  await query('DELETE FROM pioc_app_menus WHERE app_id = ?', [appId]);
}
