SET NAMES utf8mb4;

-- ============================================
-- 规则管理应用数据库迁移脚本
-- ============================================

-- 创建规则表
CREATE TABLE IF NOT EXISTS pioc_rules (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '规则名称',
  description VARCHAR(500) COMMENT '规则描述',
  content TEXT NOT NULL COMMENT '规则内容',
  status TINYINT DEFAULT 1 COMMENT '1-启用，0-禁用',
  created_by INT NOT NULL COMMENT '创建者ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_status (status),
  INDEX idx_created_by (created_by),
  FOREIGN KEY (created_by) REFERENCES pioc_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建规则分享表
CREATE TABLE IF NOT EXISTS pioc_rule_shares (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rule_id BIGINT NOT NULL COMMENT '规则ID',
  shared_by INT NOT NULL COMMENT '分享者用户ID',
  shared_to INT NOT NULL COMMENT '被分享者用户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_rule_shared_to (rule_id, shared_to),
  INDEX idx_rule_id (rule_id),
  INDEX idx_shared_by (shared_by),
  INDEX idx_shared_to (shared_to),
  FOREIGN KEY (rule_id) REFERENCES pioc_rules(id) ON DELETE CASCADE,
  FOREIGN KEY (shared_by) REFERENCES pioc_users(id) ON DELETE CASCADE,
  FOREIGN KEY (shared_to) REFERENCES pioc_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 注册规则管理应用
INSERT IGNORE INTO pioc_apps (id, name, description, icon, url, status) VALUES
  (19, '规则管理', '管理系统规则，支持规则的创建、编辑、分享', 'FileTextOutlined', '/rules', 1);

-- 为 admin 角色分配应用权限
INSERT IGNORE INTO pioc_role_apps (role_id, app_id) VALUES (1, 19);

-- 验证插入结果
SELECT id, name, url, status FROM pioc_apps WHERE id = 19;
SELECT role_id, app_id FROM pioc_role_apps WHERE app_id = 19;
