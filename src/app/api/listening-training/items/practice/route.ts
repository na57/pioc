import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { 
  listeningTrainingDataService,
  getListeningTrainingConfigLoader,
  getListeningTrainingQueryService,
} from '@/lib/config/listening-training';

const appUrl = '/listening-training';

// GET /api/listening-training/items/practice - 获取待复习词条
async function getPracticeItemsHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string }
) {
  try {
    const { searchParams } = new URL(request.url);
    const wordbookId = searchParams.get('wordbook_id');
    const supplementNew = searchParams.get('supplement_new') === 'true'; // 是否补充新词条

    // 获取用户设置
    const settingsResult = await listeningTrainingDataService.getOrCreateUserSettings(session.userId);
    const dailyLimit = settingsResult.success && settingsResult.data
      ? (settingsResult.data as { daily_limit?: number }).daily_limit || 20
      : 20;

    // 1. 查询待复习词条（不区分词书，按待复习时间先后）
    const reviewResult = await listeningTrainingDataService.queryPracticeItems(
      session.userId,
      dailyLimit
    );

    if (!reviewResult.success) {
      return NextResponse.json(
        { success: false, message: '查询失败', error: reviewResult.error },
        { status: 500 }
      );
    }

    let items = reviewResult.data || [];
    let supplementedFromNew = false;
    let needMoreWordbooks = false;
    let availableWordbooks: Array<{ id: string; name: string; new_items_count: number }> = [];

    // 2. 如果待复习词条不足，且用户选择补充新词条，则从所有词书中获取新词条
    if (items.length < dailyLimit && supplementNew) {
      const neededCount = dailyLimit - items.length;
      const newItemsResult = await listeningTrainingDataService.queryNewItems(
        session.userId,
        neededCount
      );

      if (newItemsResult.success && newItemsResult.data && newItemsResult.data.length > 0) {
        items = [...items, ...newItemsResult.data];
        supplementedFromNew = true;
      }
    }

    // 3. 如果仍然不足，查询其他有可学习词条的词书
    if (items.length < dailyLimit && wordbookId) {
      const otherWordbooksResult = await listeningTrainingDataService.queryOtherWordbooks(
        session.userId,
        wordbookId
      );

      if (otherWordbooksResult.success && otherWordbooksResult.data && otherWordbooksResult.data.length > 0) {
        needMoreWordbooks = true;
        availableWordbooks = otherWordbooksResult.data;
      }
    }

    // 查询今日已完成复习数（所有词书）
    const configLoader = getListeningTrainingConfigLoader();
    const queryService = getListeningTrainingQueryService();
    const userItemsConfig = configLoader.getTableConfig('userItems');
    const dataSourceId = userItemsConfig.dataSourceId || configLoader.getDataSourceId() || '1';

    const todayCompleted = await queryService.executeRawQuery(
      dataSourceId,
      `SELECT COUNT(*) as count FROM ${userItemsConfig.name} 
       WHERE user_id = ? 
       AND last_review_at >= CURDATE()`,
      [session.userId]
    );

    return NextResponse.json({
      success: true,
      data: {
        items,
        total: items.length,
        daily_limit: dailyLimit,
        completed_today: todayCompleted.success && todayCompleted.data ? todayCompleted.data[0]?.count || 0 : 0,
        supplemented_from_new: supplementedFromNew,
        need_more_wordbooks: needMoreWordbooks,
        available_wordbooks: availableWordbooks,
        shortfall: Math.max(0, dailyLimit - items.length),
      },
    });
  } catch (error) {
    console.error('Failed to fetch practice items:', error);
    return NextResponse.json(
      { success: false, message: '获取待复习词条失败', error: String(error) },
      { status: 500 }
    );
  }
}

export const GET = createAppProtectedHandler(getPracticeItemsHandler, appUrl);
