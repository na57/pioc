import { NextRequest, NextResponse } from 'next/server';
import { createApiHandler } from '@/lib/auth/api-auth';
import { query } from '@/lib/database/connection';

// GET /api/external/v1/configsys/versions/:id - 获取单个版本详情
const getHandler = createApiHandler(async (request, auth) => {
  try {
    const versionId = request.nextUrl.pathname.split('/').pop();

    if (!versionId) {
      return NextResponse.json(
        { success: false, message: 'Version ID is required' },
        { status: 400 }
      );
    }

    const versions = await query(
      `SELECT
        v.*,
        u.name as creator_name,
        u.username as creator_username,
        c.name as config_name,
        c.description as config_description
       FROM configsys_versions v
       LEFT JOIN pioc_users u ON v.created_by = u.id
       JOIN configsys_configs c ON v.config_id = c.id
       WHERE v.id = ?`,
      [versionId]
    );

    if (!versions || (versions as any[]).length === 0) {
      return NextResponse.json(
        { success: false, message: 'Version not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: (versions as any[])[0],
    });
  } catch (error) {
    console.error('External API: get version failed:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get version', error: String(error) },
      { status: 500 }
    );
  }
}, ['read']);

// PUT /api/external/v1/configsys/versions/:id - 更新版本
const putHandler = createApiHandler(async (request, auth) => {
  try {
    const versionId = request.nextUrl.pathname.split('/').pop();
    const body = await request.json();
    const { content, changeDescription } = body;

    if (!versionId) {
      return NextResponse.json(
        { success: false, message: 'Version ID is required' },
        { status: 400 }
      );
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    if (content !== undefined) {
      fields.push('content = ?');
      values.push(content);
    }
    if (changeDescription !== undefined) {
      fields.push('change_description = ?');
      values.push(changeDescription);
    }

    if (fields.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No fields to update' },
        { status: 400 }
      );
    }

    values.push(versionId);

    await query(
      `UPDATE configsys_versions SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('External API: update version failed:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update version', error: String(error) },
      { status: 500 }
    );
  }
}, ['write']);

// DELETE /api/external/v1/configsys/versions/:id - 删除版本
const deleteHandler = createApiHandler(async (request, auth) => {
  try {
    const versionId = request.nextUrl.pathname.split('/').pop();

    if (!versionId) {
      return NextResponse.json(
        { success: false, message: 'Version ID is required' },
        { status: 400 }
      );
    }

    await query('DELETE FROM configsys_versions WHERE id = ?', [versionId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('External API: delete version failed:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete version', error: String(error) },
      { status: 500 }
    );
  }
}, ['write']);

export const GET = getHandler;
export const PUT = putHandler;
export const DELETE = deleteHandler;
