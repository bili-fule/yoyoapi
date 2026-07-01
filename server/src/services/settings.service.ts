import db from '../db/index.js'
import { getRow, allRows } from '../db/helpers.js'

export function getSetting(key: string): string | undefined {
  const row = getRow<{ value: string }>(db.prepare('SELECT value FROM settings WHERE key = ?'), key)
  return row?.value
}

export function setSetting(key: string, value: string): void {
  db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `).run(key, value)
}

export function getAllSettings(): Record<string, string> {
  const rows = allRows<{ key: string; value: string }>(db.prepare('SELECT key, value FROM settings'))
  const result: Record<string, string> = {}
  for (const row of rows) {
    result[row.key] = row.value
  }
  return result
}
