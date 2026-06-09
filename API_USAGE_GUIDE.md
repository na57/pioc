# PIOC 第三方API使用指南

## 概述

PIOC平台提供了一套完整的第三方API访问机制，支持数据的读取和更新操作。通过API密钥认证，第三方应用可以安全地访问PIOC中的数据对象。

## 认证机制

### API密钥

访问PIOC API需要使用API密钥进行认证。每个API密钥包含：
- **API Key**: 用于标识调用者身份
- **API Secret**: 用于生成请求签名

### 请求头

每个API请求必须包含以下请求头：

| 请求头 | 说明 | 示例 |
|--------|------|------|
| `X-API-Key` | API密钥 | `pk_abc123...` |
| `X-API-Signature` | 请求签名 | `a1b2c3d4...` |
| `X-API-Timestamp` | 时间戳（Unix时间戳，秒） | `1704067200` |
| `Content-Type` | 内容类型 | `application/json` |

### 签名算法

签名使用HMAC-SHA256算法生成，签名内容为以下字符串拼接：

```
{METHOD}\n{PATH}\n{QUERY_STRING}\n{TIMESTAMP}\n{BODY}
```

例如：
```
GET\n/api/external/v1/data/users\npage=1&pageSize=20\n1704067200\n
POST\n/api/external/v1/data/users\n\n1704067200\n{"name":"张三","age":25}
```

签名生成代码（JavaScript）：
```javascript
const crypto = require('crypto');

const signString = `${method}\n${path}\n${queryString}\n${timestamp}\n${body}`;
const signature = crypto
  .createHmac('sha256', apiSecret)
  .update(signString)
  .digest('hex');
```

## API端点

### 基础URL

```
http://localhost:3000/api/external/v1
```

### 数据对象操作

#### 1. 查询数据列表

```
GET /data/{object}?page={page}&pageSize={pageSize}
```

**参数：**
- `object`: 数据对象名称（必填）
- `page`: 页码，默认1（可选）
- `pageSize`: 每页数量，默认20，最大100（可选）

**响应：**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

#### 2. 获取单条数据

```
GET /data/{object}/{id}
```

**参数：**
- `object`: 数据对象名称（必填）
- `id`: 数据ID（必填）

**响应：**
```json
{
  "success": true,
  "data": {...}
}
```

#### 3. 创建数据

```
POST /data/{object}
```

**请求体：**
```json
{
  "field1": "value1",
  "field2": "value2"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "id": 123
  }
}
```

#### 4. 更新数据

```
PUT /data/{object}/{id}
```

**请求体：**
```json
{
  "field1": "new_value1"
}
```

**响应：**
```json
{
  "success": true
}
```

#### 5. 删除数据

```
DELETE /data/{object}/{id}
```

**响应：**
```json
{
  "success": true
}
```

### 配置管理API

#### 1. 获取配置版本列表

```
GET /configsys/versions?configId={configId}&page={page}&pageSize={pageSize}
```

**参数：**
- `configId`: 配置ID（必填）
- `page`: 页码，默认1（可选）
- `pageSize`: 每页数量，默认20，最大100（可选）

**响应：**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 10,
    "totalPages": 1
  }
}
```

#### 2. 获取单个配置版本

```
GET /configsys/versions/{versionId}
```

**参数：**
- `versionId`: 版本ID（必填）

**响应：**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "config_id": "0b82e466-bbbd-43f3-830a-402c96725a41",
    "version_number": 1,
    "content": "...",
    "change_description": "初始版本",
    "creator_name": "管理员"
  }
}
```

#### 3. 创建配置版本

```
POST /configsys/versions
```

**请求体：**
```json
{
  "configId": "0b82e466-bbbd-43f3-830a-402c96725a41",
  "content": "配置内容",
  "changeDescription": "新增配置"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "versionNumber": 2
  }
}
```

#### 4. 更新配置版本

```
PUT /configsys/versions/{versionId}
```

**请求体：**
```json
{
  "content": "更新后的配置内容",
  "changeDescription": "修复问题"
}
```

**响应：**
```json
{
  "success": true
}
```

#### 5. 删除配置版本

```
DELETE /configsys/versions/{versionId}
```

**响应：**
```json
{
  "success": true
}
```

## 权限控制

API密钥支持以下权限：

- `read`: 读取数据权限（GET请求）
- `write`: 写入数据权限（POST/PUT/DELETE请求）

创建API密钥时可以指定权限，例如：`["read", "write"]`

## IP白名单

可以为API密钥配置IP白名单，只允许特定IP地址访问。如果不配置，则允许所有IP访问。

## SDK使用示例

### JavaScript SDK

```javascript
const PIOCClient = require('./pioc-client');

// 初始化客户端
const client = new PIOCClient(
  'pk_your_api_key_here',
  'your_api_secret_here',
  'http://localhost:3000'
);

// 查询数据
async function queryData() {
  try {
    const result = await client.queryData('users', 1, 10);
    console.log(result.data);
  } catch (error) {
    console.error('查询失败:', error.message);
  }
}

// 创建数据
async function createData() {
  try {
    const result = await client.createData('users', {
      name: '张三',
      email: 'zhangsan@example.com'
    });
    console.log('创建成功，ID:', result.data.id);
  } catch (error) {
    console.error('创建失败:', error.message);
  }
}

queryData();
```

### cURL示例

```bash
# 设置变量
API_KEY="pk_your_api_key"
API_SECRET="your_api_secret"
TIMESTAMP=$(date +%s)

# 生成签名
SIGN_STRING="GET\n/api/external/v1/data/users\npage=1&pageSize=10\n${TIMESTAMP}\n"
SIGNATURE=$(echo -n "$SIGN_STRING" | openssl dgst -sha256 -hmac "$API_SECRET" | cut -d' ' -f2)

# 发送请求
curl -X GET "http://localhost:3000/api/external/v1/data/users?page=1&pageSize=10" \
  -H "X-API-Key: $API_KEY" \
  -H "X-API-Signature: $SIGNATURE" \
  -H "X-API-Timestamp: $TIMESTAMP" \
  -H "Content-Type: application/json"
```

## 错误处理

API返回的错误格式：

```json
{
  "success": false,
  "message": "错误描述",
  "error": "详细错误信息（可选）"
}
```

常见错误码：

| HTTP状态码 | 说明 |
|------------|------|
| 400 | 请求参数错误 |
| 401 | 认证失败（API Key无效、签名错误或请求过期） |
| 403 | 权限不足（IP不在白名单或缺少所需权限） |
| 404 | 数据对象或记录不存在 |
| 500 | 服务器内部错误 |

## 安全建议

1. **妥善保管API Secret**: API Secret只在创建时显示一次，请立即保存并妥善保管
2. **使用HTTPS**: 生产环境务必使用HTTPS传输
3. **设置IP白名单**: 为API密钥配置IP白名单，限制访问来源
4. **设置过期时间**: 为API密钥设置合理的过期时间
5. **定期轮换密钥**: 定期创建新密钥并废弃旧密钥
6. **监控API调用**: 关注API调用日志，发现异常及时处理

## 获取API密钥

1. 登录PIOC平台
2. 进入"API密钥管理"应用
3. 点击"创建API密钥"
4. 填写密钥名称、选择权限、设置IP白名单（可选）
5. 保存后立即复制API Key和API Secret

## 联系支持

如有问题，请联系系统管理员或技术支持团队。
