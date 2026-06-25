import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { 
  listeningTrainingDataService,
  getListeningTrainingConfigLoader,
  getListeningTrainingQueryService,
} from '@/lib/config/listening-training';

const appUrl = '/listening-training';

// GET /api/listening-training/items/practice - 获取今日学习清单
async function getPracticeItemsHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string }
) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'daily'; // 'daily' | 'extra'

    // 获取用户设置
    const settingsResult = await listeningTrainingDataService.getOrCreateUserSettings(session.userId);
    const dailyLimit = settingsResult.success && settingsResult.data
      ? (settingsResult.data as { daily_limit?: number }).daily_limit || 20
      : 20;

    let items: any[] = [];
    let isExtraMode = mode === 'extra';
    let reviewCount = 0;
    let needMoreItems = false;
    let neededCount = 0;

    if (isExtraMode) {
      // 加练模式：返回空列表，让用户自己选择
      items = [];
    } else {
      // 日常学习模式：获取或创建今日学习清单
      const planResult = await listeningTrainingDataService.getOrCreateDailyPlan(session.userId, dailyLimit);
      if (planResult.success && planResult.data) {
        items = planResult.data;
        reviewCount = planResult.reviewCount || 0;
        
        // 检查是否需要补充新词条
        // 如果待复习词条数量 < 每日目标，则需要补充新词条
        if (reviewCount < dailyLimit) {
          needMoreItems = true;
          neededCount = dailyLimit - reviewCount;
        }
      }
    }

    // 查询今日已完成数量（从学习清单中统计）
    const configLoader = getListeningTrainingConfigLoader();
    const queryService = getListeningTrainingQueryService();
    const dailyPlanConfig = configLoader.getTableConfig('dailyPlan');
    const dataSourceId = dailyPlanConfig.dataSourceId || configLoader.getDataSourceId() || '1';

    const today = new Date().toISOString().split('T')[0];
    const todayCompleted = await queryService.executeRawQuery(
      dataSourceId,
      `SELECT COUNT(*) as count FROM ${dailyPlanConfig.name} 
       WHERE user_id = ? AND plan_date = ? AND status = 'completed'`,
      [session.userId, today]
    );

    const completedCount = todayCompleted.success && todayCompleted.data 
      ? todayCompleted.data[0]?.count || 0 
      : 0;

    // 计算待复习和新词条数量
    const pendingReviewCount = items.filter((item: any) => item.item_type === 'review' && item.status === 'pending').length;
    const pendingNewCount = items.filter((item: any) => item.item_type === 'new' && item.status === 'pending').length;
    
    // 计算还需要选择多少个新词条（考虑用户可能已经选择了一些）
    const selectedNewCount = items.filter((item: any) => item.item_type === 'new').length;
    const stillNeedCount = Math.max(0, neededCount - selectedNewCount);

    return NextResponse.json({
      success: true,
      data: {
        items,
        total: items.length,
        daily_limit: dailyLimit,
        completed_today: completedCount,
        pending_count: items.filter((item: any) => item.status === 'pending').length,
        review_count: pendingReviewCount,
        new_count: pendingNewCount,
        need_more_items: stillNeedCount > 0,
        needed_count: stillNeedCount,
        total_needed: neededCount,
        review_total: reviewCount,
        mode: isExtraMode ? 'extra' : 'daily',
      },
    });
  } catch (error) {
    console.error('Failed to fetch practice items:', error);
    return NextResponse.json(
      { success: false, message: '获取学习清单失败', error: String(error) },
      { status: 500 }
    );
  }
}

export const GET = createAppProtectedHandler(getPracticeItemsHandler, appUrl);
