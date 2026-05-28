# 第一阶段：构建前端
FROM node:22-alpine AS builder

WORKDIR /app

# 复制整个项目
COPY . .

# 安装依赖
RUN npm install --legacy-peer-deps

# 构建前端
RUN npm run build

# 第二阶段：运行应用
FROM node:22-alpine

WORKDIR /app

# 仅复制必需的文件（减小镜像体积）
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server ./server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.env* ./

# 生产环境安装依赖（排除 devDependencies）
RUN npm install --production --legacy-peer-deps

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["npm", "run", "dev:server"]
