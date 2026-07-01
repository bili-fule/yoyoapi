import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeFileSync, unlinkSync } from 'fs'
import { resolve } from 'path'

const ORIGINAL_ENV = { ...process.env }
const TEST_ENV_PATH = resolve(process.cwd(), 'data', '.env.test')

beforeEach(() => {
  vi.resetModules()
  process.env.YOYOAPI_ENV_FILE = TEST_ENV_PATH
})

afterEach(() => {
  try {
    unlinkSync(TEST_ENV_PATH)
  } catch {
  }
  process.env = { ...ORIGINAL_ENV }
})

describe('config', () => {
  it('corsOrigin defaults to *', async () => {
    delete process.env.CORS_ORIGIN
    const { config } = await import('./config.js')
    expect(config.corsOrigin).toBe('*')
  })

  it('corsOrigin reads CORS_ORIGIN env var', async () => {
    process.env.CORS_ORIGIN = 'https://example.com'
    const { config } = await import('./config.js')
    expect(config.corsOrigin).toBe('https://example.com')
  })

  it('serveStatic defaults to true', async () => {
    delete process.env.SERVE_STATIC
    const { config } = await import('./config.js')
    expect(config.serveStatic).toBe(true)
  })

  it('serveStatic is false when SERVE_STATIC=false', async () => {
    process.env.SERVE_STATIC = 'false'
    const { config } = await import('./config.js')
    expect(config.serveStatic).toBe(false)
  })

  it('serveStatic is false when SERVE_STATIC=0', async () => {
    process.env.SERVE_STATIC = '0'
    const { config } = await import('./config.js')
    expect(config.serveStatic).toBe(false)
  })

  it('existing config fields are unchanged', async () => {
    delete process.env.PORT
    delete process.env.HOST
    const { config } = await import('./config.js')
    expect(config.port).toBe(3001)
    expect(config.host).toBe('0.0.0.0')
  })

  it('loads values from server .env file', async () => {
    delete process.env.SMTP_HOST
    delete process.env.SMTP_PORT
    writeFileSync(TEST_ENV_PATH, 'SMTP_HOST=smtp.example.com\nSMTP_PORT=465\n')

    const { config } = await import('./config.js')

    expect(config.smtp.host).toBe('smtp.example.com')
    expect(config.smtp.port).toBe(465)
  })

  it('does not override existing environment variables with .env values', async () => {
    process.env.SMTP_HOST = 'smtp.runtime.example.com'
    writeFileSync(TEST_ENV_PATH, 'SMTP_HOST=smtp.file.example.com\n')

    const { config } = await import('./config.js')

    expect(config.smtp.host).toBe('smtp.runtime.example.com')
  })
})
