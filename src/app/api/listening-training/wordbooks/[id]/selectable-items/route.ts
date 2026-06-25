import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { listeningTrainingDataService } from '@/lib/config/listening-training';

const appUrl = '/listening-training';

// GET /api/listening-training/wordbooks/:id/selectable-items - 获取词书中可供选择的词条
async function getSelectableItemsHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  session: { userId: number; username: string; email: string; name: string }
) {
  try {
    const { id: wordbookId } = await params;

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

    const result = await listeningTrainingDataService.getSelectableItems(session.userId, wordbookId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: '获取词条失败', error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data || [],
    });
  } catch (error) {
    console.error('Failed to fetch selectable items:', error);
    return NextResponse.json(
      { success: false, message: '获取词条失败', error: String(error) },
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

export const GET = wrapHandler(getSelectableItemsHandler);
