import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { query } from '@/lib/database/connection';
import { v4 as uuidv4 } from 'uuid';

const appUrl = '/idc';

// GET 请求处理 - 查询空调列表
async function getAirConditionersHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    
    let sql = 'SELECT * FROM pioc_idc_room_ac';
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
      coolingCapacity: item.cooling_capacity,
      assetNo: item.asset_no,
      status: item.status,
      remark: item.remark,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
    
    return NextResponse.json({ success: true, data: formattedResult });
  } catch (error) {
    console.error('查询空调失败:', error);
    return NextResponse.json({ success: false, message: '查询空调失败', error: String(error) }, { status: 500 });
  }
}

// POST 请求处理 - 创建空调
async function createAirConditionerHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomId, name, model, coolingCapacity, assetNo, status = 1 } = body;

    if (!roomId || !name) {
      return NextResponse.json({ success: false, message: '机房ID和设备名称为必填项' }, { status: 400 });
    }

    const id = uuidv4();
    const sql = `
      INSERT INTO pioc_idc_room_ac (id, room_id, name, model, cooling_capacity, asset_no, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    await query(sql, [id, roomId, name, model || null, coolingCapacity || null, assetNo || null, status]);

    return NextResponse.json({ success: true, data: { id }, message: '空调创建成功' }, { status: 201 });
  } catch (error) {
    console.error('创建空调失败:', error);
    return NextResponse.json({ success: false, message: '创建空调失败', error: String(error) }, { status: 500 });
  }
}

// PUT 请求处理 - 更新空调
async function updateAirConditionerHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: '空调ID为必填项' }, { status: 400 });
    }

    const allowedFields: Record<string, string> = {
      name: 'name',
      model: 'model',
      coolingCapacity: 'cooling_capacity',
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
    const sql = `UPDATE pioc_idc_room_ac SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`;
    await query(sql, values);

    return NextResponse.json({ success: true, message: '空调更新成功' });
  } catch (error) {
    console.error('更新空调失败:', error);
    return NextResponse.json({ success: false, message: '更新空调失败', error: String(error) }, { status: 500 });
  }
}

// DELETE 请求处理 - 删除空调
async function deleteAirConditionerHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: '空调ID为必填项' }, { status: 400 });
    }

    await query('DELETE FROM pioc_idc_room_ac WHERE id = ?', [id]);

    return NextResponse.json({ success: true, message: '空调删除成功' });
  } catch (error) {
    console.error('删除空调失败:', error);
    return NextResponse.json({ success: false, message: '删除空调失败', error: String(error) }, { status: 500 });
  }
}

export const GET = createAppProtectedHandler(getAirConditionersHandler, appUrl);
export const POST = createAppProtectedHandler(createAirConditionerHandler, appUrl);
export const PUT = createAppProtectedHandler(updateAirConditionerHandler, appUrl);
export const DELETE = createAppProtectedHandler(deleteAirConditionerHandler, appUrl);
