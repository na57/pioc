import { query } from '../connection';

export interface RuleShare {
  id: number;
  rule_id: number;
  shared_by: number;
  shared_to: number;
  created_at: Date;
}

export interface RuleShareWithUser extends RuleShare {
  shared_by_name?: string;
  shared_to_name?: string;
  shared_to_username?: string;
}

// 创建分享
export async function createShare(ruleId: number, sharedBy: number, sharedTo: number): Promise<number> {
  const result = await query<{ insertId: number }>(
    'INSERT INTO pioc_rule_shares (rule_id, shared_by, shared_to) VALUES (?, ?, ?)',
    [ruleId, sharedBy, sharedTo]
  );
  return result.insertId;
}

// 删除分享
export async function removeShare(ruleId: number, sharedTo: number): Promise<boolean> {
  const result = await query<{ affectedRows: number }>(
    'DELETE FROM pioc_rule_shares WHERE rule_id = ? AND shared_to = ?',
    [ruleId, sharedTo]
  );
  return result.affectedRows > 0;
}

// 根据规则ID获取分享列表
export async function findSharesByRuleId(ruleId: number): Promise<RuleShareWithUser[]> {
  return query<RuleShareWithUser[]>(
    `SELECT rs.*, u.name as shared_to_name, u.username as shared_to_username
     FROM pioc_rule_shares rs
     JOIN pioc_users u ON rs.shared_to = u.id
     WHERE rs.rule_id = ?
     ORDER BY rs.created_at DESC`,
    [ruleId]
  );
}

// 检查用户是否已被分享该规则
export async function checkUserHasShared(ruleId: number, userId: number): Promise<boolean> {
  const results = await query<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM pioc_rule_shares WHERE rule_id = ? AND shared_to = ?',
    [ruleId, userId]
  );
  return results[0]?.count > 0;
}

// 检查用户是否可以访问规则（创建者或被分享者）
export async function checkUserCanAccess(ruleId: number, userId: number): Promise<boolean> {
  const results = await query<{ count: number }[]>(
    `SELECT COUNT(*) as count FROM pioc_rules 
     WHERE id = ? AND (created_by = ? OR id IN (
       SELECT rule_id FROM pioc_rule_shares WHERE shared_to = ?
     ))`,
    [ruleId, userId, userId]
  );
  return results[0]?.count > 0;
}

// 检查用户是否是规则的分享者（有权限管理分享）
export async function checkUserIsOwner(ruleId: number, userId: number): Promise<boolean> {
  const results = await query<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM pioc_rules WHERE id = ? AND created_by = ?',
    [ruleId, userId]
  );
  return results[0]?.count > 0;
}

// 获取用户被分享的规则ID列表
export async function findSharedRuleIdsByUserId(userId: number): Promise<number[]> {
  const results = await query<{ rule_id: number }[]>(
    'SELECT rule_id FROM pioc_rule_shares WHERE shared_to = ?',
    [userId]
  );
  return results.map(r => r.rule_id);
}

// 获取分享给用户的分享记录（带规则信息）
export async function findSharesToUser(userId: number): Promise<RuleShareWithUser[]> {
  return query<RuleShareWithUser[]>(
    `SELECT rs.*, u.name as shared_by_name, r.name as rule_name
     FROM pioc_rule_shares rs
     JOIN pioc_users u ON rs.shared_by = u.id
     JOIN pioc_rules r ON rs.rule_id = r.id
     WHERE rs.shared_to = ?
     ORDER BY rs.created_at DESC`,
    [userId]
  );
}
