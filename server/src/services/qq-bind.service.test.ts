import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { initDB } from '../db/index.js'
import db from '../db/index.js'

beforeAll(() => {
  initDB()
})

beforeEach(() => {
  db.pragma('foreign_keys = OFF')
  for (const t of ['api_keys', 'users']) {
    db.prepare(`DELETE FROM ${t}`).run()
  }
  db.pragma('foreign_keys = ON')
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
})
