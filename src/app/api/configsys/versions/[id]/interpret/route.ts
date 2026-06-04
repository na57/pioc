import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { query } from '@/lib/database/connection';
import { configInterpretService } from '@/lib/ai/config-interpret-service';

const appUrl = '/configsys';

// AI解读配置
async function postInterpretHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id') || '';
    const userRoles = JSON.parse(request.headers.get('x-user-roles') || '[]');
    const isAdmin = userRoles.includes('系统管理员');

    // 获取版本信息
    const versions = await query<
      Array<{
        id: string;
        config_id: string;
        content: string;
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

    // 检查权限
    if (!isAdmin && version.config_owner !== userId) {
      const shares = await query<Array<Record<string, unknown>>>(
        `SELECT 1 FROM configsys_config_shares WHERE config_id = ? AND shared_with_user_id = ?`,
        [version.config_id, userId]
      );
      if (shares.length === 0) {
        return NextResponse.json(
          { success: false, message: '无权访问此版本' },
          { status: 403 }
        );
      }
    }

    // 调用AI服务进行配置解读
    const result = await configInterpretService.interpretConfig(
      version.content,
      version.config_name
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.userMessage || 'AI解读失败', error: result.error },
        { status: 500 }
      );
    }

    // 构建AI分析结果
    const aiAnalysis = {
      detectedType: result.detectedType || 'Unknown',
      summary: result.summary || '',
      keyItems: result.keyItems || [],
      riskAssessment: result.riskAssessment || { level: 'low', findings: [] },
    };

    // 保存AI解读结果
    await query(
      `UPDATE configsys_versions
       SET ai_summary = ?, ai_full_analysis = ?
       WHERE id = ?`,
      [
        aiAnalysis.summary,
        JSON.stringify(aiAnalysis),
        id,
      ]
    );

    return NextResponse.json({
      success: true,
      data: aiAnalysis,
      message: 'AI解读完成',
    });
  } catch (error) {
    console.error('AI解读失败:', error);
    return NextResponse.json(
      { success: false, message: 'AI解读失败', error: String(error) },
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

export const POST = wrapHandler(postInterpretHandler);
