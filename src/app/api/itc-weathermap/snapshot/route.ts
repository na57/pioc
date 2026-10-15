/**
 * 获取拓扑快照 API
 * GET /api/itc-weathermap/snapshot?view=xxx
 *
 * 即使 SNMP 未连接也返回 200 + 拓扑框架 SVG，让前端始终能看到拓扑图。
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/jwt';
import {
  getViewMeta,
  getRefreshPeriod,
} from '@/lib/services/itc-weathermap/config-loader';
import { canAccessView } from '@/lib/services/itc-weathermap/access';
import {
  getSnapshot,
  initializeCollector,
  startCollecting,
  restartCollecting,
  whenFirstRound,
  getViewConnection,
} from '@/lib/services/itc-weathermap/collector';
import { renderSVG, buildPortTableRows } from '@/lib/services/itc-weathermap/renderer';

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const viewId = searchParams.get('view') || searchParams.get('viewId') || 'core';

    const view = getViewMeta(viewId);
    if (!view) {
      return NextResponse.json({ success: false, error: '视图不存在' }, { status: 404 });
    }

    // 视图级角色鉴权
    if (!(await canAccessView(viewId, session.userId))) {
      return NextResponse.json({ success: false, error: '无权访问该网络天气图' }, { status: 403 });
    }

    // 初始化设备运行时（纯本地，不做网络探测）并确保采集循环运行（幂等）
    const initialized = await initializeCollector(viewId).catch(() => false);
    if (initialized) startCollecting(getRefreshPeriod(), viewId);

    // 短等首轮采集：可达设备的 discover 在百毫秒级，拿得到首屏就直接带数据；
    // 不可达设备首轮只快速探测 1.2s，等不到也立即返回拓扑框架
    await withTimeout(whenFirstRound(viewId), 2500, undefined);

    const snapshot = getSnapshot(viewId);
    const conn = getViewConnection(viewId);
    const connected = conn.connected > 0;

    // 无论 snapshot 是否为空，都生成 SVG 框架
    const svg = renderSVG(snapshot, { viewId });
    const rows = buildPortTableRows(snapshot, viewId);

    return NextResponse.json({
      success: true,
      viewId: view.id,
      viewName: view.title,
      connected,
      deviceTotal: conn.total,
      deviceConnected: conn.connected,
      devices: conn.devices,
      warm: snapshot?.warm ?? false,
      ready: snapshot?.ready ?? false,
      updateTime: snapshot?.ts?.getTime() ?? null,
      svg,
      ports: rows,
      error: snapshot?.err || (connected ? '' : 'SNMP 未连接，显示拓扑框架仅供参考'),
    });
  } catch (error) {
    console.error('[ITCWeathermap] 获取快照失败:', error);

    let fallbackSvg = '';
    let fallbackPorts: any[] = [];
    try {
      fallbackSvg = renderSVG(null);
    } catch { /* 忽略 */ }

    return NextResponse.json({
      success: false,
      error: '获取快照失败',
      connected: false,
      warm: false,
      ready: false,
      updateTime: null,
      svg: fallbackSvg,
      ports: fallbackPorts,
    }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const viewId = body.view || 'core';

    const view = getViewMeta(viewId);
    if (!view) {
      return NextResponse.json({ success: false, error: '视图不存在' }, { status: 404 });
    }

    // 视图级角色鉴权
    if (!(await canAccessView(viewId, session.userId))) {
      return NextResponse.json({ success: false, error: '无权访问该网络天气图' }, { status: 403 });
    }

    // 强制重连：重建 SNMP 客户端与设备状态，立即跑一轮冷启动并重新预热
    await initializeCollector(viewId, true).catch(() => false);
    await withTimeout(restartCollecting(getRefreshPeriod(), viewId), 8000, undefined);
    const conn = getViewConnection(viewId);

    return NextResponse.json({
      success: true,
      connected: conn.connected > 0,
      deviceTotal: conn.total,
      deviceConnected: conn.connected,
      devices: conn.devices,
    });
  } catch (error) {
    console.error('[ITCWeathermap] 刷新失败:', error);
    return NextResponse.json({ success: false, error: '刷新失败' }, { status: 500 });
  }
}
