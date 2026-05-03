import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler, getCurrentUser } from '@/lib/auth/middleware';
import * as dataSourceModel from '@/lib/database/models/dataSource';
import * as dataSourceShareModel from '@/lib/database/models/dataSourceShare';

const appUrl = '/data-sources';

// DELETE /api/data-sources/:id/shares/:userId - 删除分享
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
    const dataSourceId = Number(id);

    // 检查数据源是否存在
    const dataSource = await dataSourceModel.findById(String(dataSourceId));
    if (!dataSource) {
      return NextResponse.json(
        { success: false, message: 'Data source not found' },
        { status: 404 }
      );
    }

    // 检查当前用户是否是数据源的创建者
    if (dataSource.created_by !== user.id) {
      return NextResponse.json(
        { success: false, message: 'Only creator can remove shares' },
        { status: 403 }
      );
    }

    // 删除分享
    const removed = await dataSourceShareModel.removeShare(dataSourceId, Number(sharedToUserId));
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
