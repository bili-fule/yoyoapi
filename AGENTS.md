# AGENTS.md — Project Conventions

## Overview

YoYOapi is a Node.js AI API relay station (公益中转站) with email login, QQ binding (via AstrBot), and API format conversion (OpenAI ↔ Anthropic ↔ Gemini).

## Tech Stack

- **Backend**: Express + TypeScript, `better-sqlite3`, `vitest`
- **Frontend**: Next.js 15 (App Router, static export `output: 'export'`, built output served by Express)
- **Auth**: API Key (`sk-xxx`) via `better-sqlite3` lookup (no JWT/sessions for API)
- **Database**: SQLite only (WAL mode, `data/yoyoapi.db`)

## Core Rules

### 1. Libraries First

Use JS libraries when available; only build from scratch when no library exists.
- `openai` npm package for OpenAI upstream requests
- `better-sqlite3` for database
- `bcryptjs` for password hashing
- `nodemailer` for email verification
- `zod` for request validation
- Do NOT add unnecessary dependencies

### 2. Strict Layer Order (No Cross-Level/Circular/Downstream Dependencies)

Each layer may ONLY import from lower-numbered layers.

```
0. config/       → config.ts, .env
1. utils/        → crypto, email, errors (pure helpers, no deps on project modules)
2. db/           → SQLite init (depends on config)
3. converters/   → format conversion (pure functions, no deps on services/db)
4. services/     → business logic (depends on db, utils, converters)
5. middleware/   → auth, rate-limit (depends on services for user lookup)
6. controllers/  → request handlers (depends on services)
7. routes/       → HTTP routes, middleware assembly (depends on controllers, middleware)
8. index.ts      → Express bootstrap (depends on routes)
```

**Forbidden patterns:**
- Service importing from controller/route
- Converter importing from service/db
- Controller importing from another controller
- Utils importing from services

### 3. Code Style

- TypeScript strict mode, ESM (`"type": "module"`)
- No `require()` — use `import`/`export` everywhere
- No barrel files — import directly from source modules
- No comments in business code — let code speak
- Functions are async only when they contain `await`
- Prefer early returns, clear branches over deep nesting

### 4. Testing

- Every module must have unit tests (`*.test.ts`)
- Tests use vitest with `globals: true`
- Tests clean DB state in `beforeEach` (delete all tables with `foreign_keys = OFF`)
- Use realistic test data; avoid fakes/random inputs
- Integration tests test HTTP endpoints via `supertest`
- Full test suite: `npm test` from `server/`

### 5. API Key Auth

All API relay endpoints use `Bearer sk-xxx` token authentication.
- Auth middleware looks up key in `api_keys` table
- No JWT, no session cookies for API access
- Tokens are 64-char hex prefixed with `sk-`

### 6. API Format Conversion Flow

```
Client (OpenAI format) → Express → tokenAuth → relay controller
  → channel selection (type = targetFormat)
  → convertRequest(openai → target)
  → fetch upstream
  → convertResponse(target → openai)
  → log usage → respond OpenAI format
```

Target format is selected via `X-Target-Format` header:
- `openai` (default): passthrough
- `anthropic`: OpenAI ↔ Anthropic conversion
- `gemini`: OpenAI ↔ Gemini conversion

### 7. QQ Binding (AstrBot)

Flow: getBindCode → user sends code to QQ bot → confirmBind
- AstrBot endpoint: `{QQ_BOT_BASE_URL}/api/plug/api/v1/bind/{code|query|unbind}`
- User ID format: `yoyoapi_{userId}`
- Configure via `.env`: `QQ_BOT_BASE_URL`, `QQ_REQUIRED`

### 8. Project Structure

```
YoYOapi/
├── server/          # Express backend
│   ├── src/
│   │   ├── index.ts
│   │   ├── config.ts
│   │   ├── db/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── converters/
│   │   └── utils/
│   └── package.json
├── web/             # Next.js frontend
│   └── src/
└── AGENTS.md
```
