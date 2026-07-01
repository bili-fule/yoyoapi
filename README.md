# YoYOapi

AI API 公益中转站 — 支持 OpenAI / Anthropic / Gemini 格式互转，邮箱登录，QQ 绑定。

## 快速开始

```bash
# 安装依赖
cd server && npm install
cd ../web && npm install

# 配置环境变量
cp .env.example server/.env
# 编辑 server/.env 填入 SMTP / QQ Bot 配置

# 构建前端
cd web && npm run build

# 启动服务
cd ../server && npm run dev
```

访问 `http://localhost:3001`

## API 使用

```
POST /api/v1/chat/completions
Authorization: Bearer sk-your-api-key
X-Target-Format: openai | anthropic | gemini

{
  "model": "gpt-4o",
  "messages": [{"role": "user", "content": "Hello"}]
}
```

## 功能

- 邮箱注册/登录/密码重置
- API Key 自动生成 (`sk-xxx`)
- OpenAI ↔ Anthropic / Gemini 格式自动转换
- QQ 绑定（对接 AstrBot）
- 管理后台
- Next.js 前端面板

## 项目结构

```
server/       Express + TypeScript 后端
  src/
    config.ts       配置
    db/             数据库 (SQLite)
    middleware/     认证/限流/错误处理
    converters/     API 格式转换器
    services/       业务逻辑
    controllers/    HTTP 处理
    routes/         路由
web/          Next.js 前端
Dockerfile    后端 Docker 构建
```

## 部署方式

### 方式一：一体化部署（默认）

后端 Express 同时提供 API 和前端静态文件，适合单机部署。

```bash
# 构建前端
cd web && npm run build

# 启动后端（自动 serving 前端）
cd ../server && npm run dev
```

### 方式二：前后端分离部署

前端部署到 Cloudflare Pages / GitHub Pages 等静态托管，后端部署到服务器或 Docker。

#### 后端配置

```bash
# 1. 配置环境变量
cd server
cp ../.env.example .env
```

编辑 `.env` 确保以下设置：

```ini
# 允许前端域名跨域访问
CORS_ORIGIN=https://your-frontend-domain.com

# 关闭静态文件服务（前端由 CDN 托管）
SERVE_STATIC=false
```

**Docker 部署：**

```bash
# 构建镜像
docker build -t yoyoapi .

# 运行
docker run -d \
  --name yoyoapi \
  -p 3001:3001 \
  -v ./data:/app/data \
  -e CORS_ORIGIN=https://your-frontend-domain.com \
  -e SERVE_STATIC=false \
  -e DB_PATH=/app/data/yoyoapi.db \
  yoyoapi
```

#### 前端配置

构建时通过环境变量指定 API 地址（会被内联到静态产物中）：

```bash
cd web

# 安装依赖
npm install

# 构建（指定后端 API 地址）
NEXT_PUBLIC_API_BASE=https://api.your-backend.com npm run build
```

将 `web/build/` 目录部署到 Cloudflare Pages 或 GitHub Pages：

- **Cloudflare Pages**: 上传 `web/build/` 目录，设置构建命令为 `npm run build`，输出目录为 `build`
- **GitHub Pages**: 将 `web/build/` 推送到 `gh-pages` 分支，或使用 Actions 自动构建部署

#### 环境变量说明

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `CORS_ORIGIN` | `*` | 允许的前端域名，分离部署时设为前端 URL |
| `SERVE_STATIC` | `true` | 是否由后端提供静态文件，分离部署时设为 `false` |
| `NEXT_PUBLIC_API_BASE` | `/api` | 前端 API 请求地址，分离部署时设为后端 URL |
