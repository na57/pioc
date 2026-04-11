-- 课程中心应用数据库迁移脚本
-- 执行此脚本以在已部署的数据库中添加课程中心应用

-- 设置字符集
SET NAMES utf8mb4;

-- 1. 注册课程中心应用（如果不存在）
INSERT IGNORE INTO pioc_apps (id, name, description, icon, url, status) VALUES
  (13, '课程中心', '查看本科生和研究生课程信息，支持课程查询、教学班和课堂统计查看', 'BookOutlined', '/course-center', 1);

-- 2. 为 admin 角色分配课程中心应用权限
INSERT IGNORE INTO pioc_role_apps (role_id, app_id) VALUES (1, 13);

-- 验证插入结果
SELECT id, name, url, status FROM pioc_apps WHERE id = 13;
SELECT role_id, app_id FROM pioc_role_apps WHERE app_id = 13;
