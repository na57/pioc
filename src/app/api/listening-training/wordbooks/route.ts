import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { query } from '@/lib/database/connection';
import { v4 as uuidv4 } from 'uuid';

const appUrl = '/listening-training';

// GET /api/listening-training/wordbooks - 获取词书列表
async function getWordbooksHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string }
) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const offset = (page - 1) * pageSize;

    // 查询词书列表
    const wordbooks = await query<any[]>(
      `SELECT * FROM pioc_lt_wordbooks 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [session.userId, pageSize, offset]
    );

    // 查询总数
    const countResult = await query<{ total: number }[]>(
      `SELECT COUNT(*) as total FROM pioc_lt_wordbooks WHERE user_id = ?`,
      [session.userId]
    );

    return NextResponse.json({
      success: true,
      data: {
        list: wordbooks,
        pagination: {
          page,
          pageSize,
          total: countResult[0]?.total || 0,
        },
      },
    });
  } catch (error) {
    console.error('Failed to fetch wordbooks:', error);
    return NextResponse.json(
      { success: false, message: '获取词书列表失败', error: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/listening-training/wordbooks - 创建词书（支持文件上传或在线编辑）
async function createWordbookHandler(
  request: NextRequest,
  session: { userId: number; username: string; email: string; name: string }
) {
  try {
    const contentType = request.headers.get('content-type') || '';
    
    let name: string;
    let items: string[];
    
    if (contentType.includes('multipart/form-data')) {
      // 文件上传方式
      const formData = await request.formData();
      const file = formData.get('file') as File;
      name = formData.get('name') as string || '';

      if (!file) {
        return NextResponse.json(
          { success: false, message: '请上传txt文件' },
          { status: 400 }
        );
      }

      // 读取文件内容
      const fileContent = await file.text();
      items = fileContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      if (!name) {
        name = file.name.replace('.txt', '');
      }
    } else {
      // 在线编辑方式（JSON）
      const body = await request.json();
      name = body.name;
      items = body.items?.filter((item: string) => item.trim().length > 0) || [];
      
      if (!name || name.trim().length === 0) {
        return NextResponse.json(
          { success: false, message: '请输入词书名称' },
          { status: 400 }
        );
      }
    }

    if (items.length === 0) {
      return NextResponse.json(
        { success: false, message: '词条列表不能为空' },
        { status: 400 }
      );
    }

    const wordbookId = uuidv4();
    const wordbookName = name.trim();

    // 创建词书
    await query(
      `INSERT INTO pioc_lt_wordbooks (id, user_id, name, description, source, total_items) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [wordbookId, session.userId, wordbookName, null, 'manual', items.length]
    );

    // 批量创建词条
    const itemValues = items.map((content: string) => {
      const itemId = uuidv4();
      return `('${itemId}', '${wordbookId}', '${content.replace(/'/g, "\\'")}', NOW())`;
    }).join(',');

    await query(
      `INSERT INTO pioc_lt_items (id, wordbook_id, content, created_at) 
       VALUES ${itemValues}`
    );

    return NextResponse.json({
      success: true,
      message: '词书创建成功',
      data: {
        id: wordbookId,
        name: wordbookName,
        total_items: items.length,
        created_at: new Date().toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create wordbook:', error);
    return NextResponse.json(
      { success: false, message: '创建词书失败', error: String(error) },
      { status: 500 }
    );
  }
}

export const GET = createAppProtectedHandler(getWordbooksHandler, appUrl);
export const POST = createAppProtectedHandler(createWordbookHandler, appUrl);
