import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import * as dataSourceModel from '@/lib/database/models/dataSource';
import { queryService } from '@/lib/services/dataSourceQuery';

const appUrl = '/data-objects';

// POST /api/data-sources/:id/preview-query - 预览查询（创建时测试用）
async function previewQueryHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dataSource = await dataSourceModel.findById(id);

    if (!dataSource) {
      return NextResponse.json(
        { success: false, message: '数据源不存在' },
        { status: 404 }
      );
    }

    // 检查数据源状态
    if (dataSource.status !== 1) {
      return NextResponse.json(
        { success: false, message: '数据源已禁用' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { query_statement } = body;

    if (!query_statement) {
      return NextResponse.json(
        { success: false, message: '缺少查询语句' },
        { status: 400 }
      );
    }

    // 执行预览查询（限制返回10条）
    const result = await queryService.previewQuery(dataSource, query_statement);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: `查询失败: ${result.error}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('预览查询失败:', error);
    return NextResponse.json(
      { success: false, message: '预览查询失败', error: String(error) },
      { status: 500 }
    );
  }
}

type HandlerFunction = (
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) => Promise<NextResponse>;

const wrapHandler = (handler: HandlerFunction) => {
  return async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const protectedHandler = createAppProtectedHandler(
      (req: NextRequest) => handler(req, context),
      appUrl
    );
    return protectedHandler(request, context);
  };
};

export const POST = wrapHandler(previewQueryHandler);
