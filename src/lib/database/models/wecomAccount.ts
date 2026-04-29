import { query } from '../connection';

export interface WecomAccount {
  id: number;
  name: string;
  corp_id: string;
  corp_secret: string | null;
  description: string | null;
  status: number;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateWecomAccountData {
  name: string;
  corp_id: string;
  corp_secret?: string;
  description?: string;
  status?: number;
  created_by: number;
}

export interface UpdateWecomAccountData {
  name?: string;
  corp_id?: string;
  corp_secret?: string;
  description?: string;
  status?: number;
}

export interface WecomAccountFilters {
  name?: string;
  corp_id?: string;
  status?: number;
  created_by?: number;
}

// 获取所有企微账号（带分页）
export async function findAll(
  page: number = 1,
  pageSize: number = 20,
  filters?: WecomAccountFilters
): Promise<{ list: WecomAccount[]; total: number }> {
  const whereConditions: string[] = [];
  const values: unknown[] = [];

  if (filters?.created_by) {
    whereConditions.push('created_by = ?');
    values.push(filters.created_by);
  }
  if (filters?.name) {
    whereConditions.push('name LIKE ?');
    values.push(`%${filters.name}%`);
  }
  if (filters?.corp_id) {
    whereConditions.push('corp_id LIKE ?');
    values.push(`%${filters.corp_id}%`);
  }
  if (filters?.status !== undefined) {
    whereConditions.push('status = ?');
    values.push(filters.status);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // 获取总数
  const countResult = await query<{ total: number }[]>(
    `SELECT COUNT(*) as total FROM pioc_wecom_accounts ${whereClause}`,
    values
  );
  const total = countResult[0]?.total || 0;

  // 获取列表
  const offset = (page - 1) * pageSize;
  const list = await query<WecomAccount[]>(
    `SELECT * FROM pioc_wecom_accounts ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...values, pageSize, offset]
  );

  return { list, total };
}

// 获取所有企微账号（不分页）
export async function findAllWithoutPagination(
  filters?: WecomAccountFilters
): Promise<WecomAccount[]> {
  const whereConditions: string[] = [];
  const values: unknown[] = [];

  if (filters?.created_by) {
    whereConditions.push('created_by = ?');
    values.push(filters.created_by);
  }
  if (filters?.name) {
    whereConditions.push('name LIKE ?');
    values.push(`%${filters.name}%`);
  }
  if (filters?.corp_id) {
    whereConditions.push('corp_id LIKE ?');
    values.push(`%${filters.corp_id}%`);
  }
  if (filters?.status !== undefined) {
    whereConditions.push('status = ?');
    values.push(filters.status);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  return query<WecomAccount[]>(
    `SELECT * FROM pioc_wecom_accounts ${whereClause} ORDER BY created_at DESC`,
    values
  );
}

// 根据ID获取企微账号
export async function findById(id: number): Promise<WecomAccount | null> {
  const results = await query<WecomAccount[]>(
    'SELECT * FROM pioc_wecom_accounts WHERE id = ?',
    [id]
  );
  return results[0] || null;
}

// 根据ID和用户ID获取企微账号（用于用户隔离）
export async function findByIdAndUser(id: number, userId: number): Promise<WecomAccount | null> {
  const results = await query<WecomAccount[]>(
    'SELECT * FROM pioc_wecom_accounts WHERE id = ? AND created_by = ?',
    [id, userId]
  );
  return results[0] || null;
}

// 根据CorpId获取企微账号
export async function findByCorpId(corpId: string): Promise<WecomAccount | null> {
  const results = await query<WecomAccount[]>(
    'SELECT * FROM pioc_wecom_accounts WHERE corp_id = ?',
    [corpId]
  );
  return results[0] || null;
}

// 创建企微账号
export async function create(data: CreateWecomAccountData): Promise<number> {
  const result = await query<{ insertId: number }>(
    `INSERT INTO pioc_wecom_accounts 
     (name, corp_id, corp_secret, description, status, created_by) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.corp_id,
      data.corp_secret || null,
      data.description || null,
      data.status ?? 1,
      data.created_by,
    ]
  );
  return result.insertId;
}

// 更新企微账号
export async function update(id: number, data: UpdateWecomAccountData): Promise<boolean> {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) {
    fields.push('name = ?');
    values.push(data.name);
  }
  if (data.corp_id !== undefined) {
    fields.push('corp_id = ?');
    values.push(data.corp_id);
  }
  if (data.corp_secret !== undefined) {
    fields.push('corp_secret = ?');
    values.push(data.corp_secret);
  }
  if (data.description !== undefined) {
    fields.push('description = ?');
    values.push(data.description);
  }
  if (data.status !== undefined) {
    fields.push('status = ?');
    values.push(data.status);
  }

  if (fields.length === 0) return false;

  fields.push('updated_at = NOW()');
  values.push(id);

  const result = await query<{ affectedRows: number }>(
    `UPDATE pioc_wecom_accounts SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  return result.affectedRows > 0;
}

// 更新企微账号（带用户隔离）
export async function updateByUser(id: number, userId: number, data: UpdateWecomAccountData): Promise<boolean> {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) {
    fields.push('name = ?');
    values.push(data.name);
  }
  if (data.corp_id !== undefined) {
    fields.push('corp_id = ?');
    values.push(data.corp_id);
  }
  if (data.corp_secret !== undefined) {
    fields.push('corp_secret = ?');
    values.push(data.corp_secret);
  }
  if (data.description !== undefined) {
    fields.push('description = ?');
    values.push(data.description);
  }
  if (data.status !== undefined) {
    fields.push('status = ?');
    values.push(data.status);
  }

  if (fields.length === 0) return false;

  fields.push('updated_at = NOW()');
  values.push(id);
  values.push(userId);

  const result = await query<{ affectedRows: number }>(
    `UPDATE pioc_wecom_accounts SET ${fields.join(', ')} WHERE id = ? AND created_by = ?`,
    values
  );
  return result.affectedRows > 0;
}

// 删除企微账号
export async function remove(id: number): Promise<boolean> {
  const result = await query<{ affectedRows: number }>(
    'DELETE FROM pioc_wecom_accounts WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
}

// 删除企微账号（带用户隔离）
export async function removeByUser(id: number, userId: number): Promise<boolean> {
  const result = await query<{ affectedRows: number }>(
    'DELETE FROM pioc_wecom_accounts WHERE id = ? AND created_by = ?',
    [id, userId]
  );
  return result.affectedRows > 0;
}

// 检查CorpId是否已存在
export async function checkCorpIdExists(corpId: string, excludeId?: number): Promise<boolean> {
  let sql = 'SELECT COUNT(*) as count FROM pioc_wecom_accounts WHERE corp_id = ?';
  const values: unknown[] = [corpId];

  if (excludeId) {
    sql += ' AND id != ?';
    values.push(excludeId);
  }

  const results = await query<{ count: number }[]>(sql, values);
  return results[0]?.count > 0;
}
