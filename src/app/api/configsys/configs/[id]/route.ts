import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { query } from '@/lib/database/connection';
import { isAdmin } from '@/lib/config/configsys';
import { findUserRoles } from '@/lib/database/models/user';

const appUrl = '/configsys';

// 获取配置详情
async function getConfigHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const username = session.username;
    const userRoles = await findUserRoles(session.userId);
    const userRoleNames = userRoles.map(r => r.name);
    const isAdminUser = isAdmin(userRoleNames);

    // 获取配置信息（包含关联的规则信息）
    const configs = await query<
      Array<{
        id: string;
        name: string;
        description: string;
        compliance_rule_id: number | null;
        compliance_rule_name: string | null;
        compliance_rule_content: string | null;
        created_by: string;
        created_at: string;
        updated_at: string;
      }>
    >(
      `SELECT c.*, r.name as compliance_rule_name, r.content as compliance_rule_content
       FROM configsys_configs c
       LEFT JOIN pioc_rules r ON c.compliance_rule_id = r.id
       WHERE c.id = ?`,
      [id]
    );

    if (configs.length === 0) {
      return NextResponse.json(
        { success: false, message: '配置不存在' },
        { status: 404 }
      );
    }

    const config = configs[0];

    // 检查权限
    if (!isAdminUser && config.created_by !== username) {
      // 检查是否被共享
      const shares = await query<Array<Record<string, unknown>>>(
        `SELECT 1 FROM configsys_config_shares WHERE config_id = ? AND shared_with_user_id = ?`,
        [id, username]
      );
      if (shares.length === 0) {
        return NextResponse.json(
          { success: false, message: '无权访问此配置' },
          { status: 403 }
        );
      }
    }

    // 获取版本列表
    const versions = await query(
      `SELECT id, version_number, ai_summary, created_by, created_at 
       FROM configsys_versions 
       WHERE config_id = ? 
       ORDER BY created_at DESC`,
      [id]
    );

    // 获取共享列表
    const shares = await query(
      `SELECT s.*, u.name as shared_with_name 
       FROM configsys_config_shares s
       LEFT JOIN pioc_users u ON s.shared_with_user_id = u.id
       WHERE s.config_id = ?`,
      [id]
    );

    return NextResponse.json({
      success: true,
      data: {
        ...config,
        versions,
        shares,
        isOwner: config.created_by === username || isAdminUser,
      },
    });
  } catch (error) {
    console.error('获取配置详情失败:', error);
    return NextResponse.json(
      { success: false, message: '获取配置详情失败', error: String(error) },
      { status: 500 }
    );
  }
}

// 更新配置
async function putConfigHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, complianceRuleId } = body;
    const username = session.username;
    const userRoles = await findUserRoles(session.userId);
    const userRoleNames = userRoles.map(r => r.name);
    const isAdminUser = isAdmin(userRoleNames);

    // 检查权限
    const configs = await query<Array<{ created_by: string }>>(
      `SELECT created_by FROM configsys_configs WHERE id = ?`,
      [id]
    );

    if (configs.length === 0) {
      return NextResponse.json(
        { success: false, message: '配置不存在' },
        { status: 404 }
      );
    }

    if (!isAdminUser && configs[0].created_by !== username) {
      return NextResponse.json(
        { success: false, message: '无权修改此配置' },
        { status: 403 }
      );
    }

    await query(
      `UPDATE configsys_configs
       SET name = ?, description = ?, compliance_rule_id = ?
       WHERE id = ?`,
      [name, description || '', complianceRuleId || null, id]
    );

    return NextResponse.json({
      success: true,
      message: '配置更新成功',
    });
  } catch (error) {
    console.error('更新配置失败:', error);
    return NextResponse.json(
      { success: false, message: '更新配置失败', error: String(error) },
      { status: 500 }
    );
  }
}

// 删除配置
async function deleteConfigHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const username = session.username;
    const userRoles = await findUserRoles(session.userId);
    const userRoleNames = userRoles.map(r => r.name);
    const isAdminUser = isAdmin(userRoleNames);

    // 检查权限
    const checkConfigs = await query<Array<{ created_by: string }>>(
      `SELECT created_by FROM configsys_configs WHERE id = ?`,
      [id]
    );

    if (checkConfigs.length === 0) {
      return NextResponse.json(
        { success: false, message: '配置不存在' },
        { status: 404 }
      );
    }

    if (!isAdminUser && checkConfigs[0].created_by !== username) {
      return NextResponse.json(
        { success: false, message: '无权删除此配置' },
        { status: 403 }
      );
    }

    await query(`DELETE FROM configsys_configs WHERE id = ?`, [id]);

    return NextResponse.json({
      success: true,
      message: '配置删除成功',
    });
  } catch (error) {
    console.error('删除配置失败:', error);
    return NextResponse.json(
      { success: false, message: '删除配置失败', error: String(error) },
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

export const GET = wrapHandler(getConfigHandler);
export const PUT = wrapHandler(putConfigHandler);
export const DELETE = wrapHandler(deleteConfigHandler);
