import { query } from '../connection';

export interface TagGroup {
  id: number;
  name: string;
  code: string;
  description: string | null;
  color: string | null;
  sort_order: number;
  status: number;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTagGroupData {
  name: string;
  code: string;
  description?: string;
  color?: string;
  sort_order?: number;
  status?: number;
  created_by: number;
}

export interface UpdateTagGroupData {
  name?: string;
  code?: string;
  description?: string;
  color?: string;
  sort_order?: number;
  status?: number;
}

export interface TagGroupQueryParams {
  page?: number;
  pageSize?: number;
  name?: string;
  status?: number;
  createdBy?: number;
}

// 获取分组列表（带分页和筛选）
export async function findAll(params: TagGroupQueryParams = {}): Promise<{ list: TagGroup[]; total: number }> {
  const { page = 1, pageSize = 20, name, status, createdBy } = params;
  const offset = (page - 1) * pageSize;

  let whereClause = 'WHERE 1=1';
  const queryParams: unknown[] = [];

  if (name) {
    whereClause += ' AND name LIKE ?';
    queryParams.push(`%${name}%`);
  }

  if (status !== undefined) {
    whereClause += ' AND status = ?';
    queryParams.push(status);
  }

  if (createdBy !== undefined) {
    whereClause += ' AND created_by = ?';
    queryParams.push(createdBy);
  }

  // 获取总数
  const countResult = await query<{ total: number }[]>(
    `SELECT COUNT(*) as total FROM pioc_tag_groups ${whereClause}`,
    queryParams
  );
  const total = countResult[0]?.total || 0;

  // 获取分组列表
  const list = await query<TagGroup[]>(
    `SELECT * FROM pioc_tag_groups ${whereClause} ORDER BY sort_order ASC, created_at DESC LIMIT ? OFFSET ?`,
    [...queryParams, Number(pageSize), Number(offset)]
  );

  return { list, total };
}

// 获取所有分组（不分页，用于下拉选择）
export async function findAllActive(): Promise<TagGroup[]> {
  return query<TagGroup[]>(
    'SELECT * FROM pioc_tag_groups WHERE status = 1 ORDER BY sort_order ASC, created_at DESC'
  );
}

// 获取所有分组（不分页，用于下拉选择，按用户过滤）
export async function findAllActiveByUserId(userId: number): Promise<TagGroup[]> {
  return query<TagGroup[]>(
    'SELECT * FROM pioc_tag_groups WHERE status = 1 AND created_by = ? ORDER BY sort_order ASC, created_at DESC',
    [userId]
  );
}

// 根据ID获取分组详情
export async function findById(id: number): Promise<TagGroup | null> {
  const groups = await query<TagGroup[]>('SELECT * FROM pioc_tag_groups WHERE id = ?', [id]);
  return groups[0] || null;
}

// 根据ID和用户ID获取分组详情
export async function findByIdAndUserId(id: number, userId: number): Promise<TagGroup | null> {
  const groups = await query<TagGroup[]>('SELECT * FROM pioc_tag_groups WHERE id = ? AND created_by = ?', [id, userId]);
  return groups[0] || null;
}

// 根据编码获取分组
export async function findByCode(code: string): Promise<TagGroup | null> {
  const groups = await query<TagGroup[]>('SELECT * FROM pioc_tag_groups WHERE code = ?', [code]);
  return groups[0] || null;
}

// 根据编码和用户ID获取分组
export async function findByCodeAndUserId(code: string, userId: number): Promise<TagGroup | null> {
  const groups = await query<TagGroup[]>('SELECT * FROM pioc_tag_groups WHERE code = ? AND created_by = ?', [code, userId]);
  return groups[0] || null;
}

// 创建分组
export async function create(data: CreateTagGroupData): Promise<number> {
  const result = await query<{ insertId: number }>(
    `INSERT INTO pioc_tag_groups (name, code, description, color, sort_order, status, created_by) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.code,
      data.description || null,
      data.color || null,
      data.sort_order ?? 0,
      data.status ?? 1,
      data.created_by,
    ]
  );

  return result.insertId;
}

// 更新分组
export async function update(id: number, data: UpdateTagGroupData): Promise<boolean> {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) {
    fields.push('name = ?');
    values.push(data.name);
  }
  if (data.code !== undefined) {
    fields.push('code = ?');
    values.push(data.code);
  }
  if (data.description !== undefined) {
    fields.push('description = ?');
    values.push(data.description);
  }
  if (data.color !== undefined) {
    fields.push('color = ?');
    values.push(data.color);
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

  fields.push('updated_at = NOW()');
  values.push(id);

  const result = await query<{ affectedRows: number }>(
    `UPDATE pioc_tag_groups SET ${fields.join(', ')} WHERE id = ?`,
    values
  );

  return result.affectedRows > 0;
}

// 删除分组
export async function remove(id: number): Promise<boolean> {
  // 检查是否有关联的标签
  const relationResult = await query<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM pioc_tag_group_relations WHERE group_id = ?',
    [id]
  );

  if (relationResult[0]?.count > 0) {
    // 删除关联关系
    await query('DELETE FROM pioc_tag_group_relations WHERE group_id = ?', [id]);
  }

  // 删除分组
  const result = await query<{ affectedRows: number }>('DELETE FROM pioc_tag_groups WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

// 根据ID和用户ID删除分组
export async function removeByIdAndUserId(id: number, userId: number): Promise<boolean> {
  // 检查是否有关联的标签
  const relationResult = await query<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM pioc_tag_group_relations WHERE group_id = ?',
    [id]
  );

  if (relationResult[0]?.count > 0) {
    // 删除关联关系
    await query('DELETE FROM pioc_tag_group_relations WHERE group_id = ?', [id]);
  }

  // 删除分组
  const result = await query<{ affectedRows: number }>('DELETE FROM pioc_tag_groups WHERE id = ? AND created_by = ?', [id, userId]);
  return result.affectedRows > 0;
}

// 检查分组下是否有标签
export async function hasTags(id: number): Promise<boolean> {
  const result = await query<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM pioc_tag_group_relations WHERE group_id = ?',
    [id]
  );
  return result[0]?.count > 0;
}

// 检查编码是否已存在
export async function isCodeExists(code: string, excludeId?: number): Promise<boolean> {
  let sql = 'SELECT COUNT(*) as count FROM pioc_tag_groups WHERE code = ?';
  const params: unknown[] = [code];

  if (excludeId) {
    sql += ' AND id != ?';
    params.push(excludeId);
  }

  const result = await query<{ count: number }[]>(sql, params);
  return result[0]?.count > 0;
}
