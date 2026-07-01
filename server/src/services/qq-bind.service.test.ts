import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest'
import { initDB } from '../db/index.js'
import db from '../db/index.js'
import { config } from '../config.js'

beforeAll(() => {
  initDB()
})

beforeEach(() => {
  db.pragma('foreign_keys = OFF')
  for (const t of ['api_keys', 'users']) {
    db.prepare(`DELETE FROM ${t}`).run()
  }
  db.pragma('foreign_keys = ON')
  vi.restoreAllMocks()
})

describe('QQ Bind Service', () => {
  it('should throw when AstrBot is not configured', async () => {
    const { getBindCode } = await import('./qq-bind.service.js')
    await expect(getBindCode(1)).rejects.toThrow('QQ bot base URL not configured')
  })

  it('should throw when AstrBot is not configured for confirm', async () => {
    const { confirmBind } = await import('./qq-bind.service.js')
    await expect(confirmBind(1)).rejects.toThrow('QQ bot base URL not configured')
  })

  describe('with bot configured', () => {
    let getBindCode: typeof import('./qq-bind.service.js')['getBindCode']
    let confirmBind: typeof import('./qq-bind.service.js')['confirmBind']
    let unbindQq: typeof import('./qq-bind.service.js')['unbindQq']

    beforeAll(async () => {
      config.qq.botBaseUrl = 'http://localhost:8080'
      const mod = await import('./qq-bind.service.js')
      getBindCode = mod.getBindCode
      confirmBind = mod.confirmBind
      unbindQq = mod.unbindQq
    })

    afterAll(() => {
      config.qq.botBaseUrl = ''
    })

    // ─── getBindCode ─────────────────────────────────────────────────────────

    it('getBindCode returns code on successful response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ code: 'test123', expire_seconds: 300 }), { status: 200 }),
      )

      const result = await getBindCode(1)
      expect(result).toEqual({ code: 'test123', expire_seconds: 300 })
    })

    it('getBindCode throws on non-ok response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Not Found', { status: 404 }))

      await expect(getBindCode(1)).rejects.toThrow('AstrBot returned 404')
    })

    it('getBindCode throws when code is missing from response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ expire_seconds: 300 }), { status: 200 }),
      )

      await expect(getBindCode(1)).rejects.toThrow('Invalid response from AstrBot')
    })

    // ─── confirmBind ─────────────────────────────────────────────────────────

    it('confirmBind returns qqId when user is bound', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ bound: true, qq: '123456', user_id: 'yoyoapi_1' }), { status: 200 }),
      )

      const result = await confirmBind(1)
      expect(result).toEqual({ qqId: '123456' })
    })

    it('confirmBind throws when user is not bound yet', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ bound: false, qq: '', user_id: 'yoyoapi_1' }), { status: 200 }),
      )

      await expect(confirmBind(1)).rejects.toThrow('QQ not bound yet. Send the code to the QQ bot first.')
    })

    it('confirmBind throws on user_id mismatch', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ bound: true, qq: '123456', user_id: 'yoyoapi_999' }), { status: 200 }),
      )

      await expect(confirmBind(1)).rejects.toThrow('User ID mismatch')
    })

    it('confirmBind throws on non-ok response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Server Error', { status: 500 }))

      await expect(confirmBind(1)).rejects.toThrow('AstrBot returned 500')
    })

    // ─── unbindQq ────────────────────────────────────────────────────────────

    it('unbindQq succeeds with 200 response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('OK', { status: 200 }))

      await expect(unbindQq(1)).resolves.toBeUndefined()
    })

    it('unbindQq throws on non-ok response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Bad Request', { status: 400 }))

      await expect(unbindQq(1)).rejects.toThrow('AstrBot returned 400')
    })
  })
})
