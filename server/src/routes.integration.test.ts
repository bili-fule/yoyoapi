import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { initDB } from './db/index.js'
import { errorHandler } from './middleware/error.js'
import routes from './routes/index.js'
import db from './db/index.js'
import { hashPassword, generateApiKey } from './utils/crypto.js'

let app: express.Express

function cleanDB(): void {
  db.pragma('foreign_keys = OFF')
  for (const t of ['logs', 'verify_codes', 'api_keys', 'channels', 'users']) {
    db.prepare(`DELETE FROM ${t}`).run()
  }
  db.pragma('foreign_keys = ON')
}

beforeAll(async () => {
  initDB()
  cleanDB()

  app = express()
  app.use(express.json())
  app.use('/api', routes)
  app.use(errorHandler)
})

beforeEach(() => {
  cleanDB()
})

describe('API Integration', () => {
  it('GET /api/health', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })

  it('POST /api/auth/send-code', async () => {
    const res = await request(app)
      .post('/api/auth/send-code')
      .send({ email: 'test@example.com', type: 'register' })
    expect(res.status).toBe(200)
    expect(res.body.message).toBe('Verification code sent')
  })

  it('POST /api/auth/login with valid credentials', async () => {
    const pwHash = await hashPassword('pass123')
    db.prepare('INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)')
      .run('login@test.com', pwHash, 'Test')
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get('login@test.com') as { id: number }
    const key = generateApiKey()
    db.prepare('INSERT INTO api_keys (user_id, key) VALUES (?, ?)').run(user.id, key)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.com', password: 'pass123' })
    expect(res.status).toBe(200)
    expect(res.body.apiKey).toBe(key)
  })

  it('POST /api/auth/login with wrong password returns 401', async () => {
    const pwHash = await hashPassword('pass123')
    db.prepare('INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)')
      .run('login@test.com', pwHash, 'Test')

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.com', password: 'wrong' })
    expect(res.status).toBe(401)
  })

  it('GET /api/user/profile with valid API key', async () => {
    const pwHash = await hashPassword('pass123')
    db.prepare('INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)')
      .run('profile@test.com', pwHash, 'ProfileUser')
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get('profile@test.com') as { id: number }
    const key = generateApiKey()
    db.prepare('INSERT INTO api_keys (user_id, key, name) VALUES (?, ?, ?)').run(user.id, key, 'test-key')

    const res = await request(app)
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${key}`)
    expect(res.status).toBe(200)
    expect(res.body.user.email).toBe('profile@test.com')
    expect(res.body.user.display_name).toBe('ProfileUser')
  })

  it('GET /api/user/profile without auth returns 401', async () => {
    const res = await request(app).get('/api/user/profile')
    expect(res.status).toBe(401)
  })

  it('GET /api/user/api-keys', async () => {
    const pwHash = await hashPassword('pass123')
    db.prepare('INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)')
      .run('keys@test.com', pwHash, 'KeysUser')
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get('keys@test.com') as { id: number }
    const key = generateApiKey()
    db.prepare('INSERT INTO api_keys (user_id, key, name) VALUES (?, ?, ?)').run(user.id, key, 'key1')

    const res = await request(app)
      .get('/api/user/api-keys')
      .set('Authorization', `Bearer ${key}`)
    expect(res.status).toBe(200)
    expect(res.body.apiKeys).toHaveLength(1)
    expect(res.body.apiKeys[0].name).toBe('key1')
  })

  it('CRUD API keys', async () => {
    const pwHash = await hashPassword('pass123')
    db.prepare('INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)')
      .run('crud@test.com', pwHash, 'CrudUser')
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get('crud@test.com') as { id: number }
    const key = generateApiKey()
    db.prepare('INSERT INTO api_keys (user_id, key, name) VALUES (?, ?, ?)').run(user.id, key, 'key1')

    const res = await request(app)
      .post('/api/user/api-keys')
      .set('Authorization', `Bearer ${key}`)
      .send({ name: 'new-key' })
    expect(res.status).toBe(201)
    expect(res.body.apiKey.name).toBe('new-key')
  })

  it('GET /api/v1/models', async () => {
    db.prepare('INSERT INTO channels (name, type, base_url, api_key, models) VALUES (?, ?, ?, ?, ?)')
      .run('test', 'openai', 'https://api.example.com', 'sk-test', JSON.stringify(['gpt-4', 'gpt-3.5']))

    const pwHash = await hashPassword('pass123')
    db.prepare('INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)')
      .run('models@test.com', pwHash, 'ModelsUser')
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get('models@test.com') as { id: number }
    const key = generateApiKey()
    db.prepare('INSERT INTO api_keys (user_id, key) VALUES (?, ?)').run(user.id, key)

    const res = await request(app)
      .get('/api/v1/models')
      .set('Authorization', `Bearer ${key}`)
    expect(res.status).toBe(200)
    expect(res.body.object).toBe('list')
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
  })

  it('POST /api/v1/chat/completions with invalid api key returns 401', async () => {
    const res = await request(app)
      .post('/api/v1/chat/completions')
      .set('Authorization', 'Bearer sk-invalid')
      .send({ model: 'gpt-4', messages: [{ role: 'user', content: 'hi' }] })
    expect(res.status).toBe(401)
  })
})
