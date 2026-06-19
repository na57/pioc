import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { query } from '@/lib/database/connection';
import { configChatService } from '@/lib/ai/config-chat-service';
import { isAdmin } from '@/lib/config/configsys';
import { findUserRoles } from '@/lib/database/models/user';

const appUrl = '/configsys';

interface ChatRequestBody {
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  configContent?: string;
}

async function postChatHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: versionId } = await params;
    const body: ChatRequestBody = await request.json();
    const { message, history, configContent } = body;
    const username = session.username;
    const userRoles = await findUserRoles(session.userId);
    const userRoleNames = userRoles.map(r => r.name);
    const isAdminUser = isAdmin(userRoleNames);

    if (!message) {
      return NextResponse.json(
        { success: false, message: '问题不能为空' },
        { status: 400 }
      );
    }

    // 获取版本信息
    const versions = await query<
      Array<{
        id: string;
        config_id: string;
        content: string;
        config_name: string;
        config_owner: string;
      }>
    >(
      `SELECT v.*, c.name as config_name, c.created_by as config_owner
       FROM configsys_versions v
       JOIN configsys_configs c ON v.config_id = c.id
       WHERE v.id = ?`,
      [versionId]
    );

    if (versions.length === 0) {
      return NextResponse.json(
        { success: false, message: '版本不存在' },
        { status: 404 }
      );
    }

    const version = versions[0];

    // 检查权限
    if (!isAdminUser && version.config_owner !== username) {
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

    // 使用传入的configContent或版本内容
    const effectiveConfigContent = configContent || version.content;

    // 调用AI服务进行问答
    const result = await configChatService.chat(
      message,
      effectiveConfigContent,
      version.config_name,
      history
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.userMessage || 'AI问答失败', error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        answer: result.answer,
        suggestions: result.suggestions || [],
      },
      message: '问答完成',
    });
  } catch (error) {
    console.error('AI问答失败:', error);
    return NextResponse.json(
      { success: false, message: 'AI问答失败', error: String(error) },
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

export const POST = wrapHandler(postChatHandler);
