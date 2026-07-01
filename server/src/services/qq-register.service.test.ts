import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { initDB } from '../db/index.js'
import db from '../db/index.js'
import { config } from '../config.js'
import { getQqRegisterCode, validateQqBind, registerWithQq } from './qq-register.service.js'

function cleanDB(): void {
  db.pragma('foreign_keys = OFF')
  db.prepare('DELETE FROM api_keys').run()
  db.prepare('DELETE FROM users').run()
  db.pragma('foreign_keys = ON')
}

let originalBotUrl: string

beforeAll(() => {
  initDB()
})

beforeEach(() => {
  originalBotUrl = config.qq.botBaseUrl
  cleanDB()
})

afterEach(() => {
  config.qq.botBaseUrl = originalBotUrl
  vi.restoreAllMocks()
})

describe('getQqRegisterCode', () => {
  it('throws when AstrBot not configured', async () => {
    await expect(getQqRegisterCode()).rejects.toThrow('QQ bot base URL not configured')
  })

  it('returns bindId, code, and expireSeconds on success', async () => {
    config.qq.botBaseUrl = 'http://astrbot.test'

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code: 'ABC123', expire_seconds: 300 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const result = await getQqRegisterCode()
    expect(result.code).toBe('ABC123')
    expect(result.expireSeconds).toBe(300)
    expect(result.bindId).toMatch(/^[0-9a-f]{16}$/)
  })

  it('throws on non-ok response from AstrBot', async () => {
    config.qq.botBaseUrl = 'http://astrbot.test'

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Forbidden', { status: 403 }),
    )

    await expect(getQqRegisterCode()).rejects.toThrow('AstrBot returned 403')
  })

  it('throws when response has no code field', async () => {
    config.qq.botBaseUrl = 'http://astrbot.test'

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ expire_seconds: 300 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(getQqRegisterCode()).rejects.toThrow('Invalid response from AstrBot')
  })
})

describe('validateQqBind', () => {
  it('throws when AstrBot not configured', async () => {
    await expect(validateQqBind('test123')).rejects.toThrow('QQ bot base URL not configured')
  })

  it('throws when not bound yet', async () => {
    config.qq.botBaseUrl = 'http://astrbot.test'

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ bound: false, qq: '', user_id: 'qqreg_test123' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    await expect(validateQqBind('test123')).rejects.toThrow('QQ not bound yet')
  })

  it('throws when response has empty QQ number', async () => {
    config.qq.botBaseUrl = 'http://astrbot.test'

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ bound: true, qq: '', user_id: 'qqreg_test123' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    await expect(validateQqBind('test123')).rejects.toThrow('missing QQ number')
  })

  it('returns QQ ID when bound', async () => {
    config.qq.botBaseUrl = 'http://astrbot.test'

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ bound: true, qq: 'QQ123456', user_id: 'qqreg_test123' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const qqId = await validateQqBind('test123')
    expect(qqId).toBe('QQ123456')
  })

  it('throws on non-ok response from AstrBot', async () => {
    config.qq.botBaseUrl = 'http://astrbot.test'

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Not Found', { status: 404 }),
    )

    await expect(validateQqBind('test123')).rejects.toThrow('AstrBot returned 404')
  })
})

describe('registerWithQq', () => {
  it('creates user with qq_id and returns api key', async () => {
    const result = await registerWithQq('qqreg@example.com', 'password123', 'QQ88888')

    expect(result.user.email).toBe('qqreg@example.com')
    expect(result.user.qqId).toBe('QQ88888')
    expect(result.apiKey).toMatch(/^sk-/)
  })

  it('rejects duplicate email', async () => {
    await registerWithQq('dup@example.com', 'pass123', 'QQ111')

    await expect(
      registerWithQq('dup@example.com', 'pass456', 'QQ222'),
    ).rejects.toThrow('Email already registered')
  })

  it('allows same qqId for different emails', async () => {
    await registerWithQq('user1@example.com', 'pass123', 'QQ999')
    await registerWithQq('user2@example.com', 'pass456', 'QQ999')

    const rows = db.prepare('SELECT COUNT(*) as c FROM users WHERE qq_id = ?').get('QQ999') as { c: number }
    expect(rows.c).toBe(2)
  })

  it('accepts optional displayName', async () => {
    const result = await registerWithQq('display@example.com', 'pass123', 'QQ777', 'MyName')
    expect(result.user.displayName).toBe('MyName')
  })
})
