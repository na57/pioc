SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS pioc_lt_daily_plan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '用户ID',
  plan_date DATE NOT NULL COMMENT '计划日期',
  item_id VARCHAR(36) NOT NULL COMMENT '词条ID',
  wordbook_id VARCHAR(36) NOT NULL COMMENT '词书ID',
  item_type ENUM('review', 'new') NOT NULL COMMENT '词条类型：review-待复习, new-新词条',
  status ENUM('pending', 'completed', 'skipped') DEFAULT 'pending' COMMENT '状态：pending-待学习, completed-已完成, skipped-已跳过',
  completed_at TIMESTAMP NULL DEFAULT NULL COMMENT '完成时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_date_item (user_id, plan_date, item_id),
  INDEX idx_user_date (user_id, plan_date),
  INDEX idx_item_id (item_id),
  INDEX idx_status (status),
  FOREIGN KEY (user_id) REFERENCES pioc_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='听力训练每日学习清单';
