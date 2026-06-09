import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import * as apiKeyModel from '@/lib/database/models/api-key';

const appUrl = '/api-keys';

// PUT /api/api-keys/:id - 更新API密钥
async function updateApiKeyHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const keyId = parseInt(id);

    if (isNaN(keyId)) {
      return NextResponse.json(
        { success: false, message: '无效的密钥ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, permissions, allowed_ips, rate_limit, status, expires_at } = body;

    const updateData: apiKeyModel.UpdateApiKeyData = {};

    if (name !== undefined) updateData.name = name;
    if (permissions !== undefined) updateData.permissions = permissions;
    if (allowed_ips !== undefined) updateData.allowed_ips = allowed_ips;
    if (rate_limit !== undefined) updateData.rate_limit = rate_limit;
    if (status !== undefined) updateData.status = status;
    if (expires_at !== undefined) updateData.expires_at = expires_at ? new Date(expires_at) : undefined;

    const success = await apiKeyModel.update(keyId, updateData);

    if (!success) {
      return NextResponse.json(
        { success: false, message: '密钥不存在或无需更新' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('更新API密钥失败:', error);
    return NextResponse.json(
      { success: false, message: '更新API密钥失败', error: String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/api-keys/:id - 删除API密钥
async function deleteApiKeyHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const keyId = parseInt(id);

    if (isNaN(keyId)) {
      return NextResponse.json(
        { success: false, message: '无效的密钥ID' },
        { status: 400 }
      );
    }

    const success = await apiKeyModel.remove(keyId);

    if (!success) {
      return NextResponse.json(
        { success: false, message: '密钥不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除API密钥失败:', error);
    return NextResponse.json(
      { success: false, message: '删除API密钥失败', error: String(error) },
      { status: 500 }
    );
  }
}

type HandlerFunction = (
  req: NextRequest,
  session: { userId: number; username: string; email: string; name: string },
  ctx: { params: Promise<{ id: string }> }
) => Promise<NextResponse>;

const wrapHandler = (handler: HandlerFunction) => {
  return async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const protectedHandler = createAppProtectedHandler(
      (req: NextRequest, session: { userId: number; username: string; email: string; name: string }) =>
        handler(req, session, context),
      appUrl
    );
    return protectedHandler(request, context);
  };
};

export const PUT = wrapHandler(updateApiKeyHandler);
export const DELETE = wrapHandler(deleteApiKeyHandler);
