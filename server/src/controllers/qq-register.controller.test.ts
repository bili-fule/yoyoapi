import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import { initDB } from '../db/index.js'
import db from '../db/index.js'
import { errorHandler } from '../middleware/error.js'
import { asyncHandler } from '../utils/async-handler.js'
import * as qqRegisterService from '../services/qq-register.service.js'
import * as qqRegisterController from './qq-register.controller.js'

let app: express.Express

function cleanDB(): void {
  db.pragma('foreign_keys = OFF')
  for (const t of ['api_keys', 'users']) {
    db.prepare(`DELETE FROM ${t}`).run()
  }
  db.pragma('foreign_keys = ON')
}

beforeAll(() => {
  initDB()
  app = express()
  app.use(express.json())
  app.post('/api/auth/qq-register-code', asyncHandler(qqRegisterController.qqRegisterCode))
  app.post('/api/auth/register-qq', asyncHandler(qqRegisterController.registerQq))
  app.use(errorHandler)
})

beforeEach(() => {
  cleanDB()
  db.exec("UPDATE settings SET value = 'false' WHERE key = 'qq_registration_enabled'")
  vi.restoreAllMocks()
})

describe('qqRegisterCode', () => {
  it('returns 404 when qq_registration_enabled is false', async () => {
    const res = await request(app).post('/api/auth/qq-register-code')

    expect(res.status).toBe(404)
    expect(res.body.error.message).toBe('QQ registration is not enabled')
  })

  it('returns 502 when AstrBot is not configured', async () => {
    db.exec("UPDATE settings SET value = 'true' WHERE key = 'qq_registration_enabled'")

    const res = await request(app).post('/api/auth/qq-register-code')

    expect(res.status).toBe(502)
    expect(res.body.error.message).toContain('not configured')
  })

  it('returns result when AstrBot responds', async () => {
    db.exec("UPDATE settings SET value = 'true' WHERE key = 'qq_registration_enabled'")

    vi.spyOn(qqRegisterService, 'getQqRegisterCode').mockResolvedValue({
      bindId: 'a1b2c3d4e5f6a7b8',
      code: 'ABC123',
      expireSeconds: 300,
    })

    const res = await request(app).post('/api/auth/qq-register-code')

    expect(res.status).toBe(200)
    expect(res.body.code).toBe('ABC123')
    expect(res.body.bindId).toBe('a1b2c3d4e5f6a7b8')
    expect(res.body.expireSeconds).toBe(300)
  })
})

describe('registerQq', () => {
  it('returns 404 when qq_registration_enabled is false', async () => {
    const res = await request(app)
      .post('/api/auth/register-qq')
      .send({ email: 'test@test.com', password: 'pass123', bindId: 'abc123' })

    expect(res.status).toBe(404)
    expect(res.body.error.message).toBe('QQ registration is not enabled')
  })

  it('returns 400 for invalid email', async () => {
    db.exec("UPDATE settings SET value = 'true' WHERE key = 'qq_registration_enabled'")

    const res = await request(app)
      .post('/api/auth/register-qq')
      .send({ email: 'not-an-email', password: 'pass123', bindId: 'abc123' })

    expect(res.status).toBe(400)
  })

  it('returns 400 for short password', async () => {
    db.exec("UPDATE settings SET value = 'true' WHERE key = 'qq_registration_enabled'")

    const res = await request(app)
      .post('/api/auth/register-qq')
      .send({ email: 'test@test.com', password: '123', bindId: 'abc123' })

    expect(res.status).toBe(400)
  })

  it('returns 400 for empty bindId', async () => {
    db.exec("UPDATE settings SET value = 'true' WHERE key = 'qq_registration_enabled'")

    const res = await request(app)
      .post('/api/auth/register-qq')
      .send({ email: 'test@test.com', password: 'pass123', bindId: '' })

    expect(res.status).toBe(400)
  })

  it('returns 409 when email already registered', async () => {
    db.exec("UPDATE settings SET value = 'true' WHERE key = 'qq_registration_enabled'")
    db.prepare('INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)')
      .run('existing@test.com', 'hash', 'Existing')

    const res = await request(app)
      .post('/api/auth/register-qq')
      .send({ email: 'existing@test.com', password: 'pass123', bindId: 'abc123' })

    expect(res.status).toBe(409)
    expect(res.body.error.message).toBe('Email already registered')
  })

  it('returns 400 when QQ bind validation fails', async () => {
    db.exec("UPDATE settings SET value = 'true' WHERE key = 'qq_registration_enabled'")

    vi.spyOn(qqRegisterService, 'validateQqBind').mockRejectedValue(
      new Error('QQ not bound yet. Send the code to the QQ bot first.'),
    )

    const res = await request(app)
      .post('/api/auth/register-qq')
      .send({ email: 'new@test.com', password: 'pass123', bindId: 'invalid-bind' })

    expect(res.status).toBe(400)
    expect(res.body.error.message).toBe('QQ not bound yet. Send the code to the QQ bot first.')
  })

  it('returns 409 when QQ already bound to another user', async () => {
    db.exec("UPDATE settings SET value = 'true' WHERE key = 'qq_registration_enabled'")
    db.prepare('INSERT INTO users (email, password_hash, display_name, qq_id) VALUES (?, ?, ?, ?)')
      .run('other@test.com', 'hash', 'Other', 'QQ12345')

    vi.spyOn(qqRegisterService, 'validateQqBind').mockResolvedValue('QQ12345')

    const res = await request(app)
      .post('/api/auth/register-qq')
      .send({ email: 'new@test.com', password: 'pass123', bindId: 'abc123' })

    expect(res.status).toBe(409)
    expect(res.body.error.message).toBe('This QQ account is already bound to another user')
  })

  it('returns 201 on successful registration', async () => {
    db.exec("UPDATE settings SET value = 'true' WHERE key = 'qq_registration_enabled'")

    vi.spyOn(qqRegisterService, 'validateQqBind').mockResolvedValue('QQ67890')
    vi.spyOn(qqRegisterService, 'registerWithQq').mockResolvedValue({
      user: { id: 1, email: 'newuser@test.com', displayName: 'NewUser', role: 1, quota: 0, usedQuota: 0, qqId: 'QQ67890', createdAt: '2024-01-01' },
      apiKey: 'sk-test-key',
    })

    const res = await request(app)
      .post('/api/auth/register-qq')
      .send({ email: 'newuser@test.com', password: 'pass123', bindId: 'abc123', displayName: 'NewUser' })

    expect(res.status).toBe(201)
    expect(res.body.user.email).toBe('newuser@test.com')
    expect(res.body.user.qqId).toBe('QQ67890')
    expect(res.body.apiKey).toBe('sk-test-key')
  })
})
