import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/jwt';
import { checkUserUrlPermission } from '@/lib/database/models/app';

export async function authMiddleware(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  return null;
}

// 验证请求身份，返回用户信息或错误
export async function authenticateRequest(request: NextRequest): Promise<
  | { success: true; userId: number; username: string; email: string; name: string }
  | { success: false; message: string; status: number }
> {
  const session = await getSession();

  if (!session) {
    return {
      success: false,
      message: 'Unauthorized',
      status: 401,
    };
  }

  return {
    success: true,
    userId: session.userId,
    username: session.username,
    email: session.email,
    name: session.name,
  };
}

export function createProtectedHandler(
  handler: (request: NextRequest, session: { userId: number; username: string; email: string; name: string }) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    return handler(request, session);
  };
}

// 创建带应用权限检查的保护处理器
export function createAppProtectedHandler(
  handler: (request: NextRequest, session: { userId: number; username: string; email: string; name: string }, params?: Promise<{ [key: string]: string }>) => Promise<NextResponse>,
  appUrl: string
) {
  return async (request: NextRequest, { params }: { params?: Promise<{ [key: string]: string }> }) => {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 检查用户是否有权限访问该应用
    const hasPermission = await checkUserUrlPermission(session.userId, appUrl);
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: No permission to access this application' },
        { status: 403 }
      );
    }

    return handler(request, session, params);
  };
}

// 获取当前用户ID
export async function getCurrentUserId(request: NextRequest): Promise<number | null> {
  const session = await getSession();
  return session?.userId || null;
}

// 获取当前用户信息
export async function getCurrentUser(request: NextRequest): Promise<{ id: number; username: string; email: string; name: string } | null> {
  const session = await getSession();
  if (!session) return null;
  return {
    id: session.userId,
    username: session.username,
    email: session.email,
    name: session.name,
  };
}
