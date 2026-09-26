/**
 * IT资产中心 - 巡检计划管理 API
 *
 * 所有操作统一通过 POST + action 参数处理，避免动态路由的类型兼容问题。
 *
 * GET  /api/it-asset-center/schedules          - 获取计划列表（支持分页筛选）
 * POST /api/it-asset-center/schedules          - 所有写操作（action 区分）
 *   action = "create"     - 创建计划
 *   action = "update"     - 更新计划
 *   action = "delete"     - 删除计划
 *   action = "run"        - 立即执行
 *   action = "enable"     - 启用
 *   action = "disable"    - 暂停
 *   action = "logs"       - 获取执行日志
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { inspectionScheduler } from '@/lib/services/it-asset-center/scheduler-service';

const appUrl = '/it-asset-center';

// ============================================
// GET: 获取计划列表
// ============================================

async function getHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string }
) {
  try {
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '10', 10);
    const keyword = request.nextUrl.searchParams.get('keyword') || undefined;
    const systemId = request.nextUrl.searchParams.get('systemId') || undefined;
    const isEnabled = request.nextUrl.searchParams.get('isEnabled') !== null
      ? parseInt(request.nextUrl.searchParams.get('isEnabled')!, 10)
      : undefined;

    const result = await inspectionScheduler.listSchedules({ page, pageSize, keyword, systemId, isEnabled });
    return NextResponse.json({
      success: true,
      data: result.data,
      total: result.total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('获取巡检计划失败:', error);
    return NextResponse.json(
      { success: false, error: '获取巡检计划失败', detail: String(error) },
      { status: 500 }
    );
  }
}

// ============================================
// POST: 所有写操作
// ============================================

async function postHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string }
) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'create': {
        if (!params.name || !params.systemId || !params.cronExpression) {
          return NextResponse.json(
            { success: false, error: '缺少必要参数: name, systemId, cronExpression' },
            { status: 400 }
          );
        }

        const schedule = await inspectionScheduler.createSchedule({
          name: params.name,
          systemId: params.systemId,
          systemName: params.systemName || '',
          ruleIds: params.ruleIds || [],
          cronExpression: params.cronExpression,
          description: params.description || '',
          username: session.username,
        });

        return NextResponse.json({ success: true, data: schedule });
      }

      case 'update': {
        if (!params.id) {
          return NextResponse.json({ success: false, error: '缺少计划 ID' }, { status: 400 });
        }

        const schedule = await inspectionScheduler.updateSchedule(params.id, params);
        if (!schedule) {
          return NextResponse.json({ success: false, error: '计划不存在或无更新' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: schedule });
      }

      case 'delete': {
        if (!params.id) {
          return NextResponse.json({ success: false, error: '缺少计划 ID' }, { status: 400 });
        }

        const result = await inspectionScheduler.deleteSchedule(params.id);
        if (!result) {
          return NextResponse.json({ success: false, error: '计划不存在' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: { id: params.id } });
      }

      case 'run': {
        if (!params.id) {
          return NextResponse.json({ success: false, error: '缺少计划 ID' }, { status: 400 });
        }

        await inspectionScheduler.runNow(params.id);
        return NextResponse.json({ success: true });
      }

      case 'enable': {
        if (!params.id) {
          return NextResponse.json({ success: false, error: '缺少计划 ID' }, { status: 400 });
        }

        const schedule = await inspectionScheduler.enableSchedule(params.id);
        if (!schedule) {
          return NextResponse.json({ success: false, error: '计划不存在' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: schedule });
      }

      case 'disable': {
        if (!params.id) {
          return NextResponse.json({ success: false, error: '缺少计划 ID' }, { status: 400 });
        }

        const schedule = await inspectionScheduler.disableSchedule(params.id);
        if (!schedule) {
          return NextResponse.json({ success: false, error: '计划不存在' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: schedule });
      }

      case 'logs': {
        if (!params.id) {
          return NextResponse.json({ success: false, error: '缺少计划 ID' }, { status: 400 });
        }

        const page = params.page || 1;
        const pageSize = params.pageSize || 10;
        const result = await inspectionScheduler.listScheduleLogs(params.id, { page, pageSize });

        return NextResponse.json({ success: true, data: result.data, total: result.total });
      }

      default:
        return NextResponse.json(
          { success: false, error: '未知的 action: ' + action },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('操作巡检计划失败:', error);
    return NextResponse.json(
      { success: false, error: '操作巡检计划失败', detail: String(error) },
      { status: 500 }
    );
  }
}

export const GET = createAppProtectedHandler(getHandler, appUrl);
export const POST = createAppProtectedHandler(postHandler, appUrl);