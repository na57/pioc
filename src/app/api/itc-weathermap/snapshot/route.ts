/**
 * 获取拓扑快照 API
 * GET /api/itc-weathermap/snapshot?view=xxx
 *
 * 即使 SNMP 未连接也返回 200 + 拓扑框架 SVG，让前端始终能看到拓扑图。
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/jwt';
import {
  loadYamlConfig,
  getViewMeta,
  getRefreshPeriod,
} from '@/lib/services/itc-weathermap/config-loader';
import { canAccessView } from '@/lib/services/itc-weathermap/access';
import { getSnapshot, initializeCollector, startCollecting, getViewConnection } from '@/lib/services/itc-weathermap/collector';
import { renderSVG, buildPortTableRows } from '@/lib/services/itc-weathermap/renderer';

// 各视图正在初始化的 Promise（避免并发重复 init）
const initPromises = new Map<string, Promise<boolean>>();

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

    // 尝试初始化该视图的采集器（多设备并行 ping）——超时保护不阻塞框架渲染
    if (!initPromises.has(viewId)) {
      const p = withTimeout(
        initializeCollector(viewId)
          .then((ok) => {
            if (ok) startCollecting(getRefreshPeriod(), viewId);
            return ok;
          })
          .catch(() => false)
          .finally(() => {
            // 保留一小段时间防并发，随后允许重新初始化
            setTimeout(() => initPromises.delete(viewId), 2000);
          }),
        6000,
        false,
      );
      initPromises.set(viewId, p);
    }
    await initPromises.get(viewId);

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

    // 强制重新初始化该视图（collector 内部对已初始化设备会保留基线）
    initPromises.delete(viewId);
    const ok = await withTimeout(
      initializeCollector(viewId, true).catch(() => false),
      8000,
      false,
    );
    if (ok) {
      startCollecting(getRefreshPeriod(), viewId);
    }
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
