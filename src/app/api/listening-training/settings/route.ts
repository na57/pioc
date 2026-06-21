import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { listeningTrainingDataService } from '@/lib/config/listening-training';

const appUrl = '/listening-training';

// GET /api/listening-training/settings - 获取用户设置
async function getSettingsHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string }
) {
  try {
    const result = await listeningTrainingDataService.getOrCreateUserSettings(session.userId);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: '获取设置失败', error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Failed to get settings:', error);
    return NextResponse.json(
      { success: false, message: '获取设置失败', error: String(error) },
      { status: 500 }
    );
  }
}

// PUT /api/listening-training/settings - 更新用户设置
async function updateSettingsHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string }
) {
  try {
    const body = await request.json();
    const { dailyLimit, itemOrder, autoPlay, reviewUnknownFirst, playCount, playInterval, extraSettings } = body;

    // 验证参数
    if (dailyLimit !== undefined && (typeof dailyLimit !== 'number' || dailyLimit < 1 || dailyLimit > 100)) {
      return NextResponse.json(
        { success: false, message: '每日学习数量必须在 1-100 之间' },
        { status: 400 }
      );
    }

    if (itemOrder !== undefined && !['sequential', 'random'].includes(itemOrder)) {
      return NextResponse.json(
        { success: false, message: '词条顺序必须是 sequential 或 random' },
        { status: 400 }
      );
    }

    if (playCount !== undefined && (typeof playCount !== 'number' || playCount < 1 || playCount > 10)) {
      return NextResponse.json(
        { success: false, message: '播放次数必须在 1-10 之间' },
        { status: 400 }
      );
    }

    if (playInterval !== undefined && (typeof playInterval !== 'number' || playInterval < 0 || playInterval > 10)) {
      return NextResponse.json(
        { success: false, message: '播放间隔必须在 0-10 秒之间' },
        { status: 400 }
      );
    }

    const result = await listeningTrainingDataService.updateUserSettings(session.userId, {
      dailyLimit,
      itemOrder,
      autoPlay,
      reviewUnknownFirst,
      playCount,
      playInterval,
      extraSettings,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: '更新设置失败', error: 'error' in result ? result.error : '更新失败' },
        { status: 500 }
      );
    }

    // 获取更新后的设置
    const updatedSettings = await listeningTrainingDataService.getOrCreateUserSettings(session.userId);

    return NextResponse.json({
      success: true,
      message: '设置更新成功',
      data: updatedSettings.data,
    });
  } catch (error) {
    console.error('Failed to update settings:', error);
    return NextResponse.json(
      { success: false, message: '更新设置失败', error: String(error) },
      { status: 500 }
    );
  }
}

export const GET = createAppProtectedHandler(getSettingsHandler, appUrl);
export const PUT = createAppProtectedHandler(updateSettingsHandler, appUrl);
