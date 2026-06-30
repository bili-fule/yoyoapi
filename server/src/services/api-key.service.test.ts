import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { initDB } from '../db/index.js'
import db from '../db/index.js'
import { createUser } from './user.service.js'
import { createApiKey, listApiKeys, updateApiKey, deleteApiKey } from './api-key.service.js'

function cleanDB(): void {
  db.pragma('foreign_keys = OFF')
  db.prepare('DELETE FROM api_keys').run()
  db.prepare('DELETE FROM users').run()
  db.pragma('foreign_keys = ON')
}

beforeAll(() => {
  initDB()
})

beforeEach(() => {
  cleanDB()
})

describe('ApiKeyService', () => {
  it('should create, list, update, and delete API keys', async () => {
    const user = await createUser('keytest@example.com', 'password123')

    const key1 = createApiKey(user.id, 'my key')
    expect(key1.fullKey).toMatch(/^sk-[0-9a-f]{64}$/)
    expect(key1.name).toBe('my key')

    const key2 = createApiKey(user.id, 'key 2')
    expect(key2.id).toBeGreaterThan(key1.id)

    const keys = listApiKeys(user.id)
    expect(keys.length).toBe(2)

    const updated = updateApiKey(key1.id, user.id, { name: 'renamed' })
    expect(updated!.name).toBe('renamed')

    const deleted = deleteApiKey(key2.id, user.id)
    expect(deleted).toBe(true)

    const keysAfter = listApiKeys(user.id)
    expect(keysAfter.length).toBe(1)
  })
})
