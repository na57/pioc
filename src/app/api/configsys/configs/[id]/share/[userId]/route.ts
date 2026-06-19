import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { query } from '@/lib/database/connection';
import { isAdmin } from '@/lib/config/configsys';
import { findUserRoles } from '@/lib/database/models/user';

const appUrl = '/configsys';

// 取消共享
async function deleteShareHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id: configId, userId: sharedWithUserId } = await params;
    const username = session.username;
    const userRoles = await findUserRoles(session.userId);
    const userRoleNames = userRoles.map(r => r.name);
    const isAdminUser = isAdmin(userRoleNames);

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

    if (!isAdminUser && configs[0].created_by !== username) {
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

type HandlerFunction = (
  req: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  ctx: { params: Promise<{ id: string; userId: string }> }
) => Promise<NextResponse>;

const wrapHandler = (handler: HandlerFunction) => {
  return async (request: NextRequest, context: { params: Promise<{ id: string; userId: string }> }) => {
    const protectedHandler = createAppProtectedHandler(
      (req: NextRequest, session: { userId: number; username: string; email: string; name: string }) =>
        handler(req, session, context),
      appUrl
    );
    return protectedHandler(request, context);
  };
};

export const DELETE = wrapHandler(deleteShareHandler);
