import { query } from '../connection';

export interface DataSource {
  id: string;
  name: string;
  type: 'mysql' | 'mongodb';
  host: string;
  port: number;
  username: string;
  password: string;
  db_name: string;
  description: string;
  status: number;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateDataSourceData {
  name: string;
  type: 'mysql' | 'mongodb';
  host: string;
  port: number;
  username: string;
  password: string;
  db_name: string;
  description?: string;
  status?: number;
  created_by: number;
}

export interface UpdateDataSourceData {
  name?: string;
  type?: 'mysql' | 'mongodb';
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  db_name?: string;
  description?: string;
  status?: number;
}

export interface DataSourceWithCreator extends DataSource {
  creator_name?: string;
}

export async function findAll(): Promise<DataSource[]> {
  return query<DataSource[]>('SELECT * FROM pioc_data_sources ORDER BY created_at DESC');
}

export async function findByUserId(userId: number): Promise<DataSource[]> {
  return query<DataSource[]>('SELECT * FROM pioc_data_sources WHERE created_by = ? ORDER BY created_at DESC', [userId]);
}

export async function findById(id: string): Promise<DataSource | null> {
  const results = await query<DataSource[]>('SELECT * FROM pioc_data_sources WHERE id = ?', [id]);
  return results[0] || null;
}

export async function findByIdWithCreator(id: string): Promise<DataSourceWithCreator | null> {
  const results = await query<DataSourceWithCreator[]>(
    `SELECT ds.*, u.name as creator_name
     FROM pioc_data_sources ds
     LEFT JOIN pioc_users u ON ds.created_by = u.id
     WHERE ds.id = ?`,
    [id]
  );
  return results[0] || null;
}

// 获取数据源（不包含密码），用于被分享者查看
export async function findByIdWithoutPassword(id: string): Promise<Omit<DataSourceWithCreator, 'password'> | null> {
  const results = await query<Omit<DataSourceWithCreator, 'password'>[]>(
    `SELECT ds.id, ds.name, ds.type, ds.host, ds.port, ds.username, ds.db_name, ds.description, ds.status, ds.created_by, ds.created_at, ds.updated_at, u.name as creator_name
     FROM pioc_data_sources ds
     LEFT JOIN pioc_users u ON ds.created_by = u.id
     WHERE ds.id = ?`,
    [id]
  );
  return results[0] || null;
}

export async function findByIdAndUserId(id: string, userId: number): Promise<DataSource | null> {
  const results = await query<DataSource[]>('SELECT * FROM pioc_data_sources WHERE id = ? AND created_by = ?', [id, userId]);
  return results[0] || null;
}

export async function findByName(name: string): Promise<DataSource | null> {
  const results = await query<DataSource[]>('SELECT * FROM pioc_data_sources WHERE name = ?', [name]);
  return results[0] || null;
}

export async function findByNameAndUserId(name: string, userId: number): Promise<DataSource | null> {
  const results = await query<DataSource[]>('SELECT * FROM pioc_data_sources WHERE name = ? AND created_by = ?', [name, userId]);
  return results[0] || null;
}

export async function findByType(type: string): Promise<DataSource[]> {
  return query<DataSource[]>('SELECT * FROM pioc_data_sources WHERE type = ? ORDER BY created_at DESC', [type]);
}

export async function findByTypeAndUserId(type: string, userId: number): Promise<DataSource[]> {
  return query<DataSource[]>('SELECT * FROM pioc_data_sources WHERE type = ? AND created_by = ? ORDER BY created_at DESC', [type, userId]);
}

export async function findByStatus(status: number): Promise<DataSource[]> {
  return query<DataSource[]>('SELECT * FROM pioc_data_sources WHERE status = ? ORDER BY created_at DESC', [status]);
}

export async function findByStatusAndUserId(status: number, userId: number): Promise<DataSource[]> {
  return query<DataSource[]>('SELECT * FROM pioc_data_sources WHERE status = ? AND created_by = ? ORDER BY created_at DESC', [status, userId]);
}

export async function create(data: CreateDataSourceData): Promise<string> {
  const result = await query<{ insertId: string }>(
    'INSERT INTO pioc_data_sources (name, type, host, port, username, password, db_name, description, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      data.name,
      data.type,
      data.host,
      data.port,
      data.username,
      data.password,
      data.db_name,
      data.description || '',
      data.status ?? 1,
      data.created_by,
    ]
  );
  // For UUID, we need to query back to get the generated ID
  const [newRecord] = await query<DataSource[]>(
    'SELECT id FROM pioc_data_sources WHERE name = ? AND created_by = ? ORDER BY created_at DESC LIMIT 1',
    [data.name, data.created_by]
  );
  return newRecord?.id || '';
}

export async function update(id: string, data: UpdateDataSourceData): Promise<boolean> {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) {
    fields.push('name = ?');
    values.push(data.name);
  }
  if (data.type !== undefined) {
    fields.push('type = ?');
    values.push(data.type);
  }
  if (data.host !== undefined) {
    fields.push('host = ?');
    values.push(data.host);
  }
  if (data.port !== undefined) {
    fields.push('port = ?');
    values.push(data.port);
  }
  if (data.username !== undefined) {
    fields.push('username = ?');
    values.push(data.username);
  }
  if (data.password !== undefined) {
    fields.push('password = ?');
    values.push(data.password);
  }
  if (data.db_name !== undefined) {
    fields.push('db_name = ?');
    values.push(data.db_name);
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
    `UPDATE pioc_data_sources SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  return result.affectedRows > 0;
}

export async function remove(id: string): Promise<boolean> {
  const result = await query<{ affectedRows: number }>('DELETE FROM pioc_data_sources WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

export async function removeByIdAndUserId(id: string, userId: number): Promise<boolean> {
  const result = await query<{ affectedRows: number }>('DELETE FROM pioc_data_sources WHERE id = ? AND created_by = ?', [id, userId]);
  return result.affectedRows > 0;
}
