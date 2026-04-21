import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler, getCurrentUser } from '@/lib/auth/middleware';
import * as dataObjectModel from '@/lib/database/models/dataObject';
import * as dataObjectShareModel from '@/lib/database/models/dataObjectShare';

const appUrl = '/data-objects';

// DELETE /api/data-objects/:id/shares/:userId - 删除分享
async function removeShareHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id, userId: sharedToUserId } = await params;
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
        { success: false, message: 'Only creator can remove shares' },
        { status: 403 }
      );
    }

    // 删除分享
    const removed = await dataObjectShareModel.removeShare(dataObjectId, Number(sharedToUserId));
    if (!removed) {
      return NextResponse.json(
        { success: false, message: 'Failed to remove share' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to remove share', error: String(error) },
      { status: 500 }
    );
  }
}

type HandlerFunction = (req: NextRequest, ctx: { params: Promise<{ id: string; userId: string }> }) => Promise<NextResponse>;

const wrapHandler = (handler: HandlerFunction) => {
  return async (request: NextRequest, context: { params: Promise<{ id: string; userId: string }> }) => {
    const protectedHandler = createAppProtectedHandler(
      (req: NextRequest) => handler(req, context),
      appUrl
    );
    return protectedHandler(request, context);
  };
};

export const DELETE = wrapHandler(removeShareHandler);
