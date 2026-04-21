import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import * as dataObjectModel from '@/lib/database/models/dataObject';
import * as dataSourceModel from '@/lib/database/models/dataSource';
import { queryService } from '@/lib/services/dataSourceQuery';
import { renderTemplate } from '@/lib/utils/template';

const appUrl = '/data-objects';

// POST /api/data-objects/:id/query - 实时查询数据对象数据
async function queryHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dataObjectId = parseInt(id);

    if (isNaN(dataObjectId)) {
      return NextResponse.json(
        { success: false, message: '无效的数据对象ID' },
        { status: 400 }
      );
    }

    // 获取数据对象配置
    const dataObject = await dataObjectModel.findById(dataObjectId);
    if (!dataObject) {
      return NextResponse.json(
        { success: false, message: '数据对象不存在' },
        { status: 404 }
      );
    }

    // 检查数据对象状态
    if (dataObject.status !== 1) {
      return NextResponse.json(
        { success: false, message: '数据对象已禁用' },
        { status: 400 }
      );
    }

    // 获取数据源配置
    const dataSource = await dataSourceModel.findById(dataObject.data_source_id);
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

    // 获取查询参数
    const body = await request.json().catch(() => ({}));
    const page = body.page || 1;
    const pageSize = body.pageSize || 20;

    // 执行查询
    const result = await queryService.executeQuery(
      dataSource,
      dataObject.query_statement,
      { page, pageSize }
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: `查询失败: ${result.error}` },
        { status: 500 }
      );
    }

    // 应用显示模板渲染预览
    const list = result.data.map((item) => ({
      ...(item as Record<string, unknown>),
      _display: renderTemplate(dataObject.display_template, item as Record<string, unknown>),
    }));

    // 获取字段注释（仅 MySQL）
    let fieldComments: { name: string; comment: string }[] = [];
    if (dataSource.type === 'mysql') {
      try {
        fieldComments = await queryService.getMySQLFieldComments(dataSource, dataObject.query_statement);
      } catch (error) {
        console.warn('获取字段注释失败:', error);
        // 获取注释失败不影响主功能
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        display_template: dataObject.display_template,
        primary_key: dataObject.primary_key,
        list,
        fieldComments,
        pagination: {
          page,
          pageSize,
          total: result.total || 0,
        },
      },
    });
  } catch (error) {
    console.error('查询数据对象数据失败:', error);
    return NextResponse.json(
      { success: false, message: '查询数据对象数据失败', error: String(error) },
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

export const POST = wrapHandler(queryHandler);
