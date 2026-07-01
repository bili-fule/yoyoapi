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
```
