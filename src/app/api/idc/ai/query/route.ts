import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { idcAIQueryService, AIQueryResult } from '@/lib/ai/idc-query-service';
import { EntityMatch } from '@/lib/ai/entity-resolver';

const appUrl = '/idc';

interface ChatRequest {
  message: string;
  history?: Array<{ role: string; content: string }>;
  confirmedEntity?: EntityMatch;
}

/**
 * POST 请求处理 - AI查询
 */
async function handleAIQuery(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, history, confirmedEntity } = body;

    if (!message || message.trim() === '') {
      return NextResponse.json(
        { success: false, error: '消息不能为空' },
        { status: 400 }
      );
    }

    let result: AIQueryResult;

    // 如果有确认的实体，使用确认后的实体重新查询
    if (confirmedEntity) {
      result = await idcAIQueryService.queryWithConfirmedEntity(message, confirmedEntity, history);
    } else {
      // 正常查询流程，传递历史消息支持多轮对话
      result = await idcAIQueryService.processQuery(message, history);
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          answer: result.answer,
          sql: result.sql,
          result: result.result,
          entities: result.entities,
          needsClarification: result.needsClarification,
          clarificationMessage: result.clarificationMessage,
          candidates: result.candidates,
          chartRecommendation: result.chartRecommendation,
        },
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error || '查询失败', userMessage: result.userMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('AI查询处理失败:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export const POST = createAppProtectedHandler(handleAIQuery, appUrl);
