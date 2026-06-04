import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler, getCurrentUser } from '@/lib/auth/middleware';
import * as ruleModel from '@/lib/database/models/rule';

const appUrl = '/rules';

// GET /api/rules/accessible - 获取当前用户可访问的规则列表（用于下拉选择）
async function getAccessibleRulesHandler(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name') || undefined;

    // 获取所有可访问的规则（创建的 + 被共享的），不分页
    const result = await ruleModel.findAllAccessibleByUserId(user.id, {
      page: 1,
      pageSize: 1000, // 获取足够多的规则用于下拉选择
      name,
      status: 1, // 只获取启用的规则
    });

    // 简化返回数据，只保留必要字段
    const simplifiedList = result.list.map(rule => ({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      isShared: rule.is_shared,
      sharedByName: rule.shared_by_name,
    }));

    return NextResponse.json({
      success: true,
      data: simplifiedList,
    });
  } catch (error) {
    console.error('Failed to fetch accessible rules:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch accessible rules', error: String(error) },
      { status: 500 }
    );
  }
}

export const GET = createAppProtectedHandler(getAccessibleRulesHandler, appUrl);
