/**
 * 数据对象AI问答API
 */

import { NextRequest, NextResponse } from 'next/server';
import { dataObjectAIQueryService } from '@/lib/ai/data-object-query-service';
import { dataObjectSchemaService } from '@/lib/ai/data-object-schema-service';
import { findByIdAccessibleByUserId } from '@/lib/database/models/dataObject';
import { getCurrentUser } from '@/lib/auth/middleware';

// 处理AI问答请求
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dataObjectId = parseInt(id, 10);

    if (isNaN(dataObjectId)) {
      return NextResponse.json(
        { success: false, error: '无效的数据对象ID' },
        { status: 400 }
      );
    }

    // 获取当前用户
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      );
    }

    // 检查用户是否有权限访问该数据对象
    const dataObject = await findByIdAccessibleByUserId(dataObjectId, user.id);
    if (!dataObject) {
      return NextResponse.json(
        { success: false, error: '数据对象不存在或无权限访问' },
        { status: 404 }
      );
    }

    // 获取请求体
    const body = await request.json();
    const { question } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { success: false, error: '问题不能为空' },
        { status: 400 }
      );
    }

    // 处理AI查询
    const result = await dataObjectAIQueryService.processQuery(dataObjectId, question);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[AI Chat API] 处理请求失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '处理请求失败',
        userMessage: '处理请求时出现错误，请稍后重试',
      },
      { status: 500 }
    );
  }
}
