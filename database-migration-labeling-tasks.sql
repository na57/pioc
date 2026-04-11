-- 打标作业应用数据库迁移脚本
-- 执行此脚本以更新已部署的数据库

-- 1. 创建打标作业表
CREATE TABLE IF NOT EXISTS pioc_labeling_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '作业名称',
  description VARCHAR(500) COMMENT '作业描述',
  data_object_id BIGINT NOT NULL COMMENT '数据对象ID',
  tag_group_id INT NOT NULL COMMENT '标签组ID',
  status TINYINT DEFAULT 1 COMMENT '1-进行中，0-已结束',
  created_by INT NOT NULL COMMENT '创建者ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_data_object_id (data_object_id),
  INDEX idx_tag_group_id (tag_group_id),
  INDEX idx_status (status),
  INDEX idx_created_by (created_by),
  FOREIGN KEY (data_object_id) REFERENCES pioc_data_objects(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_group_id) REFERENCES pioc_tag_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES pioc_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 创建打标作业协作者表
CREATE TABLE IF NOT EXISTS pioc_labeling_task_collaborators (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL COMMENT '作业ID',
  user_id INT NOT NULL COMMENT '协作者用户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_task_user (task_id, user_id),
  INDEX idx_task_id (task_id),
  INDEX idx_user_id (user_id),
  FOREIGN KEY (task_id) REFERENCES pioc_labeling_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES pioc_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 创建打标结果表（如果不存在）
CREATE TABLE IF NOT EXISTS pioc_labeling_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL COMMENT '作业ID',
  data_object_id BIGINT NOT NULL COMMENT '数据对象ID',
  data_entry_id VARCHAR(255) NOT NULL COMMENT '数据条目ID',
  tag_id INT NOT NULL COMMENT '标签ID',
  created_by INT NOT NULL COMMENT '打标用户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_task_id (task_id),
  INDEX idx_data_object_id (data_object_id),
  INDEX idx_data_entry_id (data_entry_id),
  INDEX idx_tag_id (tag_id),
  INDEX idx_created_by (created_by),
  FOREIGN KEY (task_id) REFERENCES pioc_labeling_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES pioc_tags(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES pioc_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. 删除旧索引（如果存在）
-- 先检查索引是否存在，如果存在则删除
SET @drop_index_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'pioc_labeling_results' 
      AND INDEX_NAME = 'uk_task_entry_tag'
    ),
    'ALTER TABLE pioc_labeling_results DROP INDEX uk_task_entry_tag',
    'SELECT 1'
  )
);
PREPARE stmt FROM @drop_index_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. 添加新的唯一索引（如果不存在）
-- 先检查索引是否存在，如果不存在则添加
SET @add_index_sql = (
  SELECT IF(
    NOT EXISTS(
      SELECT 1 FROM information_schema.STATISTICS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'pioc_labeling_results' 
      AND INDEX_NAME = 'uk_object_entry_tag'
    ),
    'ALTER TABLE pioc_labeling_results ADD UNIQUE KEY uk_object_entry_tag (data_object_id, data_entry_id, tag_id)',
    'SELECT 1'
  )
);
PREPARE stmt FROM @add_index_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 6. 注册打标作业应用（如果不存在）
INSERT IGNORE INTO pioc_apps (id, name, description, icon, url, status) VALUES
  (12, '打标作业', '创建和管理数据打标作业，支持多人协作打标', 'FlagOutlined', '/labeling-tasks', 1);

-- 7. 为 admin 角色分配打标作业应用权限
INSERT IGNORE INTO pioc_role_apps (role_id, app_id) VALUES (1, 12);
