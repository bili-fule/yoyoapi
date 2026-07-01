import { randomBytes } from 'crypto'
import db from '../db/index.js'
import { config } from '../config.js'
import { hashPassword, generateApiKey } from '../utils/crypto.js'
import { toPublic } from './user.service.js'
import type { UserRow } from './user.service.js'
import { ValidationError } from '../utils/errors.js'

const QQ_REGISTER_PREFIX = 'qqreg_'

interface BindCodeResponse {
  code: string
  expire_seconds: number
}

interface BindQueryResponse {
  bound: boolean
  qq: string
  user_id: string
}

function getBaseUrl(): string {
  if (!config.qq.botBaseUrl) {
    throw new Error('QQ bot base URL not configured')
  }
  return config.qq.botBaseUrl.replace(/\/+$/, '')
}

export async function getQqRegisterCode(): Promise<{ bindId: string; code: string; expireSeconds: number }> {
  const bindId = randomBytes(8).toString('hex')
  const baseUrl = getBaseUrl()
  const url = `${baseUrl}/api/plug/api/v1/bind/code?user_id=${QQ_REGISTER_PREFIX}${bindId}`

  const resp = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  if (!resp.ok) {
    throw new Error(`AstrBot returned ${resp.status}`)
  }

  const data = await resp.json() as BindCodeResponse
  if (!data.code) {
    throw new Error('Invalid response from AstrBot')
  }

  return { bindId, code: data.code, expireSeconds: data.expire_seconds }
}

export async function validateQqBind(bindId: string): Promise<string> {
  const baseUrl = getBaseUrl()
  const url = `${baseUrl}/api/plug/api/v1/bind/query?user_id=${QQ_REGISTER_PREFIX}${bindId}`

  const resp = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  if (!resp.ok) {
    throw new Error(`AstrBot returned ${resp.status}`)
  }

  const data = await resp.json() as BindQueryResponse
  if (!data.bound) {
    throw new Error('QQ not bound yet. Send the code to the QQ bot first.')
  }

  if (!data.qq) {
    throw new Error('Invalid response from AstrBot: missing QQ number')
  }

  return data.qq
}

export async function registerWithQq(email: string, password: string, qqId: string, displayName?: string) {
  const passwordHash = await hashPassword(password)

  const registerTx = db.transaction(() => {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (existing) throw new ValidationError('Email already registered')

    const result = db.prepare('INSERT INTO users (email, password_hash, display_name, qq_id) VALUES (?, ?, ?, ?)')
      .run(email, passwordHash, displayName || email.split('@')[0], qqId)
    const userId = Number(result.lastInsertRowid)

    const key = generateApiKey()
    db.prepare('INSERT INTO api_keys (user_id, key, name) VALUES (?, ?, ?)').run(userId, key, 'default')

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRow
    return { user: toPublic(user), fullKey: key }
  })

  const { user, fullKey } = registerTx()
  return { user, apiKey: fullKey }
}
