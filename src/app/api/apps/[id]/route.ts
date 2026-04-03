import { NextRequest, NextResponse } from 'next/server';
import { findById, update, remove, findByName, isBuiltinApp } from '@/lib/database/models/app';
import { createAppProtectedHandler } from '@/lib/auth/middleware';

const appUrl = '/apps';

async function getAppHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const app = await findById(parseInt(id));
    if (!app) {
      return NextResponse.json({ success: false, message: 'App not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: app });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch app', error: String(error) },
      { status: 500 }
    );
  }
}

async function updateAppHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, icon, url, status } = body;

    const existingApp = await findById(parseInt(id));
    if (!existingApp) {
      return NextResponse.json({ success: false, message: 'App not found' }, { status: 404 });
    }

    // 检查是否为内置应用，内置应用不允许修改URL
    if (isBuiltinApp(parseInt(id))) {
      if (url && url !== existingApp.url) {
        return NextResponse.json(
          { success: false, message: 'Cannot modify URL of built-in application' },
          { status: 403 }
        );
      }
    }

    if (name && name !== existingApp.name) {
      const appWithName = await findByName(name);
      if (appWithName) {
        return NextResponse.json({ success: false, message: 'App name already exists' }, { status: 409 });
      }
    }

    const updated = await update(parseInt(id), { name, description, icon, url, status });
    if (!updated) {
      return NextResponse.json({ success: false, message: 'No changes made' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'App updated successfully' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to update app', error: String(error) },
      { status: 500 }
    );
  }
}

async function deleteAppHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 检查是否为内置应用，内置应用不允许删除
    if (isBuiltinApp(parseInt(id))) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete built-in application' },
        { status: 403 }
      );
    }
    
    const deleted = await remove(parseInt(id));
    if (!deleted) {
      return NextResponse.json({ success: false, message: 'App not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'App deleted successfully' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to delete app', error: String(error) },
      { status: 500 }
    );
  }
}

// 包装处理器以添加权限检查
type HandlerFunction = (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<NextResponse>;

const wrapHandler = (handler: HandlerFunction) => {
  return async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const protectedHandler = createAppProtectedHandler(
      (req: NextRequest) => handler(req, context),
      appUrl
    );
    return protectedHandler(request, context);
  };
};

export const GET = wrapHandler(getAppHandler);
export const PUT = wrapHandler(updateAppHandler);
export const DELETE = wrapHandler(deleteAppHandler);
