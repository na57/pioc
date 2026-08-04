import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { itAssetAIQueryService, ItAssetAIQueryResult } from '@/lib/ai/it-asset-query-service';

const appUrl = '/it-asset-center';

interface ChatRequest {
  message: string;
  history?: Array<{ role: string; content: string }>;
}

/**
 * POST 请求处理 - IT资产中心AI查询
 */
async function handleAIQuery(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, history } = body;

    if (!message || message.trim() === '') {
      return NextResponse.json(
        { success: false, error: '消息不能为空' },
        { status: 400 }
      );
    }

    const result: ItAssetAIQueryResult = await itAssetAIQueryService.processQuery(message, history);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          answer: result.answer,
          // 使用格式化的 chartData 作为 result，供前端 AIChart 组件渲染图表
          result: result.chartData || result.result,
          // 同时保留原始 API 调用结果供技术详情展示
          rawResult: result.result,
          apiCalls: result.apiCalls,
          chartRecommendation: result.chartRecommendation,
          // 为了兼容 AIChatPanel 组件，同时提供 sql 字段（虽然 IT 资产中心不直接使用 SQL）
          sql: result.apiCalls?.map(call => call.description).join('\n') || '',
        },
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error || '查询失败', userMessage: result.userMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[IT资产 AI] API查询处理失败:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export const POST = createAppProtectedHandler(handleAIQuery, appUrl);
