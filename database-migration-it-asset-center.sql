-- IT资产中心应用数据库迁移脚本
-- 执行此脚本以在数据库中注册 IT 资产中心应用

-- 设置字符集
SET NAMES utf8mb4;

-- 1. 注册 IT 资产中心应用（如果不存在）
INSERT IGNORE INTO pioc_apps (id, name, description, icon, url, status) VALUES
  (22, 'IT资产中心', '以信息系统为主线，统一查看和管理所有 IT 资产数据', 'DatabaseOutlined', '/it-asset-center', 1);

-- 2. 为 admin 角色分配 IT 资产中心应用权限
INSERT IGNORE INTO pioc_role_apps (role_id, app_id) VALUES (1, 22);

-- 验证插入结果
SELECT id, name, url, status FROM pioc_apps WHERE id = 22;
SELECT role_id, app_id FROM pioc_role_apps WHERE app_id = 22;
