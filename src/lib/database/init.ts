import { getPool } from './connection';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';

const initSQL = `
-- 创建用户表
CREATE TABLE IF NOT EXISTS pioc_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  status TINYINT DEFAULT 1 COMMENT '1-启用，0-禁用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建角色表
CREATE TABLE IF NOT EXISTS pioc_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),
  is_builtin TINYINT DEFAULT 0 COMMENT '1-内置角色，0-普通角色',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_is_builtin (is_builtin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建用户角色关联表
CREATE TABLE IF NOT EXISTS pioc_user_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  role_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_role (user_id, role_id),
  INDEX idx_user_id (user_id),
  INDEX idx_role_id (role_id),
  FOREIGN KEY (user_id) REFERENCES pioc_users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES pioc_roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建应用表
CREATE TABLE IF NOT EXISTS pioc_apps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),
  icon VARCHAR(100),
  url VARCHAR(255),
  status TINYINT DEFAULT 1 COMMENT '1-启用，0-禁用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建角色应用关联表
CREATE TABLE IF NOT EXISTS pioc_role_apps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,
  app_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_role_app (role_id, app_id),
  INDEX idx_role_id (role_id),
  INDEX idx_app_id (app_id),
  FOREIGN KEY (role_id) REFERENCES pioc_roles(id) ON DELETE CASCADE,
  FOREIGN KEY (app_id) REFERENCES pioc_apps(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建会话表
CREATE TABLE IF NOT EXISTS pioc_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(500) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_token (token(255)),
  INDEX idx_expires_at (expires_at),
  FOREIGN KEY (user_id) REFERENCES pioc_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建菜单表
CREATE TABLE IF NOT EXISTS pioc_menus (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  path VARCHAR(255) NOT NULL DEFAULT '',
  icon VARCHAR(100),
  parent_id INT DEFAULT NULL,
  sort_order INT DEFAULT 0,
  status TINYINT DEFAULT 1 COMMENT '1-启用，0-禁用',
  app_id INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_parent_id (parent_id),
  INDEX idx_status (status),
  INDEX idx_sort_order (sort_order),
  INDEX idx_app_id (app_id),
  FOREIGN KEY (parent_id) REFERENCES pioc_menus(id) ON DELETE CASCADE,
  FOREIGN KEY (app_id) REFERENCES pioc_apps(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建数据源表
CREATE TABLE IF NOT EXISTS pioc_data_sources (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(100) NOT NULL COMMENT '数据源名称',
  type VARCHAR(20) NOT NULL COMMENT '数据源类型：mysql, mongodb',
  host VARCHAR(255) NOT NULL COMMENT '主机地址',
  port INT NOT NULL COMMENT '端口号',
  username VARCHAR(100) NOT NULL COMMENT '用户名',
  password VARCHAR(255) NOT NULL COMMENT '密码',
  db_name VARCHAR(100) NOT NULL COMMENT '数据库名称',
  description VARCHAR(500) COMMENT '描述',
  status TINYINT DEFAULT 1 COMMENT '1-启用，0-禁用',
  created_by INT NOT NULL COMMENT '创建者用户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_type (type),
  INDEX idx_status (status),
  INDEX idx_created_by (created_by),
  FOREIGN KEY (created_by) REFERENCES pioc_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建密钥表
CREATE TABLE IF NOT EXISTS pioc_keys (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(100) NOT NULL COMMENT '密钥名称',
  type VARCHAR(10) NOT NULL COMMENT '密钥类型：RSA, ECC, EdDSA',
  key_size INT DEFAULT NULL COMMENT '密钥长度（RSA使用）',
  curve VARCHAR(20) DEFAULT NULL COMMENT '曲线名称（ECC/EdDSA使用）',
  public_key TEXT NOT NULL COMMENT '公钥',
  private_key TEXT NOT NULL COMMENT '私钥',
  description VARCHAR(500) COMMENT '描述',
  user_id INT NOT NULL COMMENT '创建用户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_type (type),
  INDEX idx_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES pioc_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建数据对象表
CREATE TABLE IF NOT EXISTS pioc_data_objects (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '数据对象名称',
  description VARCHAR(500) COMMENT '数据对象描述',
  data_source_id CHAR(36) NOT NULL COMMENT '数据源ID',
  query_statement TEXT NOT NULL COMMENT '查询语句',
  primary_key VARCHAR(100) NOT NULL COMMENT '主键字段名',
  display_template VARCHAR(500) DEFAULT '{{id}}' COMMENT '显示模板',
  status TINYINT DEFAULT 1 COMMENT '1-启用，0-禁用',
  created_by INT NOT NULL COMMENT '创建者ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_data_source_id (data_source_id),
  INDEX idx_status (status),
  INDEX idx_created_by (created_by),
  FOREIGN KEY (data_source_id) REFERENCES pioc_data_sources(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES pioc_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建标签组表
CREATE TABLE IF NOT EXISTS pioc_tag_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '标签组名称',
  code VARCHAR(50) NOT NULL UNIQUE COMMENT '标签组编码',
  description VARCHAR(500) COMMENT '标签组描述',
  color VARCHAR(20) DEFAULT NULL COMMENT '标签组颜色',
  sort_order INT DEFAULT 0 COMMENT '排序顺序',
  status TINYINT DEFAULT 1 COMMENT '1-启用，0-禁用',
  created_by INT NOT NULL COMMENT '创建者用户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_code (code),
  INDEX idx_status (status),
  INDEX idx_created_by (created_by),
  FOREIGN KEY (created_by) REFERENCES pioc_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建标签表
CREATE TABLE IF NOT EXISTS pioc_tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '标签名称',
  code VARCHAR(50) NOT NULL UNIQUE COMMENT '标签编码',
  color VARCHAR(20) DEFAULT '#1890ff' COMMENT '标签颜色',
  description VARCHAR(500) COMMENT '标签描述',
  status TINYINT DEFAULT 1 COMMENT '1-启用，0-禁用',
  created_by INT NOT NULL COMMENT '创建者用户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_code (code),
  INDEX idx_status (status),
  INDEX idx_created_by (created_by),
  FOREIGN KEY (created_by) REFERENCES pioc_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建标签与标签组关联表
CREATE TABLE IF NOT EXISTS pioc_tag_group_relations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tag_id INT NOT NULL COMMENT '标签ID',
  group_id INT NOT NULL COMMENT '标签组ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_tag_group (tag_id, group_id),
  INDEX idx_tag_id (tag_id),
  INDEX idx_group_id (group_id),
  FOREIGN KEY (tag_id) REFERENCES pioc_tags(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES pioc_tag_groups(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建打标作业表
CREATE TABLE IF NOT EXISTS pioc_labeling_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '作业名称',
  description VARCHAR(500) COMMENT '作业描述',
  data_object_id BIGINT NOT NULL COMMENT '数据对象ID',
  tag_group_id INT NOT NULL COMMENT '标签组ID',
  status TINYINT DEFAULT 1 COMMENT '1-进行中，0-已结束',
  created_by INT NOT NULL COMMENT '创建者ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_data_object_id (data_object_id),
  INDEX idx_tag_group_id (tag_group_id),
  INDEX idx_status (status),
  INDEX idx_created_by (created_by),
  FOREIGN KEY (data_object_id) REFERENCES pioc_data_objects(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_group_id) REFERENCES pioc_tag_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES pioc_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建打标作业协作者表
CREATE TABLE IF NOT EXISTS pioc_labeling_task_collaborators (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL COMMENT '作业ID',
  user_id INT NOT NULL COMMENT '协作者用户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_task_user (task_id, user_id),
  INDEX idx_task_id (task_id),
  INDEX idx_user_id (user_id),
  FOREIGN KEY (task_id) REFERENCES pioc_labeling_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES pioc_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建打标结果表
CREATE TABLE IF NOT EXISTS pioc_labeling_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL COMMENT '作业ID',
  data_object_id BIGINT NOT NULL COMMENT '数据对象ID',
  data_entry_id VARCHAR(255) NOT NULL COMMENT '数据条目ID',
  tag_id INT NOT NULL COMMENT '标签ID',
  created_by INT NOT NULL COMMENT '打标用户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_task_id (task_id),
  INDEX idx_data_object_id (data_object_id),
  INDEX idx_data_entry_id (data_entry_id),
  INDEX idx_tag_id (tag_id),
  INDEX idx_created_by (created_by),
  FOREIGN KEY (task_id) REFERENCES pioc_labeling_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES pioc_tags(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES pioc_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认角色（内置角色）
INSERT IGNORE INTO pioc_roles (id, name, description, is_builtin) VALUES
  (1, 'admin', '系统管理员', 1),
  (2, 'user', '普通用户', 1),
  (3, 'guest', '访客', 1);

-- 插入内置应用（用户管理、角色管理、应用管理、菜单管理、我的应用）
INSERT IGNORE INTO pioc_apps (id, name, description, icon, url, status) VALUES
  (1, '用户管理', '管理系统用户，包括用户的增删改查和角色分配', 'UserOutlined', '/users', 1),
  (2, '角色管理', '管理系统角色，包括角色的增删改查、用户分配和应用权限分配', 'TeamOutlined', '/roles', 1),
  (3, '应用管理', '管理系统应用，包括应用的增删改查和权限控制', 'AppstoreOutlined', '/apps', 1),
  (4, '菜单管理', '管理系统顶部导航菜单，支持多级菜单配置', 'MenuOutlined', '/menus', 1),
  (5, '我的应用', '以卡片方式展示当前登录用户有权限的应用，可点击进入', 'AppstoreOutlined', '/my-apps', 1),
  (6, '数据源管理', '管理MySQL、MongoDB等数据源的基本信息', 'DatabaseOutlined', '/data-sources', 1),
  (7, '密钥管理', '创建和管理RSA、ECC、EdDSA等类型的密钥', 'KeyOutlined', '/key-management', 1),
  (8, '本科教师授课情况', '查看本科教师授课信息明细，支持按学年学期、教工号、教师姓名筛选', 'ReadOutlined', '/teacher-teaching', 1),
  (9, '我的授课', '查看当前登录用户的授课情况，支持按学年学期筛选', 'BookOutlined', '/my-teaching', 1),
  (10, '数据对象管理', '管理数据对象，配置外部数据源查询', 'DatabaseOutlined', '/data-objects', 1),
  (11, '标签管理', '管理系统标签，包括标签的增删改查和分组管理', 'TagsOutlined', '/tags', 1),
  (12, '打标作业', '创建和管理数据打标作业，支持多人协作打标', 'FlagOutlined', '/labeling-tasks', 1);

-- 插入默认菜单
INSERT IGNORE INTO pioc_menus (id, name, path, icon, parent_id, sort_order, status, app_id) VALUES
  (1, '控制台', '/dashboard', 'HomeOutlined', NULL, 1, 1, NULL),
  (2, '管理', '', 'DatabaseOutlined', NULL, 2, 1, NULL),
  (3, '用户管理', '/users', 'UserOutlined', 2, 1, 1, 1),
  (4, '角色管理', '/roles', 'TeamOutlined', 2, 2, 1, 2),
  (5, '应用管理', '/apps', 'AppstoreOutlined', 2, 3, 1, 3),
  (6, '菜单管理', '/menus', 'MenuOutlined', 2, 4, 1, 4);
`;

export async function initializeDatabase() {
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    const statements = initSQL.split(';').filter(s => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await connection.execute(statement);
      }
    }

    // 创建默认管理员账号
    await createDefaultAdmin(connection);

    // 为admin角色分配所有内置应用的权限
    await assignDefaultAppPermissions(connection);

    // 为admin角色分配菜单管理应用权限
    await assignMenuAppPermission(connection);

    // 为admin角色分配其他预装应用权限
    await assignAdditionalAppPermissions(connection);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  } finally {
    connection.release();
  }
}

async function createDefaultAdmin(connection: mysql.PoolConnection) {
  try {
    // 检查是否已存在 admin 账号
    const [existingAdmin] = await connection.execute<mysql.RowDataPacket[]>(
      'SELECT id FROM pioc_users WHERE username = ?',
      ['admin']
    );

    if (existingAdmin && existingAdmin.length > 0) {
      console.log('Default admin account already exists');
      return;
    }

    // 生成密码哈希
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // 插入默认管理员账号
    const [result] = await connection.execute<mysql.ResultSetHeader>(
      'INSERT INTO pioc_users (username, email, password, name, status) VALUES (?, ?, ?, ?, ?)',
      ['admin', 'admin@pioc.local', hashedPassword, '系统管理员', 1]
    );

    const adminUserId = result.insertId;

    // 分配管理员角色 (role_id = 1 是 admin 角色)
    await connection.execute(
      'INSERT INTO pioc_user_roles (user_id, role_id) VALUES (?, ?)',
      [adminUserId, 1]
    );

    console.log('Default admin account created successfully');
  } catch (error) {
    console.error('Failed to create default admin account:', error);
    throw error;
  }
}

async function assignDefaultAppPermissions(connection: mysql.PoolConnection) {
  try {
    // 为 admin 角色分配所有内置应用的权限（应用ID 1, 2, 3）
    const builtinAppIds = [1, 2, 3];
    for (const appId of builtinAppIds) {
      await connection.execute(
        'INSERT IGNORE INTO pioc_role_apps (role_id, app_id) VALUES (?, ?)',
        [1, appId] // role_id = 1 是 admin 角色
      );
    }
    console.log('Default app permissions assigned to admin role');
  } catch (error) {
    console.error('Failed to assign default app permissions:', error);
    throw error;
  }
}

async function assignMenuAppPermission(connection: mysql.PoolConnection) {
  try {
    // 为 admin 角色分配菜单管理应用权限（应用ID 4）
    await connection.execute(
      'INSERT IGNORE INTO pioc_role_apps (role_id, app_id) VALUES (?, ?)',
      [1, 4] // role_id = 1 是 admin 角色, app_id = 4 是菜单管理
    );
    console.log('Menu app permission assigned to admin role');
  } catch (error) {
    console.error('Failed to assign menu app permission:', error);
    throw error;
  }
}

async function assignAdditionalAppPermissions(connection: mysql.PoolConnection) {
  try {
    // 为 admin 角色分配其他预装应用权限（应用ID 5, 6, 7, 8, 9, 10, 11, 12）
    const additionalAppIds = [5, 6, 7, 8, 9, 10, 11, 12];
    for (const appId of additionalAppIds) {
      await connection.execute(
        'INSERT IGNORE INTO pioc_role_apps (role_id, app_id) VALUES (?, ?)',
        [1, appId] // role_id = 1 是 admin 角色
      );
    }
    console.log('Additional app permissions assigned to admin role');
  } catch (error) {
    console.error('Failed to assign additional app permissions:', error);
    throw error;
  }
}

export default initializeDatabase;
