-- 听力训练应用数据库迁移脚本 V2
-- 重构数据结构，支持多用户独立学习进度

-- 设置字符集
SET NAMES utf8mb4;

-- ============================================
-- 1. 创建用户-词条学习状态关联表
-- ============================================
CREATE TABLE IF NOT EXISTS pioc_lt_user_items (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id INT NOT NULL COMMENT '用户ID',
  item_id CHAR(36) NOT NULL COMMENT '词条ID',
  status ENUM('unknown', 'known', 'familiar') DEFAULT 'unknown' COMMENT '学习状态：unknown没懂/known懂了/familiar熟识',
  review_count INT DEFAULT 0 COMMENT '复习次数',
  last_review_at TIMESTAMP NULL DEFAULT NULL COMMENT '上次复习时间',
  next_review_at TIMESTAMP NULL DEFAULT NULL COMMENT '下次复习时间',
  history JSON COMMENT '复习历史记录：[{time, choice}]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_item (user_id, item_id),
  INDEX idx_user_id (user_id),
  INDEX idx_item_id (item_id),
  INDEX idx_status (status),
  INDEX idx_next_review_at (next_review_at),
  FOREIGN KEY (item_id) REFERENCES pioc_lt_items(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES pioc_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户词条学习状态表';

-- ============================================
-- 2. 迁移现有数据到新表
-- ============================================
INSERT INTO pioc_lt_user_items (user_id, item_id, status, review_count, last_review_at, next_review_at, history, created_at)
SELECT 
  w.user_id,
  i.id as item_id,
  i.status,
  i.review_count,
  i.last_review_at,
  i.next_review_at,
  i.history,
  i.created_at
FROM pioc_lt_items i
JOIN pioc_lt_wordbooks w ON i.wordbook_id = w.id
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  review_count = VALUES(review_count),
  last_review_at = VALUES(last_review_at),
  next_review_at = VALUES(next_review_at),
  history = VALUES(history);

-- ============================================
-- 3. 从原表移除学习相关字段（保留content字段）
-- ============================================
ALTER TABLE pioc_lt_items 
  DROP COLUMN status,
  DROP COLUMN review_count,
  DROP COLUMN last_review_at,
  DROP COLUMN next_review_at,
  DROP COLUMN history;

-- ============================================
-- 4. 验证迁移结果
-- ============================================
SELECT '词条基础表' as table_name, COUNT(*) as count FROM pioc_lt_items;
SELECT '用户学习状态表' as table_name, COUNT(*) as count FROM pioc_lt_user_items;
SELECT user_id, status, COUNT(*) as count FROM pioc_lt_user_items GROUP BY user_id, status;

-- ============================================
-- 5. 查看表结构
-- ============================================
DESC pioc_lt_items;
DESC pioc_lt_user_items;
