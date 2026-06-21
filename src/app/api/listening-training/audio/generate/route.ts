import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { getConfig } from '@/lib/config';

const appUrl = '/listening-training';

// 延迟函数
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 带重试的 fetch
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<Response> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      lastError = error as Error;
      console.warn(`TTS API 调用失败 (尝试 ${i + 1}/${maxRetries}):`, error);

      if (i < maxRetries - 1) {
        await delay(retryDelay * (i + 1)); // 指数退避
      }
    }
  }

  throw lastError || new Error('TTS API 调用失败，已重试多次');
}

// POST /api/listening-training/audio/generate - 生成音频
async function generateAudioHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string }
) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json(
        { success: false, message: '缺少文本内容' },
        { status: 400 }
      );
    }

    // 从 config.yaml 获取 TTS 配置
    const config = getConfig();
    const ltConfig = config.listeningTraining;

    if (!ltConfig || !ltConfig.tts || !ltConfig.tts.apiKey) {
      return NextResponse.json(
        { success: false, message: 'TTS API 密钥未配置，请在 config.yaml 中配置 listeningTraining.tts.apiKey' },
        { status: 500 }
      );
    }

    const apiKey = ltConfig.tts.apiKey;
    // Higgs TTS 使用 /v1/audio/speech 端点
    const baseUrl = ltConfig.tts.apiUrl?.replace('/v1/chat/completions', '') || 'https://new-api-itc.ynu.edu.cn';
    const apiUrl = `${baseUrl}/v1/audio/speech`;
    const model = ltConfig.tts.model || 'bosonai/higgs-audio-v3-tts-4b';

    // 调用 TTS API - 使用重试机制
    const response = await fetchWithRetry(
      apiUrl,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          input: text,
          voice: 'default',
          response_format: 'mp3',
        }),
      },
      3, // 最多重试3次
      1000 // 初始延迟1秒
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('TTS API error:', errorText);
      return NextResponse.json(
        { success: false, message: 'TTS服务调用失败', error: errorText },
        { status: 502 }
      );
    }

    // Higgs TTS 返回的是二进制音频数据
    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');

    if (!audioBase64 || audioBase64.length === 0) {
      return NextResponse.json(
        { success: false, message: 'TTS服务返回数据为空' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        audio_base64: `data:audio/mp3;base64,${audioBase64}`,
        text,
      },
    });
  } catch (error) {
    console.error('Failed to generate audio:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    // 判断错误类型
    if (errorMessage.includes('ECONNRESET') || errorMessage.includes('ETIMEDOUT')) {
      return NextResponse.json(
        { success: false, message: 'TTS 服务连接失败，请检查网络或稍后重试', error: errorMessage },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, message: '生成音频失败', error: errorMessage },
      { status: 500 }
    );
  }
}

export const POST = createAppProtectedHandler(generateAudioHandler, appUrl);
