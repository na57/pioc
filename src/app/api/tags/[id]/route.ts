import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import * as tagModel from '@/lib/database/models/tag';

const appUrl = '/tags';

// GET /api/tags/:id - 获取标签详情
async function getTagHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tagId = parseInt(id, 10);

    if (isNaN(tagId)) {
      return NextResponse.json(
        { success: false, message: '无效的标签ID' },
        { status: 400 }
      );
    }

    const tag = await tagModel.findByIdAndUserId(tagId, session.userId);

    if (!tag) {
      return NextResponse.json(
        { success: false, message: '标签不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: tag });
  } catch (error) {
    console.error('Failed to fetch tag:', error);
    return NextResponse.json(
      { success: false, message: '获取标签详情失败', error: String(error) },
      { status: 500 }
    );
  }
}

// PUT /api/tags/:id - 更新标签
async function updateTagHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tagId = parseInt(id, 10);

    if (isNaN(tagId)) {
      return NextResponse.json(
        { success: false, message: '无效的标签ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // 检查标签是否存在（且属于当前用户）
    const existingTag = await tagModel.findByIdAndUserId(tagId, session.userId);
    if (!existingTag) {
      return NextResponse.json(
        { success: false, message: '标签不存在' },
        { status: 404 }
      );
    }

    // 如果修改了编码，检查是否与其他标签冲突（当前用户范围内）
    if (body.code && body.code !== existingTag.code) {
      const exists = await tagModel.findByCodeAndUserId(body.code, session.userId);
      if (exists && exists.id !== tagId) {
        return NextResponse.json(
          { success: false, message: '标签编码已存在' },
          { status: 400 }
        );
      }
    }

    await tagModel.update(tagId, {
      name: body.name,
      code: body.code,
      color: body.color,
      description: body.description,
      status: body.status,
      group_ids: body.group_ids,
    });

    const tag = await tagModel.findById(tagId);

    return NextResponse.json({
      success: true,
      message: '标签更新成功',
      data: tag,
    });
  } catch (error) {
    console.error('Failed to update tag:', error);
    return NextResponse.json(
      { success: false, message: '更新标签失败', error: String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/tags/:id - 删除标签
async function deleteTagHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tagId = parseInt(id, 10);

    if (isNaN(tagId)) {
      return NextResponse.json(
        { success: false, message: '无效的标签ID' },
        { status: 400 }
      );
    }

    // 检查标签是否存在（且属于当前用户）
    const existingTag = await tagModel.findByIdAndUserId(tagId, session.userId);
    if (!existingTag) {
      return NextResponse.json(
        { success: false, message: '标签不存在' },
        { status: 404 }
      );
    }

    await tagModel.removeByIdAndUserId(tagId, session.userId);

    return NextResponse.json({
      success: true,
      message: '标签删除成功',
    });
  } catch (error) {
    console.error('Failed to delete tag:', error);
    return NextResponse.json(
      { success: false, message: '删除标签失败', error: String(error) },
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

export const GET = wrapHandler(getTagHandler);
export const PUT = wrapHandler(updateTagHandler);
export const DELETE = wrapHandler(deleteTagHandler);
