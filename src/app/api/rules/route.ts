import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler, getCurrentUser } from '@/lib/auth/middleware';
import * as ruleModel from '@/lib/database/models/rule';

const appUrl = '/rules';

// GET /api/rules - 获取规则列表
async function getRulesHandler(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const name = searchParams.get('name') || undefined;
    const status = searchParams.get('status') ? parseInt(searchParams.get('status')!) : undefined;

    const result = await ruleModel.findAllAccessibleByUserId(user.id, {
      page,
      pageSize,
      name,
      status,
    });

    return NextResponse.json({
      success: true,
      data: {
        list: result.list,
        pagination: {
          page,
          pageSize,
          total: result.total,
        },
      },
    });
  } catch (error) {
    console.error('Failed to fetch rules:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch rules', error: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/rules - 创建规则
async function createRuleHandler(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, content, status } = body;

    if (!name || !content) {
      return NextResponse.json(
        { success: false, message: 'Name and content are required' },
        { status: 400 }
      );
    }

    // 检查名称是否已存在（同一用户）
    const existingRule = await ruleModel.findByNameAndUserId(name, user.id);
    if (existingRule) {
      return NextResponse.json(
        { success: false, message: 'Rule name already exists' },
        { status: 400 }
      );
    }

    const ruleId = await ruleModel.create({
      name,
      description,
      content,
      status: status ?? 1,
      created_by: user.id,
    });

    return NextResponse.json(
      { success: true, data: { id: ruleId } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create rule:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create rule', error: String(error) },
      { status: 500 }
    );
  }
}

export const GET = createAppProtectedHandler(getRulesHandler, appUrl);
export const POST = createAppProtectedHandler(createRuleHandler, appUrl);
