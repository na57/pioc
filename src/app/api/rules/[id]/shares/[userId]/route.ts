import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler, getCurrentUser } from '@/lib/auth/middleware';
import * as ruleModel from '@/lib/database/models/rule';
import * as ruleShareModel from '@/lib/database/models/ruleShare';

const appUrl = '/rules';

// DELETE /api/rules/:id/shares/:userId - 删除分享
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

    const { id, userId: targetUserId } = await params;
    const ruleId = Number(id);
    const sharedToUserId = Number(targetUserId);

    // 检查规则是否存在
    const rule = await ruleModel.findById(ruleId);
    if (!rule) {
      return NextResponse.json(
        { success: false, message: 'Rule not found' },
        { status: 404 }
      );
    }

    // 检查当前用户是否是规则的所有者
    if (rule.created_by !== user.id) {
      return NextResponse.json(
        { success: false, message: 'Only creator can manage shares' },
        { status: 403 }
      );
    }

    // 删除分享
    const removed = await ruleShareModel.removeShare(ruleId, sharedToUserId);
    if (!removed) {
      return NextResponse.json(
        { success: false, message: 'Share not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Share removed successfully' });
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
