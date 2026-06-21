import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { 
  listeningTrainingDataService,
  getListeningTrainingConfigLoader,
  getListeningTrainingQueryService,
} from '@/lib/config/listening-training';

const appUrl = '/listening-training';

// PATCH /api/listening-training/items/:id/restore - 从熟识区捞回
async function restoreItemHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  session: { userId: number; username: string; email: string; name: string }
) {
  try {
    const { id: itemId } = await params;

    // 验证词条是否存在
    const configLoader = getListeningTrainingConfigLoader();
    const queryService = getListeningTrainingQueryService();
    const itemsConfig = configLoader.getTableConfig('items');
    const dataSourceId = itemsConfig.dataSourceId || configLoader.getDataSourceId() || '1';
    
    const itemResult = await queryService.executeRawQuery(
      dataSourceId,
      `SELECT * FROM ${itemsConfig.name} WHERE id = ?`,
      [itemId]
    );

    if (!itemResult.success || !itemResult.data || itemResult.data.length === 0) {
      return NextResponse.json(
        { success: false, message: '词条不存在' },
        { status: 404 }
      );
    }

    // 获取用户词条学习状态
    const userItemResult = await listeningTrainingDataService.getOrCreateUserItem(session.userId, itemId);
    
    if (!userItemResult.success) {
      return NextResponse.json(
        { success: false, message: '获取学习状态失败', error: userItemResult.error },
        { status: 500 }
      );
    }

    const userItem = userItemResult.data;

    if (userItem?.status !== 'familiar') {
      return NextResponse.json(
        { success: false, message: '只有熟识区的词条才能捞回' },
        { status: 400 }
      );
    }

    const now = new Date();
    const nextReviewAt = new Date(now.getTime() + 5 * 60 * 1000); // 5分钟后复习

    // 更新词条状态
    const updateResult = await listeningTrainingDataService.updateUserItem(
      session.userId,
      itemId,
      {
        status: 'unknown',
        reviewCount: 0,
        lastReviewAt: now,
        nextReviewAt,
        history: [{ time: now.toISOString(), choice: 'restore' }],
      }
    );

    if (!updateResult.success) {
      return NextResponse.json(
        { success: false, message: '捞回词条失败', error: 'error' in updateResult ? updateResult.error : '更新失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '词条已捞回',
      data: {
        id: itemId,
        status: 'unknown',
        review_count: 0,
        next_review_at: nextReviewAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to restore item:', error);
    return NextResponse.json(
      { success: false, message: '捞回词条失败', error: String(error) },
      { status: 500 }
    );
  }
}

type HandlerWithParams = (
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) => Promise<NextResponse>;

function wrapHandler(
  handler: (req: NextRequest, ctx: { params: Promise<{ id: string }> }, session: any) => Promise<NextResponse>
): HandlerWithParams {
  return async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const protectedHandler = createAppProtectedHandler(
      (req: NextRequest, session: any) => handler(req, context, session),
      appUrl
    );
    return protectedHandler(request, {} as any);
  };
}

export const PATCH = wrapHandler(restoreItemHandler);
