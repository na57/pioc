import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import * as tagModel from '@/lib/database/models/tag';
import * as tagGroupModel from '@/lib/database/models/tagGroup';
import { query } from '@/lib/database/connection';

const appUrl = '/tags';

// 检查用户是否可以访问标签组（创建者或打标作业协作者）
async function checkUserCanAccessTagGroup(groupId: number, userId: number): Promise<boolean> {
  // 检查是否是创建者
  const group = await tagGroupModel.findByIdAndUserId(groupId, userId);
  if (group) return true;

  // 检查是否是引用了该标签组的打标作业的协作者
  const results = await query<{ count: number }[]>(`
    SELECT COUNT(*) as count FROM pioc_labeling_tasks lt
    JOIN pioc_labeling_task_collaborators ltc ON lt.id = ltc.task_id
    WHERE lt.tag_group_id = ? AND ltc.user_id = ?
  `, [groupId, userId]);

  return results[0]?.count > 0;
}

// GET /api/tags - 获取标签列表
async function getTagsHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string }
) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const name = searchParams.get('name') || undefined;
    const status = searchParams.get('status') ? parseInt(searchParams.get('status')!, 10) : undefined;
    const group_id = searchParams.get('group_id') ? parseInt(searchParams.get('group_id')!, 10) : undefined;

    // 如果指定了 group_id，检查用户是否有权限访问该标签组
    if (group_id) {
      const canAccess = await checkUserCanAccessTagGroup(group_id, session.userId);
      if (!canAccess) {
        return NextResponse.json(
          { success: false, message: '没有权限访问该标签组' },
          { status: 403 }
        );
      }
      // 有权限时，不限制 createdBy，返回该标签组下的所有标签
      const { list, total } = await tagModel.findAll({
        page,
        pageSize,
        name,
        status,
        group_id,
        // 不传递 createdBy，获取该标签组下的所有标签
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
    }

    // 没有指定 group_id 时，只返回当前用户创建的标签
    const { list, total } = await tagModel.findAll({
      page,
      pageSize,
      name,
      status,
      createdBy: session.userId,
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
async function createTagHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string }
) {
  let body: any = {};
  try {
    body = await request.json();

    // 校验必填字段
    if (!body.name || !body.code) {
      return NextResponse.json(
        { success: false, message: '标签名称和编码为必填项' },
        { status: 400 }
      );
    }

    // 校验编码格式
    const codePattern = /^[a-zA-Z0-9_]+$/;
    if (!codePattern.test(body.code)) {
      return NextResponse.json(
        { success: false, message: '标签编码只能包含字母、数字和下划线' },
        { status: 400 }
      );
    }

    // 检查编码是否已存在（当前用户范围内）
    const exists = await tagModel.findByCodeAndUserId(body.code, session.userId);
    if (exists) {
      return NextResponse.json(
        { success: false, message: `标签编码 "${body.code}" 已存在，请使用其他编码` },
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
      created_by: session.userId,
    });

    const tag = await tagModel.findById(tagId);

    return NextResponse.json(
      { success: true, message: '标签创建成功', data: tag },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Failed to create tag:', error);
    
    // 处理数据库唯一约束错误
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      // 提取重复字段信息
      const errorMessage = error.message || '';
      let fieldName = '编码';
      let fieldValue = body?.code || '';
      
      if (errorMessage.includes('uk_code')) {
        fieldName = '编码';
        fieldValue = body?.code;
      }
      
      return NextResponse.json(
        { 
          success: false, 
          message: `创建失败：标签${fieldName} "${fieldValue}" 已存在`,
          suggestion: '请修改标签编码后重试，或使用其他唯一标识'
        },
        { status: 400 }
      );
    }
    
    // 处理外键约束错误
    if (error.code === 'ER_NO_REFERENCED_ROW' || error.code === 'ER_NO_REFERENCED_ROW_2' || error.errno === 1452) {
      return NextResponse.json(
        { 
          success: false, 
          message: '创建失败：所选分组不存在或已被删除',
          suggestion: '请刷新页面后重新选择分组'
        },
        { status: 400 }
      );
    }
    
    // 处理字段长度错误
    if (error.code === 'ER_DATA_TOO_LONG' || error.errno === 1406) {
      return NextResponse.json(
        { 
          success: false, 
          message: '创建失败：输入内容过长',
          suggestion: '标签名称最多100字符，编码最多50字符，请精简后重试'
        },
        { status: 400 }
      );
    }
    
    // 通用错误
    return NextResponse.json(
      { 
        success: false, 
        message: '创建标签失败，请稍后重试',
        error: error.message || String(error)
      },
      { status: 500 }
    );
  }
}

export const GET = createAppProtectedHandler(getTagsHandler, appUrl);
export const POST = createAppProtectedHandler(createTagHandler, appUrl);
