import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { query } from '@/lib/database/connection';
import { configVersionCompareService } from '@/lib/ai/config-version-compare-service';
import { isAdmin } from '@/lib/config/configsys';
import { findUserRoles } from '@/lib/database/models/user';

const appUrl = '/configsys';

// AI版本比对
async function postAICompareHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: baseVersionId } = await params;
    const body = await request.json();
    const { targetVersionId } = body;
    const username = session.username;
    const userRoles = await findUserRoles(session.userId);
    const userRoleNames = userRoles.map(r => r.name);
    const isAdminUser = isAdmin(userRoleNames);

    if (!targetVersionId) {
      return NextResponse.json(
        { success: false, message: '请选择要对比的目标版本' },
        { status: 400 }
      );
    }

    // 获取两个版本的信息
    const versions = await query<
      Array<{
        id: string;
        config_id: string;
        version_number: string;
        content: string;
        config_name: string;
        config_owner: string;
      }>
    >(
      `SELECT v.*, c.name as config_name, c.created_by as config_owner
       FROM configsys_versions v
       JOIN configsys_configs c ON v.config_id = c.id
       WHERE v.id IN (?, ?)`,
      [baseVersionId, targetVersionId]
    );

    if (versions.length !== 2) {
      return NextResponse.json(
        { success: false, message: '版本不存在' },
        { status: 404 }
      );
    }

    const baseVersion = versions.find((v) => v.id === baseVersionId)!;
    const targetVersion = versions.find((v) => v.id === targetVersionId)!;

    // 检查是否是同一配置
    if (baseVersion.config_id !== targetVersion.config_id) {
      return NextResponse.json(
        { success: false, message: '只能对比同一配置的不同版本' },
        { status: 400 }
      );
    }

    // 检查权限
    if (!isAdminUser && baseVersion.config_owner !== username) {
      const shares = await query<Array<Record<string, unknown>>>(
        `SELECT 1 FROM configsys_config_shares WHERE config_id = ? AND shared_with_user_id = ?`,
        [baseVersion.config_id, username]
      );
      if (shares.length === 0) {
        return NextResponse.json(
          { success: false, message: '无权访问此配置' },
          { status: 403 }
        );
      }
    }

    // 调用AI服务进行版本比对
    const result = await configVersionCompareService.compareVersions(
      {
        version_number: baseVersion.version_number,
        content: baseVersion.content,
      },
      {
        version_number: targetVersion.version_number,
        content: targetVersion.content,
      },
      baseVersion.config_name
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.userMessage || 'AI比对失败', error: result.error },
        { status: 500 }
      );
    }

    // 构建比对结果
    const compareResult = {
      baseVersion: {
        id: baseVersion.id,
        version_number: baseVersion.version_number,
      },
      targetVersion: {
        id: targetVersion.id,
        version_number: targetVersion.version_number,
      },
      summary: result.summary,
      changes: result.changes,
      impact: result.impact,
    };

    return NextResponse.json({
      success: true,
      data: compareResult,
      message: 'AI比对完成',
    });
  } catch (error) {
    console.error('AI版本比对失败:', error);
    return NextResponse.json(
      { success: false, message: 'AI版本比对失败', error: String(error) },
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

export const POST = wrapHandler(postAICompareHandler);
