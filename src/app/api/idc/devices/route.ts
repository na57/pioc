import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { idcRoomDataService } from '@/lib/config/idc-room';
import { query } from '@/lib/database/connection';
import { v4 as uuidv4 } from 'uuid';

const appUrl = '/idc';

// GET 请求处理 - 查询设备列表或单个设备
async function getDevicesHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const cabinetId = searchParams.get('cabinetId');
    const roomId = searchParams.get('roomId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const keyword = searchParams.get('keyword') || '';
    const deviceType = searchParams.get('deviceType');
    const status = searchParams.get('status');

    if (id) {
      const deviceResult = await idcRoomDataService.queryDeviceById(id);
      if (!deviceResult.success || !deviceResult.data || deviceResult.data.length === 0) {
        return NextResponse.json({ success: false, message: '设备不存在' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: deviceResult.data[0] });
    }

    let where: Record<string, unknown> = {};
    if (cabinetId) where.cabinetId = cabinetId;
    if (deviceType) where.deviceType = parseInt(deviceType);
    if (status !== null && status !== undefined && status !== '') {
      where.status = parseInt(status);
    }

    // 如果按roomId查询，需要先获取该机柜下的所有设备
    if (roomId && !cabinetId) {
      const cabinetsResult = await idcRoomDataService.queryCabinetsByRoomId(roomId);
      const cabinetIds = cabinetsResult.success && cabinetsResult.data 
        ? cabinetsResult.data.map((c: Record<string, unknown>) => c.id)
        : [];
      
      if (cabinetIds.length === 0) {
        return NextResponse.json({ success: true, data: [], total: 0, page, pageSize });
      }
      
      // 使用IN查询
      const result = await idcRoomDataService.queryDevices(page, pageSize, {});
      let filteredData = result.data || [];
      filteredData = filteredData.filter((d: Record<string, unknown>) => cabinetIds.includes(d.cabinetId));
      
      if (keyword) {
        const lowerKeyword = keyword.toLowerCase();
        filteredData = filteredData.filter((device: Record<string, unknown>) =>
          String(device.name || '').toLowerCase().includes(lowerKeyword) ||
          String(device.asset_no || '').toLowerCase().includes(lowerKeyword) ||
          String(device.brand_model || '').toLowerCase().includes(lowerKeyword)
        );
      }

      // 转换字段名为驼峰命名
      const camelCaseData = filteredData.map((device: Record<string, unknown>) => ({
        id: device.id,
        cabinetId: device.cabinet_id,
        name: device.name,
        deviceType: device.device_type,
        brandModel: device.brand_model,
        assetNo: device.asset_no,
        startU: device.start_u,
        occupyU: device.occupy_u,
        ratedPower: device.rated_power,
        status: device.status,
        sortOrder: device.sort_order,
        onlineDate: device.online_date,
        remark: device.remark,
        createdAt: device.created_at,
      }));

      return NextResponse.json({
        success: true,
        data: camelCaseData,
        total: filteredData.length,
        page,
        pageSize,
      });
    }

    const result = await idcRoomDataService.queryDevices(page, pageSize, where);

    let filteredData = result.data || [];
    if (keyword) {
      const lowerKeyword = keyword.toLowerCase();
      filteredData = filteredData.filter((device: Record<string, unknown>) =>
        String(device.name || '').toLowerCase().includes(lowerKeyword) ||
        String(device.asset_no || '').toLowerCase().includes(lowerKeyword) ||
        String(device.brand_model || '').toLowerCase().includes(lowerKeyword)
      );
    }

    // 转换字段名为驼峰命名
    const camelCaseData = filteredData.map((device: Record<string, unknown>) => ({
      id: device.id,
      cabinetId: device.cabinet_id,
      name: device.name,
      deviceType: device.device_type,
      brandModel: device.brand_model,
      assetNo: device.asset_no,
      startU: device.start_u,
      occupyU: device.occupy_u,
      ratedPower: device.rated_power,
      status: device.status,
      sortOrder: device.sort_order,
      onlineDate: device.online_date,
      remark: device.remark,
      createdAt: device.created_at,
    }));

    return NextResponse.json({
      success: true,
      data: camelCaseData,
      total: result.total || filteredData.length,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('查询设备失败:', error);
    return NextResponse.json({ success: false, message: '查询设备失败', error: String(error) }, { status: 500 });
  }
}

// POST 请求处理 - 创建设备（上架）
async function createDeviceHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      cabinetId, name, deviceType, brandModel, assetNo,
      startU, occupyU = 1, ratedPower, onlineDate, remark, status = 1
    } = body;

    if (!cabinetId || !name || !deviceType || !startU) {
      return NextResponse.json({ success: false, message: '机柜、设备名称、类型和起始U位为必填项' }, { status: 400 });
    }

    // 查询机柜信息（直接查询数据库）
    const cabinetResult = await query('SELECT * FROM pioc_idc_cabinet WHERE id = ?', [cabinetId]);
    if (!Array.isArray(cabinetResult) || cabinetResult.length === 0) {
      return NextResponse.json({ success: false, message: '机柜不存在' }, { status: 404 });
    }

    const cabinetRaw = cabinetResult[0] as Record<string, unknown>;
    const cabinet = {
      id: cabinetRaw.id as string,
      roomId: cabinetRaw.room_id as string,
      name: cabinetRaw.name as string,
      code: cabinetRaw.code as string,
      totalU: Number(cabinetRaw.total_u) || 0,
      usedU: Number(cabinetRaw.used_u) || 0,
      ratedPower: Number(cabinetRaw.rated_power) || 0,
      usedPower: Number(cabinetRaw.used_power) || 0,
      position: cabinetRaw.position as string,
      pduInfo: cabinetRaw.pdu_info as string,
      status: cabinetRaw.status as number,
      remark: cabinetRaw.remark as string,
    };

    // 检查机柜是否可用
    if (cabinet.status !== 1) {
      return NextResponse.json({ success: false, message: '该机柜不可用，无法上架设备' }, { status: 400 });
    }

    // 校验U位范围
    const endU = startU + occupyU - 1;
    if (endU > (cabinet.totalU || 0)) {
      return NextResponse.json({ success: false, message: `U位超出范围，该机柜最大U位为${cabinet.totalU}` }, { status: 400 });
    }

    if (startU < 1) {
      return NextResponse.json({ success: false, message: '起始U位不能小于1' }, { status: 400 });
    }

    // 检查U位是否被占用（直接查询数据库）
    const existingDevicesResult = await query('SELECT * FROM pioc_idc_device WHERE cabinet_id = ? ORDER BY start_u DESC', [cabinetId]);
    if (Array.isArray(existingDevicesResult)) {
      for (const deviceRaw of existingDevicesResult) {
        const device = deviceRaw as Record<string, unknown>;
        const deviceStartU = device.start_u as number;
        const deviceOccupyU = device.occupy_u as number;
        const deviceEndU = deviceStartU + deviceOccupyU - 1;
        
        // 检查是否有重叠
        if ((startU >= deviceStartU && startU <= deviceEndU) ||
            (endU >= deviceStartU && endU <= deviceEndU) ||
            (startU <= deviceStartU && endU >= deviceEndU)) {
          return NextResponse.json({ 
            success: false, 
            message: `U位 ${startU}-${endU} 与现有设备 ${device.name} (U${deviceStartU}-${deviceEndU}) 冲突` 
          }, { status: 400 });
        }
      }
    }

    // 校验功耗
    const devicePower = ratedPower || 0;
    const newUsedPower = (cabinet.usedPower || 0) + devicePower;
    if (cabinet.ratedPower && newUsedPower > cabinet.ratedPower) {
      return NextResponse.json({ 
        success: false, 
        message: `功耗超出额定值，当前已分配${cabinet.usedPower || 0}W，额定${cabinet.ratedPower}W` 
      }, { status: 400 });
    }

    const id = uuidv4();
    
    // 开始事务
    await query('START TRANSACTION');
    
    try {
      // 插入设备
      const insertSql = `
        INSERT INTO pioc_idc_device (
          id, cabinet_id, name, device_type, brand_model, asset_no,
          start_u, occupy_u, rated_power, status, sort_order, online_date, remark, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;

      await query(insertSql, [
        id, cabinetId, name, deviceType, brandModel || null, assetNo || null,
        startU, occupyU, ratedPower || null, status, body.sortOrder || 0, onlineDate || null, remark || null
      ]);

      // 更新机柜的已用U数和功耗
      const newUsedU = (cabinet.usedU || 0) + occupyU;
      await query(
        'UPDATE pioc_idc_cabinet SET used_u = ?, used_power = ?, updated_at = NOW() WHERE id = ?',
        [newUsedU, newUsedPower, cabinetId]
      );

      await query('COMMIT');

      return NextResponse.json({ success: true, data: { id }, message: '设备上架成功' }, { status: 201 });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('创建设备失败:', error);
    return NextResponse.json({ success: false, message: '创建设备失败', error: String(error) }, { status: 500 });
  }
}

// PUT 请求处理 - 更新设备
async function updateDeviceHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: '设备ID为必填项' }, { status: 400 });
    }

    // 直接查询数据库获取设备信息
    const existingResult = await query('SELECT * FROM pioc_idc_device WHERE id = ?', [id]);
    if (!Array.isArray(existingResult) || existingResult.length === 0) {
      return NextResponse.json({ success: false, message: '设备不存在' }, { status: 404 });
    }

    const deviceRaw = existingResult[0] as Record<string, unknown>;

    // 如果更换机柜或U位，需要重新校验
    if (updateData.cabinetId && updateData.cabinetId !== deviceRaw.cabinet_id) {
      // 新柜校验逻辑类似创建，这里简化处理
      return NextResponse.json({ success: false, message: '不支持更换机柜，请先下架再上架' }, { status: 400 });
    }

    const allowedFields: Record<string, string> = {
      name: 'name', deviceType: 'device_type', brandModel: 'brand_model',
      assetNo: 'asset_no', startU: 'start_u', occupyU: 'occupy_u',
      ratedPower: 'rated_power', status: 'status',
      sortOrder: 'sort_order', onlineDate: 'online_date', remark: 'remark',
    };

    const updates: string[] = [];
    const values: unknown[] = [];

    Object.entries(updateData).forEach(([key, value]) => {
      const dbField = allowedFields[key];
      if (dbField !== undefined) {
        updates.push(`${dbField} = ?`);
        // 处理日期格式，将 ISO 格式转换为 YYYY-MM-DD
        if (key === 'onlineDate' && value) {
          const date = new Date(value as string);
          if (!isNaN(date.getTime())) {
            const formattedDate = date.toISOString().split('T')[0];
            values.push(formattedDate);
          } else {
            values.push(value);
          }
        } else {
          values.push(value);
        }
      }
    });

    if (updates.length === 0) {
      return NextResponse.json({ success: false, message: '没有要更新的字段' }, { status: 400 });
    }

    values.push(id);
    const sql = `UPDATE pioc_idc_device SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`;
    await query(sql, values);

    return NextResponse.json({ success: true, message: '设备更新成功' });
  } catch (error) {
    console.error('更新设备失败:', error);
    return NextResponse.json({ success: false, message: '更新设备失败', error: String(error) }, { status: 500 });
  }
}

// DELETE 请求处理 - 删除设备（下架）
async function deleteDeviceHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: '设备ID为必填项' }, { status: 400 });
    }

    // 直接查询数据库获取设备信息
    const existingResult = await query('SELECT * FROM pioc_idc_device WHERE id = ?', [id]);
    if (!Array.isArray(existingResult) || existingResult.length === 0) {
      return NextResponse.json({ success: false, message: '设备不存在' }, { status: 404 });
    }

    const deviceRaw = existingResult[0] as Record<string, unknown>;
    const cabinetId = deviceRaw.cabinet_id as string;
    const occupyU = (deviceRaw.occupy_u as number) || 1;
    const ratedPower = (deviceRaw.rated_power as number) || 0;

    // 开始事务
    await query('START TRANSACTION');
    
    try {
      // 删除设备
      await query('DELETE FROM pioc_idc_device WHERE id = ?', [id]);

      // 更新机柜的已用U数和功耗（直接查询数据库）
      const cabinetResult = await query('SELECT * FROM pioc_idc_cabinet WHERE id = ?', [cabinetId]);
      if (Array.isArray(cabinetResult) && cabinetResult.length > 0) {
        const cabinetRaw = cabinetResult[0] as Record<string, unknown>;
        const usedU = (cabinetRaw.used_u as number) || 0;
        const usedPower = (cabinetRaw.used_power as number) || 0;
        const newUsedU = Math.max(0, usedU - occupyU);
        const newUsedPower = Math.max(0, usedPower - ratedPower);
        
        await query(
          'UPDATE pioc_idc_cabinet SET used_u = ?, used_power = ?, updated_at = NOW() WHERE id = ?',
          [newUsedU, newUsedPower, cabinetId]
        );
      }

      await query('COMMIT');

      return NextResponse.json({ success: true, message: '设备下架成功' });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('删除设备失败:', error);
    return NextResponse.json({ success: false, message: '删除设备失败', error: String(error) }, { status: 500 });
  }
}

export const GET = createAppProtectedHandler(getDevicesHandler, appUrl);
export const POST = createAppProtectedHandler(createDeviceHandler, appUrl);
export const PUT = createAppProtectedHandler(updateDeviceHandler, appUrl);
export const DELETE = createAppProtectedHandler(deleteDeviceHandler, appUrl);
