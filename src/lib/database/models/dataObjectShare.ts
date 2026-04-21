import { query } from '../connection';

export interface DataObjectShare {
  id: number;
  data_object_id: number;
  shared_by: number;
  shared_to: number;
  created_at: Date;
}

export interface DataObjectShareWithUser extends DataObjectShare {
  shared_by_name?: string;
  shared_to_name?: string;
  shared_to_username?: string;
}

// 创建分享
export async function createShare(dataObjectId: number, sharedBy: number, sharedTo: number): Promise<number> {
  const result = await query<{ insertId: number }>(
    'INSERT INTO pioc_data_object_shares (data_object_id, shared_by, shared_to) VALUES (?, ?, ?)',
    [dataObjectId, sharedBy, sharedTo]
  );
  return result.insertId;
}

// 删除分享
export async function removeShare(dataObjectId: number, sharedTo: number): Promise<boolean> {
  const result = await query<{ affectedRows: number }>(
    'DELETE FROM pioc_data_object_shares WHERE data_object_id = ? AND shared_to = ?',
    [dataObjectId, sharedTo]
  );
  return result.affectedRows > 0;
}

// 根据数据对象ID获取分享列表
export async function findSharesByDataObjectId(dataObjectId: number): Promise<DataObjectShareWithUser[]> {
  return query<DataObjectShareWithUser[]>(
    `SELECT ds.*, u.name as shared_to_name, u.username as shared_to_username
     FROM pioc_data_object_shares ds
     JOIN pioc_users u ON ds.shared_to = u.id
     WHERE ds.data_object_id = ?
     ORDER BY ds.created_at DESC`,
    [dataObjectId]
  );
}

// 检查用户是否已被分享该数据对象
export async function checkUserHasShared(dataObjectId: number, userId: number): Promise<boolean> {
  const results = await query<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM pioc_data_object_shares WHERE data_object_id = ? AND shared_to = ?',
    [dataObjectId, userId]
  );
  return results[0]?.count > 0;
}

// 检查用户是否可以访问数据对象（创建者或被分享者）
export async function checkUserCanAccess(dataObjectId: number, userId: number): Promise<boolean> {
  const results = await query<{ count: number }[]>(
    `SELECT COUNT(*) as count FROM pioc_data_objects 
     WHERE id = ? AND (created_by = ? OR id IN (
       SELECT data_object_id FROM pioc_data_object_shares WHERE shared_to = ?
     ))`,
    [dataObjectId, userId, userId]
  );
  return results[0]?.count > 0;
}

// 检查用户是否是数据对象的分享者（有权限管理分享）
export async function checkUserIsOwner(dataObjectId: number, userId: number): Promise<boolean> {
  const results = await query<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM pioc_data_objects WHERE id = ? AND created_by = ?',
    [dataObjectId, userId]
  );
  return results[0]?.count > 0;
}

// 获取用户被分享的数据对象ID列表
export async function findSharedDataObjectIdsByUserId(userId: number): Promise<number[]> {
  const results = await query<{ data_object_id: number }[]>(
    'SELECT data_object_id FROM pioc_data_object_shares WHERE shared_to = ?',
    [userId]
  );
  return results.map(r => r.data_object_id);
}

// 获取分享给用户的分享记录（带数据对象信息）
export async function findSharesToUser(userId: number): Promise<DataObjectShareWithUser[]> {
  return query<DataObjectShareWithUser[]>(
    `SELECT ds.*, u.name as shared_by_name, do.name as data_object_name
     FROM pioc_data_object_shares ds
     JOIN pioc_users u ON ds.shared_by = u.id
     JOIN pioc_data_objects do ON ds.data_object_id = do.id
     WHERE ds.shared_to = ?
     ORDER BY ds.created_at DESC`,
    [userId]
  );
}
