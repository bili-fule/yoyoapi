import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function env(key: string, fallback?: string): string {
  return process.env[key] ?? fallback ?? ''
}

export const config = {
  port: parseInt(env('PORT', '3001'), 10),
  host: env('HOST', '0.0.0.0'),
  dbPath: env('DB_PATH', resolve(__dirname, '..', 'data', 'yoyoapi.db')),
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
    password: env('ADMIN_PASSWORD', 'admin123456'),
  },
  qq: {
    botBaseUrl: env('QQ_BOT_BASE_URL'),
    required: env('QQ_REQUIRED', 'false') === 'true',
  },
}
