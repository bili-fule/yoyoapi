import db from '../db/index.js'
import { generateApiKey } from '../utils/crypto.js'
import { getRow, allRows } from '../db/helpers.js'

export interface ApiKeyRow {
  id: number
  user_id: number
  key: string
  name: string
  status: number
  last_used_at: string | null
  created_at: string
}

export interface ApiKeyPublic {
  id: number
  keyPrefix: string
  name: string
  status: number
  lastUsedAt: string | null
  createdAt: string
}

function toPublic(row: ApiKeyRow): ApiKeyPublic {
  return {
    id: row.id,
    keyPrefix: row.key.slice(0, 12) + '...',
    name: row.name,
    status: row.status,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
  }
}

export function createApiKey(userId: number, name = ''): ApiKeyPublic & { fullKey: string } {
  const key = generateApiKey()
  const result = db.prepare('INSERT INTO api_keys (user_id, key, name) VALUES (?, ?, ?)')
    .run(userId, key, name)

  const row = getRow<ApiKeyRow>(db.prepare('SELECT * FROM api_keys WHERE id = ?'), Number(result.lastInsertRowid))!
  return { ...toPublic(row), fullKey: row.key }
}

export function listApiKeys(userId: number): ApiKeyPublic[] {
  const rows = allRows<ApiKeyRow>(db.prepare('SELECT * FROM api_keys WHERE user_id = ? ORDER BY id DESC'), userId)
  return rows.map(toPublic)
}

export function updateApiKey(id: number, userId: number, fields: Partial<{ name: string; status: number }>): ApiKeyPublic | undefined {
  const sets: string[] = []
  const vals: unknown[] = []
  for (const [key, val] of Object.entries(fields)) {
    if (val !== undefined) {
      sets.push(`${key} = ?`)
      vals.push(val)
    }
  }
  if (sets.length === 0) return undefined
  vals.push(id, userId)

  db.prepare(`UPDATE api_keys SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`).run(...vals)
  const row = getRow<ApiKeyRow>(db.prepare('SELECT * FROM api_keys WHERE id = ?'), id)
  return row ? toPublic(row) : undefined
}

export function deleteApiKey(id: number, userId: number): boolean {
  const result = db.prepare('DELETE FROM api_keys WHERE id = ? AND user_id = ?').run(id, userId)
  return result.changes > 0
}

export function getApiKeyByValue(key: string): (ApiKeyRow & { user_id: number }) | undefined {
  return getRow<ApiKeyRow & { user_id: number }>(db.prepare('SELECT * FROM api_keys WHERE key = ?'), key)
}
