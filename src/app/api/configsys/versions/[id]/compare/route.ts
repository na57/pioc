import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { query } from '@/lib/database/connection';

const appUrl = '/configsys';

// 版本对比
async function postCompareHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: baseVersionId } = await params;
    const body = await request.json();
    const { targetVersionId } = body;
    const userId = request.headers.get('x-user-id') || '';
    const userRoles = JSON.parse(request.headers.get('x-user-roles') || '[]');
    const isAdmin = userRoles.includes('系统管理员');

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
        config_owner: string;
      }>
    >(
      `SELECT v.*, c.created_by as config_owner
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
    if (!isAdmin && baseVersion.config_owner !== userId) {
      const shares = await query<Array<Record<string, unknown>>>(
        `SELECT 1 FROM configsys_config_shares WHERE config_id = ? AND shared_with_user_id = ?`,
        [baseVersion.config_id, userId]
      );
      if (shares.length === 0) {
        return NextResponse.json(
          { success: false, message: '无权访问此配置' },
          { status: 403 }
        );
      }
    }

    // TODO: 调用AI服务进行版本对比
    // 这里先返回模拟数据
    const diffAnalysis = {
      summary: `从 ${targetVersion.version_number} 升级到 ${baseVersion.version_number}，主要优化了性能配置和安全性设置。`,
      changes: [
        {
          type: 'modify',
          category: 'performance',
          description: 'worker_processes 从 4 修改为 auto',
          risk: 'low',
          suggestion: '建议监控系统负载，确保自动调整符合预期',
        },
        {
          type: 'add',
          category: 'security',
          description: '新增 SSL 证书配置',
          risk: 'low',
          suggestion: '确保证书有效且定期更新',
        },
      ],
      impact: '此次变更提升了系统性能和安全性，建议在生产环境部署前进行充分测试。',
    };

    // 保存差异报告到当前版本
    await query(
      `UPDATE configsys_versions SET diff_report = ? WHERE id = ?`,
      [JSON.stringify(diffAnalysis), baseVersionId]
    );

    return NextResponse.json({
      success: true,
      data: diffAnalysis,
      message: '对比完成',
    });
  } catch (error) {
    console.error('版本对比失败:', error);
    return NextResponse.json(
      { success: false, message: '版本对比失败', error: String(error) },
      { status: 500 }
    );
  }
}

type HandlerFunction = (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<NextResponse>;

const wrapHandler = (handler: HandlerFunction) => {
  return async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const protectedHandler = createAppProtectedHandler(
      (req: NextRequest) => handler(req, context),
      appUrl
    );
    return protectedHandler(request, context);
  };
};

export const POST = wrapHandler(postCompareHandler);
