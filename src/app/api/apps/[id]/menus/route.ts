import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/jwt';
import { checkUserUrlPermission } from '@/lib/database/models/app';
import { findById as findAppById } from '@/lib/database/models/app';
import {
  findByAppId,
  findEnabledByAppId,
  create,
} from '@/lib/database/models/app-menu';

// GET /api/apps/[id]/menus
// 管理员（有应用管理权限）返回全部菜单，普通用户仅返回已启用的菜单
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const appId = parseInt(id);
    const app = await findAppById(appId);
    if (!app) {
      return NextResponse.json({ success: false, message: 'App not found' }, { status: 404 });
    }

    // 有应用管理权限的用户返回全部（含禁用），否则仅返回启用项
    const canManage = await checkUserUrlPermission(session.userId, '/apps');
    const menus = canManage
      ? await findByAppId(appId)
      : await findEnabledByAppId(appId);

    return NextResponse.json({ success: true, data: menus });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch app menus', error: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/apps/[id]/menus —— 新增应用菜单（需要应用管理权限）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const canManage = await checkUserUrlPermission(session.userId, '/apps');
    if (!canManage) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const appId = parseInt(id);
    const app = await findAppById(appId);
    if (!app) {
      return NextResponse.json({ success: false, message: 'App not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, path, icon, sort_order, status } = body;
    if (!name || !path) {
      return NextResponse.json(
        { success: false, message: '菜单名称和路径不能为空' },
        { status: 400 }
      );
    }

    const menuId = await create({ app_id: appId, name, path, icon, sort_order, status });
    return NextResponse.json({ success: true, data: { id: menuId } });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to create app menu', error: String(error) },
      { status: 500 }
    );
  }
}
