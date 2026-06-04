import { query } from '../connection';

export interface Rule {
  id: number;
  name: string;
  description: string | null;
  content: string;
  status: number;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface RuleWithCreator extends Rule {
  creator_name?: string;
}

export interface RuleWithShareInfo extends RuleWithCreator {
  is_shared?: boolean;
  shared_by?: number;
  shared_by_name?: string;
}

export interface CreateRuleData {
  name: string;
  description?: string;
  content: string;
  status?: number;
  created_by: number;
}

export interface UpdateRuleData {
  name?: string;
  description?: string;
  content?: string;
  status?: number;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  name?: string;
  status?: number;
  createdBy?: number;
}

export async function findAll(params?: ListParams): Promise<{ list: RuleWithCreator[]; total: number }> {
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 10;
  const offset = (page - 1) * pageSize;

  let whereClause = 'WHERE 1=1';
  const queryParams: unknown[] = [];

  if (params?.name) {
    whereClause += ' AND r.name LIKE ?';
    queryParams.push(`%${params.name}%`);
  }

  if (params?.status !== undefined) {
    whereClause += ' AND r.status = ?';
    queryParams.push(params.status);
  }

  if (params?.createdBy !== undefined) {
    whereClause += ' AND r.created_by = ?';
    queryParams.push(params.createdBy);
  }

  // Get total count
  const countResult = await query<{ total: number }[]>(
    `SELECT COUNT(*) as total FROM pioc_rules r ${whereClause}`,
    queryParams
  );
  const total = countResult[0]?.total || 0;

  // Get list with creator info
  const list = await query<RuleWithCreator[]>(
    `SELECT r.*, u.name as creator_name 
     FROM pioc_rules r
     LEFT JOIN pioc_users u ON r.created_by = u.id
     ${whereClause}
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`,
    [...queryParams, pageSize, offset]
  );

  return { list, total };
}

export async function findById(id: number): Promise<RuleWithCreator | null> {
  const results = await query<RuleWithCreator[]>(
    `SELECT r.*, u.name as creator_name 
     FROM pioc_rules r
     LEFT JOIN pioc_users u ON r.created_by = u.id
     WHERE r.id = ?`,
    [id]
  );
  return results[0] || null;
}

export async function findByIdAndUserId(id: number, userId: number): Promise<RuleWithCreator | null> {
  const results = await query<RuleWithCreator[]>(
    `SELECT r.*, u.name as creator_name 
     FROM pioc_rules r
     LEFT JOIN pioc_users u ON r.created_by = u.id
     WHERE r.id = ? AND r.created_by = ?`,
    [id, userId]
  );
  return results[0] || null;
}

// 查询用户可访问的规则列表（创建的 + 被分享的）
export async function findAllAccessibleByUserId(userId: number, params?: ListParams): Promise<{ list: RuleWithShareInfo[]; total: number }> {
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 10;
  const offset = (page - 1) * pageSize;

  let whereClause = 'WHERE (r.created_by = ? OR r.id IN (SELECT rule_id FROM pioc_rule_shares WHERE shared_to = ?))';
  const queryParams: unknown[] = [userId, userId];

  if (params?.name) {
    whereClause += ' AND r.name LIKE ?';
    queryParams.push(`%${params.name}%`);
  }

  if (params?.status !== undefined) {
    whereClause += ' AND r.status = ?';
    queryParams.push(params.status);
  }

  // Get total count
  const countResult = await query<{ total: number }[]>(
    `SELECT COUNT(*) as total FROM pioc_rules r ${whereClause}`,
    queryParams
  );
  const total = countResult[0]?.total || 0;

  // Get list with creator info and share info
  const list = await query<RuleWithShareInfo[]>(
    `SELECT r.*, u.name as creator_name,
            CASE WHEN r.created_by != ? THEN 1 ELSE 0 END as is_shared,
            rs.shared_by as shared_by,
            u_share.name as shared_by_name
     FROM pioc_rules r
     LEFT JOIN pioc_users u ON r.created_by = u.id
     LEFT JOIN pioc_rule_shares rs ON r.id = rs.rule_id AND rs.shared_to = ?
     LEFT JOIN pioc_users u_share ON rs.shared_by = u_share.id
     ${whereClause}
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, userId, ...queryParams, pageSize, offset]
  );

  return { list, total };
}

// 根据ID查询用户可访问的规则（创建的 + 被分享的）
export async function findByIdAccessibleByUserId(id: number, userId: number): Promise<RuleWithShareInfo | null> {
  const results = await query<RuleWithShareInfo[]>(
    `SELECT r.*, u.name as creator_name,
            CASE WHEN r.created_by != ? THEN 1 ELSE 0 END as is_shared,
            rs.shared_by as shared_by,
            u_share.name as shared_by_name
     FROM pioc_rules r
     LEFT JOIN pioc_users u ON r.created_by = u.id
     LEFT JOIN pioc_rule_shares rs ON r.id = rs.rule_id AND rs.shared_to = ?
     LEFT JOIN pioc_users u_share ON rs.shared_by = u_share.id
     WHERE r.id = ? AND (r.created_by = ? OR r.id IN (
       SELECT rule_id FROM pioc_rule_shares WHERE shared_to = ?
     ))`,
    [userId, userId, id, userId, userId]
  );
  return results[0] || null;
}

export async function findByName(name: string): Promise<Rule | null> {
  const results = await query<Rule[]>('SELECT * FROM pioc_rules WHERE name = ?', [name]);
  return results[0] || null;
}

export async function findByNameAndUserId(name: string, userId: number): Promise<Rule | null> {
  const results = await query<Rule[]>('SELECT * FROM pioc_rules WHERE name = ? AND created_by = ?', [name, userId]);
  return results[0] || null;
}

export async function create(data: CreateRuleData): Promise<number> {
  const result = await query<{ insertId: number }>(
    `INSERT INTO pioc_rules 
     (name, description, content, status, created_by) 
     VALUES (?, ?, ?, ?, ?)`,
    [
      data.name,
      data.description || '',
      data.content,
      data.status ?? 1,
      data.created_by,
    ]
  );
  return result.insertId;
}

export async function update(id: number, data: UpdateRuleData): Promise<boolean> {
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
  if (data.content !== undefined) {
    fields.push('content = ?');
    values.push(data.content);
  }
  if (data.status !== undefined) {
    fields.push('status = ?');
    values.push(data.status);
  }

  if (fields.length === 0) return false;

  fields.push('updated_at = NOW()');
  values.push(id);

  const result = await query<{ affectedRows: number }>(
    `UPDATE pioc_rules SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  return result.affectedRows > 0;
}

export async function remove(id: number): Promise<boolean> {
  const result = await query<{ affectedRows: number }>('DELETE FROM pioc_rules WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

export async function removeByIdAndUserId(id: number, userId: number): Promise<boolean> {
  const result = await query<{ affectedRows: number }>('DELETE FROM pioc_rules WHERE id = ? AND created_by = ?', [id, userId]);
  return result.affectedRows > 0;
}
