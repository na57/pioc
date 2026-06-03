/**
 * IDC机房管理应用配置
 * 使用通用数据访问框架 - 工厂模式
 */

import {
  TableConfig,
  AppBaseConfig,
  AIConfig,
  createAppConfigBundle,
  createQueryFunction,
  BaseDataService,
  QueryOptions,
  QueryResult,
} from '@/lib/data-framework';

// ============================================
// 字段映射类型定义
// ============================================

export interface RoomFieldMapping extends Record<string, string> {
  id: string;
  name: string;
  code: string;
  location: string;
  floor: string;
  area: string;
  fireProtectionInfo: string;
  securityInfo: string;
  contactPerson: string;
  contactPhone: string;
  builtDate: string;
  remark: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoomAcFieldMapping extends Record<string, string> {
  id: string;
  roomId: string;
  name: string;
  model: string;
  coolingCapacity: string;
  assetNo: string;
  status: string;
  remark: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoomUpsFieldMapping extends Record<string, string> {
  id: string;
  roomId: string;
  name: string;
  model: string;
  capacity: string;
  assetNo: string;
  status: string;
  remark: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoomBatteryFieldMapping extends Record<string, string> {
  id: string;
  roomId: string;
  name: string;
  batteryCount: string;
  totalCapacity: string;
  assetNo: string;
  status: string;
  remark: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoomGeneratorFieldMapping extends Record<string, string> {
  id: string;
  roomId: string;
  name: string;
  model: string;
  power: string;
  assetNo: string;
  status: string;
  remark: string;
  createdAt: string;
  updatedAt: string;
}

export interface CabinetFieldMapping extends Record<string, string> {
  id: string;
  roomId: string;
  name: string;
  code: string;
  totalU: string;
  usedU: string;
  ratedPower: string;
  usedPower: string;
  position: string;
  pduInfo: string;
  status: string;
  remark: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceFieldMapping extends Record<string, string> {
  id: string;
  cabinetId: string;
  name: string;
  deviceType: string;
  brandModel: string;
  assetNo: string;
  startU: string;
  occupyU: string;
  ratedPower: string;
  status: string;
  onlineDate: string;
  remark: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// 应用配置类型
// ============================================

export interface IdcRoomConfig extends AppBaseConfig {
  ai?: AIConfig;
  tables: {
    room: TableConfig<RoomFieldMapping>;
    roomAc: TableConfig<RoomAcFieldMapping>;
    roomUps: TableConfig<RoomUpsFieldMapping>;
    roomBattery: TableConfig<RoomBatteryFieldMapping>;
    roomGenerator: TableConfig<RoomGeneratorFieldMapping>;
    cabinet: TableConfig<CabinetFieldMapping>;
    device: TableConfig<DeviceFieldMapping>;
  };
}

// ============================================
// 默认配置
// ============================================

const defaultConfig: IdcRoomConfig = {
  dataSourceId: '1',
  ai: {
    providerId: 'openai',
    model: 'gpt-4o',
  },
  tables: {
    room: {
      name: 'pioc_idc_room',
      fields: {
        id: 'id',
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
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    },
    roomAc: {
      name: 'pioc_idc_room_ac',
      fields: {
        id: 'id',
        roomId: 'room_id',
        name: 'name',
        model: 'model',
        coolingCapacity: 'cooling_capacity',
        assetNo: 'asset_no',
        status: 'status',
        remark: 'remark',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    },
    roomUps: {
      name: 'pioc_idc_room_ups',
      fields: {
        id: 'id',
        roomId: 'room_id',
        name: 'name',
        model: 'model',
        capacity: 'capacity',
        assetNo: 'asset_no',
        status: 'status',
        remark: 'remark',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    },
    roomBattery: {
      name: 'pioc_idc_room_battery',
      fields: {
        id: 'id',
        roomId: 'room_id',
        name: 'name',
        batteryCount: 'battery_count',
        totalCapacity: 'total_capacity',
        assetNo: 'asset_no',
        status: 'status',
        remark: 'remark',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    },
    roomGenerator: {
      name: 'pioc_idc_room_generator',
      fields: {
        id: 'id',
        roomId: 'room_id',
        name: 'name',
        model: 'model',
        power: 'power',
        assetNo: 'asset_no',
        status: 'status',
        remark: 'remark',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    },
    cabinet: {
      name: 'pioc_idc_cabinet',
      fields: {
        id: 'id',
        roomId: 'room_id',
        name: 'name',
        code: 'code',
        totalU: 'total_u',
        usedU: 'used_u',
        ratedPower: 'rated_power',
        usedPower: 'used_power',
        position: 'position',
        pduInfo: 'pdu_info',
        status: 'status',
        remark: 'remark',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    },
    device: {
      name: 'pioc_idc_device',
      fields: {
        id: 'id',
        cabinetId: 'cabinet_id',
        name: 'name',
        deviceType: 'device_type',
        brandModel: 'brand_model',
        assetNo: 'asset_no',
        startU: 'start_u',
        occupyU: 'occupy_u',
        ratedPower: 'rated_power',
        status: 'status',
        onlineDate: 'online_date',
        remark: 'remark',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    },
  },
};

// ============================================
// 使用工厂创建应用配置包
// ============================================

const appBundle = createAppConfigBundle<IdcRoomConfig>({
  defaultConfig,
  configFileName: 'idc-room.yaml',
  legacyConfigPath: 'apps.idcRoom',
});

const { configLoader, queryService } = appBundle;

// ============================================
// 创建通用查询函数
// ============================================

const queryTable = createQueryFunction<IdcRoomConfig>(configLoader, queryService);

// ============================================
// 便捷 API
// ============================================

export function getIdcRoomConfigLoader() {
  return configLoader;
}

export function getIdcRoomQueryService() {
  return queryService;
}

/**
 * 加载IDC机房配置
 */
export function loadIdcRoomConfig(): IdcRoomConfig {
  return appBundle.loadConfig();
}

/**
 * 获取IDC机房配置
 */
export function getIdcRoomConfig(): IdcRoomConfig {
  return appBundle.getConfig();
}

/**
 * 通用查询接口
 */
export async function queryIdcRoomTable<T = Record<string, unknown>>(
  tableName: keyof IdcRoomConfig['tables'],
  options: QueryOptions = {}
): Promise<QueryResult<T>> {
  return queryTable<T>(tableName, options);
}

// ============================================
// 数据服务类
// ============================================

export class IdcRoomDataService extends BaseDataService<IdcRoomConfig> {
  /**
   * 查询机房列表
   */
  async queryRooms(page = 1, pageSize = 10, where?: Record<string, unknown>) {
    return queryIdcRoomTable('room', {
      page,
      perPage: pageSize,
      where,
      orderBy: 'sort_order ASC, created_at DESC',
    });
  }

  /**
   * 根据ID查询机房
   */
  async queryRoomById(id: string) {
    return queryIdcRoomTable('room', {
      where: { id },
    });
  }

  /**
   * 查询机房的空调列表
   */
  async queryRoomAcList(roomId: string) {
    return queryIdcRoomTable('roomAc', {
      where: { roomId },
      orderBy: 'created_at DESC',
    });
  }

  /**
   * 查询机房的UPS列表
   */
  async queryRoomUpsList(roomId: string) {
    return queryIdcRoomTable('roomUps', {
      where: { roomId },
      orderBy: 'created_at DESC',
    });
  }

  /**
   * 查询机房的电池组列表
   */
  async queryRoomBatteryList(roomId: string) {
    return queryIdcRoomTable('roomBattery', {
      where: { roomId },
      orderBy: 'created_at DESC',
    });
  }

  /**
   * 查询机房的发电机列表
   */
  async queryRoomGeneratorList(roomId: string) {
    return queryIdcRoomTable('roomGenerator', {
      where: { roomId },
      orderBy: 'created_at DESC',
    });
  }

  /**
   * 查询机柜列表
   */
  async queryCabinets(page = 1, pageSize = 10, where?: Record<string, unknown>) {
    return queryIdcRoomTable('cabinet', {
      page,
      perPage: pageSize,
      where,
      orderBy: 'sort_order ASC, code ASC',
    });
  }

  /**
   * 根据ID查询机柜
   */
  async queryCabinetById(id: string) {
    return queryIdcRoomTable('cabinet', {
      where: { id },
    });
  }

  /**
   * 查询机房的机柜列表
   */
  async queryCabinetsByRoomId(roomId: string) {
    return queryIdcRoomTable('cabinet', {
      where: { roomId },
      orderBy: 'sort_order ASC, code ASC',
    });
  }

  /**
   * 查询机柜内的设备列表
   */
  async queryDevicesByCabinetId(cabinetId: string) {
    return queryIdcRoomTable('device', {
      where: { cabinetId },
      orderBy: 'sort_order ASC, start_u DESC',
    });
  }

  /**
   * 查询设备列表
   */
  async queryDevices(page = 1, pageSize = 10, where?: Record<string, unknown>) {
    return queryIdcRoomTable('device', {
      page,
      perPage: pageSize,
      where,
      orderBy: 'sort_order ASC, created_at DESC',
    });
  }

  /**
   * 根据ID查询设备
   */
  async queryDeviceById(id: string) {
    return queryIdcRoomTable('device', {
      where: { id },
    });
  }
}

// 导出默认实例
export const idcRoomDataService = new IdcRoomDataService(configLoader, queryService);

export default configLoader;
