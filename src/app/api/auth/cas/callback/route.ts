import { NextRequest, NextResponse } from 'next/server';
import { validateCasTicket, casLogin, setSessionCookie } from '@/lib/auth/cas';
import { getConfig } from '@/lib/config';

function getBaseUrl(): string {
  // 直接使用配置文件中的 serviceUrl
  const config = getConfig();
  return config.cas.serviceUrl.endsWith('/') ? config.cas.serviceUrl.slice(0, -1) : config.cas.serviceUrl;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ticket = searchParams.get('ticket');
  const error = searchParams.get('error');

  // 从配置文件获取基础 URL
  const baseUrl = getBaseUrl();

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
