import db from '../db/index.js'
import { hashPassword, verifyPassword, generateCode } from '../utils/crypto.js'
import { getRow } from '../db/helpers.js'
import { sendVerificationCode } from '../utils/email.js'
import { createUser, getUserByEmail, getUserById, updatePassword } from './user.service.js'
import { createApiKey } from './api-key.service.js'
import { AuthError, ValidationError } from '../utils/errors.js'

const CODE_EXPIRY_MINUTES = 10

export async function register(email: string, password: string, code: string, displayName?: string) {
  const valid = verifyCode(email, code, 'register')
  if (!valid) throw new ValidationError('Invalid or expired verification code')

  const user = await createUser(email, password, displayName)
  const apiKey = createApiKey(user.id, 'default')

  markCodeUsed(email, code, 'register')

  return { user, apiKey: apiKey.fullKey }
}

export async function login(email: string, password: string) {
  const user = getUserByEmail(email)
  if (!user) throw new AuthError('Invalid email or password')
  if (user.role === 0) throw new AuthError('Account disabled')

  const ok = await verifyPassword(password, user.password_hash)
  if (!ok) throw new AuthError('Invalid email or password')

  const keys = getRow<{ key: string }>(db.prepare('SELECT key FROM api_keys WHERE user_id = ? AND status = 1 LIMIT 1'), user.id)

  const { password_hash: _, ...safeUser } = user

  if (!keys) {
    const newKey = createApiKey(user.id, 'default')
    return {
      user: safeUser,
      apiKey: newKey.fullKey,
    }
  }

  return {
    user: safeUser,
    apiKey: keys.key,
  }
}

export function sendCode(email: string, type: 'register' | 'reset') {
  const code = generateCode()
  const expiresAt = getSqliteDateTime(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000)

  db.prepare('INSERT INTO verify_codes (email, code, type, expires_at) VALUES (?, ?, ?, ?)')
    .run(email, code, type, expiresAt)

  return sendVerificationCode(email, code)
}

export async function resetPassword(email: string, code: string, newPassword: string) {
  const valid = verifyCode(email, code, 'reset')
  if (!valid) throw new ValidationError('Invalid or expired verification code')

  const user = getUserByEmail(email)
  if (!user) throw new ValidationError('User not found')

  const passwordHash = await hashPassword(newPassword)
  updatePassword(user.id, passwordHash)
  markCodeUsed(email, code, 'reset')
}

function verifyCode(email: string, code: string, type: string): boolean {
  const row = db.prepare(`
    SELECT id FROM verify_codes
    WHERE email = ? AND code = ? AND type = ? AND used = 0 AND expires_at > datetime('now')
    ORDER BY id DESC LIMIT 1
  `).get(email, code, type)
  return !!row
}

function markCodeUsed(email: string, code: string, type: string): void {
  db.prepare('UPDATE verify_codes SET used = 1 WHERE email = ? AND code = ? AND type = ?')
    .run(email, code, type)
}

function getSqliteDateTime(ms: number): string {
  return new Date(ms).toISOString().slice(0, 19).replace('T', ' ')
}
