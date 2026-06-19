import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { query } from '@/lib/database/connection';
import { v4 as uuidv4 } from 'uuid';
import { isAdmin } from '@/lib/config/configsys';
import { findUserRoles } from '@/lib/database/models/user';

const appUrl = '/configsys';

// 获取配置列表
async function getConfigsHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string }
) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const keyword = searchParams.get('keyword') || '';
    const userId = String(session.userId);
    const username = session.username;

    // 从数据库获取用户角色
    const userRoles = await findUserRoles(session.userId);
    const userRoleNames = userRoles.map(r => r.name);

    // 检查是否是管理员
    const isAdminUser = isAdmin(userRoleNames);

    let sql = `
      SELECT DISTINCT c.*,
        (SELECT COUNT(*) FROM configsys_versions WHERE config_id = c.id) as version_count
      FROM configsys_configs c
      LEFT JOIN configsys_config_shares s ON c.id = s.config_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (!isAdminUser) {
      sql += ` AND (c.created_by = ? OR s.shared_with_user_id = ?)`;
      params.push(username, username);
    }
    
    if (keyword) {
      sql += ` AND (c.name LIKE ? OR c.description LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    
    sql += ` ORDER BY c.updated_at DESC LIMIT ? OFFSET ?`;
    params.push(pageSize, (page - 1) * pageSize);
    
    const configs = await query(sql, params);
    
    // 获取总数
    let countSql = `
      SELECT COUNT(DISTINCT c.id) as total
      FROM configsys_configs c
      LEFT JOIN configsys_config_shares s ON c.id = s.config_id
      WHERE 1=1
    `;
    const countParams: any[] = [];

    if (!isAdminUser) {
      countSql += ` AND (c.created_by = ? OR s.shared_with_user_id = ?)`;
      countParams.push(username, username);
    }
    
    if (keyword) {
      countSql += ` AND (c.name LIKE ? OR c.description LIKE ?)`;
      countParams.push(`%${keyword}%`, `%${keyword}%`);
    }
    
    const countResult = await query<Array<{ total: number }>>(countSql, countParams);
    const total = countResult[0]?.total || 0;
    
    return NextResponse.json({
      success: true,
      data: configs,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('获取配置列表失败:', error);
    return NextResponse.json(
      { success: false, message: '获取配置列表失败', error: String(error) },
      { status: 500 }
    );
  }
}

// 创建配置
async function postConfigsHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string }
) {
  try {
    const body = await request.json();
    const { name, description, complianceRuleId } = body;
    const username = session.username;

    if (!name) {
      return NextResponse.json(
        { success: false, message: '配置名称为必填项' },
        { status: 400 }
      );
    }

    const configId = uuidv4();

    // 创建配置（不包含内容，内容在版本中添加）
    await query(
      `INSERT INTO configsys_configs (id, name, description, compliance_rule_id, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [configId, name, description || '', complianceRuleId || null, username]
    );

    return NextResponse.json({
      success: true,
      data: { id: configId, name },
      message: '配置创建成功',
    }, { status: 201 });
  } catch (error) {
    console.error('创建配置失败:', error);
    return NextResponse.json(
      { success: false, message: '创建配置失败', error: String(error) },
      { status: 500 }
    );
  }
}

export const GET = createAppProtectedHandler(getConfigsHandler, appUrl);
export const POST = createAppProtectedHandler(postConfigsHandler, appUrl);
