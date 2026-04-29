import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import * as wecomAccountModel from '@/lib/database/models/wecomAccount';

const appUrl = '/wecom-accounts';

// GET /api/wecom-accounts - 获取企微账号列表
async function getWecomAccountsHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string }
) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const name = searchParams.get('name') || undefined;
    const corp_id = searchParams.get('corp_id') || undefined;
    const status = searchParams.get('status') ? parseInt(searchParams.get('status')!, 10) : undefined;
    const all = searchParams.get('all') === 'true';

    const filters: wecomAccountModel.WecomAccountFilters = {
      created_by: session.userId, // 用户隔离：只查询当前用户的数据
    };
    if (name) filters.name = name;
    if (corp_id) filters.corp_id = corp_id;
    if (status !== undefined) filters.status = status;

    if (all) {
      // 返回所有账号（不分页）
      const list = await wecomAccountModel.findAllWithoutPagination(filters);
      return NextResponse.json({
        success: true,
        data: { list },
      });
    }

    // 分页查询
    const { list, total } = await wecomAccountModel.findAll(page, pageSize, filters);

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
    console.error('Failed to fetch wecom accounts:', error);
    return NextResponse.json(
      { success: false, message: '获取企微账号列表失败', error: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/wecom-accounts - 创建企微账号
async function createWecomAccountHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string }
) {
  let body: any = {};
  try {
    body = await request.json();

    // 校验必填字段
    if (!body.name || !body.corp_id) {
      return NextResponse.json(
        { success: false, message: '账号名称和CorpId为必填项' },
        { status: 400 }
      );
    }

    // 检查CorpId是否已存在
    const exists = await wecomAccountModel.checkCorpIdExists(body.corp_id);
    if (exists) {
      return NextResponse.json(
        { success: false, message: `CorpId "${body.corp_id}" 已存在` },
        { status: 400 }
      );
    }

    const accountId = await wecomAccountModel.create({
      name: body.name,
      corp_id: body.corp_id,
      corp_secret: body.corp_secret,
      description: body.description,
      status: body.status ?? 1,
      created_by: session.userId,
    });

    const account = await wecomAccountModel.findById(accountId);

    return NextResponse.json(
      { success: true, message: '企微账号创建成功', data: account },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Failed to create wecom account:', error);
    
    // 处理数据库唯一约束错误
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return NextResponse.json(
        { 
          success: false, 
          message: `创建失败：CorpId "${body?.corp_id}" 已存在`,
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
        },
        { status: 400 }
      );
    }
    
    // 通用错误
    return NextResponse.json(
      { 
        success: false, 
        message: '创建企微账号失败，请稍后重试',
        error: error.message || String(error)
      },
      { status: 500 }
    );
  }
}

export const GET = createAppProtectedHandler(getWecomAccountsHandler, appUrl);
export const POST = createAppProtectedHandler(createWecomAccountHandler, appUrl);
