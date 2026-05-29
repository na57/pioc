/**
 * 数据对象Schema管理API
 */

import { NextRequest, NextResponse } from 'next/server';
import { dataObjectSchemaService } from '@/lib/ai/data-object-schema-service';
import { findByIdAccessibleByUserId } from '@/lib/database/models/dataObject';
import { getCurrentUser } from '@/lib/auth/middleware';

// 获取Schema
export async function GET(
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

    // 获取Schema
    const result = await dataObjectSchemaService.getSchema(dataObjectId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[AI Schema API] 获取Schema失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '获取Schema失败',
      },
      { status: 500 }
    );
  }
}

// 重新生成Schema
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

    // 检查用户是否有权限访问该数据对象（只有创建者可以重新生成）
    const dataObject = await findByIdAccessibleByUserId(dataObjectId, user.id);
    if (!dataObject) {
      return NextResponse.json(
        { success: false, error: '数据对象不存在或无权限访问' },
        { status: 404 }
      );
    }

    // 检查是否是创建者
    if (dataObject.created_by !== user.id) {
      return NextResponse.json(
        { success: false, error: '只有创建者可以重新生成Schema' },
        { status: 403 }
      );
    }

    // 重新生成Schema
    const result = await dataObjectSchemaService.generateSchema(dataObjectId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[AI Schema API] 重新生成Schema失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '重新生成Schema失败',
      },
      { status: 500 }
    );
  }
}

// 更新Schema（手动编辑）
export async function PUT(
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

    // 检查是否是创建者
    if (dataObject.created_by !== user.id) {
      return NextResponse.json(
        { success: false, error: '只有创建者可以编辑Schema' },
        { status: 403 }
      );
    }

    // 获取请求体
    const body = await request.json();
    const { schema } = body;

    if (!schema || typeof schema !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Schema内容不能为空' },
        { status: 400 }
      );
    }

    // 更新Schema
    const result = await dataObjectSchemaService.updateSchema(dataObjectId, schema);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[AI Schema API] 更新Schema失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '更新Schema失败',
      },
      { status: 500 }
    );
  }
}
