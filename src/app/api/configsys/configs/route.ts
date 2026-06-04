import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { query } from '@/lib/database/connection';
import { v4 as uuidv4 } from 'uuid';

const appUrl = '/configsys';

// 获取配置列表
async function getConfigsHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const keyword = searchParams.get('keyword') || '';
    const userId = request.headers.get('x-user-id') || '';
    const userRoles = JSON.parse(request.headers.get('x-user-roles') || '[]');
    
    // 检查是否是管理员
    const isAdmin = userRoles.includes('系统管理员');
    
    let sql = `
      SELECT DISTINCT c.*, 
        (SELECT COUNT(*) FROM configsys_versions WHERE config_id = c.id) as version_count
      FROM configsys_configs c
      LEFT JOIN configsys_config_shares s ON c.id = s.config_id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (!isAdmin) {
      sql += ` AND (c.created_by = ? OR s.shared_with_user_id = ?)`;
      params.push(userId, userId);
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
    
    if (!isAdmin) {
      countSql += ` AND (c.created_by = ? OR s.shared_with_user_id = ?)`;
      countParams.push(userId, userId);
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
async function postConfigsHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, complianceRuleId } = body;
    const userId = request.headers.get('x-user-id') || '';

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
      [configId, name, description || '', complianceRuleId || null, userId]
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
