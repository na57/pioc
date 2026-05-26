-- IDC机房管理应用数据库迁移脚本
-- 执行此脚本以在数据库中创建IDC机房管理应用所需的表

-- 设置字符集
SET NAMES utf8mb4;

-- 1. 注册应用（如果不存在）
INSERT IGNORE INTO pioc_apps (id, name, description, icon, url, status) VALUES
  (17, 'IDC机房管理', '管理机房基础设施、环境设备、机柜及设备信息', 'DatabaseOutlined', '/idc', 1);

-- 2. 为 admin 角色分配应用权限
INSERT IGNORE INTO pioc_role_apps (role_id, app_id) VALUES (1, 17);

-- 3. 创建机房表
CREATE TABLE IF NOT EXISTS pioc_idc_room (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '机房名称',
  code VARCHAR(50) NOT NULL COMMENT '机房编号',
  location VARCHAR(200) COMMENT '所在位置/地址',
  floor VARCHAR(50) COMMENT '楼层',
  area DECIMAL(10,2) COMMENT '面积（平方米）',
  fire_protection_info VARCHAR(500) COMMENT '消防系统信息',
  security_info VARCHAR(500) COMMENT '门禁/监控信息',
  contact_person VARCHAR(50) COMMENT '负责人',
  contact_phone VARCHAR(20) COMMENT '联系电话',
  built_date DATE COMMENT '建成时间',
  remark TEXT COMMENT '备注',
  status TINYINT DEFAULT 1 COMMENT '状态：1-启用，0-停用',
  sort_order INT DEFAULT 0 COMMENT '排序字段，数值越小越靠前',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_room_code (code),
  KEY idx_room_status (status),
  KEY idx_room_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='机房表';

-- 4. 创建机房空调表
CREATE TABLE IF NOT EXISTS pioc_idc_room_ac (
  id CHAR(36) PRIMARY KEY,
  room_id CHAR(36) NOT NULL COMMENT '所属机房ID',
  name VARCHAR(100) NOT NULL COMMENT '设备名称',
  model VARCHAR(100) COMMENT '型号',
  cooling_capacity DECIMAL(10,2) COMMENT '制冷量（KW）',
  asset_no VARCHAR(50) COMMENT '资产编号',
  status TINYINT DEFAULT 1 COMMENT '状态：1-运行，2-停机，3-故障，4-维修',
  remark TEXT COMMENT '备注',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_ac_room_id (room_id),
  KEY idx_ac_status (status),
  CONSTRAINT fk_ac_room FOREIGN KEY (room_id) REFERENCES pioc_idc_room(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='机房空调表';

-- 5. 创建机房UPS表
CREATE TABLE IF NOT EXISTS pioc_idc_room_ups (
  id CHAR(36) PRIMARY KEY,
  room_id CHAR(36) NOT NULL COMMENT '所属机房ID',
  name VARCHAR(100) NOT NULL COMMENT '设备名称',
  model VARCHAR(100) COMMENT '型号',
  capacity DECIMAL(10,2) COMMENT '容量（KVA）',
  asset_no VARCHAR(50) COMMENT '资产编号',
  status TINYINT DEFAULT 1 COMMENT '状态：1-运行，2-停机，3-故障，4-维修',
  remark TEXT COMMENT '备注',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_ups_room_id (room_id),
  KEY idx_ups_status (status),
  CONSTRAINT fk_ups_room FOREIGN KEY (room_id) REFERENCES pioc_idc_room(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='机房UPS表';

-- 6. 创建机房电池组表
CREATE TABLE IF NOT EXISTS pioc_idc_room_battery (
  id CHAR(36) PRIMARY KEY,
  room_id CHAR(36) NOT NULL COMMENT '所属机房ID',
  name VARCHAR(100) NOT NULL COMMENT '电池组名称',
  battery_count INT COMMENT '电池数量',
  total_capacity DECIMAL(10,2) COMMENT '总容量（AH）',
  asset_no VARCHAR(50) COMMENT '资产编号',
  status TINYINT DEFAULT 1 COMMENT '状态：1-正常，2-故障，3-更换中',
  remark TEXT COMMENT '备注',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_battery_room_id (room_id),
  KEY idx_battery_status (status),
  CONSTRAINT fk_battery_room FOREIGN KEY (room_id) REFERENCES pioc_idc_room(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='机房电池组表';

-- 7. 创建机房发电机表
CREATE TABLE IF NOT EXISTS pioc_idc_room_generator (
  id CHAR(36) PRIMARY KEY,
  room_id CHAR(36) NOT NULL COMMENT '所属机房ID',
  name VARCHAR(100) NOT NULL COMMENT '设备名称',
  model VARCHAR(100) COMMENT '型号',
  power DECIMAL(10,2) COMMENT '功率（KW）',
  asset_no VARCHAR(50) COMMENT '资产编号',
  status TINYINT DEFAULT 1 COMMENT '状态：1-待机，2-运行，3-故障，4-维修',
  remark TEXT COMMENT '备注',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_generator_room_id (room_id),
  KEY idx_generator_status (status),
  CONSTRAINT fk_generator_room FOREIGN KEY (room_id) REFERENCES pioc_idc_room(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='机房发电机表';

-- 8. 创建机柜表
CREATE TABLE IF NOT EXISTS pioc_idc_cabinet (
  id CHAR(36) PRIMARY KEY,
  room_id CHAR(36) NOT NULL COMMENT '所属机房ID',
  name VARCHAR(100) NOT NULL COMMENT '机柜名称',
  code VARCHAR(50) NOT NULL COMMENT '机柜编号',
  total_u INT NOT NULL DEFAULT 42 COMMENT '总U数',
  used_u INT DEFAULT 0 COMMENT '已用U数',
  rated_power DECIMAL(10,2) COMMENT '额定功耗（W）',
  used_power DECIMAL(10,2) DEFAULT 0 COMMENT '已分配功耗（W）',
  position VARCHAR(200) COMMENT '机房内位置描述',
  pdu_info VARCHAR(200) COMMENT 'PDU配置信息',
  status TINYINT DEFAULT 1 COMMENT '可用状态：1-可用，0-不可用',
  sort_order INT DEFAULT 0 COMMENT '排序字段，数值越小越靠前',
  remark TEXT COMMENT '备注',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_cabinet_code (code),
  KEY idx_cabinet_room_id (room_id),
  KEY idx_cabinet_status (status),
  KEY idx_cabinet_sort (sort_order),
  CONSTRAINT fk_cabinet_room FOREIGN KEY (room_id) REFERENCES pioc_idc_room(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='机柜表';

-- 9. 创建设备表
CREATE TABLE IF NOT EXISTS pioc_idc_device (
  id CHAR(36) PRIMARY KEY,
  cabinet_id CHAR(36) NOT NULL COMMENT '所属机柜ID',
  name VARCHAR(100) NOT NULL COMMENT '设备名称',
  device_type TINYINT NOT NULL COMMENT '设备类型：1-服务器，2-网络设备，3-安全设备，4-其他',
  brand_model VARCHAR(100) COMMENT '品牌型号',
  asset_no VARCHAR(50) COMMENT '资产编号',
  start_u INT NOT NULL COMMENT '起始U位',
  occupy_u INT NOT NULL DEFAULT 1 COMMENT '占用U数',
  rated_power DECIMAL(10,2) COMMENT '额定功耗（W）',
  status TINYINT DEFAULT 1 COMMENT '运行状态：1-运行，2-停机，3-故障，4-闲置',
  sort_order INT DEFAULT 0 COMMENT '排序字段，数值越小越靠前',
  online_date DATE COMMENT '上线时间',
  remark TEXT COMMENT '备注',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_device_cabinet_id (cabinet_id),
  KEY idx_device_type (device_type),
  KEY idx_device_status (status),
  KEY idx_device_start_u (start_u),
  KEY idx_device_sort (sort_order),
  CONSTRAINT fk_device_cabinet FOREIGN KEY (cabinet_id) REFERENCES pioc_idc_cabinet(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备表';

-- 验证插入结果
SELECT id, name, url, status FROM pioc_apps WHERE id = 17;
SELECT role_id, app_id FROM pioc_role_apps WHERE app_id = 17;
SHOW TABLES LIKE 'pioc_idc_%';
