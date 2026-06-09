import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import * as apiKeyModel from '@/lib/database/models/api-key';
import { generateApiKey, generateApiSecret } from '@/lib/auth/api-auth';

const appUrl = '/api-keys';

// GET /api/api-keys - 获取API密钥列表
async function getApiKeysHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string }
) {
  try {
    const keys = await apiKeyModel.findAll();
    return NextResponse.json({ success: true, data: keys });
  } catch (error) {
    console.error('获取API密钥列表失败:', error);
    return NextResponse.json(
      { success: false, message: '获取API密钥列表失败', error: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/api-keys - 创建API密钥
async function createApiKeyHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string }
) {
  try {
    const body = await request.json();
    const { name, permissions, allowed_ips, rate_limit, expires_at } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, message: '密钥名称不能为空' },
        { status: 400 }
      );
    }

    // 生成API Key和Secret
    const apiKey = generateApiKey();
    const apiSecret = generateApiSecret();

    // 创建密钥记录
    const keyId = await apiKeyModel.create({
      name,
      api_key: apiKey,
      api_secret: apiSecret,
      user_id: session.userId,
      permissions: permissions || ['read'],
      allowed_ips: allowed_ips || [],
      rate_limit: rate_limit || 1000,
      expires_at: expires_at ? new Date(expires_at) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: keyId,
        key: apiKey,
        secret: apiSecret,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('创建API密钥失败:', error);
    return NextResponse.json(
      { success: false, message: '创建API密钥失败', error: String(error) },
      { status: 500 }
    );
  }
}

export const GET = createAppProtectedHandler(getApiKeysHandler, appUrl);
export const POST = createAppProtectedHandler(createApiKeyHandler, appUrl);
