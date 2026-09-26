/**
 * IT资产中心 - 合规巡检调度器服务
 *
 * 职责：
 * 1. 管理巡检计划的 CRUD（增删改查）
 * 2. 基于 node-cron 自动注册/注销定时任务
 * 3. 服务启动时自动恢复所有已启用的计划（由 src/instrumentation.ts 调用 initialize）
 * 4. 记录每次自动执行的日志
 *
 * ⚠️ 部署前提：本调度器为「进程内调度」，任务注册保存在本进程内存中。
 *    当前按单实例部署运行；若将来改为多实例（PM2 cluster、多容器副本），
 *    每个副本都会独立注册并执行同一批计划，会导致重复巡检、重复生成配置版本。
 *    届时须引入分布式协调：例如执行前按 schedule_id 抢占数据库锁
 *    （SELECT ... FOR UPDATE 或独立的锁表），抢到锁的副本才执行。
 */

import { v4 as uuidv4 } from 'uuid';
import * as cron from 'node-cron';
import { query } from '@/lib/database/connection';
import { createItAssetDataProvider } from '@/lib/services/it-asset-center/factory';
import { runComplianceInspection } from './compliance-inspection';

// ============================================
// 类型定义
// ============================================

/** 巡检计划 */
export interface InspectionSchedule {
  id: string;
  name: string;
  system_id: string;
  system_name: string;
  rule_ids: number[] | null;
  cron_expression: string;
  description: string | null;
  is_enabled: number;
  last_run_at: string | null;
  next_run_at: string | null;
  total_runs: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/** 巡检计划执行日志 */
export interface ScheduleLog {
  id: string;
  schedule_id: string;
  inspection_record_id: string | null;
  status: 'running' | 'completed' | 'failed';
  result_summary: string | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  created_at: string;
}

/** 创建计划参数 */
export interface CreateScheduleParams {
  name: string;
  systemId: string;
  systemName: string;
  ruleIds?: number[];
  cronExpression: string;
  description?: string;
  username: string;
}

/** 更新计划参数 */
export interface UpdateScheduleParams {
  name?: string;
  ruleIds?: number[];
  cronExpression?: string;
  description?: string;
  isEnabled?: number;
}

/** 计算下一次执行时间的选项 */
interface NextRunOptions {
  cronExpression: string;
  after?: Date;
}

// ============================================
// 调度器（单例）
// ============================================

class InspectionScheduler {
  /** 存储所有活跃的定时任务：scheduleId -> cron job */
  private jobs = new Map<string, cron.ScheduledTask>();

  /**
   * 正在执行中的计划 ID 集合（重入保护）
   *
   * 单次巡检包含图谱 BFS 采集 + 大模型判定，耗时可能从数十秒到数分钟。
   * 若不保护，上一次尚未跑完时下一次触发会并发进入，造成重复生成配置版本、
   * 并发占用数据库连接。这里在进程内做重入拦截（单实例部署下足够）。
   */
  private runningJobs = new Set<string>();

  /** 是否已初始化 */
  private initialized = false;

  /**
   * 初始化调度器：扫描数据库中所有已启用的计划并注册定时任务
   * 在应用启动时调用
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[InspectionScheduler] 正在初始化调度器...');

    try {
      const schedules = await query<InspectionSchedule[]>(
        `SELECT * FROM pioc_inspection_schedules WHERE is_enabled = 1`
      );

      for (const schedule of schedules) {
        this.registerJob(schedule);
      }

      console.log(
        `[InspectionScheduler] 调度器初始化完成，已注册 ${schedules.length} 个定时任务`
      );
    } catch (error) {
      // 初始化失败不置位，允许上层（instrumentation.ts）重试
      console.error('[InspectionScheduler] 初始化失败:', error);
      throw error;
    }

    this.initialized = true;
  }

  /**
   * 注册一个定时任务
   */
  private registerJob(schedule: InspectionSchedule): void {
    // 如果已存在同名任务，先注销
    if (this.jobs.has(schedule.id)) {
      this.unregisterJob(schedule.id);
    }

    // 校验 cron 表达式是否有效
    if (!cron.validate(schedule.cron_expression)) {
      console.warn(
        `[InspectionScheduler] 跳过无效 cron 表达式: ${schedule.id} - ${schedule.cron_expression}`
      );
      return;
    }

    const task = cron.schedule(schedule.cron_expression, async () => {
      await this.executeSchedule(schedule.id);
    });

    this.jobs.set(schedule.id, task);

    // 更新 next_run_at
    this.updateNextRunAt(schedule.id, schedule.cron_expression);

    console.log(
      `[InspectionScheduler] 注册定时任务: ${schedule.name} (${schedule.cron_expression})`
    );
  }

  /**
   * 注销一个定时任务
   */
  private unregisterJob(scheduleId: string): void {
    const existing = this.jobs.get(scheduleId);
    if (existing) {
      existing.stop();
      this.jobs.delete(scheduleId);
      console.log(`[InspectionScheduler] 注销定时任务: ${scheduleId}`);
    }
  }

  /**
   * 执行一次巡检（由 cron 触发）
   */
  private async executeSchedule(scheduleId: string): Promise<void> {
    // 重入保护：上一次执行尚未结束时，直接跳过本次触发
    if (this.runningJobs.has(scheduleId)) {
      console.warn(
        `[InspectionScheduler] 计划 ${scheduleId} 上一次执行尚未结束，本次触发已跳过`
      );
      return;
    }
    this.runningJobs.add(scheduleId);

    const logId = uuidv4();
    const startTime = Date.now();

    try {
      // 获取计划信息
      const schedules = await query<InspectionSchedule[]>(
        `SELECT * FROM pioc_inspection_schedules WHERE id = ?`,
        [scheduleId]
      );
      if (schedules.length === 0) {
        console.warn(`[InspectionScheduler] 计划不存在: ${scheduleId}`);
        return;
      }

      const schedule = schedules[0];

      // 如果计划已被暂停，跳过执行
      if (!schedule.is_enabled) {
        return;
      }

      // 创建执行日志（状态：running）
      await query(
        `INSERT INTO pioc_inspection_schedule_logs (id, schedule_id, status, started_at)
         VALUES (?, ?, 'running', NOW())`,
        [logId, scheduleId]
      );

      // 更新计划和记录（开始执行）
      await query(
        `UPDATE pioc_inspection_schedules SET last_run_at = NOW() WHERE id = ?`,
        [scheduleId]
      );

      // 执行合规巡检
      const ruleIds = schedule.rule_ids ? (JSON.parse(JSON.stringify(schedule.rule_ids)) as number[]) : [];
      const result = await runComplianceInspection(
        schedule.system_id,
        ruleIds,
        schedule.created_by
      );

      // 更新执行日志（状态：completed）
      const durationMs = Date.now() - startTime;
      const resultSummary = result.complianceSummary
        ? JSON.stringify({
            overallStatus: result.complianceSummary.overallStatus,
            summary: result.complianceSummary.summary,
          })
        : result.record.status === 'completed'
        ? JSON.stringify({ overallStatus: 'warning', summary: '巡检完成，未执行合规检查' })
        : null;

      await query(
        `UPDATE pioc_inspection_schedule_logs
         SET status = 'completed', inspection_record_id = ?,
             result_summary = ?, completed_at = NOW(), duration_ms = ?
         WHERE id = ?`,
        [result.record.id, resultSummary, durationMs, logId]
      );

      // 更新计划统计
      await query(
        `UPDATE pioc_inspection_schedules
         SET total_runs = total_runs + 1, next_run_at = ?
         WHERE id = ?`,
        [this.calculateNextRun(schedule.cron_expression), scheduleId]
      );
    } catch (error) {
      // 更新执行日志（状态：failed）
      const durationMs = Date.now() - startTime;
      await query(
        `UPDATE pioc_inspection_schedule_logs
         SET status = 'failed', error_message = ?, completed_at = NOW(), duration_ms = ?
         WHERE id = ?`,
        [String(error), durationMs, logId]
      );

      console.error(`[InspectionScheduler] 巡检执行失败: ${scheduleId}`, error);
    } finally {
      // 无论成功失败，都要释放重入标记，否则该计划将永久无法再次执行
      this.runningJobs.delete(scheduleId);
    }
  }

  /**
   * 计算下一次执行时间（返回 UTC 字符串，与 MySQL NOW() 同基准）
   *
   * 说明：
   * 1. node-cron 按**进程本地时区**（部署环境为 Asia/Shanghai）触发任务，
   *    因此推算必须在本地时区进行，否则 "0 9 * * *" 会被算成 UTC 9 点（即本地 17 点）；
   * 2. 但 MySQL 的 NOW() 返回**数据库会话时区**（当前部署为 UTC，见 @@session.time_zone），
   *    last_run_at / created_at 均为 UTC。为保证 next_run_at 与它们可直接比较，
   *    最终统一按 UTC 输出（见 formatDateTimeUtc）；
   * 3. 支持 5 段标准 cron：分 时 日 月 周；每段支持 星号、星号/步长、a-b、a-b/步长、逗号列表。
   *    周字段 0 与 7 均表示周日。
   */
  private calculateNextRun(cronExpression: string, after?: Date): string | null {
    try {
      const start = after || new Date();
      const parts = cronExpression.trim().split(/\s+/);
      if (parts.length < 5) return null;

      const minutes = this.parseCronField(parts[0], 0, 59);
      const hours = this.parseCronField(parts[1], 0, 23);
      const daysOfMonth = this.parseCronField(parts[2], 1, 31);
      const months = this.parseCronField(parts[3], 1, 12);
      // 周字段：0 和 7 都表示周日，统一归一到 0~6（与 Date.getDay() 对齐）
      const daysOfWeek = this.parseCronField(parts[4], 0, 7).map((d) => d % 7);

      // 从"下一分钟"开始向后找，最多找 400 天（覆盖每月、每年类计划）
      const cursor = new Date(start.getTime());
      cursor.setSeconds(0, 0);
      cursor.setMinutes(cursor.getMinutes() + 1);

      for (let day = 0; day < 400; day++) {
        const dayMatched =
          months.includes(cursor.getMonth() + 1) &&
          daysOfMonth.includes(cursor.getDate()) &&
          daysOfWeek.includes(cursor.getDay());

        if (dayMatched) {
          for (const h of hours) {
            for (const m of minutes) {
              const candidate = new Date(cursor);
              candidate.setHours(h, m, 0, 0);
              if (candidate >= cursor) {
                return this.formatDateTimeUtc(candidate);
              }
            }
          }
        }

        // 本天无可用时刻，跳到次日 00:00
        cursor.setDate(cursor.getDate() + 1);
        cursor.setHours(0, 0, 0, 0);
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * 解析 cron 单个字段为取值集合
   * 支持 星号、星号/步长、a-b、a-b/步长、逗号列表（如 1,2,3）及其组合
   */
  private parseCronField(pattern: string, min: number, max: number): number[] {
    const result = new Set<number>();

    for (const chunk of pattern.split(',')) {
      const p = chunk.trim();
      if (!p) continue;

      if (p === '*') {
        for (let i = min; i <= max; i++) result.add(i);
        continue;
      }

      // */n
      const stepAll = p.match(/^\*\/(\d+)$/);
      if (stepAll) {
        const step = parseInt(stepAll[1], 10) || 1;
        for (let i = min; i <= max; i += step) result.add(i);
        continue;
      }

      // a-b 或 a-b/n
      const range = p.match(/^(\d+)-(\d+)(?:\/(\d+))?$/);
      if (range) {
        const from = parseInt(range[1], 10);
        const to = parseInt(range[2], 10);
        const step = range[3] ? parseInt(range[3], 10) || 1 : 1;
        for (let i = from; i <= to; i += step) result.add(i);
        continue;
      }

      // 单个数字
      const n = parseInt(p, 10);
      if (!isNaN(n)) result.add(n);
    }

    return [...result].sort((a, b) => a - b);
  }

  /**
   * 格式化为 MySQL DATETIME 字符串（UTC）
   *
   * 必须与 last_run_at / created_at（由 MySQL NOW() 写入）保持同一时区基准，
   * 否则 next_run_at 与 last_run_at 之间会出现固定的时区偏移（东八区为 8 小时）。
   * 前端展示时如需本地时间，应在展示层统一换算，不要在存储层混用。
   */
  private formatDateTimeUtc(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
      `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
    );
  }

  /**
   * 更新计划的 next_run_at
   */
  private async updateNextRunAt(scheduleId: string, cronExpression: string): Promise<void> {
    const nextRun = this.calculateNextRun(cronExpression);
    if (nextRun) {
      await query(
        `UPDATE pioc_inspection_schedules SET next_run_at = ? WHERE id = ?`,
        [nextRun, scheduleId]
      );
    }
  }

  // ============================================
  // 公开 API
  // ============================================

  /**
   * 创建巡检计划
   */
  async createSchedule(params: CreateScheduleParams): Promise<InspectionSchedule> {
    const id = uuidv4();
    const ruleIds = params.ruleIds && params.ruleIds.length > 0 ? JSON.stringify(params.ruleIds) : null;

    // 计算首次 next_run_at
    const nextRunAt = this.calculateNextRun(params.cronExpression);

    await query(
      `INSERT INTO pioc_inspection_schedules (id, name, system_id, system_name, rule_ids, cron_expression, description, is_enabled, next_run_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        id,
        params.name,
        params.systemId,
        params.systemName,
        ruleIds,
        params.cronExpression,
        params.description || '',
        nextRunAt,
        params.username,
      ]
    );

    // 获取刚创建的完整记录
    const schedules = await query<InspectionSchedule[]>(
      `SELECT * FROM pioc_inspection_schedules WHERE id = ?`,
      [id]
    );

    const schedule = schedules[0];

    // 注册定时任务
    if (schedule.is_enabled) {
      this.registerJob(schedule);
    }

    return schedule;
  }

  /**
   * 更新巡检计划
   */
  async updateSchedule(id: string, params: UpdateScheduleParams): Promise<InspectionSchedule | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (params.name !== undefined) {
      fields.push('name = ?');
      values.push(params.name);
    }
    if (params.ruleIds !== undefined) {
      fields.push('rule_ids = ?');
      values.push(params.ruleIds.length > 0 ? JSON.stringify(params.ruleIds) : null);
    }
    if (params.cronExpression !== undefined) {
      fields.push('cron_expression = ?');
      values.push(params.cronExpression);
    }
    if (params.description !== undefined) {
      fields.push('description = ?');
      values.push(params.description);
    }
    if (params.isEnabled !== undefined) {
      fields.push('is_enabled = ?');
      values.push(params.isEnabled);
    }

    if (fields.length === 0) return null;

    // 如果更新了 cron 表达式，重新计算 next_run_at
    if (params.cronExpression) {
      const nextRunAt = this.calculateNextRun(params.cronExpression);
      fields.push('next_run_at = ?');
      values.push(nextRunAt);
    }

    values.push(id);

    await query(
      `UPDATE pioc_inspection_schedules SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    // 获取更新后的记录
    const schedules = await query<InspectionSchedule[]>(
      `SELECT * FROM pioc_inspection_schedules WHERE id = ?`,
      [id]
    );
    if (schedules.length === 0) return null;

    const schedule = schedules[0];

    // 重新注册/注销定时任务
    if (schedule.is_enabled) {
      this.registerJob(schedule);
    } else {
      this.unregisterJob(id);
    }

    return schedule;
  }

  /**
   * 删除巡检计划
   */
  async deleteSchedule(id: string): Promise<boolean> {
    this.unregisterJob(id);
    const result = await query<{ affectedRows: number }>(
      'DELETE FROM pioc_inspection_schedules WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  /**
   * 获取单个巡检计划
   */
  async getSchedule(id: string): Promise<InspectionSchedule | null> {
    const schedules = await query<InspectionSchedule[]>(
      `SELECT * FROM pioc_inspection_schedules WHERE id = ?`,
      [id]
    );
    return schedules[0] || null;
  }

  /**
   * 获取巡检计划列表（支持分页和筛选）
   */
  async listSchedules(params?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    systemId?: string;
    isEnabled?: number;
  }): Promise<{ data: InspectionSchedule[]; total: number }> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const offset = (page - 1) * pageSize;

    let whereClause = 'WHERE 1=1';
    const queryParams: unknown[] = [];

    if (params?.keyword) {
      whereClause += ' AND (name LIKE ? OR system_name LIKE ?)';
      queryParams.push(`%${params.keyword}%`, `%${params.keyword}%`);
    }
    if (params?.systemId) {
      whereClause += ' AND system_id = ?';
      queryParams.push(params.systemId);
    }
    if (params?.isEnabled !== undefined) {
      whereClause += ' AND is_enabled = ?';
      queryParams.push(params.isEnabled);
    }

    const countResult = await query<{ total: number }[]>(
      `SELECT COUNT(*) as total FROM pioc_inspection_schedules ${whereClause}`,
      queryParams
    );
    const total = countResult[0]?.total || 0;

    const data = await query<InspectionSchedule[]>(
      `SELECT * FROM pioc_inspection_schedules ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...queryParams, pageSize, offset]
    );

    return { data, total };
  }

  /**
   * 获取计划的执行日志
   */
  async listScheduleLogs(
    scheduleId: string,
    params?: { page?: number; pageSize?: number }
  ): Promise<{ data: ScheduleLog[]; total: number }> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const offset = (page - 1) * pageSize;

    const countResult = await query<{ total: number }[]>(
      `SELECT COUNT(*) as total FROM pioc_inspection_schedule_logs WHERE schedule_id = ?`,
      [scheduleId]
    );
    const total = countResult[0]?.total || 0;

    const data = await query<ScheduleLog[]>(
      `SELECT * FROM pioc_inspection_schedule_logs WHERE schedule_id = ? ORDER BY started_at DESC LIMIT ? OFFSET ?`,
      [scheduleId, pageSize, offset]
    );

    return { data, total };
  }

  /**
   * 立即执行一次巡检（手动触发）
   */
  async runNow(scheduleId: string): Promise<void> {
    await this.executeSchedule(scheduleId);
  }

  /**
   * 启用计划
   */
  async enableSchedule(id: string): Promise<InspectionSchedule | null> {
    return this.updateSchedule(id, { isEnabled: 1 });
  }

  /**
   * 暂停计划
   */
  async disableSchedule(id: string): Promise<InspectionSchedule | null> {
    return this.updateSchedule(id, { isEnabled: 0 });
  }

  /**
   * 获取当前所有活跃的定时任务信息
   */
  getActiveJobInfo(): { scheduleId: string; isRunning: boolean }[] {
    const info: { scheduleId: string; isRunning: boolean }[] = [];
    for (const [scheduleId] of this.jobs) {
      info.push({ scheduleId, isRunning: true });
    }
    return info;
  }

  /**
   * 关闭所有定时任务（应用关闭时调用）
   */
  async shutdown(): Promise<void> {
    for (const [id, job] of this.jobs) {
      job.stop();
    }
    this.jobs.clear();
    this.initialized = false;
    console.log('[InspectionScheduler] 调度器已关闭');
  }
}

// 导出单例
export const inspectionScheduler = new InspectionScheduler();