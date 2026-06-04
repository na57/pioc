import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { query } from '@/lib/database/connection';
import { v4 as uuidv4 } from 'uuid';

const appUrl = '/configsys';

// 获取版本列表
async function getVersionsHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('configId');
    
    if (!configId) {
      return NextResponse.json(
        { success: false, message: '缺少配置ID参数' },
        { status: 400 }
      );
    }

    const versions = await query<
      Array<{
        id: string;
        version_number: string;
        ai_summary: string | null;
        compliance_report: string | null;
        created_by: string;
        created_at: string;
      }>
    >(
      `SELECT id, version_number, ai_summary, compliance_report, created_by, created_at
       FROM configsys_versions
       WHERE config_id = ?
       ORDER BY created_at DESC`,
      [configId]
    );

    return NextResponse.json({
      success: true,
      data: versions.map((v) => ({
        ...v,
        hasComplianceReport: !!v.compliance_report,
      })),
    });
  } catch (error) {
    console.error('获取版本列表失败:', error);
    return NextResponse.json(
      { success: false, message: '获取版本列表失败', error: String(error) },
      { status: 500 }
    );
  }
}

// 创建新版本
async function postVersionsHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { configId, versionNumber, content } = body;
    const userId = request.headers.get('x-user-id') || '';
    const userRoles = JSON.parse(request.headers.get('x-user-roles') || '[]');
    const isAdmin = userRoles.includes('系统管理员');

    if (!configId || !versionNumber || !content) {
      return NextResponse.json(
        { success: false, message: '配置ID、版本号和内容为必填项' },
        { status: 400 }
      );
    }

    // 检查权限
    const configs = await query<Array<{ created_by: string }>>(
      `SELECT created_by FROM configsys_configs WHERE id = ?`,
      [configId]
    );

    if (configs.length === 0) {
      return NextResponse.json(
        { success: false, message: '配置不存在' },
        { status: 404 }
      );
    }

    if (!isAdmin && configs[0].created_by !== userId) {
      return NextResponse.json(
        { success: false, message: '无权为此配置添加版本' },
        { status: 403 }
      );
    }

    // 检查版本号是否已存在
    const existingVersion = await query<Array<{ id: string }>>(
      `SELECT id FROM configsys_versions WHERE config_id = ? AND version_number = ?`,
      [configId, versionNumber]
    );

    if (existingVersion.length > 0) {
      return NextResponse.json(
        { success: false, message: '该版本号已存在' },
        { status: 400 }
      );
    }

    const versionId = uuidv4();
    await query(
      `INSERT INTO configsys_versions (id, config_id, version_number, content, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [versionId, configId, versionNumber, content, userId]
    );

    return NextResponse.json({
      success: true,
      data: { id: versionId, versionNumber },
      message: '版本创建成功',
    }, { status: 201 });
  } catch (error) {
    console.error('创建版本失败:', error);
    return NextResponse.json(
      { success: false, message: '创建版本失败', error: String(error) },
      { status: 500 }
    );
  }
}

export const GET = createAppProtectedHandler(getVersionsHandler, appUrl);
export const POST = createAppProtectedHandler(postVersionsHandler, appUrl);
