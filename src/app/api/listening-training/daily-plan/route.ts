import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { listeningTrainingDataService } from '@/lib/config/listening-training';

const appUrl = '/listening-training';

// GET /api/listening-training/daily-plan - 获取今日学习清单
async function getDailyPlanHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string }
) {
  try {
    const result = await listeningTrainingDataService.getTodayPlan(session.userId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: '获取学习清单失败', error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data || [],
    });
  } catch (error) {
    console.error('Failed to fetch daily plan:', error);
    return NextResponse.json(
      { success: false, message: '获取学习清单失败', error: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/listening-training/daily-plan - 添加词条到今日学习清单
async function addToDailyPlanHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string }
) {
  try {
    const body = await request.json();
    const { itemIds } = body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { success: false, message: '请提供要添加的词条ID数组' },
        { status: 400 }
      );
    }

    const result = await listeningTrainingDataService.addItemsToDailyPlan(session.userId, itemIds);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: '添加词条失败', error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `成功添加 ${result.addedCount} 个词条到今日学习清单`,
      data: { addedCount: result.addedCount },
    });
  } catch (error) {
    console.error('Failed to add items to daily plan:', error);
    return NextResponse.json(
      { success: false, message: '添加词条失败', error: String(error) },
      { status: 500 }
    );
  }
}

export const GET = createAppProtectedHandler(getDailyPlanHandler, appUrl);
export const POST = createAppProtectedHandler(addToDailyPlanHandler, appUrl);
