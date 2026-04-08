import { query } from '../connection';

export interface DataObject {
  id: number;
  name: string;
  description: string | null;
  data_source_id: string;
  query_statement: string;
  primary_key: string;
  display_template: string;
  status: number;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface DataObjectWithDataSource extends DataObject {
  data_source_name?: string;
  data_source_type?: string;
}

export interface CreateDataObjectData {
  name: string;
  description?: string;
  data_source_id: string;
  query_statement: string;
  primary_key: string;
  display_template?: string;
  status?: number;
  created_by: number;
}

export interface UpdateDataObjectData {
  name?: string;
  description?: string;
  data_source_id?: string;
  query_statement?: string;
  primary_key?: string;
  display_template?: string;
  status?: number;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  name?: string;
  dataSourceId?: string;
  status?: number;
  createdBy?: number;
}

export async function findAll(params?: ListParams): Promise<{ list: DataObjectWithDataSource[]; total: number }> {
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 10;
  const offset = (page - 1) * pageSize;

  let whereClause = 'WHERE 1=1';
  const queryParams: unknown[] = [];

  if (params?.name) {
    whereClause += ' AND do.name LIKE ?';
    queryParams.push(`%${params.name}%`);
  }

  if (params?.dataSourceId) {
    whereClause += ' AND do.data_source_id = ?';
    queryParams.push(params.dataSourceId);
  }

  if (params?.status !== undefined) {
    whereClause += ' AND do.status = ?';
    queryParams.push(params.status);
  }

  if (params?.createdBy !== undefined) {
    whereClause += ' AND do.created_by = ?';
    queryParams.push(params.createdBy);
  }

  // Get total count
  const countResult = await query<{ total: number }[]>(
    `SELECT COUNT(*) as total FROM pioc_data_objects do ${whereClause}`,
    queryParams
  );
  const total = countResult[0]?.total || 0;

  // Get list with data source info
  const list = await query<DataObjectWithDataSource[]>(
    `SELECT do.*, ds.name as data_source_name, ds.type as data_source_type 
     FROM pioc_data_objects do
     LEFT JOIN pioc_data_sources ds ON do.data_source_id = ds.id
     ${whereClause}
     ORDER BY do.created_at DESC
     LIMIT ${Number(pageSize)} OFFSET ${Number(offset)}`,
    queryParams
  );

  return { list, total };
}

export async function findById(id: number): Promise<DataObjectWithDataSource | null> {
  const results = await query<DataObjectWithDataSource[]>(
    `SELECT do.*, ds.name as data_source_name, ds.type as data_source_type,
            ds.host as data_source_host, ds.port as data_source_port, 
            ds.db_name as data_source_database, ds.username as data_source_username
     FROM pioc_data_objects do
     LEFT JOIN pioc_data_sources ds ON do.data_source_id = ds.id
     WHERE do.id = ?`,
    [id]
  );
  return results[0] || null;
}

export async function findByIdAndUserId(id: number, userId: number): Promise<DataObjectWithDataSource | null> {
  const results = await query<DataObjectWithDataSource[]>(
    `SELECT do.*, ds.name as data_source_name, ds.type as data_source_type,
            ds.host as data_source_host, ds.port as data_source_port, 
            ds.db_name as data_source_database, ds.username as data_source_username
     FROM pioc_data_objects do
     LEFT JOIN pioc_data_sources ds ON do.data_source_id = ds.id
     WHERE do.id = ? AND do.created_by = ?`,
    [id, userId]
  );
  return results[0] || null;
}

export async function findByName(name: string): Promise<DataObject | null> {
  const results = await query<DataObject[]>('SELECT * FROM pioc_data_objects WHERE name = ?', [name]);
  return results[0] || null;
}

export async function findByNameAndUserId(name: string, userId: number): Promise<DataObject | null> {
  const results = await query<DataObject[]>('SELECT * FROM pioc_data_objects WHERE name = ? AND created_by = ?', [name, userId]);
  return results[0] || null;
}

export async function create(data: CreateDataObjectData): Promise<number> {
  const result = await query<{ insertId: number }>(
    `INSERT INTO pioc_data_objects 
     (name, description, data_source_id, query_statement, primary_key, display_template, status, created_by) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.description || '',
      data.data_source_id,
      data.query_statement,
      data.primary_key,
      data.display_template || '{{id}}',
      data.status ?? 1,
      data.created_by,
    ]
  );
  return result.insertId;
}

export async function update(id: number, data: UpdateDataObjectData): Promise<boolean> {
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
  if (data.data_source_id !== undefined) {
    fields.push('data_source_id = ?');
    values.push(data.data_source_id);
  }
  if (data.query_statement !== undefined) {
    fields.push('query_statement = ?');
    values.push(data.query_statement);
  }
  if (data.primary_key !== undefined) {
    fields.push('primary_key = ?');
    values.push(data.primary_key);
  }
  if (data.display_template !== undefined) {
    fields.push('display_template = ?');
    values.push(data.display_template);
  }
  if (data.status !== undefined) {
    fields.push('status = ?');
    values.push(data.status);
  }

  if (fields.length === 0) return false;

  fields.push('updated_at = NOW()');
  values.push(id);

  const result = await query<{ affectedRows: number }>(
    `UPDATE pioc_data_objects SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  return result.affectedRows > 0;
}

export async function remove(id: number): Promise<boolean> {
  const result = await query<{ affectedRows: number }>('DELETE FROM pioc_data_objects WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

export async function removeByIdAndUserId(id: number, userId: number): Promise<boolean> {
  const result = await query<{ affectedRows: number }>('DELETE FROM pioc_data_objects WHERE id = ? AND created_by = ?', [id, userId]);
  return result.affectedRows > 0;
}
