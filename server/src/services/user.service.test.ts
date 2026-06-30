import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { initDB } from '../db/index.js'
import db from '../db/index.js'
import {
  createUser,
  getUserByEmail,
  getUserById,
  updateUser,
  listUsers,
} from './user.service.js'

function cleanDB(): void {
  db.pragma('foreign_keys = OFF')
  db.prepare('DELETE FROM logs').run()
  db.prepare('DELETE FROM verify_codes').run()
  db.prepare('DELETE FROM format_routes').run()
  db.prepare('DELETE FROM api_keys').run()
  db.prepare('DELETE FROM channels').run()
  db.prepare('DELETE FROM users').run()
  db.pragma('foreign_keys = ON')
}

beforeAll(() => {
  initDB()
})

beforeEach(() => {
  cleanDB()
})

describe('createUser', () => {
  it('should create a new user', async () => {
    const user = await createUser('test@example.com', 'password123')
    expect(user.email).toBe('test@example.com')
    expect(user.displayName).toBe('test')
    expect(user.role).toBe(1)
    expect(user.id).toBeGreaterThan(0)
  })

  it('should reject duplicate email', async () => {
    await createUser('test@example.com', 'password123')
    await expect(createUser('test@example.com', 'password123')).rejects.toThrow('Email already registered')
  })
})

describe('getUserByEmail', () => {
  it('should find user by email', async () => {
    await createUser('test@example.com', 'password123')
    const user = getUserByEmail('test@example.com')
    expect(user).toBeDefined()
    expect(user!.email).toBe('test@example.com')
  })

  it('should return undefined for non-existent email', () => {
    const user = getUserByEmail('nobody@example.com')
    expect(user).toBeUndefined()
  })
})

describe('getUserById', () => {
  it('should find user by id', async () => {
    const created = await createUser('test@example.com', 'password123')
    const found = getUserById(created.id)
    expect(found).toBeDefined()
    expect(found!.email).toBe('test@example.com')
  })
})

describe('updateUser', () => {
  it('should update user fields', async () => {
    const created = await createUser('test@example.com', 'password123')
    const updated = updateUser(created.id, { display_name: 'New Name' })
    expect(updated!.displayName).toBe('New Name')
  })
})

describe('listUsers', () => {
  it('should list users with pagination', async () => {
    await createUser('test@example.com', 'password123')
    const result = listUsers(1, 10)
    expect(result.total).toBeGreaterThanOrEqual(1)
    expect(result.users.length).toBeGreaterThanOrEqual(1)
  })
})
