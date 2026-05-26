import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { query } from '@/lib/database/connection';
import { v4 as uuidv4 } from 'uuid';

const appUrl = '/idc';

// GET 请求处理 - 查询电池组列表
async function getBatteriesHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    
    let sql = 'SELECT * FROM pioc_idc_room_battery';
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
      batteryCount: item.battery_count,
      totalCapacity: item.total_capacity,
      assetNo: item.asset_no,
      status: item.status,
      remark: item.remark,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
    
    return NextResponse.json({ success: true, data: formattedResult });
  } catch (error) {
    console.error('查询电池组失败:', error);
    return NextResponse.json({ success: false, message: '查询电池组失败', error: String(error) }, { status: 500 });
  }
}

// POST 请求处理 - 创建电池组
async function createBatteryHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomId, name, batteryCount, totalCapacity, assetNo, status = 1 } = body;

    if (!roomId || !name) {
      return NextResponse.json({ success: false, message: '机房ID和电池组名称为必填项' }, { status: 400 });
    }

    const id = uuidv4();
    const sql = `
      INSERT INTO pioc_idc_room_battery (id, room_id, name, battery_count, total_capacity, asset_no, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    await query(sql, [id, roomId, name, batteryCount || null, totalCapacity || null, assetNo || null, status]);

    return NextResponse.json({ success: true, data: { id }, message: '电池组创建成功' }, { status: 201 });
  } catch (error) {
    console.error('创建电池组失败:', error);
    return NextResponse.json({ success: false, message: '创建电池组失败', error: String(error) }, { status: 500 });
  }
}

// PUT 请求处理 - 更新电池组
async function updateBatteryHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: '电池组ID为必填项' }, { status: 400 });
    }

    const allowedFields: Record<string, string> = {
      name: 'name',
      batteryCount: 'battery_count',
      totalCapacity: 'total_capacity',
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
    const sql = `UPDATE pioc_idc_room_battery SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`;
    await query(sql, values);

    return NextResponse.json({ success: true, message: '电池组更新成功' });
  } catch (error) {
    console.error('更新电池组失败:', error);
    return NextResponse.json({ success: false, message: '更新电池组失败', error: String(error) }, { status: 500 });
  }
}

// DELETE 请求处理 - 删除电池组
async function deleteBatteryHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: '电池组ID为必填项' }, { status: 400 });
    }

    await query('DELETE FROM pioc_idc_room_battery WHERE id = ?', [id]);

    return NextResponse.json({ success: true, message: '电池组删除成功' });
  } catch (error) {
    console.error('删除电池组失败:', error);
    return NextResponse.json({ success: false, message: '删除电池组失败', error: String(error) }, { status: 500 });
  }
}

export const GET = createAppProtectedHandler(getBatteriesHandler, appUrl);
export const POST = createAppProtectedHandler(createBatteryHandler, appUrl);
export const PUT = createAppProtectedHandler(updateBatteryHandler, appUrl);
export const DELETE = createAppProtectedHandler(deleteBatteryHandler, appUrl);
