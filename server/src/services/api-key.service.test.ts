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

let userId: number
let otherUserId: number

beforeAll(() => {
  initDB()
})

beforeEach(async () => {
  cleanDB()
  const user = await createUser('keytest@example.com', 'password123')
  userId = user.id
  const other = await createUser('other@example.com', 'password456')
  otherUserId = other.id
})

describe('ApiKeyService', () => {
  it('should create, list, update, and delete API keys', async () => {
    const key1 = createApiKey(userId, 'my key')
    expect(key1.fullKey).toMatch(/^sk-[0-9a-f]{64}$/)
    expect(key1.name).toBe('my key')

    const key2 = createApiKey(userId, 'key 2')
    expect(key2.id).toBeGreaterThan(key1.id)

    const keys = listApiKeys(userId)
    expect(keys.length).toBe(2)

    const updated = updateApiKey(key1.id, userId, { name: 'renamed' })
    expect(updated!.name).toBe('renamed')

    const deleted = deleteApiKey(key2.id, userId)
    expect(deleted).toBe(true)

    const keysAfter = listApiKeys(userId)
    expect(keysAfter.length).toBe(1)
  })

  it('listApiKeys returns empty array for user with no keys', () => {
    const keys = listApiKeys(userId)
    expect(keys).toEqual([])
  })

  it('updateApiKey on non-existent id returns undefined', () => {
    const result = updateApiKey(99999, userId, { name: 'ghost' })
    expect(result).toBeUndefined()
  })

  it('deleteApiKey on non-existent id returns false', () => {
    const result = deleteApiKey(99999, userId)
    expect(result).toBe(false)
  })

  it('enforces ownership boundary: cannot update other user key', () => {
    const key = createApiKey(userId, 'my key')
    const result = updateApiKey(key.id, otherUserId, { name: 'hacked' })
    // updateApiKey returns the row (not undefined) even when user_id doesn't match
    // the WHERE clause — the UPDATE silently affects 0 rows
    expect(result).toBeDefined()
    expect(result!.name).toBe('my key')

    // verify original unchanged via list
    const keys = listApiKeys(userId)
    expect(keys[0]!.name).toBe('my key')
  })

  it('enforces ownership boundary: cannot delete other user key', () => {
    const key = createApiKey(userId, 'my key')
    const result = deleteApiKey(key.id, otherUserId)
    expect(result).toBe(false)

    // verify still exists for owner
    const keys = listApiKeys(userId)
    expect(keys).toHaveLength(1)
  })

  it('can create key with empty name', () => {
    const key = createApiKey(userId, '')
    expect(key.fullKey).toMatch(/^sk-[0-9a-f]{64}$/)
    expect(key.name).toBe('')

    const keys = listApiKeys(userId)
    expect(keys).toHaveLength(1)
    expect(keys[0]!.name).toBe('')
  })
})
