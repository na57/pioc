-- ITC网络天气图应用数据库迁移脚本
-- 执行此脚本以在数据库中注册 ITC 网络天气图应用
-- 说明：该应用不创建业务表，拓扑数据通过 SNMP 实时采集、不持久化；
--       视图访问角色在 config/itc-weathermap.yaml 的 views.<id>.roles 配置。

-- 设置字符集
SET NAMES utf8mb4;

-- 1. 注册 ITC 网络天气图应用（如果不存在）
INSERT IGNORE INTO pioc_apps (id, name, description, icon, url, status) VALUES
  (23, 'ITC网络天气图', '展示数据中心网络拓扑和链路流量信息', 'GlobalOutlined', '/itc-weathermap', 1);

-- 2. 为 admin 角色分配 ITC 网络天气图应用权限
INSERT IGNORE INTO pioc_role_apps (role_id, app_id) VALUES (1, 23);

-- 验证插入结果
SELECT id, name, url, status FROM pioc_apps WHERE id = 23;
SELECT role_id, app_id FROM pioc_role_apps WHERE app_id = 23;
