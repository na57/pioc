import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import * as tagGroupModel from '@/lib/database/models/tagGroup';

const appUrl = '/tags';

// GET /api/tag-groups - 获取分组列表
async function getTagGroupsHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const name = searchParams.get('name') || undefined;
    const status = searchParams.get('status') ? parseInt(searchParams.get('status')!, 10) : undefined;
    const all = searchParams.get('all') === 'true'; // 是否返回所有分组（不分页）

    if (all) {
      // 返回所有启用的分组（用于下拉选择）
      const list = await tagGroupModel.findAllActive();
      return NextResponse.json({
        success: true,
        data: { list },
      });
    }

    const { list, total } = await tagGroupModel.findAll({
      page,
      pageSize,
      name,
      status,
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
    console.error('Failed to fetch tag groups:', error);
    return NextResponse.json(
      { success: false, message: '获取分组列表失败', error: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/tag-groups - 创建分组
async function createTagGroupHandler(request: NextRequest) {
  try {
    const body = await request.json();

    // 校验必填字段
    if (!body.name || !body.code) {
      return NextResponse.json(
        { success: false, message: '分组名称和编码为必填项' },
        { status: 400 }
      );
    }

    // 检查编码是否已存在
    const exists = await tagGroupModel.isCodeExists(body.code);
    if (exists) {
      return NextResponse.json(
        { success: false, message: '分组编码已存在' },
        { status: 400 }
      );
    }

    const groupId = await tagGroupModel.create({
      name: body.name,
      code: body.code,
      description: body.description,
      color: body.color,
      sort_order: body.sort_order,
      status: body.status,
    });

    const group = await tagGroupModel.findById(groupId);

    return NextResponse.json(
      { success: true, message: '分组创建成功', data: group },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create tag group:', error);
    return NextResponse.json(
      { success: false, message: '创建分组失败', error: String(error) },
      { status: 500 }
    );
  }
}

export const GET = createAppProtectedHandler(getTagGroupsHandler, appUrl);
export const POST = createAppProtectedHandler(createTagGroupHandler, appUrl);
