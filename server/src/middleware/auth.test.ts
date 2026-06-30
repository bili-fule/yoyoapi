import express from 'express'
import request from 'supertest'
import { initDB } from '../db/index.js'
import db from '../db/index.js'
import { hashPassword, generateApiKey } from '../utils/crypto.js'
import { tokenAuth, adminAuth, optionalTokenAuth } from './auth.js'
import { errorHandler } from './error.js'

function cleanDB(): void {
  db.pragma('foreign_keys = OFF')
  db.prepare('DELETE FROM logs').run()
  db.prepare('DELETE FROM verify_codes').run()
  db.prepare('DELETE FROM api_keys').run()
  db.prepare('DELETE FROM channels').run()
  db.prepare('DELETE FROM users').run()
  db.pragma('foreign_keys = ON')
}

let app: express.Express

beforeAll(() => {
  initDB()
  cleanDB()

  app = express()
  app.use(express.json())

  app.get('/test-auth', tokenAuth, (req, res) => {
    res.json({ user: req.user, apiKeyId: req.apiKeyId })
  })

  app.get('/test-admin', tokenAuth, adminAuth, (_req, res) => {
    res.json({ ok: true })
  })

  app.get('/test-admin-standalone', adminAuth, (_req, res) => {
    res.json({ ok: true })
  })

  app.get('/test-optional', optionalTokenAuth, (req, res) => {
    res.json({ user: req.user ?? null })
  })

  app.use(errorHandler)
})

beforeEach(() => {
  cleanDB()
})

describe('tokenAuth', () => {
  it('should pass with valid API key', async () => {
    const pwHash = await hashPassword('pass123')
    db.prepare('INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)')
      .run('test@example.com', pwHash, 'Test User')
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get('test@example.com') as { id: number }
    const key = generateApiKey()
    db.prepare('INSERT INTO api_keys (user_id, key) VALUES (?, ?)').run(user.id, key)

    const res = await request(app)
      .get('/test-auth')
      .set('Authorization', `Bearer ${key}`)

    expect(res.status).toBe(200)
    expect(res.body.user.email).toBe('test@example.com')
    expect(res.body.user.displayName).toBe('Test User')
    expect(res.body.apiKeyId).toBeGreaterThan(0)
  })

  it('should fail with missing auth header', async () => {
    const res = await request(app).get('/test-auth')

    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('unauthorized')
    expect(res.body.error.message).toBe('Missing or invalid authorization header')
  })

  it('should fail with non-Bearer auth header', async () => {
    const res = await request(app)
      .get('/test-auth')
      .set('Authorization', 'Basic dGVzdDpwYXNz')

    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('unauthorized')
  })

  it('should fail with invalid API key', async () => {
    const res = await request(app)
      .get('/test-auth')
      .set('Authorization', 'Bearer sk-invalid-key')

    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('unauthorized')
    expect(res.body.error.message).toBe('Invalid or disabled API key')
  })

  it('should fail with disabled API key', async () => {
    const pwHash = await hashPassword('pass123')
    db.prepare('INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)')
      .run('disabled@example.com', pwHash, 'Disabled User')
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get('disabled@example.com') as { id: number }
    const key = generateApiKey()
    db.prepare('INSERT INTO api_keys (user_id, key, status) VALUES (?, ?, ?)').run(user.id, key, 0)

    const res = await request(app)
      .get('/test-auth')
      .set('Authorization', `Bearer ${key}`)

    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('unauthorized')
  })
})

describe('adminAuth', () => {
  it('should pass for admin user with role >= 10', async () => {
    const pwHash = await hashPassword('pass123')
    db.prepare('INSERT INTO users (email, password_hash, display_name, role) VALUES (?, ?, ?, ?)')
      .run('admin@example.com', pwHash, 'Admin User', 10)
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@example.com') as { id: number }
    const key = generateApiKey()
    db.prepare('INSERT INTO api_keys (user_id, key) VALUES (?, ?)').run(user.id, key)

    const res = await request(app)
      .get('/test-admin')
      .set('Authorization', `Bearer ${key}`)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('should fail for non-admin user with role < 10', async () => {
    const pwHash = await hashPassword('pass123')
    db.prepare('INSERT INTO users (email, password_hash, display_name, role) VALUES (?, ?, ?, ?)')
      .run('user@example.com', pwHash, 'Regular User', 1)
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get('user@example.com') as { id: number }
    const key = generateApiKey()
    db.prepare('INSERT INTO api_keys (user_id, key) VALUES (?, ?)').run(user.id, key)

    const res = await request(app)
      .get('/test-admin')
      .set('Authorization', `Bearer ${key}`)

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('forbidden')
  })

  it('should fail when no user is authenticated', async () => {
    const res = await request(app).get('/test-admin-standalone')

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('forbidden')
  })
})

describe('optionalTokenAuth', () => {
  it('should set user with valid API key', async () => {
    const pwHash = await hashPassword('pass123')
    db.prepare('INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)')
      .run('optional@example.com', pwHash, 'Optional User')
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get('optional@example.com') as { id: number }
    const key = generateApiKey()
    db.prepare('INSERT INTO api_keys (user_id, key) VALUES (?, ?)').run(user.id, key)

    const res = await request(app)
      .get('/test-optional')
      .set('Authorization', `Bearer ${key}`)

    expect(res.status).toBe(200)
    expect(res.body.user.email).toBe('optional@example.com')
  })

  it('should pass without auth header and not set user', async () => {
    const res = await request(app).get('/test-optional')

    expect(res.status).toBe(200)
    expect(res.body.user).toBeNull()
  })
})
