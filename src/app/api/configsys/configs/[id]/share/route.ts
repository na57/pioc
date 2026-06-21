import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { query } from '@/lib/database/connection';
import { v4 as uuidv4 } from 'uuid';
import { isAdmin } from '@/lib/config/configsys';
import { findUserRoles } from '@/lib/database/models/user';

const appUrl = '/configsys';

// 获取配置的共享列表
async function getSharesHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: configId } = await params;
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
        { success: false, message: '无权查看此配置的共享信息' },
        { status: 403 }
      );
    }

    // 获取共享列表，关联用户表获取被共享者姓名
    // 注意：shared_with_user_id 存储的是用户 username，需要关联 pioc_users.username
    // 使用 COLLATE 统一字符集比较，避免 collation 不匹配问题
    const shares = await query<
      Array<{
        id: string;
        shared_with_user_id: string;
        shared_at: string;
        shared_with_name: string | null;
      }>
    >(
      `SELECT s.id, s.shared_with_user_id, s.shared_at, u.name as shared_with_name
       FROM configsys_config_shares s
       LEFT JOIN pioc_users u ON s.shared_with_user_id COLLATE utf8mb4_unicode_ci = u.username COLLATE utf8mb4_unicode_ci
       WHERE s.config_id = ?
       ORDER BY s.shared_at DESC`,
      [configId]
    );

    return NextResponse.json({
      success: true,
      data: shares,
    });
  } catch (error) {
    console.error('获取共享列表失败:', error);
    return NextResponse.json(
      { success: false, message: '获取共享列表失败', error: String(error) },
      { status: 500 }
    );
  }
}

// 共享配置给指定用户
async function postShareHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: configId } = await params;
    const body = await request.json();
    const { userId: sharedWithUserId } = body;
    const username = session.username;
    const userRoles = await findUserRoles(session.userId);
    const userRoleNames = userRoles.map(r => r.name);
    const isAdminUser = isAdmin(userRoleNames);

    if (!sharedWithUserId) {
      return NextResponse.json(
        { success: false, message: '请选择要共享的用户' },
        { status: 400 }
      );
    }

    // 检查权限
    const checkConfigs = await query<Array<{ created_by: string }>>(
      `SELECT created_by FROM configsys_configs WHERE id = ?`,
      [configId]
    );

    if (checkConfigs.length === 0) {
      return NextResponse.json(
        { success: false, message: '配置不存在' },
        { status: 404 }
      );
    }

    if (!isAdminUser && checkConfigs[0].created_by !== username) {
      return NextResponse.json(
        { success: false, message: '无权共享此配置' },
        { status: 403 }
      );
    }

    // 检查是否已共享
    const existingShare = await query<Array<Record<string, unknown>>>(
      `SELECT 1 FROM configsys_config_shares WHERE config_id = ? AND shared_with_user_id = ?`,
      [configId, sharedWithUserId]
    );

    if (existingShare.length > 0) {
      return NextResponse.json(
        { success: false, message: '该用户已被共享此配置' },
        { status: 400 }
      );
    }

    // 创建共享记录
    const shareId = uuidv4();
    await query(
      `INSERT INTO configsys_config_shares (id, config_id, shared_with_user_id, shared_by) 
       VALUES (?, ?, ?, ?)`,
      [shareId, configId, sharedWithUserId, username]
    );

    return NextResponse.json({
      success: true,
      message: '共享成功',
    });
  } catch (error) {
    console.error('共享配置失败:', error);
    return NextResponse.json(
      { success: false, message: '共享配置失败', error: String(error) },
      { status: 500 }
    );
  }
}

type HandlerFunction = (
  req: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  ctx: { params: Promise<{ id: string }> }
) => Promise<NextResponse>;

const wrapHandler = (handler: HandlerFunction) => {
  return async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const protectedHandler = createAppProtectedHandler(
      (req: NextRequest, session: { userId: number; username: string; email: string; name: string }) =>
        handler(req, session, context),
      appUrl
    );
    return protectedHandler(request, context);
  };
};

export const GET = wrapHandler(getSharesHandler);
export const POST = wrapHandler(postShareHandler);
