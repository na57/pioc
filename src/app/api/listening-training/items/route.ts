import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { listeningTrainingDataService } from '@/lib/config/listening-training';

const appUrl = '/listening-training';

// GET /api/listening-training/items - 获取词条列表（词本）
async function getItemsHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string }
) {
  try {
    const { searchParams } = new URL(request.url);
    const wordbookId = searchParams.get('wordbook_id');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '100', 10);

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

    let result;
    if (status && status !== 'all') {
      result = await listeningTrainingDataService.queryItemsByStatus(wordbookId, session.userId, status, page, pageSize);
    } else {
      result = await listeningTrainingDataService.queryItemsByWordbook(wordbookId, session.userId, page, pageSize);
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: '查询失败', error: result.error },
        { status: 500 }
      );
    }

    // 获取各状态的数量统计
    const countsResult = await listeningTrainingDataService.queryItemCountsByStatus(wordbookId, session.userId);
    const counts = countsResult.success ? countsResult.data : { all: 0, unknown: 0, known: 0, familiar: 0 };

    return NextResponse.json({
      success: true,
      data: {
        list: result.data || [],
        pagination: {
          page,
          pageSize,
          total: (result.data || []).length,
        },
        counts,
      },
    });
  } catch (error) {
    console.error('Failed to fetch items:', error);
    return NextResponse.json(
      { success: false, message: '获取词条列表失败', error: String(error) },
      { status: 500 }
    );
  }
}

export const GET = createAppProtectedHandler(getItemsHandler, appUrl);
