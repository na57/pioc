-- 设置字符集为 UTF-8
SET NAMES utf8mb4;

-- 创建教师中心数据库
CREATE DATABASE IF NOT EXISTS teacher_center
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

-- 创建数据库用户（使用强密码）
-- 密码包含：大小写字母、数字、特殊字符，共16位
CREATE USER 'teacher_center'@'%' IDENTIFIED BY 'TcP@9#mK$2vL&5nQ';

-- 授权用户对数据库的所有权限
GRANT ALL PRIVILEGES ON teacher_center.* TO 'teacher_center'@'%';

-- 刷新权限
FLUSH PRIVILEGES;
