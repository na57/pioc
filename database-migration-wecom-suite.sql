-- 企业微信套件数据库迁移脚本
-- 包含：企微账号管理、企微应用管理、智能表格管理
-- 执行此脚本以部署完整的企业微信管理套件

-- 设置字符集
SET NAMES utf8mb4;

-- =============================================
-- 1. 创建数据表
-- =============================================

-- 1.1 企微账号表
CREATE TABLE IF NOT EXISTS pioc_wecom_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '账号名称',
  corp_id VARCHAR(100) NOT NULL UNIQUE COMMENT '企业微信CorpId',
  corp_secret VARCHAR(255) COMMENT '企业微信CorpSecret',
  description VARCHAR(500) COMMENT '描述',
  status TINYINT DEFAULT 1 COMMENT '1-启用，0-禁用',
  created_by INT NOT NULL COMMENT '创建者用户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_corp_id (corp_id),
  INDEX idx_status (status),
  INDEX idx_created_by (created_by),
  FOREIGN KEY (created_by) REFERENCES pioc_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.2 企微应用表
CREATE TABLE IF NOT EXISTS pioc_wecom_apps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_id INT NOT NULL COMMENT '所属企微账号ID',
  name VARCHAR(100) NOT NULL COMMENT '应用名称',
  agent_id VARCHAR(50) NOT NULL COMMENT '应用AgentId',
  secret VARCHAR(255) COMMENT '应用Secret',
  description VARCHAR(500) COMMENT '描述',
  status TINYINT DEFAULT 1 COMMENT '1-启用，0-禁用',
  created_by INT NOT NULL COMMENT '创建者用户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_account_id (account_id),
  INDEX idx_name (name),
  INDEX idx_agent_id (agent_id),
  INDEX idx_status (status),
  INDEX idx_created_by (created_by),
  FOREIGN KEY (account_id) REFERENCES pioc_wecom_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES pioc_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.3 企微应用智能表格表
CREATE TABLE IF NOT EXISTS pioc_wecom_smart_sheets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  app_id INT NOT NULL COMMENT '所属企微应用ID',
  docid VARCHAR(100) NOT NULL COMMENT '智能表格ID',
  name VARCHAR(200) NOT NULL COMMENT '表格名称',
  url VARCHAR(500) COMMENT '表格链接',
  description VARCHAR(500) COMMENT '描述',
  sheets_json TEXT COMMENT '工作表信息JSON',
  status TINYINT DEFAULT 1 COMMENT '1-启用，0-禁用',
  created_by INT NOT NULL COMMENT '创建者用户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_app_id (app_id),
  INDEX idx_docid (docid),
  INDEX idx_name (name),
  INDEX idx_status (status),
  INDEX idx_created_by (created_by),
  FOREIGN KEY (app_id) REFERENCES pioc_wecom_apps(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES pioc_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 2. 注册应用
-- =============================================

-- 2.1 企微账号管理应用
INSERT IGNORE INTO pioc_apps (id, name, description, icon, url, status) VALUES
  (14, '企微账号', '管理企业微信账号信息，包括CorpId、名称等', 'WechatOutlined', '/wecom-accounts', 1);

-- 2.2 企微应用管理应用
INSERT IGNORE INTO pioc_apps (id, name, description, icon, url, status) VALUES
  (15, '企微应用', '管理企业微信应用信息，包括应用名称、Secret、AgentId等', 'AppstoreOutlined', '/wecom-apps', 1);

-- =============================================
-- 3. 分配应用权限
-- =============================================

-- 3.1 为 admin 角色分配企微账号应用权限
INSERT IGNORE INTO pioc_role_apps (role_id, app_id) VALUES (1, 14);

-- 3.2 为 admin 角色分配企微应用管理权限
INSERT IGNORE INTO pioc_role_apps (role_id, app_id) VALUES (1, 15);

-- =============================================
-- 4. 验证结果
-- =============================================

SELECT '企微账号管理应用' as check_item, id, name, url, status FROM pioc_apps WHERE id = 14
UNION ALL
SELECT '企微应用管理应用' as check_item, id, name, url, status FROM pioc_apps WHERE id = 15;

SELECT '企微账号应用权限' as check_item, role_id, app_id FROM pioc_role_apps WHERE app_id = 14
UNION ALL
SELECT '企微应用管理权限' as check_item, role_id, app_id FROM pioc_role_apps WHERE app_id = 15;

SHOW CREATE TABLE pioc_wecom_accounts;
SHOW CREATE TABLE pioc_wecom_apps;
SHOW CREATE TABLE pioc_wecom_smart_sheets;
