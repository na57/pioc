import { query } from '../connection';

export interface Tag {
  id: number;
  name: string;
  code: string;
  color: string;
  description: string | null;
  status: number;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface TagWithGroups extends Tag {
  groups: {
    id: number;
    name: string;
  }[];
}

export interface CreateTagData {
  name: string;
  code: string;
  color?: string;
  description?: string;
  status?: number;
  group_ids?: number[];
  created_by: number;
}

export interface UpdateTagData {
  name?: string;
  code?: string;
  color?: string;
  description?: string;
  status?: number;
  group_ids?: number[];
}

export interface TagQueryParams {
  page?: number;
  pageSize?: number;
  name?: string;
  status?: number;
  group_id?: number;
  createdBy?: number;
}

// 获取标签列表（带分页和筛选）
export async function findAll(params: TagQueryParams = {}): Promise<{ list: TagWithGroups[]; total: number }> {
  const { page = 1, pageSize = 20, name, status, group_id, createdBy } = params;
  const offset = (page - 1) * pageSize;

  let whereClause = 'WHERE 1=1';
  const queryParams: unknown[] = [];

  if (name) {
    whereClause += ' AND t.name LIKE ?';
    queryParams.push(`%${name}%`);
  }

  if (status !== undefined) {
    whereClause += ' AND t.status = ?';
    queryParams.push(status);
  }

  if (group_id) {
    whereClause += ' AND t.id IN (SELECT tag_id FROM pioc_tag_group_relations WHERE group_id = ?)';
    queryParams.push(group_id);
  }

  if (createdBy !== undefined) {
    whereClause += ' AND t.created_by = ?';
    queryParams.push(createdBy);
  }

  // 获取总数
  const countResult = await query<{ total: number }[]>(
    `SELECT COUNT(*) as total FROM pioc_tags t ${whereClause}`,
    queryParams
  );
  const total = countResult[0]?.total || 0;

  // 获取标签列表
  const tags = await query<Tag[]>(
    `SELECT t.* FROM pioc_tags t ${whereClause} ORDER BY t.created_at DESC LIMIT ? OFFSET ?`,
    [...queryParams, Number(pageSize), Number(offset)]
  );

  // 获取标签关联的分组
  const tagIds = tags.map(t => t.id);
  let groups: { tag_id: number; id: number; name: string }[] = [];

  if (tagIds.length > 0) {
    const placeholders = tagIds.map(() => '?').join(',');
    groups = await query<{ tag_id: number; id: number; name: string }[]>(
      `SELECT tgr.tag_id, tg.id, tg.name 
       FROM pioc_tag_group_relations tgr
       INNER JOIN pioc_tag_groups tg ON tgr.group_id = tg.id
       WHERE tgr.tag_id IN (${placeholders})`,
      tagIds
    );
  }

  // 组装数据
  const list: TagWithGroups[] = tags.map(tag => ({
    ...tag,
    groups: groups
      .filter(g => g.tag_id === tag.id)
      .map(g => ({ id: g.id, name: g.name })),
  }));

  return { list, total };
}

// 根据ID获取标签详情
export async function findById(id: number): Promise<TagWithGroups | null> {
  const tags = await query<Tag[]>('SELECT * FROM pioc_tags WHERE id = ?', [id]);
  if (tags.length === 0) return null;

  const tag = tags[0];

  // 获取关联的分组
  const groups = await query<{ id: number; name: string }[]>(
    `SELECT tg.id, tg.name 
     FROM pioc_tag_group_relations tgr
     INNER JOIN pioc_tag_groups tg ON tgr.group_id = tg.id
     WHERE tgr.tag_id = ?`,
    [id]
  );

  return {
    ...tag,
    groups,
  };
}

// 根据ID和用户ID获取标签详情
export async function findByIdAndUserId(id: number, userId: number): Promise<TagWithGroups | null> {
  const tags = await query<Tag[]>('SELECT * FROM pioc_tags WHERE id = ? AND created_by = ?', [id, userId]);
  if (tags.length === 0) return null;

  const tag = tags[0];

  // 获取关联的分组
  const groups = await query<{ id: number; name: string }[]>(
    `SELECT tg.id, tg.name 
     FROM pioc_tag_group_relations tgr
     INNER JOIN pioc_tag_groups tg ON tgr.group_id = tg.id
     WHERE tgr.tag_id = ?`,
    [id]
  );

  return {
    ...tag,
    groups,
  };
}

// 根据编码获取标签
export async function findByCode(code: string): Promise<Tag | null> {
  const tags = await query<Tag[]>('SELECT * FROM pioc_tags WHERE code = ?', [code]);
  return tags[0] || null;
}

// 根据编码和用户ID获取标签
export async function findByCodeAndUserId(code: string, userId: number): Promise<Tag | null> {
  const tags = await query<Tag[]>('SELECT * FROM pioc_tags WHERE code = ? AND created_by = ?', [code, userId]);
  return tags[0] || null;
}

// 创建标签
export async function create(data: CreateTagData): Promise<number> {
  const result = await query<{ insertId: number }>(
    `INSERT INTO pioc_tags (name, code, color, description, status, created_by) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.code,
      data.color || '#1890ff',
      data.description || null,
      data.status ?? 1,
      data.created_by,
    ]
  );

  const tagId = result.insertId;

  // 建立分组关联
  if (data.group_ids && data.group_ids.length > 0) {
    const values = data.group_ids.map(() => '(?, ?)').join(',');
    const params = data.group_ids.flatMap(groupId => [tagId, groupId]);
    await query(
      `INSERT INTO pioc_tag_group_relations (tag_id, group_id) VALUES ${values}`,
      params
    );
  }

  return tagId;
}

// 更新标签
export async function update(id: number, data: UpdateTagData): Promise<boolean> {
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
  if (data.color !== undefined) {
    fields.push('color = ?');
    values.push(data.color);
  }
  if (data.description !== undefined) {
    fields.push('description = ?');
    values.push(data.description);
  }
  if (data.status !== undefined) {
    fields.push('status = ?');
    values.push(data.status);
  }

  if (fields.length === 0 && (!data.group_ids || data.group_ids.length === 0)) {
    return false;
  }

  // 更新标签基本信息
  if (fields.length > 0) {
    fields.push('updated_at = NOW()');
    values.push(id);

    await query(
      `UPDATE pioc_tags SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  // 更新分组关联
  if (data.group_ids !== undefined) {
    // 删除原有关联
    await query('DELETE FROM pioc_tag_group_relations WHERE tag_id = ?', [id]);

    // 建立新关联
    if (data.group_ids.length > 0) {
      const values = data.group_ids.map(() => '(?, ?)').join(',');
      const params = data.group_ids.flatMap(groupId => [id, groupId]);
      await query(
        `INSERT INTO pioc_tag_group_relations (tag_id, group_id) VALUES ${values}`,
        params
      );
    }
  }

  return true;
}

// 删除标签
export async function remove(id: number): Promise<boolean> {
  // 删除关联关系
  await query('DELETE FROM pioc_tag_group_relations WHERE tag_id = ?', [id]);

  // 删除标签
  const result = await query<{ affectedRows: number }>('DELETE FROM pioc_tags WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

// 根据ID和用户ID删除标签
export async function removeByIdAndUserId(id: number, userId: number): Promise<boolean> {
  // 删除关联关系
  await query('DELETE FROM pioc_tag_group_relations WHERE tag_id = ?', [id]);

  // 删除标签
  const result = await query<{ affectedRows: number }>('DELETE FROM pioc_tags WHERE id = ? AND created_by = ?', [id, userId]);
  return result.affectedRows > 0;
}

// 检查编码是否已存在
export async function isCodeExists(code: string, excludeId?: number): Promise<boolean> {
  let sql = 'SELECT COUNT(*) as count FROM pioc_tags WHERE code = ?';
  const params: unknown[] = [code];

  if (excludeId) {
    sql += ' AND id != ?';
    params.push(excludeId);
  }

  const result = await query<{ count: number }[]>(sql, params);
  return result[0]?.count > 0;
}
