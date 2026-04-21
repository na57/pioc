SET NAMES utf8mb4;

-- 创建数据对象分享表
CREATE TABLE IF NOT EXISTS pioc_data_object_shares (
  id INT AUTO_INCREMENT PRIMARY KEY,
  data_object_id BIGINT NOT NULL COMMENT '数据对象ID',
  shared_by INT NOT NULL COMMENT '分享者用户ID',
  shared_to INT NOT NULL COMMENT '被分享者用户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_object_shared_to (data_object_id, shared_to),
  INDEX idx_data_object_id (data_object_id),
  INDEX idx_shared_by (shared_by),
  INDEX idx_shared_to (shared_to),
  FOREIGN KEY (data_object_id) REFERENCES pioc_data_objects(id) ON DELETE CASCADE,
  FOREIGN KEY (shared_by) REFERENCES pioc_users(id) ON DELETE CASCADE,
  FOREIGN KEY (shared_to) REFERENCES pioc_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
