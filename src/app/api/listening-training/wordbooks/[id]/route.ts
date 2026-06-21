import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { query } from '@/lib/database/connection';

const appUrl = '/listening-training';

// DELETE /api/listening-training/wordbooks/:id - 删除词书
async function deleteWordbookHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  session: { userId: number; username: string; email: string; name: string }
) {
  try {
    const { id } = await params;

    // 检查词书是否存在且属于当前用户
    const wordbooks = await query<any[]>(
      `SELECT * FROM pioc_lt_wordbooks WHERE id = ? AND user_id = ?`,
      [id, session.userId]
    );

    if (wordbooks.length === 0) {
      return NextResponse.json(
        { success: false, message: '词书不存在或无权限删除' },
        { status: 404 }
      );
    }

    // 删除词书（关联的词条会自动删除）
    await query(
      `DELETE FROM pioc_lt_wordbooks WHERE id = ?`,
      [id]
    );

    return NextResponse.json({
      success: true,
      message: '词书删除成功',
    });
  } catch (error) {
    console.error('Failed to delete wordbook:', error);
    return NextResponse.json(
      { success: false, message: '删除词书失败', error: String(error) },
      { status: 500 }
    );
  }
}

// GET /api/listening-training/wordbooks/:id - 获取词书详情
async function getWordbookDetailHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  session: { userId: number; username: string; email: string; name: string }
) {
  try {
    const { id } = await params;

    // 查询词书详情
    const wordbooks = await query<any[]>(
      `SELECT * FROM pioc_lt_wordbooks WHERE id = ? AND user_id = ?`,
      [id, session.userId]
    );

    if (wordbooks.length === 0) {
      return NextResponse.json(
        { success: false, message: '词书不存在' },
        { status: 404 }
      );
    }

    // 查询各状态词条数量
    const stats = await query<any[]>(
      `SELECT status, COUNT(*) as count FROM pioc_lt_items 
       WHERE wordbook_id = ? 
       GROUP BY status`,
      [id]
    );

    const statusCount = {
      new: 0,
      unknown: 0,
      familiar: 0,
    };
    stats.forEach((s: any) => {
      statusCount[s.status as keyof typeof statusCount] = s.count;
    });

    return NextResponse.json({
      success: true,
      data: {
        ...wordbooks[0],
        status_count: statusCount,
      },
    });
  } catch (error) {
    console.error('Failed to fetch wordbook detail:', error);
    return NextResponse.json(
      { success: false, message: '获取词书详情失败', error: String(error) },
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

export const DELETE = wrapHandler(deleteWordbookHandler);
export const GET = wrapHandler(getWordbookDetailHandler);
