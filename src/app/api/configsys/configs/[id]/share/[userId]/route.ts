import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { query } from '@/lib/database/connection';

const appUrl = '/configsys';

// 取消共享
async function deleteShareHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id: configId, userId: sharedWithUserId } = await params;
    const currentUserId = request.headers.get('x-user-id') || '';
    const userRoles = JSON.parse(request.headers.get('x-user-roles') || '[]');
    const isAdmin = userRoles.includes('系统管理员');

    // 检查权限
    const configs = await query<Array<{ created_by: string }>>(
      `SELECT created_by FROM configsys_configs WHERE id = ?`,
      [configId]
    );

    if (configs.length === 0) {
      return NextResponse.json(
        { success: false, message: '配置不存在' },
        { status: 404 }
      );
    }

    if (!isAdmin && configs[0].created_by !== currentUserId) {
      return NextResponse.json(
        { success: false, message: '无权取消此配置的共享' },
        { status: 403 }
      );
    }

    // 删除共享记录
    await query(
      `DELETE FROM configsys_config_shares WHERE config_id = ? AND shared_with_user_id = ?`,
      [configId, sharedWithUserId]
    );

    return NextResponse.json({
      success: true,
      message: '取消共享成功',
    });
  } catch (error) {
    console.error('取消共享失败:', error);
    return NextResponse.json(
      { success: false, message: '取消共享失败', error: String(error) },
      { status: 500 }
    );
  }
}

type HandlerFunction = (req: NextRequest, ctx: { params: Promise<{ id: string; userId: string }> }) => Promise<NextResponse>;

const wrapHandler = (handler: HandlerFunction) => {
  return async (request: NextRequest, context: { params: Promise<{ id: string; userId: string }> }) => {
    const protectedHandler = createAppProtectedHandler(
      (req: NextRequest) => handler(req, context),
      appUrl
    );
    return protectedHandler(request, context);
  };
};

export const DELETE = wrapHandler(deleteShareHandler);
