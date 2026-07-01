import { existsSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return

  const content = readFileSync(path, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const index = trimmed.indexOf('=')
    if (index === -1) continue

    const key = trimmed.slice(0, index).trim()
    if (!key || process.env[key] !== undefined) continue

    const rawValue = trimmed.slice(index + 1).trim()
    process.env[key] = rawValue.replace(/^(['"])(.*)\1$/, '$2')
  }
}

if (process.env.YOYOAPI_ENV_FILE) {
  loadEnvFile(process.env.YOYOAPI_ENV_FILE)
} else if (process.env.VITEST !== 'true') {
  loadEnvFile(resolve(__dirname, '..', '..', '.env'))
  loadEnvFile(resolve(__dirname, '..', '.env'))
}

function env(key: string, fallback?: string): string {
  return process.env[key] ?? fallback ?? ''
}

export const config = {
  port: parseInt(env('PORT', '3001'), 10),
  host: env('HOST', '0.0.0.0'),
  corsOrigin: env('CORS_ORIGIN', '*'),
  dbPath: env('DB_PATH', resolve(__dirname, '..', 'data', 'yoyoapi.db')),
  serveStatic: env('SERVE_STATIC', 'true') === 'true',
  smtp: {
    host: env('SMTP_HOST'),
    port: parseInt(env('SMTP_PORT', '587'), 10),
    secure: env('SMTP_SECURE', 'false') === 'true',
    user: env('SMTP_USER'),
    pass: env('SMTP_PASS'),
    from: env('SMTP_FROM', 'noreply@yoyoapi.com'),
  },
  admin: {
    email: env('ADMIN_EMAIL', 'admin@yoyoapi.com'),
    password: (() => {
      const pw = env('ADMIN_PASSWORD')
      if (!pw) throw new Error('ADMIN_PASSWORD environment variable is required — set a strong password in .env')
      return pw
    })(),
  },
  qq: {
    botBaseUrl: env('QQ_BOT_BASE_URL'),
    required: env('QQ_REQUIRED', 'false') === 'true',
  },
}
