import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { listeningTrainingDataService } from '@/lib/config/listening-training';

const appUrl = '/listening-training';

// GET /api/listening-training/review-schedule - 获取未来复习计划统计
async function getReviewScheduleHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string }
) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);

    // 查询未来一段时间的复习计划
    const result = await listeningTrainingDataService.queryReviewSchedule(session.userId, days);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: '查询失败', error: 'error' in result ? result.error : '未知错误' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        schedule: result.data || [],
        days,
      },
    });
  } catch (error) {
    console.error('Failed to fetch review schedule:', error);
    return NextResponse.json(
      { success: false, message: '获取复习计划失败', error: String(error) },
      { status: 500 }
    );
  }
}

export const GET = createAppProtectedHandler(getReviewScheduleHandler, appUrl);
