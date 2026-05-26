import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { query } from '@/lib/database/connection';
import { v4 as uuidv4 } from 'uuid';

const appUrl = '/idc';

// GET 请求处理 - 查询UPS列表
async function getUpsHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    
    let sql = 'SELECT * FROM pioc_idc_room_ups';
    const params: unknown[] = [];
    
    if (roomId) {
      sql += ' WHERE room_id = ?';
      params.push(roomId);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    const result = await query(sql, params);
    
    // 转换字段名为驼峰命名
    const formattedResult = (result as Array<Record<string, unknown>>).map(item => ({
      id: item.id,
      roomId: item.room_id,
      name: item.name,
      model: item.model,
      capacity: item.capacity,
      assetNo: item.asset_no,
      status: item.status,
      remark: item.remark,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
    
    return NextResponse.json({ success: true, data: formattedResult });
  } catch (error) {
    console.error('查询UPS失败:', error);
    return NextResponse.json({ success: false, message: '查询UPS失败', error: String(error) }, { status: 500 });
  }
}

// POST 请求处理 - 创建UPS
async function createUpsHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomId, name, model, capacity, assetNo, status = 1 } = body;

    if (!roomId || !name) {
      return NextResponse.json({ success: false, message: '机房ID和设备名称为必填项' }, { status: 400 });
    }

    const id = uuidv4();
    const sql = `
      INSERT INTO pioc_idc_room_ups (id, room_id, name, model, capacity, asset_no, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    await query(sql, [id, roomId, name, model || null, capacity || null, assetNo || null, status]);

    return NextResponse.json({ success: true, data: { id }, message: 'UPS创建成功' }, { status: 201 });
  } catch (error) {
    console.error('创建UPS失败:', error);
    return NextResponse.json({ success: false, message: '创建UPS失败', error: String(error) }, { status: 500 });
  }
}

// PUT 请求处理 - 更新UPS
async function updateUpsHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'UPS ID为必填项' }, { status: 400 });
    }

    const allowedFields: Record<string, string> = {
      name: 'name',
      model: 'model',
      capacity: 'capacity',
      assetNo: 'asset_no',
      status: 'status',
    };

    const updates: string[] = [];
    const values: unknown[] = [];

    Object.entries(updateData).forEach(([key, value]) => {
      const dbField = allowedFields[key];
      if (dbField !== undefined) {
        updates.push(`${dbField} = ?`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      return NextResponse.json({ success: false, message: '没有要更新的字段' }, { status: 400 });
    }

    values.push(id);
    const sql = `UPDATE pioc_idc_room_ups SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`;
    await query(sql, values);

    return NextResponse.json({ success: true, message: 'UPS更新成功' });
  } catch (error) {
    console.error('更新UPS失败:', error);
    return NextResponse.json({ success: false, message: '更新UPS失败', error: String(error) }, { status: 500 });
  }
}

// DELETE 请求处理 - 删除UPS
async function deleteUpsHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'UPS ID为必填项' }, { status: 400 });
    }

    await query('DELETE FROM pioc_idc_room_ups WHERE id = ?', [id]);

    return NextResponse.json({ success: true, message: 'UPS删除成功' });
  } catch (error) {
    console.error('删除UPS失败:', error);
    return NextResponse.json({ success: false, message: '删除UPS失败', error: String(error) }, { status: 500 });
  }
}

export const GET = createAppProtectedHandler(getUpsHandler, appUrl);
export const POST = createAppProtectedHandler(createUpsHandler, appUrl);
export const PUT = createAppProtectedHandler(updateUpsHandler, appUrl);
export const DELETE = createAppProtectedHandler(deleteUpsHandler, appUrl);
