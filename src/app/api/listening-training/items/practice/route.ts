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
      // 日常学习模式
      // 1. 获取今日学习清单（所有词条，包括已完成和未完成的）
      const todayPlanResult = await listeningTrainingDataService.getTodayPlan(session.userId);
      console.log(`[DEBUG] getTodayPlan returned ${todayPlanResult.success && Array.isArray(todayPlanResult.data) ? todayPlanResult.data.length : 0} items`);
      
      if (todayPlanResult.success && Array.isArray(todayPlanResult.data) && todayPlanResult.data.length > 0) {
        // 今日已有学习清单，筛选出未完成的词条
        const allItems = todayPlanResult.data;
        const pendingItems = allItems.filter((item: any) => item.status === 'pending');
        const completedItems = allItems.filter((item: any) => item.status === 'completed');
        
        console.log(`[DEBUG] Today plan - Total: ${allItems.length}, Pending: ${pendingItems.length}, Completed: ${completedItems.length}`);
        
        // 返回未完成的词条给前端学习
        items = pendingItems;
        
        // 统计信息
        const pendingReviewItems = pendingItems.filter((item: any) => item.item_type === 'review');
        reviewCount = pendingReviewItems.length;
        
        // 如果还有待学习的词条，或者还有已完成但未达目标的，不需要补充新词条
        if (pendingItems.length === 0 && completedItems.length >= dailyLimit) {
          // 所有词条都已完成且达到每日目标
          needMoreItems = false;
          neededCount = 0;
        } else if (pendingItems.length === 0 && completedItems.length < dailyLimit) {
          // 所有词条都已完成但未达到每日目标，可以补充新词条
          needMoreItems = true;
          neededCount = dailyLimit - completedItems.length;
        } else {
          // 还有待学习的词条
          needMoreItems = false;
          neededCount = 0;
        }
      } else {
        // 今日没有学习清单，需要创建
        console.log(`[DEBUG] No existing plan, calling getOrCreateDailyPlan`);
        const planResult = await listeningTrainingDataService.getOrCreateDailyPlan(session.userId, dailyLimit);
        console.log(`[DEBUG] getOrCreateDailyPlan returned ${planResult.success && planResult.data ? planResult.data.length : 0} items`);
        if (planResult.success && planResult.data) {
          items = planResult.data;
          reviewCount = planResult.reviewCount || 0;
          
          // 检查是否需要补充新词条
          if (reviewCount < dailyLimit) {
            needMoreItems = true;
            neededCount = dailyLimit - reviewCount;
          }
        }
      }
      
      // 获取今日已完成的词条清单（调试用）
      const completedItemsResult = await listeningTrainingDataService.getTodayCompletedItems(session.userId);
      console.log(`[DEBUG] getTodayCompletedItems returned ${completedItemsResult.success && Array.isArray(completedItemsResult.data) ? completedItemsResult.data.length : 0} items`);
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
      ? Number(todayCompleted.data[0]?.count) || 0 
      : 0;

    // 计算待复习和新词条数量
    const pendingReviewCount = items.filter((item: any) => item.item_type === 'review' && item.status === 'pending').length;
    const pendingNewCount = items.filter((item: any) => item.item_type === 'new' && item.status === 'pending').length;
    
    // 计算还需要选择多少个新词条（考虑用户可能已经选择了一些）
    const selectedNewCount = items.filter((item: any) => item.item_type === 'new').length;
    const stillNeedCount = Math.max(0, neededCount - selectedNewCount);

    // 判断是否今日学习已完成（有待复习词条但都被完成了）
    const allCompleted = items.length === 0 && completedCount > 0;

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
        need_more_items: stillNeedCount > 0 && !allCompleted,
        needed_count: stillNeedCount,
        total_needed: neededCount,
        review_total: reviewCount,
        all_completed: allCompleted,
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
