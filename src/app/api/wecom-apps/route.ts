import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import * as wecomAppModel from '@/lib/database/models/wecomApp';

const appUrl = '/wecom-apps';

// GET /api/wecom-apps - 获取企微应用列表
async function getWecomAppsHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string }
) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const account_id = searchParams.get('account_id') ? parseInt(searchParams.get('account_id')!, 10) : undefined;
    const name = searchParams.get('name') || undefined;
    const agent_id = searchParams.get('agent_id') || undefined;
    const status = searchParams.get('status') ? parseInt(searchParams.get('status')!, 10) : undefined;
    const all = searchParams.get('all') === 'true';

    const filters: wecomAppModel.WecomAppFilters = {};
    if (account_id) filters.account_id = account_id;
    if (name) filters.name = name;
    if (agent_id) filters.agent_id = agent_id;
    if (status !== undefined) filters.status = status;

    if (all) {
      const list = await wecomAppModel.findAllWithoutPagination(filters);
      return NextResponse.json({
        success: true,
        data: { list },
      });
    }

    const { list, total } = await wecomAppModel.findAll(page, pageSize, filters);

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
    console.error('Failed to fetch wecom apps:', error);
    return NextResponse.json(
      { success: false, message: '获取企微应用列表失败', error: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/wecom-apps - 创建企微应用
async function createWecomAppHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string }
) {
  let body: any = {};
  try {
    body = await request.json();

    if (!body.account_id || !body.name || !body.agent_id) {
      return NextResponse.json(
        { success: false, message: '所属账号、应用名称和AgentId为必填项' },
        { status: 400 }
      );
    }

    const appId = await wecomAppModel.create({
      account_id: body.account_id,
      name: body.name,
      agent_id: body.agent_id,
      secret: body.secret,
      description: body.description,
      status: body.status ?? 1,
      created_by: session.userId,
    });

    const app = await wecomAppModel.findById(appId);

    return NextResponse.json(
      { success: true, message: '企微应用创建成功', data: app },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Failed to create wecom app:', error);
    
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return NextResponse.json(
        { success: false, message: '创建失败：应用已存在' },
        { status: 400 }
      );
    }
    
    if (error.code === 'ER_NO_REFERENCED_ROW' || error.code === 'ER_NO_REFERENCED_ROW_2' || error.errno === 1452) {
      return NextResponse.json(
        { success: false, message: '创建失败：所选企微账号不存在' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: '创建企微应用失败', error: error.message || String(error) },
      { status: 500 }
    );
  }
}

export const GET = createAppProtectedHandler(getWecomAppsHandler, appUrl);
export const POST = createAppProtectedHandler(createWecomAppHandler, appUrl);
