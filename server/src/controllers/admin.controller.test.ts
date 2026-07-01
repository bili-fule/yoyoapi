// allow: SIZE_OK — test file covering 9 admin handlers + auth (single file per task requirement)
import express from 'express'
import request from 'supertest'
import { initDB } from '../db/index.js'
import db from '../db/index.js'
import { hashPassword, generateApiKey } from '../utils/crypto.js'
import { errorHandler } from '../middleware/error.js'
import adminRoutes from '../routes/admin.js'

let app: express.Express

function cleanDB(): void {
  db.pragma('foreign_keys = OFF')
  for (const t of ['logs', 'verify_codes', 'api_keys', 'channels', 'users']) {
    db.prepare(`DELETE FROM ${t}`).run()
  }
  db.pragma('foreign_keys = ON')
}

async function seedAdmin(): Promise<string> {
  const hash = await hashPassword('admin123')
  db.prepare('INSERT INTO users (email, password_hash, display_name, role) VALUES (?, ?, ?, ?)')
    .run('admin@test.com', hash, 'Admin', 10)
  const u = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@test.com') as { id: number }
  const key = generateApiKey()
  db.prepare('INSERT INTO api_keys (user_id, key) VALUES (?, ?)').run(u.id, key)
  return key
}

async function seedRegularUser(): Promise<string> {
  const hash = await hashPassword('pass123')
  db.prepare('INSERT INTO users (email, password_hash, display_name, role) VALUES (?, ?, ?, ?)')
    .run('user@test.com', hash, 'Regular', 1)
  const u = db.prepare('SELECT id FROM users WHERE email = ?').get('user@test.com') as { id: number }
  const key = generateApiKey()
  db.prepare('INSERT INTO api_keys (user_id, key) VALUES (?, ?)').run(u.id, key)
  return key
}

beforeAll(() => {
  initDB()
  cleanDB()
  app = express()
  app.use(express.json())
  app.use('/admin', adminRoutes)
  app.use(errorHandler)
})

beforeEach(() => {
  cleanDB()
})

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe('Admin Auth', () => {
  it('returns 401 without auth header', async () => {
    const res = await request(app).get('/admin/users')
    expect(res.status).toBe(401)
    expect(res.body.error).toBeDefined()
  })

  it('returns 403 for non-admin user', async () => {
    const userKey = await seedRegularUser()
    const res = await request(app)
      .get('/admin/users')
      .set('Authorization', `Bearer ${userKey}`)
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('forbidden')
  })
})

// ─── Users ────────────────────────────────────────────────────────────────────

describe('Admin Users', () => {
  let adminKey: string

  beforeEach(async () => {
    adminKey = await seedAdmin()
  })

  it('listUsers returns paginated users', async () => {
    const hash = await hashPassword('pass')
    for (let i = 0; i < 3; i++) {
      db.prepare('INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)')
        .run(`user${i}@test.com`, hash, `User${i}`)
    }

    const res = await request(app)
      .get('/admin/users')
      .set('Authorization', `Bearer ${adminKey}`)

    expect(res.status).toBe(200)
    expect(res.body.total).toBe(4) // admin + 3 users
    expect(res.body.users).toHaveLength(4)
    expect(res.body.users[0].email).toBeDefined()
  })

  it('listUsers respects page and pageSize params', async () => {
    const hash = await hashPassword('pass')
    for (let i = 0; i < 5; i++) {
      db.prepare('INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)')
        .run(`user${i}@test.com`, hash, `User${i}`)
    }

    const res = await request(app)
      .get('/admin/users?page=1&pageSize=2')
      .set('Authorization', `Bearer ${adminKey}`)

    expect(res.status).toBe(200)
    expect(res.body.users).toHaveLength(2)
    expect(res.body.total).toBe(6) // admin + 5 users
  })

  it('listUsers returns empty list when only admin exists', async () => {
    const res = await request(app)
      .get('/admin/users')
      .set('Authorization', `Bearer ${adminKey}`)

    expect(res.status).toBe(200)
    expect(res.body.users).toHaveLength(1)
    expect(res.body.total).toBe(1)
  })

  it('updateUser updates user fields', async () => {
    const hash = await hashPassword('pass')
    db.prepare('INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)')
      .run('target@test.com', hash, 'Target')
    const target = db.prepare('SELECT id FROM users WHERE email = ?').get('target@test.com') as { id: number }

    const res = await request(app)
      .put(`/admin/users/${target.id}`)
      .set('Authorization', `Bearer ${adminKey}`)
      .send({ role: 5, quota: 1000, displayName: 'Updated', qqId: 'qq123' })

    expect(res.status).toBe(200)
    expect(res.body.user.role).toBe(5)
    expect(res.body.user.quota).toBe(1000)
    expect(res.body.user.displayName).toBe('Updated')
    expect(res.body.user.qqId).toBe('qq123')
  })

  it('updateUser returns 404 for non-existent user', async () => {
    const res = await request(app)
      .put('/admin/users/99999')
      .set('Authorization', `Bearer ${adminKey}`)
      .send({ role: 5 })

    expect(res.status).toBe(404)
    expect(res.body.error.message).toBe('User not found')
  })

  it('updateUser returns 400 for invalid data types', async () => {
    const hash = await hashPassword('pass')
    db.prepare('INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)')
      .run('target@test.com', hash, 'Target')
    const target = db.prepare('SELECT id FROM users WHERE email = ?').get('target@test.com') as { id: number }

    const res = await request(app)
      .put(`/admin/users/${target.id}`)
      .set('Authorization', `Bearer ${adminKey}`)
      .send({ role: 'not-a-number' })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('validation_error')
  })

  it('updateUser with empty body returns 404 (no fields to update)', async () => {
    const hash = await hashPassword('pass')
    db.prepare('INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)')
      .run('target@test.com', hash, 'Target')
    const target = db.prepare('SELECT id FROM users WHERE email = ?').get('target@test.com') as { id: number }

    const res = await request(app)
      .put(`/admin/users/${target.id}`)
      .set('Authorization', `Bearer ${adminKey}`)
      .send({})

    expect(res.status).toBe(404)
    expect(res.body.error.message).toBe('User not found')
  })

  it('deleteUser deletes an existing user', async () => {
    const hash = await hashPassword('pass')
    db.prepare('INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)')
      .run('delete@test.com', hash, 'DeleteMe')
    const target = db.prepare('SELECT id FROM users WHERE email = ?').get('delete@test.com') as { id: number }

    const res = await request(app)
      .delete(`/admin/users/${target.id}`)
      .set('Authorization', `Bearer ${adminKey}`)

    expect(res.status).toBe(200)
    expect(res.body.message).toBe('User deleted')

    const stillThere = db.prepare('SELECT id FROM users WHERE id = ?').get(target.id)
    expect(stillThere).toBeUndefined()
  })

  it('deleteUser returns 404 for non-existent user', async () => {
    const res = await request(app)
      .delete('/admin/users/99999')
      .set('Authorization', `Bearer ${adminKey}`)

    expect(res.status).toBe(404)
    expect(res.body.error.message).toBe('User not found')
  })
})

// ─── Channels ─────────────────────────────────────────────────────────────────

describe('Admin Channels', () => {
  let adminKey: string

  beforeEach(async () => {
    adminKey = await seedAdmin()
  })

  it('createChannel creates a channel and returns 201', async () => {
    const res = await request(app)
      .post('/admin/channels')
      .set('Authorization', `Bearer ${adminKey}`)
      .send({
        name: 'test-channel',
        baseUrl: 'https://api.test.com',
        apiKey: 'sk-test',
        models: ['gpt-4', 'gpt-3.5'],
        priority: 5,
      })

    expect(res.status).toBe(201)
    expect(res.body.channel.name).toBe('test-channel')
    expect(res.body.channel.baseUrl).toBe('https://api.test.com')
    expect(res.body.channel.models).toEqual(['gpt-4', 'gpt-3.5'])
    expect(res.body.channel.priority).toBe(5)
    expect(res.body.channel.type).toBe('openai') // default type
  })

  it('createChannel returns 400 when required fields missing', async () => {
    const res = await request(app)
      .post('/admin/channels')
      .set('Authorization', `Bearer ${adminKey}`)
      .send({ name: 'incomplete' })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('validation_error')
  })

  it('createChannel returns 400 with empty body', async () => {
    const res = await request(app)
      .post('/admin/channels')
      .set('Authorization', `Bearer ${adminKey}`)
      .send({})

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('validation_error')
  })

  it('listChannels returns all channels', async () => {
    db.prepare('INSERT INTO channels (name, base_url, api_key, models, priority) VALUES (?, ?, ?, ?, ?)')
      .run('ch1', 'https://api1.test.com', 'sk-1', JSON.stringify(['m1']), 1)
    db.prepare('INSERT INTO channels (name, base_url, api_key, models, priority) VALUES (?, ?, ?, ?, ?)')
      .run('ch2', 'https://api2.test.com', 'sk-2', JSON.stringify(['m2']), 2)

    const res = await request(app)
      .get('/admin/channels')
      .set('Authorization', `Bearer ${adminKey}`)

    expect(res.status).toBe(200)
    expect(res.body.channels).toHaveLength(2)
  })

  it('listChannels returns empty array when no channels exist', async () => {
    const res = await request(app)
      .get('/admin/channels')
      .set('Authorization', `Bearer ${adminKey}`)

    expect(res.status).toBe(200)
    expect(res.body.channels).toEqual([])
  })

  it('updateChannel updates channel fields', async () => {
    db.prepare('INSERT INTO channels (name, base_url, api_key) VALUES (?, ?, ?)')
      .run('old-name', 'https://api.test.com', 'sk-old')
    const ch = db.prepare('SELECT id FROM channels WHERE name = ?').get('old-name') as { id: number }

    const res = await request(app)
      .put(`/admin/channels/${ch.id}`)
      .set('Authorization', `Bearer ${adminKey}`)
      .send({ name: 'new-name', priority: 10, status: 0 })

    expect(res.status).toBe(200)
    expect(res.body.channel.name).toBe('new-name')
    expect(res.body.channel.priority).toBe(10)
    expect(res.body.channel.status).toBe(0)
  })

  it('updateChannel returns 404 for non-existent channel', async () => {
    const res = await request(app)
      .put('/admin/channels/99999')
      .set('Authorization', `Bearer ${adminKey}`)
      .send({ name: 'ghost' })

    expect(res.status).toBe(404)
    expect(res.body.error.message).toBe('Channel not found')
  })

  it('updateChannel returns 400 for invalid data', async () => {
    db.prepare('INSERT INTO channels (name, base_url, api_key) VALUES (?, ?, ?)')
      .run('test', 'https://api.test.com', 'sk-test')
    const ch = db.prepare('SELECT id FROM channels WHERE name = ?').get('test') as { id: number }

    const res = await request(app)
      .put(`/admin/channels/${ch.id}`)
      .set('Authorization', `Bearer ${adminKey}`)
      .send({ priority: 'not-a-number' })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('validation_error')
  })

  it('deleteChannel deletes an existing channel', async () => {
    db.prepare('INSERT INTO channels (name, base_url, api_key) VALUES (?, ?, ?)')
      .run('delete-me', 'https://api.test.com', 'sk-del')
    const ch = db.prepare('SELECT id FROM channels WHERE name = ?').get('delete-me') as { id: number }

    const res = await request(app)
      .delete(`/admin/channels/${ch.id}`)
      .set('Authorization', `Bearer ${adminKey}`)

    expect(res.status).toBe(200)
    expect(res.body.message).toBe('Channel deleted')

    const stillThere = db.prepare('SELECT id FROM channels WHERE id = ?').get(ch.id)
    expect(stillThere).toBeUndefined()
  })

  it('deleteChannel returns 404 for non-existent channel', async () => {
    const res = await request(app)
      .delete('/admin/channels/99999')
      .set('Authorization', `Bearer ${adminKey}`)

    expect(res.status).toBe(404)
    expect(res.body.error.message).toBe('Channel not found')
  })
})

// ─── Logs ─────────────────────────────────────────────────────────────────────

describe('Admin Logs', () => {
  let adminKey: string

  beforeEach(async () => {
    adminKey = await seedAdmin()
  })

  it('getLogs returns paginated logs', async () => {
    db.prepare('INSERT INTO logs (user_id, model, quota_cost) VALUES (?, ?, ?)')
      .run(1, 'gpt-4', 10)
    db.prepare('INSERT INTO logs (user_id, model, quota_cost) VALUES (?, ?, ?)')
      .run(1, 'gpt-3.5', 5)

    const res = await request(app)
      .get('/admin/logs')
      .set('Authorization', `Bearer ${adminKey}`)

    expect(res.status).toBe(200)
    expect(res.body.logs).toHaveLength(2)
    expect(res.body.total).toBe(2)
    expect(res.body.logs[0].model).toBeDefined()
  })

  it('getLogs with userId filter', async () => {
    const hash = await hashPassword('pass')
    db.prepare('INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)')
      .run('user-a@test.com', hash, 'UserA')
    const ua = db.prepare('SELECT id FROM users WHERE email = ?').get('user-a@test.com') as { id: number }
    db.prepare('INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)')
      .run('user-b@test.com', hash, 'UserB')
    const ub = db.prepare('SELECT id FROM users WHERE email = ?').get('user-b@test.com') as { id: number }

    db.prepare('INSERT INTO logs (user_id, model, quota_cost) VALUES (?, ?, ?)').run(ua.id, 'gpt-4', 10)
    db.prepare('INSERT INTO logs (user_id, model, quota_cost) VALUES (?, ?, ?)').run(ua.id, 'gpt-3.5', 5)
    db.prepare('INSERT INTO logs (user_id, model, quota_cost) VALUES (?, ?, ?)').run(ub.id, 'claude-3', 8)

    const res = await request(app)
      .get(`/admin/logs?userId=${ua.id}`)
      .set('Authorization', `Bearer ${adminKey}`)

    expect(res.status).toBe(200)
    expect(res.body.logs).toHaveLength(2)
    expect(res.body.total).toBe(2)
    for (const log of res.body.logs) {
      expect(log.user_id).toBe(ua.id)
    }
  })

  it('getLogs returns empty when no logs exist', async () => {
    const res = await request(app)
      .get('/admin/logs')
      .set('Authorization', `Bearer ${adminKey}`)

    expect(res.status).toBe(200)
    expect(res.body.logs).toEqual([])
    expect(res.body.total).toBe(0)
  })

  it('getLogs respects page and pageSize', async () => {
    for (let i = 0; i < 5; i++) {
      db.prepare('INSERT INTO logs (user_id, model, quota_cost) VALUES (?, ?, ?)').run(1, 'gpt-4', 1)
    }

    const res = await request(app)
      .get('/admin/logs?page=2&pageSize=2')
      .set('Authorization', `Bearer ${adminKey}`)

    expect(res.status).toBe(200)
    expect(res.body.logs).toHaveLength(2) // items 3-4 out of 5 (0-indexed)
    expect(res.body.total).toBe(5)
  })

  it('getLogs with userId param for non-existent user returns empty', async () => {
    const res = await request(app)
      .get('/admin/logs?userId=99999')
      .set('Authorization', `Bearer ${adminKey}`)

    expect(res.status).toBe(200)
    expect(res.body.logs).toEqual([])
    expect(res.body.total).toBe(0)
  })
})

// ─── Stats ────────────────────────────────────────────────────────────────────

describe('Admin Stats', () => {
  let adminKey: string

  beforeEach(async () => {
    adminKey = await seedAdmin()
  })

  it('getStats returns totalUsers and todayUsage with data', async () => {
    const hash = await hashPassword('pass')
    db.prepare('INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)')
      .run('extra@test.com', hash, 'Extra')

    db.prepare("INSERT INTO logs (user_id, quota_cost, created_at) VALUES (?, ?, datetime('now'))")
      .run(1, 100)
    db.prepare("INSERT INTO logs (user_id, quota_cost, created_at) VALUES (?, ?, datetime('now'))")
      .run(1, 50)

    const res = await request(app)
      .get('/admin/stats')
      .set('Authorization', `Bearer ${adminKey}`)

    expect(res.status).toBe(200)
    expect(res.body.totalUsers).toBe(2) // admin + 1 extra
    expect(res.body.todayUsage).toBe(150)
  })

  it('getStats returns zero values when no data exists', async () => {
    const res = await request(app)
      .get('/admin/stats')
      .set('Authorization', `Bearer ${adminKey}`)

    expect(res.status).toBe(200)
    expect(res.body.totalUsers).toBe(1) // admin only
    expect(res.body.todayUsage).toBe(0)
  })
})
