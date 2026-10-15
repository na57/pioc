/**
 * 获取当前用户可访问的视图列表 API
 * GET /api/itc-weathermap/views
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/jwt';
import { getAllViews } from '@/lib/services/itc-weathermap/config-loader';
import { canAccessView } from '@/lib/services/itc-weathermap/access';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const views = getAllViews();
    const permitted: typeof views = [];
    for (const v of views) {
      if (await canAccessView(v.id, session.userId)) {
        permitted.push(v);
      }
    }

    return NextResponse.json({ success: true, data: permitted });
  } catch (error) {
    console.error('[ITCWeathermap] 获取视图列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取视图列表失败' },
      { status: 500 },
    );
  }
}
