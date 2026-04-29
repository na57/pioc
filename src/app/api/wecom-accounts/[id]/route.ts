import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import * as wecomAccountModel from '@/lib/database/models/wecomAccount';

const appUrl = '/wecom-accounts';

// GET /api/wecom-accounts/:id - 获取企微账号详情
async function getWecomAccountHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const accountId = parseInt(id, 10);

    if (isNaN(accountId)) {
      return NextResponse.json(
        { success: false, message: '无效的账号ID' },
        { status: 400 }
      );
    }

    // 使用用户隔离的方法查询
    const account = await wecomAccountModel.findByIdAndUser(accountId, session.userId);

    if (!account) {
      return NextResponse.json(
        { success: false, message: '企微账号不存在或无权限访问' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: account });
  } catch (error) {
    console.error('Failed to fetch wecom account:', error);
    return NextResponse.json(
      { success: false, message: '获取企微账号详情失败', error: String(error) },
      { status: 500 }
    );
  }
}

// PUT /api/wecom-accounts/:id - 更新企微账号
async function updateWecomAccountHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const accountId = parseInt(id, 10);

    if (isNaN(accountId)) {
      return NextResponse.json(
        { success: false, message: '无效的账号ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // 检查账号是否存在（使用用户隔离方法）
    const existingAccount = await wecomAccountModel.findByIdAndUser(accountId, session.userId);
    if (!existingAccount) {
      return NextResponse.json(
        { success: false, message: '企微账号不存在或无权限访问' },
        { status: 404 }
      );
    }

    // 如果修改了corp_id，检查是否与其他账号冲突
    if (body.corp_id && body.corp_id !== existingAccount.corp_id) {
      const exists = await wecomAccountModel.checkCorpIdExists(body.corp_id, accountId);
      if (exists) {
        return NextResponse.json(
          { success: false, message: `CorpId "${body.corp_id}" 已存在` },
          { status: 400 }
        );
      }
    }

    // 使用用户隔离方法更新
    const updated = await wecomAccountModel.updateByUser(accountId, session.userId, {
      name: body.name,
      corp_id: body.corp_id,
      corp_secret: body.corp_secret,
      description: body.description,
      status: body.status,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, message: '更新失败，企微账号不存在或无权限' },
        { status: 404 }
      );
    }

    const account = await wecomAccountModel.findByIdAndUser(accountId, session.userId);

    return NextResponse.json({
      success: true,
      message: '企微账号更新成功',
      data: account,
    });
  } catch (error: any) {
    console.error('Failed to update wecom account:', error);
    
    // 处理数据库唯一约束错误
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return NextResponse.json(
        { 
          success: false, 
          message: '更新失败：CorpId已存在',
        },
        { status: 400 }
      );
    }
    
    // 处理字段长度错误
    if (error.code === 'ER_DATA_TOO_LONG' || error.errno === 1406) {
      return NextResponse.json(
        { 
          success: false, 
          message: '更新失败：输入内容过长',
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: '更新企微账号失败，请稍后重试', error: error.message || String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/wecom-accounts/:id - 删除企微账号
async function deleteWecomAccountHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const accountId = parseInt(id, 10);

    if (isNaN(accountId)) {
      return NextResponse.json(
        { success: false, message: '无效的账号ID' },
        { status: 400 }
      );
    }

    // 使用用户隔离方法删除
    const deleted = await wecomAccountModel.removeByUser(accountId, session.userId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: '删除失败，企微账号不存在或无权限' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '企微账号删除成功',
    });
  } catch (error: any) {
    console.error('Failed to delete wecom account:', error);
    return NextResponse.json(
      { success: false, message: '删除企微账号失败，请稍后重试', error: error.message || String(error) },
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

export const GET = wrapHandler(getWecomAccountHandler);
export const PUT = wrapHandler(updateWecomAccountHandler);
export const DELETE = wrapHandler(deleteWecomAccountHandler);
