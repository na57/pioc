-- 企业微信套件 corp_id 唯一约束移除脚本 (v0.16.0 -> v0.16.1)
-- 移除 corp_id 的全局唯一约束，实现用户级别的唯一性检查
-- 
-- 说明：
--   - 移除 pioc_wecom_accounts 表中 corp_id 的 UNIQUE 约束
--   - 改为应用层面的用户级别唯一性检查
--   - 不同用户现在可以添加相同 corp_id 的账号

-- 设置字符集
SET NAMES utf8mb4;

-- =============================================
-- 1. 移除 corp_id 的唯一约束
-- =============================================

-- 1.1 查看当前表的索引信息（调试用）
-- SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE 
-- FROM INFORMATION_SCHEMA.STATISTICS 
-- WHERE TABLE_SCHEMA = DATABASE() 
-- AND TABLE_NAME = 'pioc_wecom_accounts';

-- 1.2 移除 corp_id 列的唯一约束（如果不存在则忽略错误）
-- 注意：MySQL 中 UNIQUE 约束的索引名通常与列名相同
ALTER TABLE pioc_wecom_accounts DROP INDEX corp_id;

-- =============================================
-- 2. 验证结果
-- =============================================

-- 查看移除后的索引信息
SELECT '企微账号表索引' as check_item, INDEX_NAME, COLUMN_NAME, NON_UNIQUE 
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'pioc_wecom_accounts'
AND COLUMN_NAME = 'corp_id';

-- 统计 corp_id 的重复情况（按用户分组）
SELECT 
    'corp_id 重复统计' as check_item,
    corp_id, 
    created_by, 
    COUNT(*) as count
FROM pioc_wecom_accounts 
GROUP BY corp_id, created_by
HAVING count > 1;
