-- ConfigSys 配置管理系统数据库迁移脚本（完整版）
-- 包含初始表结构创建和合规规则外键字段更新
-- 执行此脚本以在已部署的数据库中添加配置管理应用

-- 设置字符集
SET NAMES utf8mb4;

-- ============================================
-- 第一部分：应用注册与权限配置
-- ============================================

-- 1. 注册应用（如果不存在）
INSERT IGNORE INTO pioc_apps (id, name, description, icon, url, status) VALUES
  (18, '配置管理', '管理和分析各类配置文件，支持版本追踪、AI解读和合规检查', 'SettingOutlined', '/configsys', 1);

-- 2. 为 admin 角色分配应用权限
INSERT IGNORE INTO pioc_role_apps (role_id, app_id) VALUES (1, 18);

-- ============================================
-- 第二部分：数据表创建
-- ============================================

-- 3. 创建配置表
CREATE TABLE IF NOT EXISTS configsys_configs (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT COMMENT '用户描述这是什么配置',
    compliance_rule TEXT COMMENT '自然语言描述的合规规则（已弃用，使用 compliance_rule_id）',
    compliance_rule_id INT NULL COMMENT '关联的合规规则ID，引用 pioc_rules 表',
    created_by VARCHAR(100) COMMENT '配置创建者',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_created_by (created_by),
    INDEX idx_compliance_rule_id (compliance_rule_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. 创建配置版本表
-- 配置内容存储在版本表中，一个配置可以有多个版本
CREATE TABLE IF NOT EXISTS configsys_versions (
    id VARCHAR(36) PRIMARY KEY,
    config_id VARCHAR(36) NOT NULL,
    version_number VARCHAR(50) NOT NULL,
    content LONGTEXT NOT NULL COMMENT '配置内容',
    ai_summary TEXT COMMENT 'AI解读摘要',
    ai_full_analysis JSON COMMENT 'AI完整解读结果（JSON格式）',
    compliance_report JSON COMMENT '合规检查报告（JSON格式）',
    diff_report JSON COMMENT '版本差异报告（JSON格式）',
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (config_id) REFERENCES configsys_configs(id) ON DELETE CASCADE,
    UNIQUE KEY uk_config_version (config_id, version_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. 创建配置共享表
CREATE TABLE IF NOT EXISTS configsys_config_shares (
    id VARCHAR(36) PRIMARY KEY,
    config_id VARCHAR(36) NOT NULL,
    shared_with_user_id VARCHAR(100) NOT NULL COMMENT '被共享的用户ID',
    shared_by VARCHAR(100) COMMENT '共享操作者',
    shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (config_id) REFERENCES configsys_configs(id) ON DELETE CASCADE,
    UNIQUE KEY uk_config_user (config_id, shared_with_user_id),
    INDEX idx_shared_with (shared_with_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 第三部分：验证
-- ============================================

-- 验证插入结果
SELECT id, name, url, status FROM pioc_apps WHERE id = 18;
SELECT role_id, app_id FROM pioc_role_apps WHERE app_id = 18;
SHOW TABLES LIKE 'configsys_%';

-- 验证表结构
DESCRIBE configsys_configs;
