import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import * as wecomAppModel from '@/lib/database/models/wecomApp';

const appUrl = '/wecom-apps';

// GET /api/wecom-apps/:id - 获取企微应用详情
async function getWecomAppHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const appId = parseInt(id, 10);

    if (isNaN(appId)) {
      return NextResponse.json(
        { success: false, message: '无效的应用ID' },
        { status: 400 }
      );
    }

    // 使用用户隔离的方法查询
    const app = await wecomAppModel.findByIdAndUser(appId, session.userId);

    if (!app) {
      return NextResponse.json(
        { success: false, message: '企微应用不存在或无权限访问' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: app });
  } catch (error) {
    console.error('Failed to fetch wecom app:', error);
    return NextResponse.json(
      { success: false, message: '获取企微应用详情失败', error: String(error) },
      { status: 500 }
    );
  }
}

// PUT /api/wecom-apps/:id - 更新企微应用
async function updateWecomAppHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const appId = parseInt(id, 10);

    if (isNaN(appId)) {
      return NextResponse.json(
        { success: false, message: '无效的应用ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // 使用用户隔离方法检查
    const existingApp = await wecomAppModel.findByIdAndUser(appId, session.userId);
    if (!existingApp) {
      return NextResponse.json(
        { success: false, message: '企微应用不存在或无权限访问' },
        { status: 404 }
      );
    }

    // 使用用户隔离方法更新
    const updated = await wecomAppModel.updateByUser(appId, session.userId, {
      account_id: body.account_id,
      name: body.name,
      agent_id: body.agent_id,
      secret: body.secret,
      description: body.description,
      status: body.status,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, message: '更新失败，企微应用不存在或无权限' },
        { status: 404 }
      );
    }

    const app = await wecomAppModel.findByIdAndUser(appId, session.userId);

    return NextResponse.json({
      success: true,
      message: '企微应用更新成功',
      data: app,
    });
  } catch (error: any) {
    console.error('Failed to update wecom app:', error);
    
    if (error.code === 'ER_NO_REFERENCED_ROW' || error.code === 'ER_NO_REFERENCED_ROW_2' || error.errno === 1452) {
      return NextResponse.json(
        { success: false, message: '更新失败：所选企微账号不存在' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: '更新企微应用失败', error: error.message || String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/wecom-apps/:id - 删除企微应用
async function deleteWecomAppHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const appId = parseInt(id, 10);

    if (isNaN(appId)) {
      return NextResponse.json(
        { success: false, message: '无效的应用ID' },
        { status: 400 }
      );
    }

    // 使用用户隔离方法删除
    const deleted = await wecomAppModel.removeByUser(appId, session.userId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: '删除失败，企微应用不存在或无权限' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '企微应用删除成功',
    });
  } catch (error: any) {
    console.error('Failed to delete wecom app:', error);
    return NextResponse.json(
      { success: false, message: '删除企微应用失败', error: error.message || String(error) },
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

export const GET = wrapHandler(getWecomAppHandler);
export const PUT = wrapHandler(updateWecomAppHandler);
export const DELETE = wrapHandler(deleteWecomAppHandler);
