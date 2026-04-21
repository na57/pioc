import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler, getCurrentUser } from '@/lib/auth/middleware';
import * as dataObjectModel from '@/lib/database/models/dataObject';
import * as dataObjectShareModel from '@/lib/database/models/dataObjectShare';
import * as userModel from '@/lib/database/models/user';

const appUrl = '/data-objects';

// GET /api/data-objects/:id/shares - 获取数据对象的分享列表
async function getSharesHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const dataObjectId = Number(id);

    // 检查用户是否可以访问该数据对象
    const canAccess = await dataObjectShareModel.checkUserCanAccess(dataObjectId, user.id);
    if (!canAccess) {
      return NextResponse.json(
        { success: false, message: 'No permission to access this data object' },
        { status: 403 }
      );
    }

    const shares = await dataObjectShareModel.findSharesByDataObjectId(dataObjectId);
    return NextResponse.json({ success: true, data: shares });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch shares', error: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/data-objects/:id/shares - 添加分享
async function addShareHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const dataObjectId = Number(id);

    // 检查数据对象是否存在
    const dataObject = await dataObjectModel.findById(dataObjectId);
    if (!dataObject) {
      return NextResponse.json(
        { success: false, message: 'Data object not found' },
        { status: 404 }
      );
    }

    // 检查当前用户是否是数据对象的所有者
    if (dataObject.created_by !== user.id) {
      return NextResponse.json(
        { success: false, message: 'Only creator can share data object' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    // 检查用户是否存在
    const targetUser = await userModel.findById(Number(user_id));
    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // 不能分享给自己
    if (Number(user_id) === user.id) {
      return NextResponse.json(
        { success: false, message: 'Cannot share to yourself' },
        { status: 400 }
      );
    }

    // 检查是否已经分享过
    const alreadyShared = await dataObjectShareModel.checkUserHasShared(dataObjectId, Number(user_id));
    if (alreadyShared) {
      return NextResponse.json(
        { success: false, message: 'User is already shared this data object' },
        { status: 400 }
      );
    }

    // 创建分享
    const shareId = await dataObjectShareModel.createShare(dataObjectId, user.id, Number(user_id));

    return NextResponse.json(
      { success: true, data: { id: shareId } },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to add share', error: String(error) },
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

export const GET = wrapHandler(getSharesHandler);
export const POST = wrapHandler(addShareHandler);
