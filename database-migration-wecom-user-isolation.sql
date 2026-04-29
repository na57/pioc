-- 企业微信套件用户隔离迁移脚本 (v0.16.0 -> v0.16.1)
-- 为现有数据表添加/优化用户隔离所需的索引
-- 执行此脚本以启用完整的用户隔离功能
-- 
-- 版本说明：
--   - 从 v0.16.0 迁移到 v0.16.1
--   - 新增用户隔离功能：用户只能访问自己创建的企微账号、应用和智能表格

-- 设置字符集
SET NAMES utf8mb4;

-- =============================================
-- 1. 添加/优化索引
-- =============================================

-- 1.1 优化企微账号表的 created_by 索引
-- 确保查询性能
ALTER TABLE pioc_wecom_accounts 
DROP INDEX IF EXISTS idx_created_by,
ADD INDEX idx_created_by (created_by);

-- 1.2 优化企微应用表的 created_by 索引
ALTER TABLE pioc_wecom_apps 
DROP INDEX IF EXISTS idx_created_by,
ADD INDEX idx_created_by (created_by);

-- 1.3 优化智能表格表的 created_by 索引
ALTER TABLE pioc_wecom_smart_sheets 
DROP INDEX IF EXISTS idx_created_by,
ADD INDEX idx_created_by (created_by);

-- =============================================
-- 2. 为现有数据设置 created_by（如果为空）
-- =============================================

-- 注意：如果现有数据的 created_by 为空，需要手动指定一个用户ID
-- 以下是示例，请根据实际情况修改

-- UPDATE pioc_wecom_accounts SET created_by = 1 WHERE created_by IS NULL;
-- UPDATE pioc_wecom_apps SET created_by = 1 WHERE created_by IS NULL;
-- UPDATE pioc_wecom_smart_sheets SET created_by = 1 WHERE created_by IS NULL;

-- =============================================
-- 3. 验证结果
-- =============================================

SELECT '企微账号表索引' as check_item, INDEX_NAME, COLUMN_NAME, CARDINALITY 
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'pioc_wecom_accounts' 
AND INDEX_NAME LIKE 'idx_created_by';

SELECT '企微应用表索引' as check_item, INDEX_NAME, COLUMN_NAME, CARDINALITY 
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'pioc_wecom_apps' 
AND INDEX_NAME LIKE 'idx_created_by';

SELECT '智能表格表索引' as check_item, INDEX_NAME, COLUMN_NAME, CARDINALITY 
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'pioc_wecom_smart_sheets' 
AND INDEX_NAME LIKE 'idx_created_by';

-- 统计每个用户的数据量
SELECT '企微账号按用户统计' as check_item, created_by, COUNT(*) as count 
FROM pioc_wecom_accounts 
GROUP BY created_by;

SELECT '企微应用按用户统计' as check_item, created_by, COUNT(*) as count 
FROM pioc_wecom_apps 
GROUP BY created_by;

SELECT '智能表格按用户统计' as check_item, created_by, COUNT(*) as count 
FROM pioc_wecom_smart_sheets 
GROUP BY created_by;
