import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { listeningTrainingDataService } from '@/lib/config/listening-training';

const appUrl = '/listening-training';

// GET /api/listening-training/selectable-items - 获取所有可供选择的词条（按词书分组）
async function getSelectableItemsHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string }
) {
  try {
    const { searchParams } = new URL(request.url);
    const wordbookId = searchParams.get('wordbook_id');

    // 获取用户的所有词书
    const wordbooksResult = await listeningTrainingDataService.queryWordbooks(session.userId, 1, 100);
    
    if (!wordbooksResult.success || !wordbooksResult.data) {
      return NextResponse.json(
        { success: false, message: '获取词书列表失败' },
        { status: 500 }
      );
    }

    // QueryResult 的 data 直接是数组
    const wordbooks = wordbooksResult.data || [];

    // 如果指定了词书ID，只返回该词书的可选词条
    if (wordbookId) {
      const result = await listeningTrainingDataService.getSelectableItems(session.userId, wordbookId);
      
      if (!result.success) {
        return NextResponse.json(
          { success: false, message: '获取词条失败', error: result.error },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          wordbooks: wordbooks.map((wb: any) => ({
            id: wb.id,
            name: wb.name,
            total_items: wb.total_items,
          })),
          items: result.data || [],
          currentWordbookId: wordbookId,
        },
      });
    }

    // 没有指定词书，返回所有词书的可选词条
    const allItems: any[] = [];
    for (const wordbook of wordbooks) {
      const result = await listeningTrainingDataService.getSelectableItems(session.userId, String(wordbook.id));
      if (result.success && result.data) {
        allItems.push(...(result.data as any[]).map((item: any) => ({
          ...item,
          wordbook_id: wordbook.id,
          wordbook_name: wordbook.name,
        })));
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        wordbooks: wordbooks.map((wb: any) => ({
          id: wb.id,
          name: wb.name,
          total_items: wb.total_items,
        })),
        items: allItems,
        currentWordbookId: null,
      },
    });
  } catch (error) {
    console.error('Failed to fetch selectable items:', error);
    return NextResponse.json(
      { success: false, message: '获取词条失败', error: String(error) },
      { status: 500 }
    );
  }
}

export const GET = createAppProtectedHandler(getSelectableItemsHandler, appUrl);
