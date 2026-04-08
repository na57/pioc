import { NextRequest, NextResponse } from 'next/server';
import { validateCasTicket, casLogin, setSessionCookie } from '@/lib/auth/cas';
import { getConfig } from '@/lib/config';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ticket = searchParams.get('ticket');
  const error = searchParams.get('error');
  const config = getConfig();

  // 使用配置中的 serviceUrl 构建重定向地址，确保生产环境使用正确的域名
  const baseUrl = config.cas.serviceUrl.endsWith('/') ? config.cas.serviceUrl.slice(0, -1) : config.cas.serviceUrl;

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
