-- 听力训练应用数据库迁移脚本
-- 合并 V1 + V2：创建基础表结构并重构为多用户独立学习进度模式

-- 设置字符集
SET NAMES utf8mb4;

-- ============================================
-- 1. 注册应用
-- ============================================
INSERT IGNORE INTO pioc_apps (id, name, description, icon, url, status) VALUES
  (21, '听力训练', '基于艾宾浩斯记忆曲线的英语听力练习应用', 'SoundOutlined', '/listening-training', 1);

-- ============================================
-- 2. 为 admin 角色分配应用权限
-- ============================================
INSERT IGNORE INTO pioc_role_apps (role_id, app_id) VALUES (1, 21);

-- ============================================
-- 3. 创建听力训练词书表
-- ============================================
CREATE TABLE IF NOT EXISTS pioc_lt_wordbooks (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id INT NOT NULL COMMENT '创建者用户ID',
  name VARCHAR(200) NOT NULL COMMENT '词书名称',
  description VARCHAR(500) COMMENT '词书描述',
  source VARCHAR(20) DEFAULT 'upload' COMMENT '来源：upload上传/system系统预设',
  total_items INT DEFAULT 0 COMMENT '词条总数',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_source (source),
  FOREIGN KEY (user_id) REFERENCES pioc_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='听力训练词书表';

-- ============================================
-- 4. 创建听力训练词条表（V1结构，含学习字段用于数据迁移）
-- ============================================
CREATE TABLE IF NOT EXISTS pioc_lt_items (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  wordbook_id CHAR(36) NOT NULL COMMENT '关联词书ID',
  content TEXT NOT NULL COMMENT '原文内容（单词或句子）',
  status ENUM('new', 'unknown', 'familiar') DEFAULT 'new' COMMENT '状态：new没听过/unknown没懂/familiar熟识',
  review_count INT DEFAULT 0 COMMENT '复习次数',
  last_review_at TIMESTAMP NULL DEFAULT NULL COMMENT '上次复习时间',
  next_review_at TIMESTAMP NULL DEFAULT NULL COMMENT '下次复习时间',
  history JSON COMMENT '复习历史记录：[{time, choice}]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_wordbook_id (wordbook_id),
  INDEX idx_status (status),
  INDEX idx_next_review_at (next_review_at),
  FOREIGN KEY (wordbook_id) REFERENCES pioc_lt_wordbooks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='听力训练词条表';

-- ============================================
-- 5. 创建用户-词条学习状态关联表
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
-- 6. 迁移现有数据到用户学习状态表
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
-- 7. 从词条表移除学习相关字段（保留content字段）
-- ============================================
ALTER TABLE pioc_lt_items 
  DROP COLUMN status,
  DROP COLUMN review_count,
  DROP COLUMN last_review_at,
  DROP COLUMN next_review_at,
  DROP COLUMN history;

-- ============================================
-- 8. 验证迁移结果
-- ============================================
SELECT '词条基础表' as table_name, COUNT(*) as count FROM pioc_lt_items;
SELECT '用户学习状态表' as table_name, COUNT(*) as count FROM pioc_lt_user_items;
SELECT user_id, status, COUNT(*) as count FROM pioc_lt_user_items GROUP BY user_id, status;

-- ============================================
-- 9. 查看表结构
-- ============================================
DESC pioc_lt_wordbooks;
DESC pioc_lt_items;
DESC pioc_lt_user_items;
