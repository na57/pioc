-- ============================================
-- 教师中心应用数据迁移脚本（补丁）
-- ============================================
-- 此脚本用于在已部署的数据库中添加教师中心应用
-- 数据表由外部系统提供，无需在此创建
-- ============================================

SET NAMES utf8mb4;

-- ------------------------------------------
-- 1. 插入教师中心应用到应用表
-- ------------------------------------------
INSERT INTO pioc_apps (id, name, description, icon, url, status, created_at, updated_at)
VALUES (
    16, 
    '教师中心', 
    '教师信息管理与教师画像，支持查看教师基本信息、教职生涯、科研成果、教学情况等数据', 
    'TeamOutlined', 
    '/teacher-center', 
    1, 
    NOW(), 
    NOW()
)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    icon = VALUES(icon),
    url = VALUES(url),
    status = VALUES(status),
    updated_at = NOW();

-- ============================================
-- 迁移完成
-- ============================================
