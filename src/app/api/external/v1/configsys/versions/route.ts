import { NextRequest, NextResponse } from 'next/server';
import { createApiHandler } from '@/lib/auth/api-auth';
import { query } from '@/lib/database/connection';
import { v4 as uuidv4 } from 'uuid';

// GET /api/external/v1/configsys/versions?configId=xxx - 获取配置版本列表
const getHandler = createApiHandler(async (request, auth) => {
  try {
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('configId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')));

    if (!configId) {
      return NextResponse.json(
        { success: false, message: 'configId is required' },
        { status: 400 }
      );
    }

    // 查询版本列表
    const offset = (page - 1) * pageSize;
    const versions = await query(
      `SELECT
        v.*,
        u.name as creator_name,
        u.username as creator_username
       FROM configsys_versions v
       LEFT JOIN pioc_users u ON v.created_by = u.id
       WHERE v.config_id = ?
       ORDER BY v.version_number DESC
       LIMIT ? OFFSET ?`,
      [configId, pageSize, offset]
    );

    // 获取总数
    const countResult = await query<Array<{ total: number }>>(
      'SELECT COUNT(*) as total FROM configsys_versions WHERE config_id = ?',
      [configId]
    );
    const total = countResult[0]?.total || 0;

    return NextResponse.json({
      success: true,
      data: versions,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('External API: get versions failed:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get versions', error: String(error) },
      { status: 500 }
    );
  }
}, ['read']);

// POST /api/external/v1/configsys/versions - 创建新版本
const postHandler = createApiHandler(async (request, auth) => {
  try {
    const body = await request.json();
    const { configId, content, changeDescription } = body;

    // 验证用户ID必须有效
    if (!auth.userId) {
      return NextResponse.json(
        { success: false, message: 'Invalid API key: no associated user' },
        { status: 401 }
      );
    }

    if (!configId || !content) {
      return NextResponse.json(
        { success: false, message: 'configId and content are required' },
        { status: 400 }
      );
    }

    // 获取当前最大版本号
    const maxVersionResult = await query<Array<{ maxVersion: number }>>(
      'SELECT MAX(version_number) as maxVersion FROM configsys_versions WHERE config_id = ?',
      [configId]
    );
    const newVersionNumber = (maxVersionResult[0]?.maxVersion || 0) + 1;

    // 创建新版本
    const versionId = uuidv4();
    await query(
      `INSERT INTO configsys_versions (id, config_id, version_number, content, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [versionId, configId, newVersionNumber, content, auth.userId]
    );

    return NextResponse.json({
      success: true,
      data: {
        id: versionId,
        versionNumber: newVersionNumber,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('External API: create version failed:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create version', error: String(error) },
      { status: 500 }
    );
  }
}, ['write']);

export const GET = getHandler;
export const POST = postHandler;
