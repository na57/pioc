import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import * as apiKeyModel from '@/lib/database/models/api-key';

// 验证API请求
export async function validateApiRequest(request: NextRequest): Promise<
  | { success: true; apiKey: apiKeyModel.ApiKey; userId: number }
  | { success: false; message: string; status: number }
> {
  // 1. 获取API Key和签名
  const apiKey = request.headers.get('X-API-Key');
  const signature = request.headers.get('X-API-Signature');
  const timestamp = request.headers.get('X-API-Timestamp');

  if (!apiKey || !signature || !timestamp) {
    return {
      success: false,
      message: 'Missing API credentials. Required headers: X-API-Key, X-API-Signature, X-API-Timestamp',
      status: 401,
    };
  }

  // 2. 检查时间戳（防止重放攻击，5分钟内有效）
  const ts = parseInt(timestamp);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 300) {
    return {
      success: false,
      message: 'Request expired. Timestamp must be within 5 minutes of server time',
      status: 401,
    };
  }

  // 3. 验证API Key
  const keyRecord = await apiKeyModel.findByApiKey(apiKey);
  if (!keyRecord) {
    return {
      success: false,
      message: 'Invalid API key',
      status: 401,
    };
  }

  // 4. 检查是否过期
  if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
    return {
      success: false,
      message: 'API key expired',
      status: 401,
    };
  }

  // 5. 检查IP白名单
  if (keyRecord.allowed_ips && keyRecord.allowed_ips.length > 0) {
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const clientIpStr = Array.isArray(clientIp) ? clientIp[0] : clientIp;
    if (!keyRecord.allowed_ips.includes(clientIpStr)) {
      return {
        success: false,
        message: 'IP not allowed',
        status: 403,
      };
    }
  }

  // 6. 验证签名
  const method = request.method;
  const path = request.nextUrl.pathname;
  const queryString = request.nextUrl.searchParams.toString();
  const body = await request.clone().text();
  
  const signString = `${method}\n${path}\n${queryString}\n${timestamp}\n${body}`;
  const expectedSignature = createHmac('sha256', keyRecord.api_secret)
    .update(signString)
    .digest('hex');

  if (signature !== expectedSignature) {
    return {
      success: false,
      message: 'Invalid signature',
      status: 401,
    };
  }

  // 7. 更新最后使用时间
  await apiKeyModel.updateLastUsed(keyRecord.id);

  return {
    success: true,
    apiKey: keyRecord,
    userId: keyRecord.user_id,
  };
}

// 创建API保护处理器
export function createApiHandler(
  handler: (request: NextRequest, auth: { apiKey: apiKeyModel.ApiKey; userId: number }) => Promise<NextResponse>,
  requiredPermissions?: string[]
) {
  return async (request: NextRequest) => {
    const auth = await validateApiRequest(request);

    if (!auth.success) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status }
      );
    }

    // 检查权限
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasPermission = requiredPermissions.every(p => 
        auth.apiKey.permissions.includes(p)
      );
      if (!hasPermission) {
        return NextResponse.json(
          { success: false, message: 'Insufficient permissions' },
          { status: 403 }
        );
      }
    }

    return handler(request, { apiKey: auth.apiKey, userId: auth.userId });
  };
}

// 生成API Key
export function generateApiKey(): string {
  return 'pk_' + Array.from({ length: 48 }, () => 
    Math.floor(Math.random() * 36).toString(36)
  ).join('');
}

// 生成API Secret
export function generateApiSecret(): string {
  return Array.from({ length: 64 }, () => 
    Math.floor(Math.random() * 36).toString(36)
  ).join('');
}

// 生成签名（供第三方SDK使用）
export function generateSignature(
  method: string,
  path: string,
  queryString: string,
  timestamp: string,
  body: string,
  apiSecret: string
): string {
  const signString = `${method}\n${path}\n${queryString}\n${timestamp}\n${body}`;
  return createHmac('sha256', apiSecret)
    .update(signString)
    .digest('hex');
}
