# 构建阶段
FROM node:22-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装所有依赖（包括开发依赖，用于构建）
RUN npm install

# 复制源代码
COPY . .

# 复制配置文件
COPY config/config.yaml.example config/config.yaml

# 构建应用
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# 生产阶段
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# 修复安全漏洞：更新 npm 内置的依赖包
RUN cd /usr/local/lib/node_modules/npm/node_modules && \
    npm pack brace-expansion@2.0.3 && \
    npm pack picomatch@4.0.4 && \
    rm -rf brace-expansion picomatch && \
    mkdir -p brace-expansion picomatch && \
    tar -xzf brace-expansion-2.0.3.tgz -C brace-expansion --strip-components=1 && \
    tar -xzf picomatch-4.0.4.tgz -C picomatch --strip-components=1 && \
    rm -f *.tgz

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制 package.json
COPY --from=builder /app/package*.json ./

# 复制 builder 阶段安装的生产依赖（不需要重新安装）
COPY --from=builder /app/node_modules ./node_modules

# 复制构建产物
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/config ./config

# 切换到非root用户
USER nextjs

EXPOSE 8080

CMD ["npm", "start"]
