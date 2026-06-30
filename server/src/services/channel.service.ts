import db from '../db/index.js'
import { getRow, allRows } from '../db/helpers.js'

export interface ChannelRow {
  id: number
  name: string
  type: string
  base_url: string
  api_key: string
  models: string
  priority: number
  status: number
  created_at: string
}

export interface ChannelPublic {
  id: number
  name: string
  type: string
  baseUrl: string
  models: string[]
  priority: number
  status: number
  createdAt: string
}

function toPublic(row: ChannelRow): ChannelPublic {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    baseUrl: row.base_url,
    models: JSON.parse(row.models) as string[],
    priority: row.priority,
    status: row.status,
    createdAt: row.created_at,
  }
}

export interface ChannelCreate {
  name: string
  type?: string
  baseUrl: string
  apiKey: string
  models?: string[]
  priority?: number
}

export interface ChannelUpdate {
  name?: string
  type?: string
  baseUrl?: string
  apiKey?: string
  models?: string[]
  priority?: number
  status?: number
}

export function createChannel(input: ChannelCreate): ChannelPublic {
  const modelsJson = JSON.stringify(input.models ?? ['*'])
  const result = db.prepare(`
    INSERT INTO channels (name, type, base_url, api_key, models, priority)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(input.name, input.type ?? 'openai', input.baseUrl, input.apiKey, modelsJson, input.priority ?? 1)

  const row = getRow<ChannelRow>(db.prepare('SELECT * FROM channels WHERE id = ?'), Number(result.lastInsertRowid))!
  return toPublic(row)
}

export function listChannels(): ChannelPublic[] {
  const rows = allRows<ChannelRow>(db.prepare('SELECT * FROM channels ORDER BY priority DESC, id ASC'))
  return rows.map(toPublic)
}

export function getChannelById(id: number): ChannelRow | undefined {
  return getRow<ChannelRow>(db.prepare('SELECT * FROM channels WHERE id = ?'), id)
}

export function updateChannel(id: number, input: ChannelUpdate): ChannelPublic | undefined {
  const sets: string[] = []
  const vals: unknown[] = []

  const fieldMap: Record<string, string | undefined> = {
    name: input.name,
    type: input.type,
    base_url: input.baseUrl,
    api_key: input.apiKey,
    priority: input.priority !== undefined ? String(input.priority) : undefined,
    status: input.status !== undefined ? String(input.status) : undefined,
  }
  if (input.models) {
    fieldMap.models = JSON.stringify(input.models)
  }

  for (const [key, val] of Object.entries(fieldMap)) {
    if (val !== undefined) {
      sets.push(`${key} = ?`)
      vals.push(val)
    }
  }
  if (sets.length === 0) return undefined

  vals.push(id)
  db.prepare(`UPDATE channels SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
  const row = getRow<ChannelRow>(db.prepare('SELECT * FROM channels WHERE id = ?'), id)
  return row ? toPublic(row) : undefined
}

export function deleteChannel(id: number): boolean {
  const result = db.prepare('DELETE FROM channels WHERE id = ?').run(id)
  return result.changes > 0
}

export function getEnabledChannelsByType(type: string): ChannelRow[] {
  return allRows<ChannelRow>(db.prepare('SELECT * FROM channels WHERE status = 1 AND type = ? ORDER BY priority DESC, id ASC'), type)
}
