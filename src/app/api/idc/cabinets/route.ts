import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { idcRoomDataService } from '@/lib/config/idc-room';
import { query } from '@/lib/database/connection';
import { v4 as uuidv4 } from 'uuid';

const appUrl = '/idc';

// GET 请求处理 - 查询机柜列表或单个机柜
async function getCabinetsHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const roomId = searchParams.get('roomId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const keyword = searchParams.get('keyword') || '';
    const status = searchParams.get('status');

    if (id) {
      const cabinetResult = await idcRoomDataService.queryCabinetById(id);
      if (!cabinetResult.success || !cabinetResult.data || cabinetResult.data.length === 0) {
        return NextResponse.json({ success: false, message: '机柜不存在' }, { status: 404 });
      }

      const cabinetRaw = cabinetResult.data[0];
      
      // 查询机房名称
      let roomName = '-';
      if (cabinetRaw.room_id) {
        const roomResult = await idcRoomDataService.queryRoomById(cabinetRaw.room_id as string);
        if (roomResult.success && roomResult.data && roomResult.data.length > 0) {
          roomName = (roomResult.data[0] as Record<string, unknown>).name as string;
        }
      }
      
      // 转换机柜字段名为驼峰命名
      const cabinet = {
        id: cabinetRaw.id,
        roomId: cabinetRaw.room_id,
        name: cabinetRaw.name,
        code: cabinetRaw.code,
        totalU: cabinetRaw.total_u,
        usedU: cabinetRaw.used_u,
        ratedPower: cabinetRaw.rated_power,
        usedPower: cabinetRaw.used_power,
        position: cabinetRaw.position,
        pduInfo: cabinetRaw.pdu_info,
        status: cabinetRaw.status,
        sortOrder: cabinetRaw.sort_order,
        remark: cabinetRaw.remark,
        createdAt: cabinetRaw.created_at,
        roomName,
      };
      
      const devicesResult = await idcRoomDataService.queryDevicesByCabinetId(id);
      
      // 转换设备字段名为驼峰命名
      const devices = (devicesResult.success ? devicesResult.data : []).map((device: Record<string, unknown>) => ({
        id: device.id,
        name: device.name,
        deviceType: device.device_type,
        brandModel: device.brand_model,
        assetNo: device.asset_no,
        startU: device.start_u,
        occupyU: device.occupy_u,
        ratedPower: device.rated_power,
        status: device.status,
        onlineDate: device.online_date,
        remark: device.remark,
      }));

      return NextResponse.json({
        success: true,
        data: {
          ...cabinet,
          devices,
        },
      });
    }

    const where: Record<string, unknown> = {};
    if (roomId) where.roomId = roomId;
    if (status !== null && status !== undefined && status !== '') {
      where.status = parseInt(status);
    }

    const result = await idcRoomDataService.queryCabinets(page, pageSize, where);

    let filteredData = result.data || [];
    if (keyword) {
      const lowerKeyword = keyword.toLowerCase();
      filteredData = filteredData.filter((cabinet: Record<string, unknown>) =>
        String(cabinet.name || '').toLowerCase().includes(lowerKeyword) ||
        String(cabinet.code || '').toLowerCase().includes(lowerKeyword)
      );
    }

    // 转换机柜字段名为驼峰命名
    const camelCaseData = filteredData.map((cabinet: Record<string, unknown>) => ({
      id: cabinet.id,
      roomId: cabinet.room_id,
      name: cabinet.name,
      code: cabinet.code,
      totalU: cabinet.total_u,
      usedU: cabinet.used_u,
      ratedPower: cabinet.rated_power,
      usedPower: cabinet.used_power,
      position: cabinet.position,
      pduInfo: cabinet.pdu_info,
      status: cabinet.status,
      sortOrder: cabinet.sort_order,
      remark: cabinet.remark,
      createdAt: cabinet.created_at,
      roomName: cabinet.room_name,
    }));

    return NextResponse.json({
      success: true,
      data: camelCaseData,
      total: result.total || filteredData.length,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('查询机柜失败:', error);
    return NextResponse.json({ success: false, message: '查询机柜失败', error: String(error) }, { status: 500 });
  }
}

// POST 请求处理 - 创建机柜
async function createCabinetHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomId, name, code, totalU = 42, ratedPower, position, pduInfo, remark, status = 1 } = body;

    if (!roomId || !name || !code) {
      return NextResponse.json({ success: false, message: '所属机房、机柜名称和编号为必填项' }, { status: 400 });
    }

    const existingResult = await idcRoomDataService.queryCabinets(1, 1, { code });
    if (existingResult.success && existingResult.data && existingResult.data.length > 0) {
      return NextResponse.json({ success: false, message: '机柜编号已存在' }, { status: 400 });
    }

    const id = uuidv4();
    const sql = `
      INSERT INTO pioc_idc_cabinet (
        id, room_id, name, code, total_u, used_u, rated_power, used_power,
        position, pdu_info, status, sort_order, remark, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 0, ?, 0, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    await query(sql, [id, roomId, name, code, totalU, ratedPower || null, position || null, pduInfo || null, status, body.sortOrder || 0, remark || null]);

    return NextResponse.json({ success: true, data: { id }, message: '机柜创建成功' }, { status: 201 });
  } catch (error) {
    console.error('创建机柜失败:', error);
    return NextResponse.json({ success: false, message: '创建机柜失败', error: String(error) }, { status: 500 });
  }
}

// PUT 请求处理 - 更新机柜
async function updateCabinetHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: '机柜ID为必填项' }, { status: 400 });
    }

    const existingResult = await idcRoomDataService.queryCabinetById(id);
    if (!existingResult.success || !existingResult.data || existingResult.data.length === 0) {
      return NextResponse.json({ success: false, message: '机柜不存在' }, { status: 404 });
    }

    if (updateData.code) {
      const codeCheckResult = await query('SELECT id FROM pioc_idc_cabinet WHERE code = ? AND id != ?', [updateData.code, id]);
      if (Array.isArray(codeCheckResult) && codeCheckResult.length > 0) {
        return NextResponse.json({ success: false, message: '机柜编号已存在' }, { status: 400 });
      }
    }

    const allowedFields: Record<string, string> = {
      name: 'name', code: 'code', totalU: 'total_u', ratedPower: 'rated_power',
      position: 'position', pduInfo: 'pdu_info', status: 'status', sortOrder: 'sort_order', remark: 'remark',
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
    const sql = `UPDATE pioc_idc_cabinet SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`;
    await query(sql, values);

    return NextResponse.json({ success: true, message: '机柜更新成功' });
  } catch (error) {
    console.error('更新机柜失败:', error);
    return NextResponse.json({ success: false, message: '更新机柜失败', error: String(error) }, { status: 500 });
  }
}

// DELETE 请求处理 - 删除机柜
async function deleteCabinetHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: '机柜ID为必填项' }, { status: 400 });
    }

    const existingResult = await idcRoomDataService.queryCabinetById(id);
    if (!existingResult.success || !existingResult.data || existingResult.data.length === 0) {
      return NextResponse.json({ success: false, message: '机柜不存在' }, { status: 404 });
    }

    const deviceResult = await idcRoomDataService.queryDevicesByCabinetId(id);
    if (deviceResult.success && deviceResult.data && deviceResult.data.length > 0) {
      return NextResponse.json({ success: false, message: '该机柜内存在设备，无法删除' }, { status: 400 });
    }

    await query('DELETE FROM pioc_idc_cabinet WHERE id = ?', [id]);

    return NextResponse.json({ success: true, message: '机柜删除成功' });
  } catch (error) {
    console.error('删除机柜失败:', error);
    return NextResponse.json({ success: false, message: '删除机柜失败', error: String(error) }, { status: 500 });
  }
}

export const GET = createAppProtectedHandler(getCabinetsHandler, appUrl);
export const POST = createAppProtectedHandler(createCabinetHandler, appUrl);
export const PUT = createAppProtectedHandler(updateCabinetHandler, appUrl);
export const DELETE = createAppProtectedHandler(deleteCabinetHandler, appUrl);
