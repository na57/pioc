import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler, getCurrentUser } from '@/lib/auth/middleware';
import * as ruleModel from '@/lib/database/models/rule';

const appUrl = '/rules';

// GET /api/rules/:id - 获取规则详情
async function getRuleHandler(
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

    const rule = await ruleModel.findByIdAccessibleByUserId(ruleId, user.id);
    if (!rule) {
      return NextResponse.json(
        { success: false, message: 'Rule not found or no permission' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: rule });
  } catch (error) {
    console.error('Failed to fetch rule:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch rule', error: String(error) },
      { status: 500 }
    );
  }
}

// PUT /api/rules/:id - 更新规则
async function updateRuleHandler(
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

    // 检查规则是否存在且属于当前用户
    const existingRule = await ruleModel.findByIdAndUserId(ruleId, user.id);
    if (!existingRule) {
      return NextResponse.json(
        { success: false, message: 'Rule not found or no permission' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, description, content, status } = body;

    // 如果修改名称，检查是否与其他规则冲突
    if (name && name !== existingRule.name) {
      const nameExists = await ruleModel.findByNameAndUserId(name, user.id);
      if (nameExists && nameExists.id !== ruleId) {
        return NextResponse.json(
          { success: false, message: 'Rule name already exists' },
          { status: 400 }
        );
      }
    }

    const updated = await ruleModel.update(ruleId, {
      name,
      description,
      content,
      status,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, message: 'Failed to update rule' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Rule updated successfully' });
  } catch (error) {
    console.error('Failed to update rule:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update rule', error: String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/rules/:id - 删除规则
async function deleteRuleHandler(
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

    // 只能删除自己创建的规则
    const deleted = await ruleModel.removeByIdAndUserId(ruleId, user.id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, message: 'Rule not found or no permission' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Rule deleted successfully' });
  } catch (error) {
    console.error('Failed to delete rule:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete rule', error: String(error) },
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

export const GET = wrapHandler(getRuleHandler);
export const PUT = wrapHandler(updateRuleHandler);
export const DELETE = wrapHandler(deleteRuleHandler);
