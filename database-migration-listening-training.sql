-- 听力训练应用数据库迁移脚本
-- 执行此脚本以在已部署的数据库中添加听力训练应用

-- 设置字符集
SET NAMES utf8mb4;

-- 1. 注册应用（如果不存在）
INSERT IGNORE INTO pioc_apps (id, name, description, icon, url, status) VALUES
  (21, '听力训练', '基于艾宾浩斯记忆曲线的英语听力练习应用', 'SoundOutlined', '/listening-training', 1);

-- 2. 为 admin 角色分配应用权限
INSERT IGNORE INTO pioc_role_apps (role_id, app_id) VALUES (1, 21);

-- 3. 创建听力训练词书表
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

-- 4. 创建听力训练词条表
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

-- 验证插入结果
SELECT id, name, url, status FROM pioc_apps WHERE id = 21;
SELECT role_id, app_id FROM pioc_role_apps WHERE app_id = 21;
SHOW TABLES LIKE 'pioc_lt_%';
