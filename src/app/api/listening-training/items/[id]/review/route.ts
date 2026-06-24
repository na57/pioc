import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { 
  listeningTrainingDataService,
  getListeningTrainingConfigLoader,
  getListeningTrainingQueryService,
} from '@/lib/config/listening-training';

const appUrl = '/listening-training';

// 艾宾浩斯复习间隔（天）- 基于复习次数的间隔
// 用于"懂了"状态的词条
const REVIEW_INTERVALS_DAYS = [
  1,   // 第1次复习后 - 1天后
  2,   // 第2次复习后 - 2天后
  4,   // 第3次复习后 - 4天后
  7,   // 第4次复习后 - 7天后
  15,  // 第5次复习后 - 15天后
  30,  // 第6次复习后 - 30天后
];

function calculateNextReview(reviewCount: number, choice: string): Date | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (choice === 'unknown') {
    // 没懂 - 第二天凌晨4点复习
    const nextReview = new Date(today);
    nextReview.setDate(today.getDate() + 1);
    nextReview.setHours(4, 0, 0, 0);
    return nextReview;
  } else if (choice === 'known') {
    // 懂了 - 按照艾宾浩斯曲线复习，最短一天
    const intervalDays = REVIEW_INTERVALS_DAYS[Math.min(reviewCount - 1, REVIEW_INTERVALS_DAYS.length - 1)];
    const nextReview = new Date(today);
    nextReview.setDate(today.getDate() + intervalDays);
    nextReview.setHours(4, 0, 0, 0);
    return nextReview;
  }

  // 熟识 - 不再复习，返回 null
  return null;
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
      nextReviewAt = calculateNextReview(newReviewCount, choice);
    } else {
      // 没懂 - 进入艾宾浩斯复习队列
      newStatus = 'unknown';
      newReviewCount = (userItem?.review_count || 0) + 1;
      nextReviewAt = calculateNextReview(newReviewCount, choice);
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
