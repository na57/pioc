import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import * as tagModel from '@/lib/database/models/tag';

const appUrl = '/tags';

// GET /api/tags - 获取标签列表
async function getTagsHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const name = searchParams.get('name') || undefined;
    const status = searchParams.get('status') ? parseInt(searchParams.get('status')!, 10) : undefined;
    const group_id = searchParams.get('group_id') ? parseInt(searchParams.get('group_id')!, 10) : undefined;

    const { list, total } = await tagModel.findAll({
      page,
      pageSize,
      name,
      status,
      group_id,
    });

    return NextResponse.json({
      success: true,
      data: {
        list,
        pagination: {
          page,
          pageSize,
          total,
        },
      },
    });
  } catch (error) {
    console.error('Failed to fetch tags:', error);
    return NextResponse.json(
      { success: false, message: '获取标签列表失败', error: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/tags - 创建标签
async function createTagHandler(request: NextRequest) {
  try {
    const body = await request.json();

    // 校验必填字段
    if (!body.name || !body.code) {
      return NextResponse.json(
        { success: false, message: '标签名称和编码为必填项' },
        { status: 400 }
      );
    }

    // 检查编码是否已存在
    const exists = await tagModel.isCodeExists(body.code);
    if (exists) {
      return NextResponse.json(
        { success: false, message: '标签编码已存在' },
        { status: 400 }
      );
    }

    const tagId = await tagModel.create({
      name: body.name,
      code: body.code,
      color: body.color,
      description: body.description,
      status: body.status,
      group_ids: body.group_ids,
    });

    const tag = await tagModel.findById(tagId);

    return NextResponse.json(
      { success: true, message: '标签创建成功', data: tag },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create tag:', error);
    return NextResponse.json(
      { success: false, message: '创建标签失败', error: String(error) },
      { status: 500 }
    );
  }
}

export const GET = createAppProtectedHandler(getTagsHandler, appUrl);
export const POST = createAppProtectedHandler(createTagHandler, appUrl);
