# Docker 部署指南

## 项目结构

本项目采用 **多阶段 Dockerfile 构建** + **docker-compose 编排**，支持一键启动完整应用栈：

- **MySQL 8.0**：数据库服务
- **Node.js 18**：前端构建 + 后端运行环境
- **Vue 3 + Vite**：前端打包到 `dist/`
- **Express + Socket.IO**：后端 API 与实时通信

---

## 快速开始

### 前置要求

- Docker >= 20.10
- Docker Compose >= 2.0

### 启动应用

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f app

# 初始化数据库（首次启动后执行）
docker-compose exec app npm run db:init
```

### 验证服务

- **后端 API**：http://localhost:3000
- **前端页面**：http://localhost:3000 (静态文件由后端提供)
- **MySQL**：localhost:3306 (用户: `sentinel`, 密码: `sentinel123`)

### 停止应用

```bash
docker-compose down

# 同时删除数据卷（清除数据库数据）
docker-compose down -v
```

---

## 文件说明

### `Dockerfile` (多阶段构建)

#### 第一阶段：构建前端
```dockerfile
FROM node:18-alpine AS builder
```
- 安装依赖
- 运行 `npm run build`，将前端打包到 `dist/` 目录

#### 第二阶段：运行应用
```dockerfile
FROM node:18-alpine
```
- 从第一阶段复制 `dist/`（前端构建产物）
- 从第一阶段复制 `server/`（后端代码）
- 仅安装生产依赖（`npm install --production`），减小镜像体积
- 暴露 3000 端口
- 启动后端服务

**优势**：
- 最终镜像中不包含构建工具，镜像体积更小
- 分离构建与运行环境，提高安全性与效率

---

### `docker-compose.yml` (服务编排)

#### MySQL 服务

```yaml
mysql:
  image: mysql:8.0
  environment:
    MYSQL_ROOT_PASSWORD: root
    MYSQL_DATABASE: hot_sentinel
    MYSQL_USER: sentinel
    MYSQL_PASSWORD: sentinel123
  healthcheck:
    # 等待 MySQL 就绪再启动应用
```

#### 应用服务

```yaml
app:
  build: .
  depends_on:
    mysql:
      condition: service_healthy
  environment:
    DB_HOST: mysql
    DB_PORT: 3306
    DB_USER: sentinel
    DB_PASSWORD: sentinel123
```

**特点**：
- 使用 `healthcheck` 确保 MySQL 就绪后再启动应用
- 应用与 MySQL 通过 Docker 网络通信
- 数据持久化到 `mysql_data` 卷

---

## 环境变量配置

### 应用环境变量

创建 `.env` 文件（可选，docker-compose 已设置基础配置）：

```env
# 服务器
PORT=3000
NODE_ENV=production

# 数据库（docker-compose 自动设置）
DB_HOST=mysql
DB_PORT=3306
DB_USER=sentinel
DB_PASSWORD=sentinel123
DB_NAME=hot_sentinel

# AI 配置
USE_LOCAL_AI=false
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=gemma3:4b

# DeepSeek API
DEEPSEEK_API_KEY=sk-...

# 讯飞 Spark API
SPARK_API_KEY=...
SPARK_API_SECRET=...

# 通义千问 API
QWEN_API_KEY=sk-...

# 邮件配置
EMAIL_HOST=smtp.qq.com
EMAIL_PORT=465
EMAIL_USER=your-email@qq.com
EMAIL_PASSWORD=your-app-password

# Twitter API
TWITTER_API_KEY=...
```

---

## 常用命令

### 构建镜像

```bash
# 重新构建镜像（跳过缓存）
docker-compose build --no-cache

# 构建特定服务
docker-compose build app
```

### 查看日志

```bash
# 查看全部服务日志
docker-compose logs

# 实时跟踪应用日志
docker-compose logs -f app

# 查看 MySQL 日志
docker-compose logs -f mysql
```

### 执行命令

```bash
# 初始化数据库
docker-compose exec app npm run db:init

# 进入应用容器
docker-compose exec app sh

# 进入 MySQL 容器
docker-compose exec mysql mysql -u root -p
```

### 数据备份

```bash
# 备份 MySQL 数据
docker-compose exec mysql mysqldump -u root -p hot_sentinel > backup.sql

# 恢复 MySQL 数据
docker-compose exec -T mysql mysql -u root -p hot_sentinel < backup.sql
```

---

## 生产部署建议

### 1. 环境变量管理

```bash
# 使用 .env.production 文件
docker-compose --file docker-compose.yml --env-file .env.production up -d
```

### 2. 日志管理

修改 `docker-compose.yml`：

```yaml
app:
  logging:
    driver: "json-file"
    options:
      max-size: "10m"
      max-file: "3"
```

### 3. 资源限制

```yaml
app:
  deploy:
    resources:
      limits:
        cpus: '1'
        memory: 1G
      reservations:
        cpus: '0.5'
        memory: 512M
```

### 4. 使用非 root 用户

修改 `Dockerfile`：

```dockerfile
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

USER nodejs
```

### 5. Nginx 反向代理（可选）

```yaml
nginx:
  image: nginx:alpine
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./nginx.conf:/etc/nginx/nginx.conf
  depends_on:
    - app
```

---

## 故障排除

### 1. MySQL 连接失败

```bash
# 检查 MySQL 状态
docker-compose exec mysql mysqladmin ping -u root -p

# 检查网络连接
docker-compose exec app ping mysql
```

### 2. 端口被占用

```bash
# 修改 docker-compose.yml 中的端口映射
ports:
  - "13306:3306"  # MySQL 改为 13306
  - "13000:3000"  # 应用改为 13000
```

### 3. 构建失败

```bash
# 清理缓存重试
docker-compose build --no-cache app
```

### 4. 数据库初始化失败

```bash
# 删除数据卷重新初始化
docker-compose down -v
docker-compose up -d
docker-compose exec app npm run db:init
```

---

## 性能优化

### 1. 使用 Alpine 镜像

已使用 `node:18-alpine`，相比 `node:18` 减小 70% 镜像体积。

### 2. 多阶段构建

避免在最终镜像中包含构建工具（如 Vite、npm），减小 50% 体积。

### 3. 分层缓存

```dockerfile
# 先复制 package.json（依赖层缓存）
COPY package*.json ./
RUN npm install

# 再复制代码（代码改动时缓存失效）
COPY . .
```

### 4. MySQL 性能优化

```yaml
mysql:
  command: --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci --max_connections=1000
```

---

## 扩展与自定义

### 添加 Redis 缓存

```yaml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  networks:
    - hot-sentinel-network
```

### 添加监控 (Prometheus + Grafana)

```yaml
prometheus:
  image: prom/prometheus
  ports:
    - "9090:9090"
```

### 跨平台构建

```bash
docker buildx build --platform linux/amd64,linux/arm64 -t your-registry/hot-sentinel:latest --push .
```

---

## 许可与支持

项目文档：[TECH_PLAN.md](./TECH_PLAN.md) | [REQUIREMENTS.md](./REQUIREMENTS.md)
