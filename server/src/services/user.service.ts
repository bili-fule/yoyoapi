import db from '../db/index.js'
import { hashPassword } from '../utils/crypto.js'
import { getRow, allRows } from '../db/helpers.js'
import { ValidationError } from '../utils/errors.js'

export interface UserRow {
  id: number
  email: string
  password_hash: string
  display_name: string
  role: number
  quota: number
  used_quota: number
  qq_id: string
  created_at: string
  updated_at: string
}

export interface UserPublic {
  id: number
  email: string
  displayName: string
  role: number
  quota: number
  usedQuota: number
  qqId: string
  createdAt: string
}

function toPublic(row: UserRow): UserPublic {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    quota: row.quota,
    usedQuota: row.used_quota,
    qqId: row.qq_id,
    createdAt: row.created_at,
  }
}

export async function createUser(email: string, password: string, displayName?: string): Promise<UserPublic> {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) {
    throw new ValidationError('Email already registered')
  }

  const passwordHash = await hashPassword(password)
  const result = db.prepare(`
    INSERT INTO users (email, password_hash, display_name)
    VALUES (?, ?, ?)
  `).run(email, passwordHash, displayName || email.split('@')[0]!)

  const user = getRow<UserRow>(db.prepare('SELECT * FROM users WHERE id = ?'), Number(result.lastInsertRowid))!
  return toPublic(user)
}

export function getUserByEmail(email: string): UserRow | undefined {
  return getRow<UserRow>(db.prepare('SELECT * FROM users WHERE email = ?'), email)
}

export function getUserById(id: number): UserRow | undefined {
  return getRow<UserRow>(db.prepare('SELECT * FROM users WHERE id = ?'), id)
}

export function updateUser(id: number, fields: Partial<{ display_name: string; role: number; quota: number; qq_id: string }>): UserPublic | undefined {
  const sets: string[] = []
  const vals: unknown[] = []
  for (const [key, val] of Object.entries(fields)) {
    if (val !== undefined) {
      sets.push(`${key} = ?`)
      vals.push(val)
    }
  }
  if (sets.length === 0) return undefined

  sets.push("updated_at = datetime('now')")
  vals.push(id)

  db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
  const row = getRow<UserRow>(db.prepare('SELECT * FROM users WHERE id = ?'), id)
  return row ? toPublic(row) : undefined
}

export function listUsers(page = 1, pageSize = 20): { users: UserPublic[]; total: number } {
  const total = getRow<{ c: number }>(db.prepare('SELECT COUNT(*) as c FROM users'))!.c
  const rows = allRows<UserRow>(db.prepare('SELECT * FROM users ORDER BY id DESC LIMIT ? OFFSET ?'), pageSize, (page - 1) * pageSize)

  return { users: rows.map(toPublic), total }
}

export function updatePassword(userId: number, passwordHash: string): void {
  db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
    .run(passwordHash, userId)
}
