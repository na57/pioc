import { query } from '../connection';

export interface WecomSmartSheet {
  id: number;
  app_id: number;
  app_name?: string;
  docid: string;
  name: string;
  url: string | null;
  description: string | null;
  sheets_json: string | null;
  sheets?: { sheet_id: string; name: string }[];
  status: number;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateWecomSmartSheetData {
  app_id: number;
  docid: string;
  name: string;
  url?: string;
  description?: string;
  sheets_json?: string;
  status?: number;
  created_by: number;
}

export interface UpdateWecomSmartSheetData {
  app_id?: number;
  docid?: string;
  name?: string;
  url?: string;
  description?: string;
  sheets_json?: string;
  status?: number;
}

export interface WecomSmartSheetFilters {
  app_id?: number;
  name?: string;
  docid?: string;
  status?: number;
}

// 获取所有智能表格（带分页）
export async function findAll(
  page: number = 1,
  pageSize: number = 20,
  filters?: WecomSmartSheetFilters
): Promise<{ list: WecomSmartSheet[]; total: number }> {
  const whereConditions: string[] = [];
  const values: unknown[] = [];

  if (filters?.app_id) {
    whereConditions.push('s.app_id = ?');
    values.push(filters.app_id);
  }
  if (filters?.name) {
    whereConditions.push('s.name LIKE ?');
    values.push(`%${filters.name}%`);
  }
  if (filters?.docid) {
    whereConditions.push('s.docid LIKE ?');
    values.push(`%${filters.docid}%`);
  }
  if (filters?.status !== undefined) {
    whereConditions.push('s.status = ?');
    values.push(filters.status);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // 获取总数
  const countResult = await query<{ total: number }[]>(
    `SELECT COUNT(*) as total FROM pioc_wecom_smart_sheets s ${whereClause}`,
    values
  );
  const total = countResult[0]?.total || 0;

  // 获取列表（关联应用表获取应用名称）
  const offset = (page - 1) * pageSize;
  const list = await query<WecomSmartSheet[]>(
    `SELECT s.*, app.name as app_name 
     FROM pioc_wecom_smart_sheets s 
     LEFT JOIN pioc_wecom_apps app ON s.app_id = app.id 
     ${whereClause} 
     ORDER BY s.created_at DESC 
     LIMIT ? OFFSET ?`,
    [...values, pageSize, offset]
  );

  return { list, total };
}

// 获取所有智能表格（不分页）
export async function findAllWithoutPagination(
  filters?: WecomSmartSheetFilters
): Promise<WecomSmartSheet[]> {
  const whereConditions: string[] = [];
  const values: unknown[] = [];

  if (filters?.app_id) {
    whereConditions.push('s.app_id = ?');
    values.push(filters.app_id);
  }
  if (filters?.name) {
    whereConditions.push('s.name LIKE ?');
    values.push(`%${filters.name}%`);
  }
  if (filters?.docid) {
    whereConditions.push('s.docid LIKE ?');
    values.push(`%${filters.docid}%`);
  }
  if (filters?.status !== undefined) {
    whereConditions.push('s.status = ?');
    values.push(filters.status);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  return query<WecomSmartSheet[]>(
    `SELECT s.*, app.name as app_name 
     FROM pioc_wecom_smart_sheets s 
     LEFT JOIN pioc_wecom_apps app ON s.app_id = app.id 
     ${whereClause} 
     ORDER BY s.created_at DESC`,
    values
  );
}

// 根据ID获取智能表格
export async function findById(id: number): Promise<WecomSmartSheet | null> {
  const results = await query<WecomSmartSheet[]>(
    `SELECT s.*, app.name as app_name 
     FROM pioc_wecom_smart_sheets s 
     LEFT JOIN pioc_wecom_apps app ON s.app_id = app.id 
     WHERE s.id = ?`,
    [id]
  );
  return results[0] || null;
}

// 根据docid获取智能表格
export async function findByDocid(docid: string, excludeId?: number): Promise<WecomSmartSheet | null> {
  let sql = 'SELECT * FROM pioc_wecom_smart_sheets WHERE docid = ?';
  const values: unknown[] = [docid];

  if (excludeId) {
    sql += ' AND id != ?';
    values.push(excludeId);
  }

  const results = await query<WecomSmartSheet[]>(sql, values);
  return results[0] || null;
}

// 创建智能表格
export async function create(data: CreateWecomSmartSheetData): Promise<number> {
  const result = await query<{ insertId: number }>(
    `INSERT INTO pioc_wecom_smart_sheets 
     (app_id, docid, name, url, description, sheets_json, status, created_by) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.app_id,
      data.docid,
      data.name,
      data.url || null,
      data.description || null,
      data.sheets_json || null,
      data.status ?? 1,
      data.created_by,
    ]
  );
  return result.insertId;
}

// 更新智能表格
export async function update(id: number, data: UpdateWecomSmartSheetData): Promise<boolean> {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.app_id !== undefined) {
    fields.push('app_id = ?');
    values.push(data.app_id);
  }
  if (data.docid !== undefined) {
    fields.push('docid = ?');
    values.push(data.docid);
  }
  if (data.name !== undefined) {
    fields.push('name = ?');
    values.push(data.name);
  }
  if (data.url !== undefined) {
    fields.push('url = ?');
    values.push(data.url);
  }
  if (data.description !== undefined) {
    fields.push('description = ?');
    values.push(data.description);
  }
  if (data.sheets_json !== undefined) {
    fields.push('sheets_json = ?');
    values.push(data.sheets_json);
  }
  if (data.status !== undefined) {
    fields.push('status = ?');
    values.push(data.status);
  }

  if (fields.length === 0) return false;

  fields.push('updated_at = NOW()');
  values.push(id);

  const result = await query<{ affectedRows: number }>(
    `UPDATE pioc_wecom_smart_sheets SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  return result.affectedRows > 0;
}

// 删除智能表格
export async function remove(id: number): Promise<boolean> {
  const result = await query<{ affectedRows: number }>(
    'DELETE FROM pioc_wecom_smart_sheets WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
}

// 获取指定应用下的所有智能表格
export async function findByAppId(appId: number): Promise<WecomSmartSheet[]> {
  return query<WecomSmartSheet[]>(
    `SELECT s.*, app.name as app_name 
     FROM pioc_wecom_smart_sheets s 
     LEFT JOIN pioc_wecom_apps app ON s.app_id = app.id 
     WHERE s.app_id = ? 
     ORDER BY s.created_at DESC`,
    [appId]
  );
}
