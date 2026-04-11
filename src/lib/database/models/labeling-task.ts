import { query } from '../connection';

export interface LabelingTask {
  id: number;
  name: string;
  description: string | null;
  data_object_id: number;
  tag_group_id: number;
  status: number;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface LabelingTaskCollaborator {
  id: number;
  task_id: number;
  user_id: number;
  created_at: Date;
}

export interface LabelingResult {
  id: number;
  task_id: number;
  data_object_id: number;
  data_entry_id: string;
  tag_id: number;
  created_by: number;
  created_at: Date;
}

export interface LabelingTaskWithDetails extends LabelingTask {
  data_object_name: string;
  tag_group_name: string;
  creator_name: string;
  collaborator_count: number;
  result_count: number;
}

export async function findAllTasks(): Promise<LabelingTaskWithDetails[]> {
  return query<LabelingTaskWithDetails[]>(`
    SELECT 
      t.*,
      do.name as data_object_name,
      tg.name as tag_group_name,
      u.name as creator_name,
      COUNT(DISTINCT tc.user_id) as collaborator_count,
      COUNT(DISTINCT lr.id) as result_count
    FROM pioc_labeling_tasks t
    LEFT JOIN pioc_data_objects do ON t.data_object_id = do.id
    LEFT JOIN pioc_tag_groups tg ON t.tag_group_id = tg.id
    LEFT JOIN pioc_users u ON t.created_by = u.id
    LEFT JOIN pioc_labeling_task_collaborators tc ON t.id = tc.task_id
    LEFT JOIN pioc_labeling_results lr ON t.id = lr.task_id
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `);
}

export async function findTasksByUserId(userId: number): Promise<LabelingTaskWithDetails[]> {
  return query<LabelingTaskWithDetails[]>(`
    SELECT 
      t.*,
      do.name as data_object_name,
      tg.name as tag_group_name,
      u.name as creator_name,
      COUNT(DISTINCT tc.user_id) as collaborator_count,
      COUNT(DISTINCT lr.id) as result_count
    FROM pioc_labeling_tasks t
    LEFT JOIN pioc_data_objects do ON t.data_object_id = do.id
    LEFT JOIN pioc_tag_groups tg ON t.tag_group_id = tg.id
    LEFT JOIN pioc_users u ON t.created_by = u.id
    LEFT JOIN pioc_labeling_task_collaborators tc ON t.id = tc.task_id
    LEFT JOIN pioc_labeling_results lr ON t.id = lr.task_id
    WHERE t.created_by = ? OR t.id IN (
      SELECT task_id FROM pioc_labeling_task_collaborators WHERE user_id = ?
    )
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `, [userId, userId]);
}

export async function findTaskById(id: number): Promise<LabelingTaskWithDetails | null> {
  const results = await query<LabelingTaskWithDetails[]>(`
    SELECT 
      t.*,
      do.name as data_object_name,
      tg.name as tag_group_name,
      u.name as creator_name,
      COUNT(DISTINCT tc.user_id) as collaborator_count,
      COUNT(DISTINCT lr.id) as result_count
    FROM pioc_labeling_tasks t
    LEFT JOIN pioc_data_objects do ON t.data_object_id = do.id
    LEFT JOIN pioc_tag_groups tg ON t.tag_group_id = tg.id
    LEFT JOIN pioc_users u ON t.created_by = u.id
    LEFT JOIN pioc_labeling_task_collaborators tc ON t.id = tc.task_id
    LEFT JOIN pioc_labeling_results lr ON t.id = lr.task_id
    WHERE t.id = ?
    GROUP BY t.id
  `, [id]);
  return results[0] || null;
}

export async function createTask(data: Partial<LabelingTask>): Promise<number> {
  const result = await query<{ insertId: number }>(
    `INSERT INTO pioc_labeling_tasks (name, description, data_object_id, tag_group_id, status, created_by) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [data.name, data.description || null, data.data_object_id, data.tag_group_id, data.status || 1, data.created_by]
  );
  return result.insertId;
}

export async function updateTask(id: number, data: Partial<LabelingTask>): Promise<boolean> {
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
  if (data.data_object_id !== undefined) {
    fields.push('data_object_id = ?');
    values.push(data.data_object_id);
  }
  if (data.tag_group_id !== undefined) {
    fields.push('tag_group_id = ?');
    values.push(data.tag_group_id);
  }
  if (data.status !== undefined) {
    fields.push('status = ?');
    values.push(data.status);
  }

  if (fields.length === 0) return false;

  fields.push('updated_at = NOW()');
  values.push(id);

  const result = await query<{ affectedRows: number }>(
    `UPDATE pioc_labeling_tasks SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  return result.affectedRows > 0;
}

export async function removeTask(id: number): Promise<boolean> {
  const result = await query<{ affectedRows: number }>('DELETE FROM pioc_labeling_tasks WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

export async function removeTaskByIdAndUserId(id: number, userId: number): Promise<boolean> {
  const result = await query<{ affectedRows: number }>('DELETE FROM pioc_labeling_tasks WHERE id = ? AND created_by = ?', [id, userId]);
  return result.affectedRows > 0;
}

export async function findCollaboratorsByTaskId(taskId: number): Promise<{ id: number; user_id: number; username: string; name: string }[]> {
  return query<{ id: number; user_id: number; username: string; name: string }[]>(`
    SELECT tc.id, tc.user_id, u.username, u.name
    FROM pioc_labeling_task_collaborators tc
    JOIN pioc_users u ON tc.user_id = u.id
    WHERE tc.task_id = ?
  `, [taskId]);
}

export async function addCollaborator(taskId: number, userId: number): Promise<number> {
  const result = await query<{ insertId: number }>(
    'INSERT INTO pioc_labeling_task_collaborators (task_id, user_id) VALUES (?, ?)',
    [taskId, userId]
  );
  return result.insertId;
}

export async function removeCollaborator(taskId: number, userId: number): Promise<boolean> {
  const result = await query<{ affectedRows: number }>(
    'DELETE FROM pioc_labeling_task_collaborators WHERE task_id = ? AND user_id = ?',
    [taskId, userId]
  );
  return result.affectedRows > 0;
}

export async function checkUserIsCollaborator(taskId: number, userId: number): Promise<boolean> {
  const results = await query<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM pioc_labeling_task_collaborators WHERE task_id = ? AND user_id = ?',
    [taskId, userId]
  );
  return results[0]?.count > 0;
}

export async function checkUserCanAccessTask(taskId: number, userId: number): Promise<boolean> {
  const results = await query<{ count: number }[]>(`
    SELECT COUNT(*) as count FROM pioc_labeling_tasks 
    WHERE id = ? AND (created_by = ? OR id IN (
      SELECT task_id FROM pioc_labeling_task_collaborators WHERE user_id = ?
    ))
  `, [taskId, userId, userId]);
  return results[0]?.count > 0;
}

export async function createLabelingResult(data: Partial<LabelingResult>): Promise<number | null> {
  // 先检查是否已存在相同的打标结果（等幂性）
  // 同一个数据对象中的同一个数据条目，同一个标签只能被打一次，不论在哪个作业中
  const existingResults = await query<{ id: number; task_id: number }[]>(
    `SELECT id, task_id FROM pioc_labeling_results 
     WHERE data_object_id = ? AND data_entry_id = ? AND tag_id = ?`,
    [data.data_object_id, data.data_entry_id, data.tag_id]
  );
  
  // 如果已存在，直接返回已存在的记录ID（等幂操作）
  if (existingResults.length > 0) {
    return existingResults[0].id;
  }
  
  // 不存在则插入新记录
  const result = await query<{ insertId: number }>(
    `INSERT INTO pioc_labeling_results (task_id, data_object_id, data_entry_id, tag_id, created_by) 
     VALUES (?, ?, ?, ?, ?)`,
    [data.task_id, data.data_object_id, data.data_entry_id, data.tag_id, data.created_by]
  );
  return result.insertId;
}

export async function findResultsByTaskId(taskId: number): Promise<LabelingResult[]> {
  return query<LabelingResult[]>(
    'SELECT * FROM pioc_labeling_results WHERE task_id = ? ORDER BY created_at DESC',
    [taskId]
  );
}

export async function findResultsByTaskAndEntry(taskId: number, dataEntryId: string): Promise<LabelingResult[]> {
  return query<LabelingResult[]>(
    'SELECT * FROM pioc_labeling_results WHERE task_id = ? AND data_entry_id = ? ORDER BY created_at DESC',
    [taskId, dataEntryId]
  );
}

export async function findResultsByTaskAndUser(taskId: number, userId: number): Promise<LabelingResult[]> {
  return query<LabelingResult[]>(
    'SELECT * FROM pioc_labeling_results WHERE task_id = ? AND created_by = ? ORDER BY created_at DESC',
    [taskId, userId]
  );
}

export async function removeResult(id: number): Promise<boolean> {
  const result = await query<{ affectedRows: number }>('DELETE FROM pioc_labeling_results WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

export async function getTaskStatistics(taskId: number): Promise<{
  total_entries: number;
  labeled_entries: number;
  total_results: number;
}> {
  const results = await query<{
    total_entries: number;
    labeled_entries: number;
    total_results: number;
  }[]>(`
    SELECT 
      COUNT(DISTINCT lr.data_entry_id) as labeled_entries,
      COUNT(lr.id) as total_results
    FROM pioc_labeling_results lr
    WHERE lr.task_id = ?
  `, [taskId]);
  
  return {
    total_entries: 0,
    labeled_entries: results[0]?.labeled_entries || 0,
    total_results: results[0]?.total_results || 0
  };
}
