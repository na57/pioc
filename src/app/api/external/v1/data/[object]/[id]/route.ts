import { NextRequest, NextResponse } from 'next/server';
import { createApiHandler } from '@/lib/auth/api-auth';
import * as dataObjectModel from '@/lib/database/models/dataObject';
import { query } from '@/lib/database/connection';

// GET /api/external/v1/data/{object}/{id} - 获取单条数据
const getHandler = createApiHandler(async (request, auth) => {
  try {
    const pathParts = request.nextUrl.pathname.split('/');
    const objectName = pathParts[pathParts.length - 2];
    const id = pathParts[pathParts.length - 1];

    // 获取数据对象配置
    const dataObject = await dataObjectModel.findByName(objectName);
    if (!dataObject) {
      return NextResponse.json(
        { success: false, message: 'Data object not found' },
        { status: 404 }
      );
    }

    // 执行查询
    const results = await query(
      `${dataObject.query_statement} WHERE ${dataObject.primary_key} = ? LIMIT 1`,
      [id]
    );

    if (!results || (results as any[]).length === 0) {
      return NextResponse.json(
        { success: false, message: 'Record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: (results as any[])[0],
    });
  } catch (error) {
    console.error('External API get failed:', error);
    return NextResponse.json(
      { success: false, message: 'Get failed', error: String(error) },
      { status: 500 }
    );
  }
}, ['read']);

// PUT /api/external/v1/data/{object}/{id} - 更新数据
const putHandler = createApiHandler(async (request, auth) => {
  try {
    const pathParts = request.nextUrl.pathname.split('/');
    const objectName = pathParts[pathParts.length - 2];
    const id = pathParts[pathParts.length - 1];
    const body = await request.json();

    // 获取数据对象配置
    const dataObject = await dataObjectModel.findByName(objectName);
    if (!dataObject) {
      return NextResponse.json(
        { success: false, message: 'Data object not found' },
        { status: 404 }
      );
    }

    // 从查询语句中提取表名
    const tableNameMatch = dataObject.query_statement.match(/FROM\s+(\w+)/i);
    if (!tableNameMatch) {
      return NextResponse.json(
        { success: false, message: 'Cannot determine table name from query' },
        { status: 400 }
      );
    }

    const tableName = tableNameMatch[1];

    // 动态构建UPDATE语句
    const fields = Object.keys(body).map(key => `${key} = ?`);
    const values = [...Object.values(body), id];

    if (fields.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No fields to update' },
        { status: 400 }
      );
    }

    await query(
      `UPDATE ${tableName} SET ${fields.join(', ')} WHERE ${dataObject.primary_key} = ?`,
      values
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('External API update failed:', error);
    return NextResponse.json(
      { success: false, message: 'Update failed', error: String(error) },
      { status: 500 }
    );
  }
}, ['write']);

// DELETE /api/external/v1/data/{object}/{id} - 删除数据
const deleteHandler = createApiHandler(async (request, auth) => {
  try {
    const pathParts = request.nextUrl.pathname.split('/');
    const objectName = pathParts[pathParts.length - 2];
    const id = pathParts[pathParts.length - 1];

    // 获取数据对象配置
    const dataObject = await dataObjectModel.findByName(objectName);
    if (!dataObject) {
      return NextResponse.json(
        { success: false, message: 'Data object not found' },
        { status: 404 }
      );
    }

    // 从查询语句中提取表名
    const tableNameMatch = dataObject.query_statement.match(/FROM\s+(\w+)/i);
    if (!tableNameMatch) {
      return NextResponse.json(
        { success: false, message: 'Cannot determine table name from query' },
        { status: 400 }
      );
    }

    const tableName = tableNameMatch[1];

    await query(
      `DELETE FROM ${tableName} WHERE ${dataObject.primary_key} = ?`,
      [id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('External API delete failed:', error);
    return NextResponse.json(
      { success: false, message: 'Delete failed', error: String(error) },
      { status: 500 }
    );
  }
}, ['write']);

export const GET = getHandler;
export const PUT = putHandler;
export const DELETE = deleteHandler;
