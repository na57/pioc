# 依赖安装阶段
FROM node:22-alpine AS deps

WORKDIR /app

# 复制依赖文件并按 lockfile 安装（含开发依赖，构建阶段需要）
COPY package*.json ./
RUN npm ci

# 构建阶段
FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 复制配置文件
COPY config/config.yaml.example config/config.yaml

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# 生产阶段：仅包含 Next.js standalone 产物，不含 npm 与开发依赖
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# 安全加固：
# 1. 升级系统包（修复 zlib 等基础镜像 CVE）
# 2. 安装 sharp/mongodb 运行时所需的最小原生库
# 3. 删除基础镜像自带的 npm（standalone 以 node server.js 启动，无需 npm，
#    同时消除 npm 内部依赖（pacote/tar/ip-address 等）的 Trivy 告警与攻击面）
RUN apk upgrade --no-cache \
    && apk add --no-cache libstdc++ \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

# 使用官方镜像内建的非 root 用户 node(uid 1000)
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/config ./config

USER node

EXPOSE 8080

# 直接以 node 启动 standalone server，镜像内不依赖 npm
CMD ["node", "server.js"]
