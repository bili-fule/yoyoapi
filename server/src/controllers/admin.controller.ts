import type { Request, Response } from 'express'
import { z } from 'zod'
import * as userService from '../services/user.service.js'
import * as channelService from '../services/channel.service.js'
import db from '../db/index.js'
import { getRow } from '../db/helpers.js'

export function listUsers(req: Request, res: Response): void {
  const page = parseInt(req.query.page as string) || 1
  const pageSize = parseInt(req.query.pageSize as string) || 20
  const result = userService.listUsers(page, pageSize)
  res.json(result)
}

const updateUserSchema = z.object({
  role: z.number().int().optional(),
  quota: z.number().int().optional(),
  displayName: z.string().optional(),
  qqId: z.string().optional(),
})

export function updateUser(req: Request, res: Response): void {
  const id = parseInt(req.params.id, 10)
  const data = updateUserSchema.parse(req.body)
  const updated = userService.updateUser(id, {
    role: data.role,
    quota: data.quota,
    display_name: data.displayName,
    qq_id: data.qqId,
  })
  if (!updated) {
    res.status(404).json({ error: { message: 'User not found' } })
    return
  }
  res.json({ user: updated })
}

export function deleteUser(req: Request, res: Response): void {
  const id = parseInt(req.params.id, 10)
  const existing = getRow<{ id: number }>(db.prepare('SELECT id FROM users WHERE id = ?'), id)
  if (!existing) {
    res.status(404).json({ error: { message: 'User not found' } })
    return
  }
  db.prepare('DELETE FROM api_keys WHERE user_id = ?').run(id)
  db.prepare('UPDATE logs SET user_id = NULL, api_key_id = NULL WHERE user_id = ?').run(id)
  db.prepare('DELETE FROM users WHERE id = ?').run(id)
  res.json({ message: 'User deleted' })
}

const createChannelSchema = z.object({
  name: z.string(),
  type: z.string().optional(),
  baseUrl: z.string(),
  apiKey: z.string(),
  models: z.array(z.string()).optional(),
  priority: z.number().int().optional(),
})

export function createChannel(req: Request, res: Response): void {
  const data = createChannelSchema.parse(req.body)
  const channel = channelService.createChannel({
    name: data.name,
    type: data.type,
    baseUrl: data.baseUrl,
    apiKey: data.apiKey,
    models: data.models,
    priority: data.priority,
  })
  res.status(201).json({ channel })
}

export function listChannels(_req: Request, res: Response): void {
  const channels = channelService.listChannels()
  res.json({ channels })
}

const updateChannelSchema = z.object({
  name: z.string().optional(),
  type: z.string().optional(),
  baseUrl: z.string().optional(),
  apiKey: z.string().optional(),
  models: z.array(z.string()).optional(),
  priority: z.number().int().optional(),
  status: z.number().int().optional(),
})

export function updateChannel(req: Request, res: Response): void {
  const id = parseInt(req.params.id, 10)
  const data = updateChannelSchema.parse(req.body)
  const updated = channelService.updateChannel(id, {
    name: data.name,
    type: data.type,
    baseUrl: data.baseUrl,
    apiKey: data.apiKey,
    models: data.models,
    priority: data.priority,
    status: data.status,
  })
  if (!updated) {
    res.status(404).json({ error: { message: 'Channel not found' } })
    return
  }
  res.json({ channel: updated })
}

export function deleteChannel(req: Request, res: Response): void {
  const id = parseInt(req.params.id, 10)
  const ok = channelService.deleteChannel(id)
  if (!ok) {
    res.status(404).json({ error: { message: 'Channel not found' } })
    return
  }
  res.json({ message: 'Channel deleted' })
}

export function getLogs(req: Request, res: Response): void {
  const page = parseInt(req.query.page as string) || 1
  const pageSize = parseInt(req.query.pageSize as string) || 20
  const userId = req.query.userId ? parseInt(req.query.userId as string, 10) : undefined

  let query = 'SELECT * FROM logs'
  const params: unknown[] = []
  if (userId) {
    query += ' WHERE user_id = ?'
    params.push(userId)
  }
  query += ' ORDER BY id DESC LIMIT ? OFFSET ?'
  params.push(pageSize, (page - 1) * pageSize)

  const total = getRow<{ c: number }>(db.prepare('SELECT COUNT(*) as c FROM logs' + (userId ? ' WHERE user_id = ?' : '')), ...(userId ? [userId] : []))!.c
  const logs = db.prepare(query).all(...params)

  res.json({ logs, total })
}

export function getStats(_req: Request, res: Response): void {
  const totalUsers = getRow<{ c: number }>(db.prepare('SELECT COUNT(*) as c FROM users'))!.c
  const todayUsage = getRow<{ c: number }>(db.prepare("SELECT COALESCE(SUM(quota_cost), 0) as c FROM logs WHERE created_at >= datetime('now', 'start of day')"))!.c

  res.json({
    totalUsers,
    todayUsage,
  })
}
