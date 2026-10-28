import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/jwt';
import { runDiagnosis } from '@/lib/services/itc-weathermap/diagnosis';

export const dynamic = 'force-dynamic';

/** GET：诊断全部设备 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
  }
  try {
    const report = await runDiagnosis();
    return NextResponse.json({ success: true, data: report });
  } catch (e) {
    console.error('[SNMP 诊断 API] 全量诊断失败:', e);
    return NextResponse.json(
      { success: false, error: String(e), userMessage: '诊断执行失败，请稍后重试' },
      { status: 500 },
    );
  }
}

/** POST：单台诊断（body: { deviceId }） */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
  }
  try {
    const body = (await request.json()) as { deviceId?: string };
    if (!body?.deviceId) {
      return NextResponse.json(
        { success: false, error: '缺少 deviceId', userMessage: '缺少设备 ID 参数' },
        { status: 400 },
      );
    }
    const report = await runDiagnosis(body.deviceId);
    return NextResponse.json({ success: true, data: report });
  } catch (e) {
    console.error('[SNMP 诊断 API] 单台诊断失败:', e);
    return NextResponse.json(
      { success: false, error: String(e), userMessage: String(e) || '诊断执行失败' },
      { status: 500 },
    );
  }
}
