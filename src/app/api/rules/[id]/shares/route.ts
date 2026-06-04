import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler, getCurrentUser } from '@/lib/auth/middleware';
import * as ruleModel from '@/lib/database/models/rule';
import * as ruleShareModel from '@/lib/database/models/ruleShare';
import * as userModel from '@/lib/database/models/user';

const appUrl = '/rules';

// GET /api/rules/:id/shares - 获取规则的分享列表
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
    const ruleId = Number(id);

    // 检查用户是否可以访问该规则
    const canAccess = await ruleShareModel.checkUserCanAccess(ruleId, user.id);
    if (!canAccess) {
      return NextResponse.json(
        { success: false, message: 'No permission to access this rule' },
        { status: 403 }
      );
    }

    const shares = await ruleShareModel.findSharesByRuleId(ruleId);
    return NextResponse.json({ success: true, data: shares });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch shares', error: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/rules/:id/shares - 添加分享
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
    const ruleId = Number(id);

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
        { success: false, message: 'Only creator can share rule' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { user_id, user_identifier } = body;

    // 支持 user_id (数字) 或 user_identifier (用户名/ID)
    const identifier = user_identifier || user_id;
    if (!identifier) {
      return NextResponse.json(
        { success: false, message: 'User identifier is required' },
        { status: 400 }
      );
    }

    // 检查用户是否存在（先尝试作为ID查找，再尝试作为用户名查找）
    let targetUser = null;
    const numericId = Number(identifier);
    if (!isNaN(numericId) && numericId > 0) {
      targetUser = await userModel.findById(numericId);
    }
    if (!targetUser) {
      targetUser = await userModel.findByUsername(String(identifier));
    }

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const targetUserId = targetUser.id;

    // 不能分享给自己
    if (targetUserId === user.id) {
      return NextResponse.json(
        { success: false, message: 'Cannot share to yourself' },
        { status: 400 }
      );
    }

    // 检查是否已经分享过
    const alreadyShared = await ruleShareModel.checkUserHasShared(ruleId, targetUserId);
    if (alreadyShared) {
      return NextResponse.json(
        { success: false, message: 'User is already shared this rule' },
        { status: 400 }
      );
    }

    // 创建分享
    const shareId = await ruleShareModel.createShare(ruleId, user.id, targetUserId);

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
