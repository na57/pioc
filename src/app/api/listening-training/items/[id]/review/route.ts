import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { 
  listeningTrainingDataService,
  getListeningTrainingConfigLoader,
  getListeningTrainingQueryService,
} from '@/lib/config/listening-training';

const appUrl = '/listening-training';

// 艾宾浩斯复习间隔（毫秒）
const REVIEW_INTERVALS = [
  5 * 60 * 1000,       // 5分钟
  30 * 60 * 1000,      // 30分钟
  12 * 60 * 60 * 1000, // 12小时
  24 * 60 * 60 * 1000, // 1天
  2 * 24 * 60 * 60 * 1000,  // 2天
  4 * 24 * 60 * 60 * 1000,  // 4天
  7 * 24 * 60 * 60 * 1000,  // 7天
  15 * 24 * 60 * 60 * 1000, // 15天
  30 * 24 * 60 * 60 * 1000, // 30天
];

function calculateNextReview(reviewCount: number): Date {
  const index = Math.min(reviewCount, REVIEW_INTERVALS.length - 1);
  const interval = REVIEW_INTERVALS[index];
  return new Date(Date.now() + interval);
}

// POST /api/listening-training/items/:id/review - 提交复习结果
async function reviewItemHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  session: { userId: number; username: string; email: string; name: string }
) {
  try {
    const { id: itemId } = await params;
    const body = await request.json();
    const { choice } = body;

    if (!choice || !['unknown', 'known', 'familiar'].includes(choice)) {
      return NextResponse.json(
        { success: false, message: '无效的选择，必须是 unknown、known 或 familiar' },
        { status: 400 }
      );
    }

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

    // 获取或创建用户词条学习状态
    const userItemResult = await listeningTrainingDataService.getOrCreateUserItem(session.userId, itemId);
    
    if (!userItemResult.success) {
      return NextResponse.json(
        { success: false, message: '获取学习状态失败', error: userItemResult.error },
        { status: 500 }
      );
    }

    const userItem = userItemResult.data as { review_count?: number; history?: any; status?: string } | null;
    const now = new Date();
    let newStatus = choice;
    let newReviewCount = userItem?.review_count || 0;
    let nextReviewAt: Date | null = null;

    // 更新复习历史
    let history: any[] = [];
    if (userItem?.history) {
      if (typeof userItem.history === 'string') {
        try {
          history = JSON.parse(userItem.history);
        } catch {
          history = [];
        }
      } else if (Array.isArray(userItem.history)) {
        history = userItem.history;
      }
    }
    history.push({
      time: now.toISOString(),
      choice,
    });

    if (choice === 'familiar') {
      // 熟识 - 完全掌握，不再复习
      newStatus = 'familiar';
      newReviewCount = (userItem?.review_count || 0) + 1;
      // nextReviewAt 保持 null，不再出现在练习队列
    } else if (choice === 'known') {
      // 懂了 - 还需要再次复习
      newStatus = 'known';
      newReviewCount = (userItem?.review_count || 0) + 1;
      nextReviewAt = calculateNextReview(newReviewCount);
    } else {
      // 没懂 - 进入艾宾浩斯复习队列
      newStatus = 'unknown';
      newReviewCount = (userItem?.review_count || 0) + 1;
      nextReviewAt = calculateNextReview(newReviewCount);
    }

    // 更新用户词条学习状态
    const updateResult = await listeningTrainingDataService.updateUserItem(
      session.userId,
      itemId,
      {
        status: newStatus,
        reviewCount: newReviewCount,
        lastReviewAt: now,
        nextReviewAt,
        history,
      }
    );

    if (!updateResult.success) {
      return NextResponse.json(
        { success: false, message: '更新学习状态失败', error: 'error' in updateResult ? updateResult.error : '更新失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: itemId,
        status: newStatus,
        review_count: newReviewCount,
        next_review_at: nextReviewAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('Failed to review item:', error);
    return NextResponse.json(
      { success: false, message: '提交复习结果失败', error: String(error) },
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

export const POST = wrapHandler(reviewItemHandler);
