import { NextRequest, NextResponse } from 'next/server';
import { validateCasTicket, casLogin, setSessionCookie } from '@/lib/auth/cas';
import { getConfig } from '@/lib/config';

function getBaseUrl(request: NextRequest): string {
  // 优先从请求 URL 中获取 origin（包含协议、主机名和端口）
  // 例如: http://aaa.com/api/auth/cas/callback -> http://aaa.com
  const origin = request.nextUrl.origin;
  if (origin && origin !== 'null') {
    return origin;
  }

  // 如果 origin 不可用，使用配置文件中的 serviceUrl 作为默认值
  const config = getConfig();
  return config.cas.serviceUrl.endsWith('/') ? config.cas.serviceUrl.slice(0, -1) : config.cas.serviceUrl;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ticket = searchParams.get('ticket');
  const error = searchParams.get('error');

  // 根据请求地址动态获取基础 URL，适配不同域名访问
  const baseUrl = getBaseUrl(request);

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, baseUrl));
  }

  if (!ticket) {
    return NextResponse.redirect(new URL('/login?error=no_ticket', baseUrl));
  }

  const validation = await validateCasTicket(ticket);

  if (!validation.valid || !validation.username) {
    return NextResponse.redirect(new URL('/login?error=invalid_ticket', baseUrl));
  }

  const token = await casLogin(
    validation.username,
    validation.attributes?.email,
    validation.attributes?.name
  );

  await setSessionCookie(token);

  return NextResponse.redirect(new URL('/my-apps', baseUrl));
}
