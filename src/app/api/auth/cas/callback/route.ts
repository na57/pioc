import { NextRequest, NextResponse } from 'next/server';
import { validateCasTicket, casLogin, setSessionCookie } from '@/lib/auth/cas';
import { getConfig } from '@/lib/config';

function getBaseUrl(request: NextRequest): string {
  // 优先从请求头中获取协议和主机（支持反向代理场景）
  const protocol = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host;

  if (host && host !== 'localhost:8080') {
    return `${protocol}://${host}`;
  }

  // 如果无法从请求头获取，使用配置文件中的 serviceUrl 作为默认值
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
