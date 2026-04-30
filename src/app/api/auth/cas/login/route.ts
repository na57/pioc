import { NextRequest, NextResponse } from 'next/server';
import { getCasLoginUrl } from '@/lib/auth/cas';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const redirect = searchParams.get('redirect');
  const redirectUrl = getCasLoginUrl(redirect);
  return NextResponse.redirect(redirectUrl);
}
