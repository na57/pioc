# 设备运维人员 API 使用指南

## 概述

本文档面向设备运维人员，介绍如何通过 API 向 PIOC 系统创建新版本配置。通过本文档，您可以编写程序自动化配置版本管理。

## API 基本信息

### 基础 URL

```
http://localhost:8080/api/external/v1
```

### 认证信息

> **注意**: 请联系系统管理员获取您自己的 API Key 和 API Secret。

| 参数 | 说明 | 示例 |
|------|------|------|
| API Key | 您的 API 密钥 | `pk_your_api_key_here` |
| API Secret | 您的 API 密钥 secret | `your_api_secret_here` |

### 请求头要求

每个 API 请求必须包含以下请求头：

| 请求头 | 说明 | 示例 |
|--------|------|------|
| `X-API-Key` | API 密钥 | `pk_your_api_key_here` |
| `X-API-Signature` | 请求签名 | `a1b2c3d4...` |
| `X-API-Timestamp` | 时间戳（Unix 时间戳，秒） | `1704067200` |
| `Content-Type` | 内容类型 | `application/json` |

## 签名算法

### 签名内容格式

签名使用 HMAC-SHA256 算法生成，签名内容为以下字符串拼接（使用换行符 `\n` 分隔）：

```
{METHOD}\n{PATH}\n{QUERY_STRING}\n{TIMESTAMP}\n{BODY}
```

### 示例

**GET 请求示例：**
```
GET\n/api/external/v1/configsys/versions\nconfigId=xxx&page=1\n1704067200\n
```

**POST 请求示例：**
```
POST\n/api/external/v1/configsys/versions\n\n1704067200\n{"configId":"xxx","content":"..."}
```

### 签名生成代码

#### Python 示例

```python
import hmac
import hashlib
import time

def generate_signature(method, path, query_string, body, api_secret):
    timestamp = str(int(time.time()))
    sign_string = f"{method}\n{path}\n{query_string}\n{timestamp}\n{body}"
    signature = hmac.new(
        api_secret.encode('utf-8'),
        sign_string.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return signature, timestamp

# 使用示例 - 请替换为您自己的 API Secret
api_secret = "your_api_secret_here"
signature, timestamp = generate_signature(
    "POST",
    "/api/external/v1/configsys/versions",
    "",
    # 请替换为您的配置ID
    '{"configId":"your-config-id-here","content":"test"}',
    api_secret
)
```

#### Bash 示例

```bash
#!/bin/bash

# 请替换为您自己的 API Key 和 API Secret
API_KEY="pk_your_api_key_here"
API_SECRET="your_api_secret_here"
TIMESTAMP=$(date +%s)

# 请求体
# 请替换为您的配置ID
BODY='{"configId":"your-config-id-here","content":"your config content"}'

# 构建签名内容（使用实际的换行符）
SIGN_STRING="POST
/api/external/v1/configsys/versions

${TIMESTAMP}
${BODY}"

# 生成 HMAC-SHA256 签名
SIGNATURE=$(printf "%s" "$SIGN_STRING" | openssl dgst -sha256 -hmac "$API_SECRET" | cut -d' ' -f2)

echo "Signature: $SIGNATURE"
echo "Timestamp: $TIMESTAMP"
```

## API 接口

### 1. 创建配置版本

创建指定配置的新版本。

#### 请求信息

| 项目 | 值 |
|------|-----|
| 方法 | `POST` |
| 路径 | `/configsys/versions` |
| 权限 | `write` |

#### 请求体

```json
{
  "configId": "your-config-id-here",
  "content": "配置内容文本"
}
```

#### 请求参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `configId` | string | 是 | 配置 ID |
| `content` | string | 是 | 配置内容（配置文件文本） |

#### 响应示例

**成功响应：**
```json
{
  "success": true,
  "data": {
    "id": "e842458f-54cf-472e-81d1-f055f95e1d90",
    "versionNumber": "v1.11"
  }
}
```

**失败响应：**
```json
{
  "success": false,
  "message": "错误描述",
  "error": "详细错误信息"
}
```

#### 完整请求示例

**使用 curl：**

```bash
#!/bin/bash

# 请替换为您自己的 API Key 和 API Secret
API_KEY="pk_your_api_key_here"
API_SECRET="your_api_secret_here"
TIMESTAMP=$(date +%s)

# 读取配置文件内容
CONFIG_CONTENT=$(cat /path/to/your/config.conf)

# 构建 JSON 请求体
BODY=$(jq -n \
  --arg configId "your-config-id-here" \
  --arg content "$CONFIG_CONTENT" \
  '{configId: $configId, content: $content}')

# 构建签名内容
SIGN_STRING="POST
/api/external/v1/configsys/versions

${TIMESTAMP}
${BODY}"

# 生成签名
SIGNATURE=$(printf "%s" "$SIGN_STRING" | openssl dgst -sha256 -hmac "$API_SECRET" | cut -d' ' -f2)

# 发送请求
curl -X POST "http://localhost:8080/api/external/v1/configsys/versions" \
  -H "X-API-Key: $API_KEY" \
  -H "X-API-Signature: $SIGNATURE" \
  -H "X-API-Timestamp: $TIMESTAMP" \
  -H "Content-Type: application/json" \
  -d "$BODY"
```

**使用 Python：**

```python
import requests
import hmac
import hashlib
import time
import json

class PIOCConfigClient:
    def __init__(self, api_key, api_secret, base_url="http://localhost:8080"):
        self.api_key = api_key
        self.api_secret = api_secret
        self.base_url = base_url
    
    def _generate_signature(self, method, path, query_string, body):
        timestamp = str(int(time.time()))
        sign_string = f"{method}\n{path}\n{query_string}\n{timestamp}\n{body}"
        signature = hmac.new(
            self.api_secret.encode('utf-8'),
            sign_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        return signature, timestamp
    
    def create_version(self, config_id, content):
        path = "/api/external/v1/configsys/versions"
        url = f"{self.base_url}{path}"
        
        body = json.dumps({
            "configId": config_id,
            "content": content
        })
        
        signature, timestamp = self._generate_signature("POST", path, "", body)
        
        headers = {
            "X-API-Key": self.api_key,
            "X-API-Signature": signature,
            "X-API-Timestamp": timestamp,
            "Content-Type": "application/json"
        }
        
        response = requests.post(url, headers=headers, data=body)
        return response.json()

# 使用示例 - 请替换为您自己的 API Key 和 API Secret
client = PIOCConfigClient(
    api_key="pk_your_api_key_here",
    api_secret="your_api_secret_here"
)

# 读取配置文件
with open('/path/to/nginx.conf', 'r') as f:
    config_content = f.read()

# 创建新版本
result = client.create_version(
    config_id="your-config-id-here",
    content=config_content
)

if result.get('success'):
    print(f"版本创建成功！版本号: {result['data']['versionNumber']}")
else:
    print(f"创建失败: {result.get('message')}")
```

### 2. 查询配置版本列表

查询指定配置的所有版本列表。

#### 请求信息

| 项目 | 值 |
|------|-----|
| 方法 | `GET` |
| 路径 | `/configsys/versions` |
| 权限 | `read` |

#### 查询参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `configId` | string | 是 | - | 配置 ID |
| `page` | integer | 否 | 1 | 页码 |
| `pageSize` | integer | 否 | 20 | 每页数量（最大 100） |

#### 响应示例

```json
{
  "success": true,
  "data": [
    {
      "id": "e842458f-54cf-472e-81d1-f055f95e1d90",
      "config_id": "your-config-id-here",
      "version_number": "v1.11",
      "content": "配置内容...",
      "created_by": "2",
      "created_at": "2026-06-09T03:20:14.000Z",
      "creator_name": "系统管理员",
      "creator_username": "admin"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 3,
    "totalPages": 1
  }
}
```

## 完整自动化脚本示例

### 场景：自动备份配置文件到系统

```python
#!/usr/bin/env python3
"""
配置文件自动备份脚本
用于将本地配置文件自动上传到 PIOC 系统创建新版本
"""

import requests
import hmac
import hashlib
import time
import json
import sys
from pathlib import Path

class ConfigBackupTool:
    def __init__(self, api_key, api_secret, base_url="http://localhost:8080"):
        self.api_key = api_key
        self.api_secret = api_secret
        self.base_url = base_url
    
    def _generate_signature(self, method, path, query_string, body):
        timestamp = str(int(time.time()))
        sign_string = f"{method}\n{path}\n{query_string}\n{timestamp}\n{body}"
        signature = hmac.new(
            self.api_secret.encode('utf-8'),
            sign_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        return signature, timestamp
    
    def create_version(self, config_id, content):
        path = "/api/external/v1/configsys/versions"
        url = f"{self.base_url}{path}"
        
        body = json.dumps({
            "configId": config_id,
            "content": content
        })
        
        signature, timestamp = self._generate_signature("POST", path, "", body)
        
        headers = {
            "X-API-Key": self.api_key,
            "X-API-Signature": signature,
            "X-API-Timestamp": timestamp,
            "Content-Type": "application/json"
        }
        
        try:
            response = requests.post(url, headers=headers, data=body, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {"success": False, "message": f"请求失败: {str(e)}"}
    
    def backup_config_file(self, config_file_path, config_id):
        """备份单个配置文件"""
        config_path = Path(config_file_path)
        
        if not config_path.exists():
            print(f"错误: 文件不存在 {config_file_path}")
            return False
        
        try:
            content = config_path.read_text(encoding='utf-8')
        except Exception as e:
            print(f"错误: 读取文件失败 {config_file_path}: {e}")
            return False
        
        print(f"正在备份: {config_path.name} -> 配置ID: {config_id}")
        
        result = self.create_version(config_id, content)
        
        if result.get('success'):
            print(f"✓ 备份成功! 版本号: {result['data']['versionNumber']}")
            return True
        else:
            print(f"✗ 备份失败: {result.get('message')}")
            return False

def main():
    # API 配置 - 请替换为您自己的 API Key 和 API Secret
    API_KEY = "pk_your_api_key_here"
    API_SECRET = "your_api_secret_here"
    
    # 配置文件映射（本地路径 -> 配置ID）
    CONFIG_MAPPING = {
        "/etc/nginx/nginx.conf": "your-config-id-here",
        "/etc/redis/redis.conf": "your-redis-config-id",
        # 添加更多配置...
    }
    
    tool = ConfigBackupTool(API_KEY, API_SECRET)
    
    success_count = 0
    fail_count = 0
    
    for file_path, config_id in CONFIG_MAPPING.items():
        if tool.backup_config_file(file_path, config_id):
            success_count += 1
        else:
            fail_count += 1
    
    print(f"\n备份完成: 成功 {success_count} 个, 失败 {fail_count} 个")
    return 0 if fail_count == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
```

## 常见问题

### Q1: 签名验证失败怎么办？

**检查点：**
1. 确认 `API Key` 和 `API Secret` 正确无误
2. 确认签名内容格式正确（注意换行符）
3. 确认时间戳与服务器时间相差不超过 5 分钟
4. 确认请求路径包含 `/api/external/v1` 前缀

### Q2: 版本号是如何生成的？

系统自动生成版本号，格式为 `v{数字}`，例如 `v1.0`, `v1.1`, `v1.2` 等。每次创建新版本时，版本号自动递增。

### Q3: 可以更新或删除已创建的版本吗？

- **更新版本**: 使用 `PUT /configsys/versions/{versionId}` 接口
- **删除版本**: 使用 `DELETE /configsys/versions/{versionId}` 接口

注意：需要有相应的 `write` 权限。

### Q4: 如何获取配置ID？

配置ID是创建配置时生成的唯一标识符，格式如 `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`。请联系系统管理员获取您需要管理的配置ID。

## 错误码说明

| HTTP 状态码 | 说明 |
|------------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 认证失败（API Key 无效、签名错误或请求过期） |
| 403 | 权限不足（缺少所需权限） |
| 404 | 配置或版本不存在 |
| 500 | 服务器内部错误 |

## 技术支持

如有问题，请联系系统管理员或技术支持团队。
