import { query } from '../connection';

export interface ApiKey {
  id: number;
  name: string;
  api_key: string;
  api_secret: string;
  user_id: number;
  permissions: string[];
  allowed_ips: string[] | null;
  rate_limit: number;
  status: number;
  last_used_at: Date | null;
  expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ApiKeyWithUser extends ApiKey {
  username: string;
  user_name: string;
}

export interface CreateApiKeyData {
  name: string;
  api_key: string;
  api_secret: string;
  user_id: number;
  permissions?: string[];
  allowed_ips?: string[];
  rate_limit?: number;
  expires_at?: Date;
}

export interface UpdateApiKeyData {
  name?: string;
  permissions?: string[];
  allowed_ips?: string[];
  rate_limit?: number;
  status?: number;
  expires_at?: Date;
}

export async function findAll(): Promise<ApiKeyWithUser[]> {
  const results = await query<ApiKeyWithUser[]>(`
    SELECT 
      ak.*,
      u.username,
      u.name as user_name
    FROM pioc_api_keys ak
    JOIN pioc_users u ON ak.user_id = u.id
    ORDER BY ak.created_at DESC
  `);
  
  // Parse JSON fields for all records
  return results.map(record => {
    if (typeof record.permissions === 'string') {
      record.permissions = JSON.parse(record.permissions);
    }
    if (typeof record.allowed_ips === 'string') {
      record.allowed_ips = record.allowed_ips ? JSON.parse(record.allowed_ips) : null;
    }
    return record;
  });
}

export async function findById(id: number): Promise<ApiKeyWithUser | null> {
  const results = await query<ApiKeyWithUser[]>(`
    SELECT 
      ak.*,
      u.username,
      u.name as user_name
    FROM pioc_api_keys ak
    JOIN pioc_users u ON ak.user_id = u.id
    WHERE ak.id = ?
  `, [id]);
  
  if (!results[0]) return null;
  
  // Parse JSON fields
  const record = results[0];
  if (typeof record.permissions === 'string') {
    record.permissions = JSON.parse(record.permissions);
  }
  if (typeof record.allowed_ips === 'string') {
    record.allowed_ips = record.allowed_ips ? JSON.parse(record.allowed_ips) : null;
  }
  
  return record;
}

export async function findByApiKey(apiKey: string): Promise<ApiKey | null> {
  const results = await query<ApiKey[]>(
    'SELECT * FROM pioc_api_keys WHERE api_key = ? AND status = 1',
    [apiKey]
  );
  
  if (!results[0]) return null;
  
  // Parse JSON fields
  const record = results[0];
  if (typeof record.permissions === 'string') {
    record.permissions = JSON.parse(record.permissions);
  }
  if (typeof record.allowed_ips === 'string') {
    record.allowed_ips = record.allowed_ips ? JSON.parse(record.allowed_ips) : null;
  }
  
  return record;
}

export async function findByUserId(userId: number): Promise<ApiKey[]> {
  const results = await query<ApiKey[]>(
    'SELECT * FROM pioc_api_keys WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
  
  // Parse JSON fields for all records
  return results.map(record => {
    if (typeof record.permissions === 'string') {
      record.permissions = JSON.parse(record.permissions);
    }
    if (typeof record.allowed_ips === 'string') {
      record.allowed_ips = record.allowed_ips ? JSON.parse(record.allowed_ips) : null;
    }
    return record;
  });
}

export async function create(data: CreateApiKeyData): Promise<number> {
  const result = await query<{ insertId: number }>(
    `INSERT INTO pioc_api_keys 
     (name, api_key, api_secret, user_id, permissions, allowed_ips, rate_limit, expires_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.api_key,
      data.api_secret,
      data.user_id,
      JSON.stringify(data.permissions || ['read']),
      data.allowed_ips ? JSON.stringify(data.allowed_ips) : null,
      data.rate_limit || 1000,
      data.expires_at || null
    ]
  );
  return result.insertId;
}

export async function update(id: number, data: UpdateApiKeyData): Promise<boolean> {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) {
    fields.push('name = ?');
    values.push(data.name);
  }
  if (data.permissions !== undefined) {
    fields.push('permissions = ?');
    values.push(JSON.stringify(data.permissions));
  }
  if (data.allowed_ips !== undefined) {
    fields.push('allowed_ips = ?');
    values.push(data.allowed_ips ? JSON.stringify(data.allowed_ips) : null);
  }
  if (data.rate_limit !== undefined) {
    fields.push('rate_limit = ?');
    values.push(data.rate_limit);
  }
  if (data.status !== undefined) {
    fields.push('status = ?');
    values.push(data.status);
  }
  if (data.expires_at !== undefined) {
    fields.push('expires_at = ?');
    values.push(data.expires_at);
  }

  if (fields.length === 0) return false;

  fields.push('updated_at = NOW()');
  values.push(id);

  const result = await query<{ affectedRows: number }>(
    `UPDATE pioc_api_keys SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  return result.affectedRows > 0;
}

export async function updateLastUsed(id: number): Promise<void> {
  await query(
    'UPDATE pioc_api_keys SET last_used_at = NOW() WHERE id = ?',
    [id]
  );
}

export async function remove(id: number): Promise<boolean> {
  const result = await query<{ affectedRows: number }>(
    'DELETE FROM pioc_api_keys WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
}

export async function countByUserId(userId: number): Promise<number> {
  const results = await query<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM pioc_api_keys WHERE user_id = ?',
    [userId]
  );
  return results[0]?.count || 0;
}
