import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import * as dataObjectModel from '@/lib/database/models/dataObject';
import * as dataSourceModel from '@/lib/database/models/dataSource';

const appUrl = '/data-objects';

// GET /api/data-objects - 获取数据对象列表
async function getHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string }
) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const name = searchParams.get('name') || undefined;
    const dataSourceId = searchParams.get('dataSourceId') || undefined;
    const status = searchParams.get('status') ? parseInt(searchParams.get('status')!) : undefined;

    const result = await dataObjectModel.findAll({
      page,
      pageSize,
      name,
      dataSourceId,
      status,
      createdBy: session.userId,
    });

    return NextResponse.json({
      success: true,
      data: {
        list: result.list,
        pagination: {
          page,
          pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / pageSize),
        },
      },
    });
  } catch (error) {
    console.error('获取数据对象列表失败:', error);
    return NextResponse.json(
      { success: false, message: '获取数据对象列表失败', error: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/data-objects - 创建数据对象
async function postHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string }
) {
  try {
    const body = await request.json();

    // 验证必填字段
    if (!body.name || !body.data_source_id || !body.query_statement || !body.primary_key) {
      return NextResponse.json(
        { success: false, message: '缺少必填字段' },
        { status: 400 }
      );
    }

    // 检查数据源是否存在（且属于当前用户）
    const dataSource = await dataSourceModel.findByIdAndUserId(body.data_source_id, session.userId);
    if (!dataSource) {
      return NextResponse.json(
        { success: false, message: '数据源不存在或无权限访问' },
        { status: 404 }
      );
    }

    // 检查名称是否已存在（当前用户范围内）
    const existing = await dataObjectModel.findByNameAndUserId(body.name, session.userId);
    if (existing) {
      return NextResponse.json(
        { success: false, message: '数据对象名称已存在' },
        { status: 400 }
      );
    }

    // 创建数据对象
    const id = await dataObjectModel.create({
      name: body.name,
      description: body.description,
      data_source_id: body.data_source_id,
      query_statement: body.query_statement,
      primary_key: body.primary_key,
      display_template: body.display_template,
      status: body.status ?? 1,
      created_by: session.userId,
    });

    const dataObject = await dataObjectModel.findById(id);

    return NextResponse.json(
      { success: true, message: '数据对象创建成功', data: dataObject },
      { status: 201 }
    );
  } catch (error) {
    console.error('创建数据对象失败:', error);
    return NextResponse.json(
      { success: false, message: '创建数据对象失败', error: String(error) },
      { status: 500 }
    );
  }
}

export const GET = createAppProtectedHandler(getHandler, appUrl);
export const POST = createAppProtectedHandler(postHandler, appUrl);
