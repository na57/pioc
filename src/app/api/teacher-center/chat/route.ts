import { NextRequest, NextResponse } from 'next/server';
import { processTeacherChat, ChatRequest } from '@/lib/services/teacherAIChat';

/**
 * POST /api/teacher-center/chat
 * 教师AI问答接口
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: ChatRequest = await request.json();
    const { gh, message, history } = body;

    // 参数验证
    if (!gh || typeof gh !== 'string') {
      return NextResponse.json(
        { success: false, error: '缺少或无效的gh参数' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '缺少或无效的消息内容' },
        { status: 400 }
      );
    }

    // 消息长度限制
    if (message.length > 500) {
      return NextResponse.json(
        { success: false, error: '消息内容过长，最多500个字符' },
        { status: 400 }
      );
    }

    // 处理问答请求
    const result = await processTeacherChat({
      gh,
      message: message.trim(),
      history,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('教师AI问答API错误:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
