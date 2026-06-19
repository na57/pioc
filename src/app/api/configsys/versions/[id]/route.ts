import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { query } from '@/lib/database/connection';
import { isAdmin } from '@/lib/config/configsys';
import { findUserRoles } from '@/lib/database/models/user';

const appUrl = '/configsys';

// 获取版本详情
async function getVersionHandler(
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

    // 获取版本信息
    const versions = await query<
      Array<{
        id: string;
        config_id: string;
        version_number: string;
        content: string;
        ai_summary: string | null;
        ai_full_analysis: string | null;
        compliance_report: string | null;
        diff_report: string | null;
        config_name: string;
        config_description: string;
        config_owner: string;
      }>
    >(
      `SELECT v.*, c.name as config_name, c.description as config_description, c.created_by as config_owner
       FROM configsys_versions v
       JOIN configsys_configs c ON v.config_id = c.id
       WHERE v.id = ?`,
      [id]
    );

    if (versions.length === 0) {
      return NextResponse.json(
        { success: false, message: '版本不存在' },
        { status: 404 }
      );
    }

    const version = versions[0];

    // 调试日志
    console.log('Version data from DB:', {
      id: version.id,
      ai_full_analysis: version.ai_full_analysis,
      ai_full_analysis_type: typeof version.ai_full_analysis,
    });

    // 检查权限
    if (!isAdminUser && version.config_owner !== username) {
      // 检查是否被共享
      const shares = await query<Array<Record<string, unknown>>>(
        `SELECT 1 FROM configsys_config_shares WHERE config_id = ? AND shared_with_user_id = ?`,
        [version.config_id, username]
      );
      if (shares.length === 0) {
        return NextResponse.json(
          { success: false, message: '无权访问此版本' },
          { status: 403 }
        );
      }
    }

    // 获取同配置的其他版本（用于比对选择）
    const otherVersions = await query(
      `SELECT id, version_number, created_at 
       FROM configsys_versions 
       WHERE config_id = ? AND id != ?
       ORDER BY created_at DESC`,
      [version.config_id, id]
    );

    // 辅助函数：安全解析 JSON 字段
    // mysql2 驱动会自动解析 JSON 字段，所以如果值已经是对象则直接返回
    const parseJsonField = (value: any, defaultValue: any = null): any => {
      if (!value) return defaultValue;
      if (typeof value === 'object') return value;
      if (Array.isArray(value)) return value;
      try {
        return JSON.parse(value);
      } catch {
        return defaultValue;
      }
    };

    const parsedAiAnalysis = parseJsonField(version.ai_full_analysis, null);
    console.log('Parsed ai_full_analysis:', parsedAiAnalysis);

    return NextResponse.json({
      success: true,
      data: {
        ...version,
        ai_full_analysis: parsedAiAnalysis,
        compliance_report: parseJsonField(version.compliance_report, null),
        diff_report: parseJsonField(version.diff_report, null),
        otherVersions,
        isOwner: version.config_owner === username || isAdminUser,
      },
    });
  } catch (error) {
    console.error('获取版本详情失败:', error);
    return NextResponse.json(
      { success: false, message: '获取版本详情失败', error: String(error) },
      { status: 500 }
    );
  }
}

// 删除版本
async function deleteVersionHandler(
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
    const checkVersions = await query<
      Array<{
        created_by: string;
        config_owner: string;
        config_id: string;
      }>
    >(
      `SELECT v.created_by, c.created_by as config_owner, v.config_id
       FROM configsys_versions v
       JOIN configsys_configs c ON v.config_id = c.id
       WHERE v.id = ?`,
      [id]
    );

    if (checkVersions.length === 0) {
      return NextResponse.json(
        { success: false, message: '版本不存在' },
        { status: 404 }
      );
    }

    if (!isAdminUser && checkVersions[0].config_owner !== username) {
      return NextResponse.json(
        { success: false, message: '无权删除此版本' },
        { status: 403 }
      );
    }

    // 检查是否只有一个版本
    const versionCount = await query<Array<{ count: number }>>(
      `SELECT COUNT(*) as count FROM configsys_versions WHERE config_id = ?`,
      [checkVersions[0].config_id]
    );

    if (versionCount[0].count <= 1) {
      return NextResponse.json(
        { success: false, message: '不能删除唯一的版本，请直接删除配置' },
        { status: 400 }
      );
    }

    await query(`DELETE FROM configsys_versions WHERE id = ?`, [id]);

    return NextResponse.json({
      success: true,
      message: '版本删除成功',
    });
  } catch (error) {
    console.error('删除版本失败:', error);
    return NextResponse.json(
      { success: false, message: '删除版本失败', error: String(error) },
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

export const GET = wrapHandler(getVersionHandler);
export const DELETE = wrapHandler(deleteVersionHandler);
