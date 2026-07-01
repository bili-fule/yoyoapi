import { describe, it, expect, beforeEach, afterEach } from 'vitest'

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
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
})
