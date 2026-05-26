import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { idcRoomDataService, getIdcRoomQueryService } from '@/lib/config/idc-room';
import { query } from '@/lib/database/connection';
import { v4 as uuidv4 } from 'uuid';

const appUrl = '/idc';

// GET 请求处理 - 查询机房列表或单个机房
async function getRoomsHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const keyword = searchParams.get('keyword') || '';
    const status = searchParams.get('status');

    // 如果提供了ID，查询单个机房详情
    if (id) {
      const roomResult = await idcRoomDataService.queryRoomById(id);
      if (!roomResult.success || !roomResult.data || roomResult.data.length === 0) {
        return NextResponse.json(
          { success: false, message: '机房不存在' },
          { status: 404 }
        );
      }

      const room = roomResult.data[0];

      // 查询关联的环境设备（直接查询数据库并转换字段名）
      const [acResult, upsResult, batteryResult, generatorResult, cabinetResult] = await Promise.all([
        query('SELECT * FROM pioc_idc_room_ac WHERE room_id = ? ORDER BY created_at DESC', [id]),
        query('SELECT * FROM pioc_idc_room_ups WHERE room_id = ? ORDER BY created_at DESC', [id]),
        query('SELECT * FROM pioc_idc_room_battery WHERE room_id = ? ORDER BY created_at DESC', [id]),
        query('SELECT * FROM pioc_idc_room_generator WHERE room_id = ? ORDER BY created_at DESC', [id]),
        query('SELECT * FROM pioc_idc_cabinet WHERE room_id = ? ORDER BY sort_order ASC, code ASC', [id]),
      ]);

      // 转换字段名为驼峰命名
      const airConditioners = (acResult as Array<Record<string, unknown>>).map(item => ({
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

      const upsList = (upsResult as Array<Record<string, unknown>>).map(item => ({
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

      const batteries = (batteryResult as Array<Record<string, unknown>>).map(item => ({
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

      const generators = (generatorResult as Array<Record<string, unknown>>).map(item => ({
        id: item.id,
        roomId: item.room_id,
        name: item.name,
        model: item.model,
        power: item.power,
        assetNo: item.asset_no,
        status: item.status,
        remark: item.remark,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));

      const cabinets = (cabinetResult as Array<Record<string, unknown>>).map(item => ({
        id: item.id,
        roomId: item.room_id,
        name: item.name,
        code: item.code,
        totalU: item.total_u,
        usedU: item.used_u,
        ratedPower: item.rated_power,
        usedPower: item.used_power,
        position: item.position,
        pduInfo: item.pdu_info,
        status: item.status,
        sortOrder: item.sort_order,
        remark: item.remark,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));

      return NextResponse.json({
        success: true,
        data: {
          ...room,
          airConditioners,
          upsList,
          batteries,
          generators,
          cabinets,
        },
      });
    }

    // 构建查询条件
    const where: Record<string, unknown> = {};
    if (status !== null && status !== undefined && status !== '') {
      where.status = parseInt(status);
    }

    // 查询机房列表
    const result = await idcRoomDataService.queryRooms(page, pageSize, where);

    // 如果有搜索关键词，进行过滤
    let filteredData = result.data || [];
    if (keyword) {
      const lowerKeyword = keyword.toLowerCase();
      filteredData = filteredData.filter((room: Record<string, unknown>) =>
        String(room.name || '').toLowerCase().includes(lowerKeyword) ||
        String(room.code || '').toLowerCase().includes(lowerKeyword) ||
        String(room.location || '').toLowerCase().includes(lowerKeyword)
      );
    }

    // 转换字段名为驼峰命名
    const camelCaseData = filteredData.map((room: Record<string, unknown>) => ({
      id: room.id,
      name: room.name,
      code: room.code,
      location: room.location,
      floor: room.floor,
      area: room.area,
      fireProtectionInfo: room.fire_protection_info,
      securityInfo: room.security_info,
      contactPerson: room.contact_person,
      contactPhone: room.contact_phone,
      builtDate: room.built_date,
      remark: room.remark,
      status: room.status,
      sortOrder: room.sort_order,
      createdAt: room.created_at,
      updatedAt: room.updated_at,
    }));

    return NextResponse.json({
      success: true,
      data: camelCaseData,
      total: result.total || filteredData.length,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('查询机房失败:', error);
    return NextResponse.json(
      { success: false, message: '查询机房失败', error: String(error) },
      { status: 500 }
    );
  }
}

// POST 请求处理 - 创建机房
async function createRoomHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      code,
      location,
      floor,
      area,
      fireProtectionInfo,
      securityInfo,
      contactPerson,
      contactPhone,
      builtDate,
      remark,
      status = 1,
    } = body;

    // 验证必填字段
    if (!name || !code) {
      return NextResponse.json(
        { success: false, message: '机房名称和编号为必填项' },
        { status: 400 }
      );
    }

    // 检查编号是否已存在
    const existingResult = await idcRoomDataService.queryRooms(1, 1, { code });
    if (existingResult.success && existingResult.data && existingResult.data.length > 0) {
      return NextResponse.json(
        { success: false, message: '机房编号已存在' },
        { status: 400 }
      );
    }

    const id = uuidv4();
    const queryService = getIdcRoomQueryService();
    const tableConfig = idcRoomDataService.queryRooms.constructor.prototype;

    // 插入数据
    const sql = `
      INSERT INTO pioc_idc_room (
        id, name, code, location, floor, area,
        fire_protection_info, security_info, contact_person, contact_phone,
        built_date, remark, status, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    await query(sql, [
      id,
      name,
      code,
      location || null,
      floor || null,
      area || null,
      fireProtectionInfo || null,
      securityInfo || null,
      contactPerson || null,
      contactPhone || null,
      builtDate || null,
      remark || null,
      status,
      body.sortOrder || 0,
    ]);

    return NextResponse.json({
      success: true,
      data: { id },
      message: '机房创建成功',
    }, { status: 201 });
  } catch (error) {
    console.error('创建机房失败:', error);
    return NextResponse.json(
      { success: false, message: '创建机房失败', error: String(error) },
      { status: 500 }
    );
  }
}

// PUT 请求处理 - 更新机房
async function updateRoomHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: '机房ID为必填项' },
        { status: 400 }
      );
    }

    // 检查机房是否存在
    const existingResult = await idcRoomDataService.queryRoomById(id);
    if (!existingResult.success || !existingResult.data || existingResult.data.length === 0) {
      return NextResponse.json(
        { success: false, message: '机房不存在' },
        { status: 404 }
      );
    }

    // 如果更新编号，检查是否与其他机房冲突
    if (updateData.code) {
      const codeCheckSql = 'SELECT id FROM pioc_idc_room WHERE code = ? AND id != ?';
      const codeCheckResult = await query(codeCheckSql, [updateData.code, id]);
      if (Array.isArray(codeCheckResult) && codeCheckResult.length > 0) {
        return NextResponse.json(
          { success: false, message: '机房编号已存在' },
          { status: 400 }
        );
      }
    }

    // 构建更新SQL
    const allowedFields: Record<string, string> = {
      name: 'name',
      code: 'code',
      location: 'location',
      floor: 'floor',
      area: 'area',
      fireProtectionInfo: 'fire_protection_info',
      securityInfo: 'security_info',
      contactPerson: 'contact_person',
      contactPhone: 'contact_phone',
      builtDate: 'built_date',
      remark: 'remark',
      status: 'status',
      sortOrder: 'sort_order',
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
      return NextResponse.json(
        { success: false, message: '没有要更新的字段' },
        { status: 400 }
      );
    }

    values.push(id);
    const sql = `UPDATE pioc_idc_room SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`;
    await query(sql, values);

    return NextResponse.json({
      success: true,
      message: '机房更新成功',
    });
  } catch (error) {
    console.error('更新机房失败:', error);
    return NextResponse.json(
      { success: false, message: '更新机房失败', error: String(error) },
      { status: 500 }
    );
  }
}

// DELETE 请求处理 - 删除机房
async function deleteRoomHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: '机房ID为必填项' },
        { status: 400 }
      );
    }

    // 检查机房是否存在
    const existingResult = await idcRoomDataService.queryRoomById(id);
    if (!existingResult.success || !existingResult.data || existingResult.data.length === 0) {
      return NextResponse.json(
        { success: false, message: '机房不存在' },
        { status: 404 }
      );
    }

    // 检查是否有关联的机柜
    const cabinetResult = await idcRoomDataService.queryCabinetsByRoomId(id);
    if (cabinetResult.success && cabinetResult.data && cabinetResult.data.length > 0) {
      return NextResponse.json(
        { success: false, message: '该机房下存在机柜，无法删除' },
        { status: 400 }
      );
    }

    // 删除机房（关联的环境设备会通过外键级联删除）
    await query('DELETE FROM pioc_idc_room WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: '机房删除成功',
    });
  } catch (error) {
    console.error('删除机房失败:', error);
    return NextResponse.json(
      { success: false, message: '删除机房失败', error: String(error) },
      { status: 500 }
    );
  }
}

// 使用应用权限保护
export const GET = createAppProtectedHandler(getRoomsHandler, appUrl);
export const POST = createAppProtectedHandler(createRoomHandler, appUrl);
export const PUT = createAppProtectedHandler(updateRoomHandler, appUrl);
export const DELETE = createAppProtectedHandler(deleteRoomHandler, appUrl);
