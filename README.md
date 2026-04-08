# PIOC - 个人智慧运行中心

PIOC（Personal Intelligence Operations Center，个人智慧运行中心）是一个基于 Next.js 16+ 和 Ant Design v6 构建的个人数字化管理平台。

## 功能特性

- **用户管理** - 系统用户的增删改查和角色分配
- **角色管理** - 系统角色的增删改查、用户分配和应用权限分配
- **应用管理** - 系统应用的增删改查和权限控制
- **菜单管理** - 系统顶部导航菜单的多级配置
- **数据源管理** - MySQL、MongoDB 等数据源的基本信息管理
- **密钥管理** - RSA、ECC、EdDSA 等类型密钥的创建和管理
- **标签管理** - 系统标签的增删改查和分组管理
- **打标作业** - 数据打标作业的创建和管理，支持多人协作

## 技术栈

| 分类 | 技术 | 版本 |
|------|------|------|
| 前端框架 | Next.js | 16.2.0 |
| UI 组件库 | Ant Design | 6.3.3 |
| 前端框架 | React | 19.2.4 |
| 后端运行时 | Node.js | 20+ |
| 数据库 | MySQL | 8.0+ |
| 数据库驱动 | mysql2 | 3.20.0 |
| 认证 | JWT | 9.0.3 |

## 快速开始

### 环境要求

- Node.js 20.0 或更高版本
- MySQL 8.0 或更高版本
- npm 10.0 或更高版本

### 安装步骤

1. **克隆项目**

```bash
git clone <repository-url>
cd pioc
```

2. **安装依赖**

```bash
npm install
```

3. **配置数据库**

```bash
# 复制配置文件模板
cp config/config.yaml.example config/config.yaml

# 编辑 config/config.yaml，配置数据库连接信息
```

4. **初始化数据库**

```bash
npm run db:init
```

5. **启动开发服务器**

```bash
npm run dev
```

系统将在 http://localhost:8080 启动。

### 默认账号

- 用户名：`admin`
- 密码：`admin123`

## 详细文档

请参阅 [INSTALL.md](./INSTALL.md) 获取完整的安装和配置指南。

## 项目结构

```
pioc/
├── config/                 # 配置文件
│   └── config.yaml.example # 配置模板
├── scripts/                # 脚本文件
│   └── init-db.ts         # 数据库初始化脚本
├── src/
│   ├── app/               # Next.js 应用路由
│   │   ├── api/           # API 路由
│   │   ├── apps/          # 应用管理页面
│   │   ├── dashboard/     # 控制台页面
│   │   ├── data-objects/  # 数据对象管理页面
│   │   ├── data-sources/  # 数据源管理页面
│   │   ├── key-management/# 密钥管理页面
│   │   ├── labeling-tasks/# 打标作业页面
│   │   ├── login/         # 登录页面
│   │   ├── menus/         # 菜单管理页面
│   │   ├── my-apps/       # 我的应用页面
│   │   ├── roles/         # 角色管理页面
│   │   ├── tags/          # 标签管理页面
│   │   └── users/         # 用户管理页面
│   ├── components/        # 公共组件
│   └── lib/               # 工具库
│       ├── auth/          # 认证相关
│       ├── config/        # 配置管理
│       ├── database/      # 数据库连接和初始化
│       ├── services/      # 业务服务
│       ├── theme/         # 主题配置
│       └── utils/         # 工具函数
├── public/                # 静态资源
├── package.json           # 项目依赖
└── README.md             # 项目说明
```

## 常用命令

```bash
# 开发模式启动
npm run dev

# 构建生产版本
npm run build

# 生产模式启动
npm start

# 数据库初始化
npm run db:init

# 代码检查
npm run lint
```

## Docker 部署

```bash
# 构建镜像
docker build -t pioc:latest .

# 运行容器
docker run -d -p 8080:8080 pioc:latest
```

## 许可证

[MIT](./LICENSE)
