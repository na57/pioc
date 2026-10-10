import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/jwt';
import { checkUserUrlPermission } from '@/lib/database/models/app';
import * as appMenuModel from '@/lib/database/models/app-menu';

// PUT /api/apps/[id]/menus/[menuId] —— 更新应用菜单（需要应用管理权限）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; menuId: string }> }
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

    const { menuId } = await params;
    const menu = await appMenuModel.findById(parseInt(menuId));
    if (!menu) {
      return NextResponse.json({ success: false, message: 'Menu not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, path, icon, sort_order, status } = body;
    if (name !== undefined && !name) {
      return NextResponse.json({ success: false, message: '菜单名称不能为空' }, { status: 400 });
    }
    if (path !== undefined && !path) {
      return NextResponse.json({ success: false, message: '菜单路径不能为空' }, { status: 400 });
    }

    const updated = await appMenuModel.update(parseInt(menuId), { name, path, icon, sort_order, status });
    if (!updated) {
      return NextResponse.json({ success: false, message: 'No changes made' }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to update app menu', error: String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/apps/[id]/menus/[menuId] —— 删除应用菜单（需要应用管理权限）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; menuId: string }> }
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

    const { menuId } = await params;
    const deleted = await appMenuModel.remove(parseInt(menuId));
    if (!deleted) {
      return NextResponse.json({ success: false, message: 'Menu not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to delete app menu', error: String(error) },
      { status: 500 }
    );
  }
}
