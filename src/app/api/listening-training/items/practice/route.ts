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

    if (!wordbookId) {
      return NextResponse.json(
        { success: false, message: '缺少词书ID参数' },
        { status: 400 }
      );
    }

    // 验证词书归属
    const wordbookResult = await listeningTrainingDataService.queryWordbookById(wordbookId);
    if (!wordbookResult.success || !wordbookResult.data || wordbookResult.data.length === 0) {
      return NextResponse.json(
        { success: false, message: '词书不存在' },
        { status: 404 }
      );
    }
    
    const wordbook = wordbookResult.data[0];
    if (wordbook.user_id !== session.userId) {
      return NextResponse.json(
        { success: false, message: '无权限访问该词书' },
        { status: 403 }
      );
    }

    // 查询待复习词条（使用新的数据结构）
    const result = await listeningTrainingDataService.queryPracticeItems(wordbookId, session.userId);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: '查询失败', error: result.error },
        { status: 500 }
      );
    }

    // 查询今日已完成复习数
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
        items: result.data || [],
        total: (result.data || []).length,
        completed_today: todayCompleted.success && todayCompleted.data ? todayCompleted.data[0]?.count || 0 : 0,
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
