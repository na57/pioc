SET NAMES utf8mb4;

-- 创建数据源分享表
CREATE TABLE IF NOT EXISTS pioc_data_source_shares (
  id INT AUTO_INCREMENT PRIMARY KEY,
  data_source_id INT NOT NULL COMMENT '数据源ID',
  shared_by INT NOT NULL COMMENT '分享者用户ID',
  shared_to INT NOT NULL COMMENT '被分享者用户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_source_shared_to (data_source_id, shared_to),
  INDEX idx_data_source_id (data_source_id),
  INDEX idx_shared_by (shared_by),
  INDEX idx_shared_to (shared_to),
  FOREIGN KEY (data_source_id) REFERENCES pioc_data_sources(id) ON DELETE CASCADE,
  FOREIGN KEY (shared_by) REFERENCES pioc_users(id) ON DELETE CASCADE,
  FOREIGN KEY (shared_to) REFERENCES pioc_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
