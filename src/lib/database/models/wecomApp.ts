import { query } from '../connection';

export interface WecomApp {
  id: number;
  account_id: number;
  account_name?: string;
  name: string;
  agent_id: string;
  secret: string | null;
  description: string | null;
  status: number;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateWecomAppData {
  account_id: number;
  name: string;
  agent_id: string;
  secret?: string;
  description?: string;
  status?: number;
  created_by: number;
}

export interface UpdateWecomAppData {
  account_id?: number;
  name?: string;
  agent_id?: string;
  secret?: string;
  description?: string;
  status?: number;
}

export interface WecomAppFilters {
  account_id?: number;
  name?: string;
  agent_id?: string;
  status?: number;
  created_by?: number;
}

// 获取所有企微应用（带分页）
export async function findAll(
  page: number = 1,
  pageSize: number = 20,
  filters?: WecomAppFilters
): Promise<{ list: WecomApp[]; total: number }> {
  const whereConditions: string[] = [];
  const values: unknown[] = [];

  if (filters?.created_by) {
    whereConditions.push('a.created_by = ?');
    values.push(filters.created_by);
  }
  if (filters?.account_id) {
    whereConditions.push('a.account_id = ?');
    values.push(filters.account_id);
  }
  if (filters?.name) {
    whereConditions.push('a.name LIKE ?');
    values.push(`%${filters.name}%`);
  }
  if (filters?.agent_id) {
    whereConditions.push('a.agent_id LIKE ?');
    values.push(`%${filters.agent_id}%`);
  }
  if (filters?.status !== undefined) {
    whereConditions.push('a.status = ?');
    values.push(filters.status);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // 获取总数
  const countResult = await query<{ total: number }[]>(
    `SELECT COUNT(*) as total FROM pioc_wecom_apps a ${whereClause}`,
    values
  );
  const total = countResult[0]?.total || 0;

  // 获取列表（关联账号表获取账号名称）
  const offset = (page - 1) * pageSize;
  const list = await query<WecomApp[]>(
    `SELECT a.*, acc.name as account_name 
     FROM pioc_wecom_apps a 
     LEFT JOIN pioc_wecom_accounts acc ON a.account_id = acc.id 
     ${whereClause} 
     ORDER BY a.created_at DESC 
     LIMIT ? OFFSET ?`,
    [...values, pageSize, offset]
  );

  return { list, total };
}

// 获取所有企微应用（不分页）
export async function findAllWithoutPagination(
  filters?: WecomAppFilters
): Promise<WecomApp[]> {
  const whereConditions: string[] = [];
  const values: unknown[] = [];

  if (filters?.created_by) {
    whereConditions.push('a.created_by = ?');
    values.push(filters.created_by);
  }
  if (filters?.account_id) {
    whereConditions.push('a.account_id = ?');
    values.push(filters.account_id);
  }
  if (filters?.name) {
    whereConditions.push('a.name LIKE ?');
    values.push(`%${filters.name}%`);
  }
  if (filters?.agent_id) {
    whereConditions.push('a.agent_id LIKE ?');
    values.push(`%${filters.agent_id}%`);
  }
  if (filters?.status !== undefined) {
    whereConditions.push('a.status = ?');
    values.push(filters.status);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  return query<WecomApp[]>(
    `SELECT a.*, acc.name as account_name 
     FROM pioc_wecom_apps a 
     LEFT JOIN pioc_wecom_accounts acc ON a.account_id = acc.id 
     ${whereClause} 
     ORDER BY a.created_at DESC`,
    values
  );
}

// 根据ID获取企微应用
export async function findById(id: number): Promise<WecomApp | null> {
  const results = await query<WecomApp[]>(
    `SELECT a.*, acc.name as account_name 
     FROM pioc_wecom_apps a 
     LEFT JOIN pioc_wecom_accounts acc ON a.account_id = acc.id 
     WHERE a.id = ?`,
    [id]
  );
  return results[0] || null;
}

// 根据ID和用户ID获取企微应用（用于用户隔离）
export async function findByIdAndUser(id: number, userId: number): Promise<WecomApp | null> {
  const results = await query<WecomApp[]>(
    `SELECT a.*, acc.name as account_name 
     FROM pioc_wecom_apps a 
     LEFT JOIN pioc_wecom_accounts acc ON a.account_id = acc.id 
     WHERE a.id = ? AND a.created_by = ?`,
    [id, userId]
  );
  return results[0] || null;
}

// 创建企微应用
export async function create(data: CreateWecomAppData): Promise<number> {
  const result = await query<{ insertId: number }>(
    `INSERT INTO pioc_wecom_apps 
     (account_id, name, agent_id, secret, description, status, created_by) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.account_id,
      data.name,
      data.agent_id,
      data.secret || null,
      data.description || null,
      data.status ?? 1,
      data.created_by,
    ]
  );
  return result.insertId;
}

// 更新企微应用
export async function update(id: number, data: UpdateWecomAppData): Promise<boolean> {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.account_id !== undefined) {
    fields.push('account_id = ?');
    values.push(data.account_id);
  }
  if (data.name !== undefined) {
    fields.push('name = ?');
    values.push(data.name);
  }
  if (data.agent_id !== undefined) {
    fields.push('agent_id = ?');
    values.push(data.agent_id);
  }
  if (data.secret !== undefined) {
    fields.push('secret = ?');
    values.push(data.secret);
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
    `UPDATE pioc_wecom_apps SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  return result.affectedRows > 0;
}

// 更新企微应用（带用户隔离）
export async function updateByUser(id: number, userId: number, data: UpdateWecomAppData): Promise<boolean> {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.account_id !== undefined) {
    fields.push('account_id = ?');
    values.push(data.account_id);
  }
  if (data.name !== undefined) {
    fields.push('name = ?');
    values.push(data.name);
  }
  if (data.agent_id !== undefined) {
    fields.push('agent_id = ?');
    values.push(data.agent_id);
  }
  if (data.secret !== undefined) {
    fields.push('secret = ?');
    values.push(data.secret);
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
    `UPDATE pioc_wecom_apps SET ${fields.join(', ')} WHERE id = ? AND created_by = ?`,
    values
  );
  return result.affectedRows > 0;
}

// 删除企微应用
export async function remove(id: number): Promise<boolean> {
  const result = await query<{ affectedRows: number }>(
    'DELETE FROM pioc_wecom_apps WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
}

// 删除企微应用（带用户隔离）
export async function removeByUser(id: number, userId: number): Promise<boolean> {
  const result = await query<{ affectedRows: number }>(
    'DELETE FROM pioc_wecom_apps WHERE id = ? AND created_by = ?',
    [id, userId]
  );
  return result.affectedRows > 0;
}

// 获取指定账号下的所有应用
export async function findByAccountId(accountId: number): Promise<WecomApp[]> {
  return query<WecomApp[]>(
    `SELECT a.*, acc.name as account_name 
     FROM pioc_wecom_apps a 
     LEFT JOIN pioc_wecom_accounts acc ON a.account_id = acc.id 
     WHERE a.account_id = ? 
     ORDER BY a.created_at DESC`,
    [accountId]
  );
}
