---
name: "create-app"
description: "Guides developers through creating a new application in PIOC platform including frontend, backend, database registration, and permission setup. Invoke when user wants to create/add a new application to the system."
---

# 创建新应用指南

本Skill指导开发者在PIOC平台中创建新应用的完整流程。

## 前置条件

在开始创建应用前，请确保：
1. 已了解应用的功能需求和业务逻辑
2. 已确定应用的访问路径（URL）
3. 已确定应用所需的权限控制级别

## 应用类型说明

PIOC平台有两种应用类型：

### 内置应用（Built-in Apps）
- **ID范围**: 1-4
- **特点**: 系统核心应用，受保护，不允许删除，名称和URL不可修改
- **包含**: 用户管理、角色管理、应用管理、菜单管理

### 预装应用（Pre-installed Apps）
- **ID范围**: 5及以上
- **特点**: 系统预装的普通应用，硬编码在系统中，但可以被删除和修改
- **与普通应用的区别**: 在系统初始化时自动创建，有固定的ID和URL

## 创建步骤

### 1. 在应用管理中注册应用

**数据库表**: `pioc_apps`（应用信息表）

应用注册通过直接操作数据库完成，需要在两个地方添加应用信息：

#### A. 系统初始化脚本（必须）

**文件位置**: `src/lib/database/init.ts`

在 `initSQL` 变量中找到插入应用的SQL语句，添加新应用：

```sql
-- 插入预装应用（ID从5开始）
INSERT IGNORE INTO pioc_apps (id, name, description, icon, url, status) VALUES
  (5, '你的应用名称', '应用描述', 'AppstoreOutlined', '/your-app-path', 1);
```

**注意**:
- 使用 `INSERT IGNORE` 避免重复插入
- 为新应用分配唯一的ID（从5开始，1-4为系统内置应用保留）
- `icon` 使用Ant Design图标组件名称

#### B. 更新预装应用常量（必须）

**文件位置**: `src/lib/database/models/app.ts`

在 `PREINSTALLED_APPS` 和 `PREINSTALLED_APP_URLS` 中添加新应用：

```typescript
// 预装应用ID常量（普通应用，可删除和修改）
export const PREINSTALLED_APPS = {
  YOUR_APP: 5,           // 你的应用
} as const;

// 预装应用URL映射
export const PREINSTALLED_APP_URLS = {
  '/your-app-path': PREINSTALLED_APPS.YOUR_APP,
} as const;
```

同时，确保 `isPreinstalledApp` 和 `getPreinstalledAppIdByUrl` 函数正确实现：

```typescript
// 检查是否为预装应用
export function isPreinstalledApp(appId: number): boolean {
  return Object.values(PREINSTALLED_APPS).includes(appId as any);
}

// 根据URL获取预装应用ID
export function getPreinstalledAppIdByUrl(url: string): number | null {
  return PREINSTALLED_APP_URLS[url as keyof typeof PREINSTALLED_APP_URLS] || null;
}
```

#### C. 开发环境直接插入（必须）

⚠️ **重要**: 除了在初始化脚本中注册应用外，**在创建应用时还必须直接向数据库插入应用记录**。这是为了：
- **开发调试**: 开发环境数据库已初始化，需要立即看到应用
- **重新部署**: 初始化脚本用于新环境自动创建应用

**执行SQL**:
```sql
INSERT INTO pioc_apps (id, name, description, icon, url, status) 
VALUES (5, '应用名称', '应用描述', 'AppstoreOutlined', '/your-app-path', 1);
```

**执行方式**（选择其一）:
1. **使用docker命令**（推荐）:
   ```bash
   docker exec -it mysql mysql -uroot -proot123 -e "SET NAMES utf8mb4; INSERT INTO mydb.pioc_apps (id, name, description, icon, url, status) VALUES (5, '应用名称', '应用描述', 'AppstoreOutlined', '/your-app-path', 1);"
   ```

2. **使用数据库客户端**: 直接连接MySQL执行SQL

3. **创建脚本执行**: 创建临时脚本执行插入操作

**⚠️ 重要：字符集设置**
执行SQL前必须设置字符集为 `utf8mb4`，否则中文会显示为乱码：
```sql
SET NAMES utf8mb4;
```

**验证插入成功**:
```bash
docker exec -it mysql mysql -uroot -proot123 -e "SET NAMES utf8mb4; SELECT id, name, url FROM mydb.pioc_apps WHERE id = 5;"
```

**重要字段说明**:
- `id`: 应用唯一标识（从5开始）
- `name`: 应用名称（唯一，必填）
- `description`: 应用描述
- `icon`: 图标名称（使用Ant Design图标）
- `url`: 应用访问路径（如 `/your-app`）
- `status`: 状态（1-启用，0-禁用）

### 2. 创建前端页面

**文件位置**: `src/app/{your-app-path}/page.tsx`

创建应用的主页面：

```tsx
'use client';

import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

export default function YourAppPage() {
  return (
    <div>
      <Title level={2}>应用标题</Title>
      <Card>
        {/* 应用内容 */}
      </Card>
    </div>
  );
}
```

**创建布局文件**（必须）:

**文件位置**: `src/app/{your-app-path}/layout.tsx`

所有应用都必须使用 `AppLayout` 布局，以保持统一的页面结构（包含顶部导航栏）：

```tsx
import AppLayout from '@/components/layout/AppLayout';

export default function YourAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
```

**注意**: 如果不创建布局文件，页面将不会显示顶部导航菜单，用户无法在不同应用间切换。

### 3. 创建API接口

**文件位置**: `src/app/api/{your-api-path}/route.ts`

创建RESTful API：

```tsx
import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';

const appUrl = '/your-app-path'; // 与应用注册时的URL一致

// GET 请求处理
async function getHandler(request: NextRequest) {
  try {
    // 业务逻辑
    const data = await fetchYourData();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch data', error: String(error) },
      { status: 500 }
    );
  }
}

// POST 请求处理
async function postHandler(request: NextRequest) {
  try {
    const body = await request.json();
    // 业务逻辑
    const result = await createYourData(body);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to create data', error: String(error) },
      { status: 500 }
    );
  }
}

// 使用应用权限保护
export const GET = createAppProtectedHandler(getHandler, appUrl);
export const POST = createAppProtectedHandler(postHandler, appUrl);
```

**带参数的API**（如 `/api/items/[id]`）:
```tsx
// src/app/api/items/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';

const appUrl = '/your-app-path';

async function getItemHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // 业务逻辑
    const data = await fetchItemById(id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch item', error: String(error) },
      { status: 500 }
    );
  }
}

type HandlerFunction = (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<NextResponse>;

const wrapHandler = (handler: HandlerFunction) => {
  return async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const protectedHandler = createAppProtectedHandler(
      (req: NextRequest) => handler(req, context),
      appUrl
    );
    return protectedHandler(request, context);
  };
};

export const GET = wrapHandler(getItemHandler);
```

### 4. 权限管理（应用创建后配置）

**数据库表**: `pioc_role_apps`（角色应用权限关联表）

⚠️ **注意**: 应用创建时**不分配任何权限**，需要在应用创建完成后手动配置：

**配置方式**:
- 访问 `/roles` 页面
- 选择需要授权的角色
- 在"应用权限"选项卡中勾选新创建的应用
- 保存设置

**权限验证机制**:
- API使用 `createAppProtectedHandler` 包装器自动验证权限
- 用户必须拥有对应应用的权限才能访问API
- 无权限访问会返回 403 错误

### 5. 添加菜单项（应用创建后配置）

**数据库表**: `pioc_menus`（菜单表）

⚠️ **注意**: 应用创建时**不添加任何菜单项**，需要在应用创建完成后手动配置：

**配置方式**:
- 访问 `/menus` 页面
- 选择父菜单组
- 点击"添加应用"
- 选择新创建的应用

### 6. 创建应用配置（使用数据框架）⚡ 推荐

**文件位置**: `src/lib/config/{your-app}.ts`

使用通用数据访问框架创建应用配置，这是推荐的标准做法：

```typescript
/**
 * {应用名称}配置
 * 使用通用数据访问框架
 */

import {
  TableConfig,
  AppBaseConfig,
  createConfigLoader,
  createDataQueryService,
  QueryOptions,
  QueryResult,
} from '@/lib/data-framework';

// ============================================
// 字段映射类型定义
// ============================================

export interface ExampleFieldMapping extends Record<string, string> {
  id: string;
  name: string;
  // 其他字段映射：应用字段名 -> 数据库字段名
}

// ============================================
// 应用配置类型
// ============================================

export interface {AppName}Config extends AppBaseConfig {
  tables: {
    exampleTable: TableConfig<ExampleFieldMapping>;
    // 更多表配置...
  };
}

// ============================================
// 默认配置
// ============================================

const defaultConfig: {AppName}Config = {
  dataSourceId: '1', // 默认数据源ID
  tables: {
    exampleTable: {
      name: 't_example_table', // 数据库表名
      // dataObjectId: 1,      // 或使用数据对象ID（二选一）
      // dataSourceId: '2',    // 可选：覆盖全局数据源
      fields: {
        id: 'id',
        name: 'name',
        // 字段映射：应用字段名 -> 数据库字段名
      },
    },
  },
};

// ============================================
// 创建配置加载器和查询服务
// ============================================

const configLoader = createConfigLoader<{AppName}Config>(defaultConfig, {
  configFileName: '{your-app}.yaml',
  legacyConfigPath: 'apps.{yourAppName}',
});

const queryService = createDataQueryService(configLoader.getDataSourceId());

// ============================================
// 向后兼容的 API
// ============================================

export function load{AppName}Config(): {AppName}Config {
  return configLoader.load();
}

export function get{AppName}Config(): {AppName}Config {
  return configLoader.getConfig();
}

// ============================================
// 新的便捷 API
// ============================================

export function get{AppName}ConfigLoader() {
  return configLoader;
}

export function get{AppName}QueryService() {
  return queryService;
}

/**
 * 通用查询接口
 */
export async function query{AppName}Table<T = Record<string, unknown>>(
  tableName: keyof {AppName}Config['tables'],
  options: QueryOptions = {}
): Promise<QueryResult<T>> {
  const tableConfig = configLoader.getTableConfig(tableName);
  return queryService.queryByTableConfig<T>(tableConfig, options);
}

// ============================================
// 数据服务类
// ============================================

export class {AppName}DataService {
  private configLoader = configLoader;
  private queryService = queryService;

  /**
   * 查询示例表数据
   */
  async queryExampleData(page = 1, pageSize = 10) {
    return query{AppName}Table('exampleTable', {
      page,
      perPage: pageSize,
      orderBy: 'id DESC',
    });
  }

  /**
   * 根据ID查询
   */
  async queryById(id: string) {
    return query{AppName}Table('exampleTable', {
      where: { id },
    });
  }

  /**
   * 重新加载配置
   */
  reloadConfig() {
    this.configLoader.reload();
    const newDataSourceId = this.configLoader.getDataSourceId();
    if (newDataSourceId) {
      this.queryService.setGlobalDataSourceId(newDataSourceId);
    }
  }
}

// 导出默认实例
export const {appName}DataService = new {AppName}DataService();

export default configLoader;
```

### 7. 创建数据模型（可选，推荐用数据框架替代）

**文件位置**: `src/lib/database/models/{your-model}.ts`

⚠️ **注意**: 推荐使用上面的数据框架配置方式，不再需要单独创建数据模型文件。

如果确实需要，可以这样创建：

```tsx
import { query } from '../connection';

export interface YourModel {
  id: number;
  name: string;
  // 其他字段
  created_at: Date;
  updated_at: Date;
}

export async function findAll(): Promise<YourModel[]> {
  return query<YourModel[]>('SELECT * FROM pioc_your_table ORDER BY created_at DESC');
}
```

## 完整示例

创建一个名为"图书管理"的预装应用，使用数据框架：

### 1. 注册应用

**在 `src/lib/database/init.ts` 中添加**:
```sql
INSERT IGNORE INTO pioc_apps (id, name, description, icon, url, status) VALUES
  ...
  (5, '图书管理', '管理系统图书信息', 'BookOutlined', '/books', 1);
```

**在 `src/lib/database/models/app.ts` 中添加**:
```typescript
// 预装应用ID常量
export const PREINSTALLED_APPS = {
  ...
  BOOK_MANAGEMENT: 5,    // 图书管理
} as const;

// 预装应用URL映射
export const PREINSTALLED_APP_URLS = {
  ...
  '/books': PREINSTALLED_APPS.BOOK_MANAGEMENT,
} as const;

// 检查是否为预装应用
export function isPreinstalledApp(appId: number): boolean {
  return Object.values(PREINSTALLED_APPS).includes(appId as any);
}

// 根据URL获取预装应用ID
export function getPreinstalledAppIdByUrl(url: string): number | null {
  return PREINSTALLED_APP_URLS[url as keyof typeof PREINSTALLED_APP_URLS] || null;
}
```

### 2. 创建应用配置（使用数据框架）⭐

**文件位置**: `src/lib/config/books.ts`

```typescript
/**
 * 图书管理应用配置
 * 使用通用数据访问框架
 */

import {
  TableConfig,
  AppBaseConfig,
  createConfigLoader,
  createDataQueryService,
  QueryOptions,
  QueryResult,
} from '@/lib/data-framework';

// ============================================
// 字段映射类型定义
// ============================================

export interface BookFieldMapping extends Record<string, string> {
  bookId: string;
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  publishDate: string;
  category: string;
  status: string;
  location: string;
}

// ============================================
// 应用配置类型
// ============================================

export interface BooksConfig extends AppBaseConfig {
  tables: {
    books: TableConfig<BookFieldMapping>;
  };
}

// ============================================
// 默认配置
// ============================================

const defaultConfig: BooksConfig = {
  dataSourceId: '1', // 默认数据源ID
  tables: {
    books: {
      name: 't_books', // 数据库表名
      fields: {
        bookId: 'id',
        title: 'title',
        author: 'author',
        isbn: 'isbn',
        publisher: 'publisher',
        publishDate: 'publish_date',
        category: 'category',
        status: 'status',
        location: 'location',
      },
    },
  },
};

// ============================================
// 创建配置加载器和查询服务
// ============================================

const configLoader = createConfigLoader<BooksConfig>(defaultConfig, {
  configFileName: 'books.yaml',
  legacyConfigPath: 'apps.books',
});

const queryService = createDataQueryService(configLoader.getDataSourceId());

// ============================================
// 便捷 API
// ============================================

export function getBooksConfigLoader() {
  return configLoader;
}

export function getBooksQueryService() {
  return queryService;
}

/**
 * 通用查询接口
 */
export async function queryBooksTable<T = Record<string, unknown>>(
  tableName: keyof BooksConfig['tables'],
  options: QueryOptions = {}
): Promise<QueryResult<T>> {
  const tableConfig = configLoader.getTableConfig(tableName);
  return queryService.queryByTableConfig<T>(tableConfig, options);
}

// ============================================
// 数据服务类
// ============================================

export class BooksDataService {
  private configLoader = configLoader;
  private queryService = queryService;

  /**
   * 查询图书列表
   */
  async queryBooks(page = 1, pageSize = 10) {
    return queryBooksTable('books', {
      page,
      perPage: pageSize,
      orderBy: 'publish_date DESC',
    });
  }

  /**
   * 根据ID查询图书
   */
  async queryBookById(bookId: string) {
    return queryBooksTable('books', {
      where: { bookId },
    });
  }

  /**
   * 搜索图书
   */
  async searchBooks(keyword: string, page = 1, pageSize = 10) {
    // 使用自定义查询
    const tableConfig = this.configLoader.getTableConfig('books');
    return this.queryService.executeRawQuery(
      tableConfig.dataSourceId || this.configLoader.getDataSourceId() || '1',
      `SELECT * FROM ${tableConfig.name} WHERE title LIKE ? OR author LIKE ? ORDER BY publish_date DESC LIMIT ? OFFSET ?`,
      [`%${keyword}%`, `%${keyword}%`, pageSize, (page - 1) * pageSize]
    );
  }
}

// 导出默认实例
export const booksDataService = new BooksDataService();

export default configLoader;
```

### 3. 创建API（使用数据框架）

**文件位置**: `src/app/api/books/route.ts`

```tsx
import { NextRequest, NextResponse } from 'next/server';
import { createAppProtectedHandler } from '@/lib/auth/middleware';
import { booksDataService } from '@/lib/config/books';

const appUrl = '/books';

// GET 请求处理 - 查询图书列表
async function getBooksHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const keyword = searchParams.get('keyword') || '';

    let result;
    if (keyword) {
      result = await booksDataService.searchBooks(keyword, page, pageSize);
    } else {
      result = await booksDataService.queryBooks(page, pageSize);
    }

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        data: result.data,
        total: result.total 
      });
    } else {
      return NextResponse.json(
        { success: false, message: result.error || '查询失败' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('查询图书失败:', error);
    return NextResponse.json(
      { success: false, message: '查询图书失败', error: String(error) },
      { status: 500 }
    );
  }
}

export const GET = createAppProtectedHandler(getBooksHandler, appUrl);
```

### 4. 创建页面

**文件位置**: `src/app/books/page.tsx`

```tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Table, Card, Input, Pagination, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import AppLayout from '@/components/layout/AppLayout';

const { Search } = Input;

interface Book {
  bookId: string;
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  publishDate: string;
  category: string;
  status: string;
  location: string;
}

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    fetchBooks();
  }, [page, keyword]);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (keyword) params.append('keyword', keyword);

      const response = await fetch(`/api/books?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setBooks(data.data);
        setTotal(data.total || 0);
      } else {
        message.error(data.message || '获取图书列表失败');
      }
    } catch (error) {
      message.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: '书名', dataIndex: 'title', key: 'title' },
    { title: '作者', dataIndex: 'author', key: 'author' },
    { title: 'ISBN', dataIndex: 'isbn', key: 'isbn' },
    { title: '出版社', dataIndex: 'publisher', key: 'publisher' },
    { title: '出版日期', dataIndex: 'publishDate', key: 'publishDate' },
    { title: '分类', dataIndex: 'category', key: 'category' },
    { title: '状态', dataIndex: 'status', key: 'status' },
    { title: '存放位置', dataIndex: 'location', key: 'location' },
  ];

  return (
    <AppLayout>
      <Card 
        title="图书管理" 
        extra={
          <Search
            placeholder="搜索书名或作者"
            allowClear
            enterButton={<SearchOutlined />}
            onSearch={(value) => {
              setKeyword(value);
              setPage(1);
            }}
            style={{ width: 300 }}
          />
        }
      >
        <Table 
          dataSource={books} 
          columns={columns} 
          rowKey="bookId"
          loading={loading}
          pagination={false}
        />
        <Pagination
          current={page}
          pageSize={pageSize}
          total={total}
          onChange={(p) => setPage(p)}
          style={{ marginTop: 16, textAlign: 'right' }}
        />
      </Card>
    </AppLayout>
  );
}
```

### 5. 创建布局文件

**文件位置**: `src/app/books/layout.tsx`

```tsx
import AppLayout from '@/components/layout/AppLayout';

export default function BooksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
```

### 6. 创建外部配置文件（可选）

**文件位置**: `config/books.yaml`

```yaml
# 图书管理应用配置
# 此配置将覆盖代码中的默认配置

dataSourceId: "1"

tables:
  books:
    name: "t_books"
    fields:
      bookId: "id"
      title: "title"
      author: "author"
      isbn: "isbn"
      publisher: "publisher"
      publishDate: "publish_date"
      category: "category"
      status: "status"
      location: "location"
```

### 7. 配置权限（应用创建后）
在 `/roles` 页面为相应角色分配"图书管理"应用权限。

### 8. 添加菜单（应用创建后）
在 `/menus` 页面将"图书管理"添加到合适的菜单组。

## 应用配置

每个应用都应该在 `config.yaml` 中有独立的配置节点，位于 `apps` 下：

**文件位置**: `config/config.yaml` 和 `config/config.yaml.example`

### 配置结构

```yaml
#------------------------------------------
# {应用名称}应用配置
#------------------------------------------
apps:
  yourAppName:  # 使用camelCase命名
    # 数据源ID（如需要数据库）
    dataSourceId: ""
    # 其他应用特定配置...
```

### 配置示例

例如"本科教师授课信息"应用的配置：

```yaml
apps:
  teacherTeaching:
    dataSourceId: "2"
    semesterTableName: "t_yzsj_dm_xb_xnxqm"
    teachingInfoTableName: "t_dws_gxjx_bzksjsskxx_v11mx"
```

### 配置规范

1. **命名规范**: 应用配置键使用 camelCase（如 `teacherTeaching`, `bookManagement`）
2. **独立节点**: 每个应用在 `apps` 下有独立的配置节点
3. **示例同步**: 修改 `config.yaml` 时，必须同步更新 `config/config.yaml.example`
4. **类型定义**: 在 `src/lib/config/index.ts` 中添加对应的 TypeScript 类型定义

### 在代码中使用配置

```typescript
import { getConfig } from '@/lib/config';

const config = getConfig();
const appConfig = config.apps?.yourAppName;

if (!appConfig) {
  throw new Error('应用配置未找到，请在config.yaml中配置apps.yourAppName');
}
```

## 注意事项

1. **应用URL唯一性**: 应用的URL必须唯一，不能与其他应用重复
2. **ID分配**: 
   - 内置应用：ID 1-4（系统核心，不可删除）
   - 预装应用：ID 5及以上（普通应用，可删除和修改）
3. **权限即时生效**: 权限配置修改后立即生效，无需重启服务
4. **内置应用保护**: ID为1-4的应用为系统内置应用，不可删除，名称和URL不可修改
5. **预装应用特性**: 预装应用有固定ID和URL，硬编码在系统中，但可以被删除和修改
6. **数据库表前缀**: 所有自定义数据表必须使用 `pioc_` 前缀
7. **图标选择**: 使用Ant Design的图标组件名称
8. **⚠️ 双重注册要求**: 创建应用时必须同时完成：
   - **初始化脚本**: 在 `init.ts` 中添加应用，确保新环境能自动创建
   - **开发环境插入**: 直接向数据库插入应用记录，确保开发环境立即可用
   
   两者缺一不可！初始化脚本用于重新部署，开发环境插入用于即时调试。

## 7. 创建数据库迁移脚本（必须）

对于已部署的环境，需要创建数据库迁移脚本来更新数据库。

### 迁移脚本文件

**文件命名规范**: `database-migration-{应用名称}.sql`

**文件位置**: 项目根目录

### 迁移脚本内容模板

```sql
-- {应用名称}应用数据库迁移脚本
-- 执行此脚本以在已部署的数据库中添加{应用名称}应用

-- 设置字符集
SET NAMES utf8mb4;

-- 1. 注册应用（如果不存在）
INSERT IGNORE INTO pioc_apps (id, name, description, icon, url, status) VALUES
  ({应用ID}, '{应用名称}', '{应用描述}', '{图标名称}', '{应用URL}', 1);

-- 2. 为 admin 角色分配应用权限
INSERT IGNORE INTO pioc_role_apps (role_id, app_id) VALUES (1, {应用ID});

-- 3. 创建应用所需的表（如果有）
-- CREATE TABLE IF NOT EXISTS pioc_{表名} (...);

-- 4. 创建索引（如果有）
-- CREATE INDEX idx_{索引名} ON pioc_{表名}({字段名});

-- 验证插入结果
SELECT id, name, url, status FROM pioc_apps WHERE id = {应用ID};
SELECT role_id, app_id FROM pioc_role_apps WHERE app_id = {应用ID};
```

### 执行迁移脚本

**方式1: 使用docker命令（推荐）**
```bash
docker exec -i mysql mysql -uroot -proot123 mydb < /path/to/database-migration-{应用名称}.sql
```

**方式2: 使用数据库客户端**
直接连接MySQL执行SQL脚本文件。

### 示例：课程中心应用迁移脚本

`database-migration-course-center.sql`:
```sql
-- 课程中心应用数据库迁移脚本

SET NAMES utf8mb4;

-- 注册课程中心应用
INSERT IGNORE INTO pioc_apps (id, name, description, icon, url, status) VALUES
  (13, '课程中心', '查看本科生和研究生课程信息，支持课程查询、教学班和课堂统计查看', 'BookOutlined', '/course-center', 1);

-- 为 admin 角色分配权限
INSERT IGNORE INTO pioc_role_apps (role_id, app_id) VALUES (1, 13);

-- 验证结果
SELECT id, name, url, status FROM pioc_apps WHERE id = 13;
SELECT role_id, app_id FROM pioc_role_apps WHERE app_id = 13;
```

### 迁移脚本最佳实践

1. **幂等性**: 使用 `INSERT IGNORE` 或 `IF NOT EXISTS` 确保脚本可重复执行
2. **字符集**: 始终设置 `SET NAMES utf8mb4` 避免中文乱码
3. **验证**: 脚本末尾添加查询语句验证插入结果
4. **版本控制**: 将迁移脚本纳入版本控制，便于追踪变更
5. **命名规范**: 使用 `database-migration-{应用名称}.sql` 格式命名

## 完整创建清单

创建新应用时，请确保完成以下所有步骤：

### 📋 核心步骤（必须）

- [ ] 1. 在 `src/lib/database/init.ts` 中添加应用初始化SQL
- [ ] 2. 在 `src/lib/database/models/app.ts` 中添加应用常量
- [ ] 3. **创建应用配置** `src/lib/config/{your-app}.ts` ⭐ **（使用数据框架）**
- [ ] 4. 创建前端页面 `src/app/{url}/page.tsx`
- [ ] 5. 创建布局文件 `src/app/{url}/layout.tsx`
- [ ] 6. 创建API路由 `src/app/api/{api-path}/route.ts`（使用数据框架）

### ⚙️ 配置步骤（必须）

- [ ] 7. 创建外部配置文件 `config/{your-app}.yaml`（可选，用于覆盖默认配置）
- [ ] 8. 在 `config/config.yaml` 中添加应用配置（向后兼容）
- [ ] 9. 在 `config/config.yaml.example` 中同步配置示例
- [ ] 10. 在 `src/lib/config/index.ts` 中添加类型定义（向后兼容）

### 🗄️ 数据库步骤

- [ ] 11. 创建数据库迁移脚本 `database-migration-{应用名称}.sql`
- [ ] 12. 执行数据库迁移脚本（已部署环境）

### 🔐 权限步骤（应用创建后）

- [ ] 13. 配置角色权限（在 `/roles` 页面）
- [ ] 14. 添加菜单项（在 `/menus` 页面）

---

### 💡 快速开始模板

如果你只需要一个最简应用，只需完成以下 **5 步**：

1. ✅ 在 `init.ts` 和 `app.ts` 中注册应用
2. ✅ 创建 `src/lib/config/{app}.ts`（使用上面的模板）
3. ✅ 创建 `src/app/{url}/page.tsx`
4. ✅ 创建 `src/app/{url}/layout.tsx`
5. ✅ 创建 `src/app/api/{api}/route.ts`

然后就可在 `/roles` 和 `/menus` 中配置权限和菜单了！

## 为什么使用数据框架？

### 🎯 传统方式 vs 数据框架

| 特性 | 传统方式 | 数据框架 |
|------|----------|----------|
| **代码量** | 每个表写查询函数 | 配置驱动，几乎不写代码 |
| **新增表** | 修改代码 → 重启服务 | 改配置即可 |
| **多数据源** | 手动管理连接 | 自动处理 |
| **字段映射** | 硬编码在 SQL 中 | 配置文件中声明 |
| **维护成本** | 高 | 低 |

### 📊 实际效果对比

**传统方式**（教师中心原有实现）：
- 40+ 个硬编码查询函数
- 新增表需要改代码
- 每个查询都要写 SQL

**数据框架方式**（课程中心新实现）：
- 1 个通用查询接口
- 新增表只需改配置
- 框架自动生成 SQL

### 🚀 数据框架的核心能力

1. **配置驱动开发**
   ```yaml
   # 只需配置，无需代码
   tables:
     users:
       name: "t_users"
       fields:
         userId: "id"
         userName: "name"
   ```

2. **双模式查询支持**
   - 方式一：使用 `dataObjectId`（复杂查询）
   - 方式二：使用 `name`（简单表查询）

3. **自动多数据源管理**
   ```yaml
   tables:
     table1:
       name: "t_table1"
       dataSourceId: "6"  # 数据源6
     table2:
       name: "t_table2"
       dataSourceId: "7"  # 数据源7
   ```

4. **统一查询接口**
   ```typescript
   // 一个接口处理所有表的查询
   queryAppTable('users', { page: 1, perPage: 10 })
   ```

### 💡 何时使用数据框架？

✅ **推荐使用**：
- 需要访问多个数据库表
- 有多数据源需求
- 希望配置化管理数据访问
- 需要快速开发原型

❌ **可以不使用**：
- 只需简单 CRUD 单表
- 已有成熟的模型层
- 复杂的业务逻辑查询

### 📚 数据框架相关文件

- **框架核心**: `src/lib/data-framework/`
- **类型定义**: `src/lib/data-framework/types.ts`
- **配置加载器**: `src/lib/data-framework/config-loader.ts`
- **查询服务**: `src/lib/data-framework/query-service.ts`
- **工具函数**: `src/lib/data-framework/utils.ts`

### 🔗 参考实现

- **课程中心**: `src/lib/config/course-center.ts`
- **教师中心**: `src/lib/config/teacher-center.ts`

## 相关文件参考

- 数据库初始化: `src/lib/database/init.ts`
- 应用模型: `src/lib/database/models/app.ts`
- 权限中间件: `src/lib/auth/middleware.ts`
- 应用页面示例: `src/app/apps/page.tsx`
- API示例: `src/app/api/apps/route.ts`
- 配置类型定义: `src/lib/config/index.ts`
- 迁移脚本示例: `database-migration-course-center.sql`
- **数据框架**: `src/lib/data-framework/` ⚡ **新项目推荐使用**
