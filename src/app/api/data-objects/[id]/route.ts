import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import * as dataObjectModel from '@/lib/database/models/dataObject';

const appUrl = '/data-objects';

// GET /api/data-objects/:id - 获取数据对象详情
async function getHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dataObjectId = parseInt(id);

    if (isNaN(dataObjectId)) {
      return NextResponse.json(
        { success: false, message: '无效的数据对象ID' },
        { status: 400 }
      );
    }

    const dataObject = await dataObjectModel.findByIdAccessibleByUserId(dataObjectId, session.userId);

    if (!dataObject) {
      return NextResponse.json(
        { success: false, message: '数据对象不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: dataObject,
    });
  } catch (error) {
    console.error('获取数据对象详情失败:', error);
    return NextResponse.json(
      { success: false, message: '获取数据对象详情失败', error: String(error) },
      { status: 500 }
    );
  }
}

// PUT /api/data-objects/:id - 更新数据对象
async function putHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dataObjectId = parseInt(id);

    if (isNaN(dataObjectId)) {
      return NextResponse.json(
        { success: false, message: '无效的数据对象ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // 检查数据对象是否存在（且属于当前用户）
    const existing = await dataObjectModel.findByIdAndUserId(dataObjectId, session.userId);
    if (!existing) {
      return NextResponse.json(
        { success: false, message: '数据对象不存在' },
        { status: 404 }
      );
    }

    // 如果修改了名称，检查是否与其他数据对象冲突（当前用户范围内）
    if (body.name && body.name !== existing.name) {
      const nameExists = await dataObjectModel.findByNameAndUserId(body.name, session.userId);
      if (nameExists && nameExists.id !== dataObjectId) {
        return NextResponse.json(
          { success: false, message: '数据对象名称已存在' },
          { status: 400 }
        );
      }
    }

    // 更新数据对象
    const updated = await dataObjectModel.update(dataObjectId, {
      name: body.name,
      description: body.description,
      data_source_id: body.data_source_id,
      query_statement: body.query_statement,
      primary_key: body.primary_key,
      display_template: body.display_template,
      status: body.status,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, message: '更新数据对象失败' },
        { status: 500 }
      );
    }

    const dataObject = await dataObjectModel.findById(dataObjectId);

    return NextResponse.json({
      success: true,
      message: '数据对象更新成功',
      data: dataObject,
    });
  } catch (error) {
    console.error('更新数据对象失败:', error);
    return NextResponse.json(
      { success: false, message: '更新数据对象失败', error: String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/data-objects/:id - 删除数据对象
async function deleteHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dataObjectId = parseInt(id);

    if (isNaN(dataObjectId)) {
      return NextResponse.json(
        { success: false, message: '无效的数据对象ID' },
        { status: 400 }
      );
    }

    // 检查数据对象是否存在（且属于当前用户）
    const existing = await dataObjectModel.findByIdAndUserId(dataObjectId, session.userId);
    if (!existing) {
      return NextResponse.json(
        { success: false, message: '数据对象不存在' },
        { status: 404 }
      );
    }

    // 删除数据对象
    const deleted = await dataObjectModel.removeByIdAndUserId(dataObjectId, session.userId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: '删除数据对象失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '数据对象删除成功',
    });
  } catch (error) {
    console.error('删除数据对象失败:', error);
    return NextResponse.json(
      { success: false, message: '删除数据对象失败', error: String(error) },
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

export const GET = wrapHandler(getHandler);
export const PUT = wrapHandler(putHandler);
export const DELETE = wrapHandler(deleteHandler);
