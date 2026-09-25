-- IT资产中心 - 合规巡检功能数据库迁移脚本
-- 执行此脚本以创建巡检所需的表

SET NAMES utf8mb4;

-- 1. 巡检记录表：记录每次巡检的任务实例
CREATE TABLE IF NOT EXISTS inspection_records (
  id VARCHAR(36) PRIMARY KEY,           -- UUID
  system_id VARCHAR(100) NOT NULL,       -- 被巡检的信息系统ID
  system_name VARCHAR(200) NOT NULL,     -- 系统名称（冗余，方便展示）
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending/running/completed/failed
  config_id VARCHAR(36) DEFAULT NULL,    -- 关联的配置管理 config_id
  latest_version_id VARCHAR(36) DEFAULT NULL, -- 关联的配置管理最新版本ID
  result_summary TEXT DEFAULT NULL,      -- 结果摘要（JSON：overallStatus, summary）
  error_message TEXT DEFAULT NULL,       -- 失败时的错误信息
  created_by VARCHAR(100) DEFAULT NULL,  -- 巡检发起人
  started_at TIMESTAMP NULL,             -- 开始时间
  completed_at TIMESTAMP NULL,           -- 完成时间
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_system_id (system_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 追加应用权限
INSERT IGNORE INTO pioc_apps (id, name, description, icon, url, status) VALUES
  (22, 'IT资产中心', '以信息系统为主线，统一查看和管理所有 IT 资产数据', 'DatabaseOutlined', '/it-asset-center', 1)
ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), icon=VALUES(icon), url=VALUES(url), status=VALUES(status);