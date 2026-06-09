-- API密钥管理应用数据库迁移脚本
-- 执行此脚本以在已部署的数据库中添加API密钥管理应用

-- 设置字符集
SET NAMES utf8mb4;

-- 1. 创建API密钥表（如果不存在）
CREATE TABLE IF NOT EXISTS pioc_api_keys (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '密钥名称',
  api_key VARCHAR(64) NOT NULL UNIQUE COMMENT 'API密钥',
  api_secret VARCHAR(128) NOT NULL COMMENT 'API密钥签名密钥',
  user_id INT NOT NULL COMMENT '关联用户ID',
  permissions JSON COMMENT '权限配置，如["read", "write"]',
  allowed_ips JSON COMMENT '允许的IP白名单',
  rate_limit INT DEFAULT 1000 COMMENT '每分钟请求限制',
  status TINYINT DEFAULT 1 COMMENT '状态：1启用，0禁用',
  last_used_at DATETIME COMMENT '最后使用时间',
  expires_at DATETIME COMMENT '过期时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_api_key (api_key),
  INDEX idx_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES pioc_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='第三方API密钥表';

-- 2. 注册API密钥管理应用（如果不存在）
INSERT IGNORE INTO pioc_apps (id, name, description, icon, url, status) VALUES
  (20, 'API密钥管理', '创建和管理第三方API访问密钥，支持权限控制和IP白名单', 'SafetyOutlined', '/api-keys', 1);

-- 3. 为 admin 角色分配应用权限
INSERT IGNORE INTO pioc_role_apps (role_id, app_id) VALUES (1, 20);

-- 验证插入结果
SELECT id, name, url, status FROM pioc_apps WHERE id = 20;
SELECT role_id, app_id FROM pioc_role_apps WHERE app_id = 20;
SHOW CREATE TABLE pioc_api_keys;
