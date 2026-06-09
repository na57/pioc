import { NextRequest, NextResponse } from 'next/server';
import { createApiHandler } from '@/lib/auth/api-auth';
import * as dataObjectModel from '@/lib/database/models/dataObject';
import { query } from '@/lib/database/connection';

// GET /api/external/v1/data/{object} - 查询数据对象列表
const getHandler = createApiHandler(async (request, auth) => {
  try {
    const objectName = request.nextUrl.pathname.split('/').pop();
    const { searchParams } = request.nextUrl;

    // 分页参数
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')));

    // 获取数据对象配置
    const dataObject = await dataObjectModel.findByName(objectName!);
    if (!dataObject) {
      return NextResponse.json(
        { success: false, message: 'Data object not found' },
        { status: 404 }
      );
    }

    // 构建查询
    const offset = (page - 1) * pageSize;

    // 获取总数
    const countResult = await query<{ total: number }[]>(
      `SELECT COUNT(*) as total FROM (${dataObject.query_statement}) as t`
    );
    const total = countResult[0]?.total || 0;

    // 执行查询
    const results = await query(
      `${dataObject.query_statement} LIMIT ? OFFSET ?`,
      [pageSize, offset]
    );

    return NextResponse.json({
      success: true,
      data: results,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('External API query failed:', error);
    return NextResponse.json(
      { success: false, message: 'Query failed', error: String(error) },
      { status: 500 }
    );
  }
}, ['read']);

// POST /api/external/v1/data/{object} - 创建数据（仅支持简单表）
const postHandler = createApiHandler(async (request, auth) => {
  try {
    const objectName = request.nextUrl.pathname.split('/').pop();
    const body = await request.json();

    // 获取数据对象配置
    const dataObject = await dataObjectModel.findByName(objectName!);
    if (!dataObject) {
      return NextResponse.json(
        { success: false, message: 'Data object not found' },
        { status: 404 }
      );
    }

    // 从查询语句中提取表名（简化处理，假设是简单查询）
    const tableNameMatch = dataObject.query_statement.match(/FROM\s+(\w+)/i);
    if (!tableNameMatch) {
      return NextResponse.json(
        { success: false, message: 'Cannot determine table name from query' },
        { status: 400 }
      );
    }

    const tableName = tableNameMatch[1];

    // 动态构建INSERT语句
    const fields = Object.keys(body);
    const placeholders = fields.map(() => '?').join(', ');
    const values = Object.values(body);

    const result = await query<{ insertId: number }>(
      `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders})`,
      values
    );

    return NextResponse.json({
      success: true,
      data: { id: result.insertId },
    }, { status: 201 });
  } catch (error) {
    console.error('External API create failed:', error);
    return NextResponse.json(
      { success: false, message: 'Create failed', error: String(error) },
      { status: 500 }
    );
  }
}, ['write']);

export const GET = getHandler;
export const POST = postHandler;
