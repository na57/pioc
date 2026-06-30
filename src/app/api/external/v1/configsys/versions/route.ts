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
    const { configId, content, versionNumber } = body;

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

    let newVersionNumber: string;

    if (versionNumber !== undefined && versionNumber !== null) {
      // 用户提供了自定义版本号
      newVersionNumber = String(versionNumber).trim();
      if (!newVersionNumber) {
        return NextResponse.json(
          { success: false, message: 'versionNumber cannot be empty' },
          { status: 400 }
        );
      }

      // 检查版本号是否已存在
      const existingVersion = await query<Array<{ count: number }>>(
        'SELECT COUNT(*) as count FROM configsys_versions WHERE config_id = ? AND version_number = ?',
        [configId, newVersionNumber]
      );
      if (existingVersion[0]?.count > 0) {
        return NextResponse.json(
          { success: false, message: `Version number "${newVersionNumber}" already exists for this config` },
          { status: 409 }
        );
      }
    } else {
      // 自动生成版本号（格式：v1, v2, ...）
      const maxVersionResult = await query<Array<{ maxVersion: string }>>(
        'SELECT MAX(version_number) as maxVersion FROM configsys_versions WHERE config_id = ?',
        [configId]
      );
      const maxVersion = maxVersionResult[0]?.maxVersion;
      
      // 尝试从最大版本号中提取数字
      let nextNum = 1;
      if (maxVersion) {
        const match = maxVersion.match(/(\d+)/);
        if (match) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }
      newVersionNumber = `v${nextNum}`;
    }

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
