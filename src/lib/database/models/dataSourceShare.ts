import { query } from '../connection';

export interface DataSourceShare {
  id: number;
  data_source_id: number;
  shared_by: number;
  shared_to: number;
  created_at: Date;
}

export interface DataSourceShareWithUser extends DataSourceShare {
  shared_by_name?: string;
  shared_to_name?: string;
  shared_to_username?: string;
}

// 创建分享
export async function createShare(dataSourceId: number, sharedBy: number, sharedTo: number): Promise<number> {
  const result = await query<{ insertId: number }>(
    'INSERT INTO pioc_data_source_shares (data_source_id, shared_by, shared_to) VALUES (?, ?, ?)',
    [dataSourceId, sharedBy, sharedTo]
  );
  return result.insertId;
}

// 删除分享
export async function removeShare(dataSourceId: number, sharedTo: number): Promise<boolean> {
  const result = await query<{ affectedRows: number }>(
    'DELETE FROM pioc_data_source_shares WHERE data_source_id = ? AND shared_to = ?',
    [dataSourceId, sharedTo]
  );
  return result.affectedRows > 0;
}

// 根据数据源ID获取分享列表
export async function findSharesByDataSourceId(dataSourceId: number): Promise<DataSourceShareWithUser[]> {
  return query<DataSourceShareWithUser[]>(
    `SELECT ds.*, u.name as shared_to_name, u.username as shared_to_username
     FROM pioc_data_source_shares ds
     JOIN pioc_users u ON ds.shared_to = u.id
     WHERE ds.data_source_id = ?
     ORDER BY ds.created_at DESC`,
    [dataSourceId]
  );
}

// 检查用户是否已被分享该数据源
export async function checkUserHasShared(dataSourceId: number, userId: number): Promise<boolean> {
  const results = await query<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM pioc_data_source_shares WHERE data_source_id = ? AND shared_to = ?',
    [dataSourceId, userId]
  );
  return results[0]?.count > 0;
}

// 检查用户是否可以访问数据源（创建者或被分享者）
export async function checkUserCanAccess(dataSourceId: number, userId: number): Promise<boolean> {
  const results = await query<{ count: number }[]>(
    `SELECT COUNT(*) as count FROM pioc_data_sources
     WHERE id = ? AND (created_by = ? OR id IN (
       SELECT data_source_id FROM pioc_data_source_shares WHERE shared_to = ?
     ))`,
    [dataSourceId, userId, userId]
  );
  return results[0]?.count > 0;
}

// 检查用户是否是数据源的创建者（有权限管理分享）
export async function checkUserIsOwner(dataSourceId: number, userId: number): Promise<boolean> {
  const results = await query<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM pioc_data_sources WHERE id = ? AND created_by = ?',
    [dataSourceId, userId]
  );
  return results[0]?.count > 0;
}

// 获取用户被分享的数据源ID列表
export async function findSharedDataSourceIdsByUserId(userId: number): Promise<number[]> {
  const results = await query<{ data_source_id: number }[]>(
    'SELECT data_source_id FROM pioc_data_source_shares WHERE shared_to = ?',
    [userId]
  );
  return results.map(r => r.data_source_id);
}

// 获取分享给用户的分享记录（带数据源信息）
export async function findSharesToUser(userId: number): Promise<DataSourceShareWithUser[]> {
  return query<DataSourceShareWithUser[]>(
    `SELECT ds.*, u.name as shared_by_name, dsrc.name as data_source_name
     FROM pioc_data_source_shares ds
     JOIN pioc_users u ON ds.shared_by = u.id
     JOIN pioc_data_sources dsrc ON ds.data_source_id = dsrc.id
     WHERE ds.shared_to = ?
     ORDER BY ds.created_at DESC`,
    [userId]
  );
}
