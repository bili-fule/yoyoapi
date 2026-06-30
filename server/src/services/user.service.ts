import db from '../db/index.js'
import { hashPassword } from '../utils/crypto.js'

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
    throw new Error('Email already registered')
  }

  const passwordHash = await hashPassword(password)
  const result = db.prepare(`
    INSERT INTO users (email, password_hash, display_name)
    VALUES (?, ?, ?)
  `).run(email, passwordHash, displayName || email.split('@')[0]!)

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(result.lastInsertRowid)) as UserRow
  return toPublic(user)
}

export function getUserByEmail(email: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined
}

export function getUserById(id: number): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined
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
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined
  return row ? toPublic(row) : undefined
}

export function listUsers(page = 1, pageSize = 20): { users: UserPublic[]; total: number } {
  const total = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c
  const rows = db.prepare('SELECT * FROM users ORDER BY id DESC LIMIT ? OFFSET ?')
    .all(pageSize, (page - 1) * pageSize) as UserRow[]

  return { users: rows.map(toPublic), total }
}

export function updatePassword(userId: number, passwordHash: string): void {
  db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
    .run(passwordHash, userId)
}
