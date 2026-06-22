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

    // 查询待复习词条（如果指定了词书ID，则只查询该词书的词条）
    const result = await listeningTrainingDataService.queryPracticeItems(wordbookId, session.userId);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: '查询失败', error: result.error },
        { status: 500 }
      );
    }

    // 查询今日已完成复习数（所有词书）
    const configLoader = getListeningTrainingConfigLoader();
    const queryService = getListeningTrainingQueryService();
    const userItemsConfig = configLoader.getTableConfig('userItems');
    const itemsConfig = configLoader.getTableConfig('items');
    const dataSourceId = userItemsConfig.dataSourceId || configLoader.getDataSourceId() || '1';
    
    // 所有词书今日完成数
    const todayCompleted = await queryService.executeRawQuery(
      dataSourceId,
      `SELECT COUNT(*) as count FROM ${userItemsConfig.name} 
       WHERE user_id = ? 
       AND last_review_at >= CURDATE()`,
      [session.userId]
    );
    
    // 当前词书今日完成数
    let wordbookCompleted = { success: true, data: [{ count: 0 }] };
    if (wordbookId) {
      wordbookCompleted = await queryService.executeRawQuery(
        dataSourceId,
        `SELECT COUNT(*) as count FROM ${userItemsConfig.name} ui
         JOIN ${itemsConfig.name} i ON ui.item_id = i.id
         WHERE ui.user_id = ? 
         AND i.wordbook_id = ?
         AND ui.last_review_at >= CURDATE()`,
        [session.userId, wordbookId]
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        items: result.data || [],
        total: (result.data || []).length,
        completed_today: todayCompleted.success && todayCompleted.data ? todayCompleted.data[0]?.count || 0 : 0,
        completed_in_wordbook: wordbookCompleted.success && wordbookCompleted.data ? wordbookCompleted.data[0]?.count || 0 : 0,
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
