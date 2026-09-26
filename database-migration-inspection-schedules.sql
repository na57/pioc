-- IT资产中心 - 合规巡检「定时计划」数据库迁移脚本（第二阶段）
-- 依赖：database-migration-compliance-inspection.sql（inspection_records 表）
--
-- 说明：本脚本为 scheduler-service.ts 使用的两张表。
--       rule_ids 必须使用 JSON 类型，不能用 TEXT：
--       代码中 ruleIds 的读取链路为 JSON.parse(JSON.stringify(row.rule_ids))，
--       mysql2 对 JSON 列会自动解析为 JS 数组，该链路才能正确得到 number[]；
--       若使用 TEXT，读出的是字符串，JSON.parse(JSON.stringify(str)) 仍是字符串，
--       传入 runComplianceInspection 后会导致规则失效。

SET NAMES utf8mb4;

-- 1. 巡检计划表
CREATE TABLE IF NOT EXISTS pioc_inspection_schedules (
  id VARCHAR(36) PRIMARY KEY COMMENT '计划ID（UUID）',
  name VARCHAR(200) NOT NULL COMMENT '计划名称',
  system_id VARCHAR(100) NOT NULL COMMENT '被巡检的信息系统ID',
  system_name VARCHAR(200) NOT NULL DEFAULT '' COMMENT '信息系统名称（冗余，方便展示）',
  rule_ids JSON DEFAULT NULL COMMENT '关联合规规则ID数组，如 [1,2,3]；NULL 表示不执行合规检查',
  cron_expression VARCHAR(100) NOT NULL COMMENT 'cron 表达式，5 位，如 0 9 * * *',
  description TEXT COMMENT '计划描述',
  is_enabled TINYINT NOT NULL DEFAULT 1 COMMENT '1-启用，0-暂停',
  last_run_at DATETIME DEFAULT NULL COMMENT '上次执行时间',
  next_run_at DATETIME DEFAULT NULL COMMENT '预计下次执行时间',
  total_runs INT NOT NULL DEFAULT 0 COMMENT '累计执行次数',
  created_by VARCHAR(100) DEFAULT NULL COMMENT '创建人 username',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_system_id (system_id),
  INDEX idx_is_enabled (is_enabled),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 巡检计划执行日志表
CREATE TABLE IF NOT EXISTS pioc_inspection_schedule_logs (
  id VARCHAR(36) PRIMARY KEY COMMENT '日志ID（UUID）',
  schedule_id VARCHAR(36) NOT NULL COMMENT '所属计划ID',
  inspection_record_id VARCHAR(36) DEFAULT NULL COMMENT '本次执行产生的巡检记录ID',
  status VARCHAR(20) NOT NULL DEFAULT 'running' COMMENT 'running/completed/failed',
  result_summary TEXT COMMENT '执行结果摘要（JSON：overallStatus, summary）',
  error_message TEXT COMMENT '失败信息',
  started_at DATETIME DEFAULT NULL COMMENT '开始时间',
  completed_at DATETIME DEFAULT NULL COMMENT '结束时间',
  duration_ms BIGINT DEFAULT NULL COMMENT '执行耗时（毫秒）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_schedule_id (schedule_id),
  INDEX idx_status (status),
  INDEX idx_started_at (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 验证
SELECT TABLE_NAME, TABLE_COMMENT
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('pioc_inspection_schedules', 'pioc_inspection_schedule_logs');
