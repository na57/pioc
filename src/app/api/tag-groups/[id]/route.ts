import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import * as tagGroupModel from '@/lib/database/models/tagGroup';

const appUrl = '/tags';

// GET /api/tag-groups/:id - 获取分组详情
async function getTagGroupHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const groupId = parseInt(id, 10);

    if (isNaN(groupId)) {
      return NextResponse.json(
        { success: false, message: '无效的分组ID' },
        { status: 400 }
      );
    }

    const group = await tagGroupModel.findByIdAndUserId(groupId, session.userId);

    if (!group) {
      return NextResponse.json(
        { success: false, message: '分组不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: group });
  } catch (error) {
    console.error('Failed to fetch tag group:', error);
    return NextResponse.json(
      { success: false, message: '获取分组详情失败', error: String(error) },
      { status: 500 }
    );
  }
}

// PUT /api/tag-groups/:id - 更新分组
async function updateTagGroupHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const groupId = parseInt(id, 10);

    if (isNaN(groupId)) {
      return NextResponse.json(
        { success: false, message: '无效的分组ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // 检查分组是否存在（且属于当前用户）
    const existingGroup = await tagGroupModel.findByIdAndUserId(groupId, session.userId);
    if (!existingGroup) {
      return NextResponse.json(
        { success: false, message: '分组不存在' },
        { status: 404 }
      );
    }

    // 如果修改了编码，检查是否与其他分组冲突（当前用户范围内）
    if (body.code && body.code !== existingGroup.code) {
      const exists = await tagGroupModel.findByCodeAndUserId(body.code, session.userId);
      if (exists && exists.id !== groupId) {
        return NextResponse.json(
          { success: false, message: '分组编码已存在' },
          { status: 400 }
        );
      }
    }

    await tagGroupModel.update(groupId, {
      name: body.name,
      code: body.code,
      description: body.description,
      color: body.color,
      sort_order: body.sort_order,
      status: body.status,
    });

    const group = await tagGroupModel.findById(groupId);

    return NextResponse.json({
      success: true,
      message: '分组更新成功',
      data: group,
    });
  } catch (error) {
    console.error('Failed to update tag group:', error);
    return NextResponse.json(
      { success: false, message: '更新分组失败', error: String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/tag-groups/:id - 删除分组
async function deleteTagGroupHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const groupId = parseInt(id, 10);

    if (isNaN(groupId)) {
      return NextResponse.json(
        { success: false, message: '无效的分组ID' },
        { status: 400 }
      );
    }

    // 检查分组是否存在（且属于当前用户）
    const existingGroup = await tagGroupModel.findByIdAndUserId(groupId, session.userId);
    if (!existingGroup) {
      return NextResponse.json(
        { success: false, message: '分组不存在' },
        { status: 404 }
      );
    }

    await tagGroupModel.removeByIdAndUserId(groupId, session.userId);

    return NextResponse.json({
      success: true,
      message: '分组删除成功',
    });
  } catch (error) {
    console.error('Failed to delete tag group:', error);
    return NextResponse.json(
      { success: false, message: '删除分组失败', error: String(error) },
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

export const GET = wrapHandler(getTagGroupHandler);
export const PUT = wrapHandler(updateTagGroupHandler);
export const DELETE = wrapHandler(deleteTagGroupHandler);
