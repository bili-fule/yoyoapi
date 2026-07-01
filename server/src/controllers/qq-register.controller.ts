import type { Request, Response } from 'express'
import { z } from 'zod'
import { getSetting } from '../services/settings.service.js'
import * as qqRegisterService from '../services/qq-register.service.js'
import db from '../db/index.js'
import { getRow } from '../db/helpers.js'

const registerQqSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  bindId: z.string().min(1, 'bindId is required'),
  displayName: z.string().optional(),
})

export async function qqRegisterCode(_req: Request, res: Response): Promise<void> {
  const enabled = getSetting('qq_registration_enabled')
  if (enabled !== 'true') {
    res.status(404).json({ error: { message: 'QQ registration is not enabled' } })
    return
  }

  try {
    const result = await qqRegisterService.getQqRegisterCode()
    res.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to get QQ register code'
    res.status(502).json({ error: { message: msg } })
  }
}

export async function registerQq(req: Request, res: Response): Promise<void> {
  const enabled = getSetting('qq_registration_enabled')
  if (enabled !== 'true') {
    res.status(404).json({ error: { message: 'QQ registration is not enabled' } })
    return
  }

  const data = registerQqSchema.parse(req.body)

  const existing = getRow<{ id: number }>(db.prepare('SELECT id FROM users WHERE email = ?'), data.email)
  if (existing) {
    res.status(409).json({ error: { message: 'Email already registered' } })
    return
  }

  let qqId: string
  try {
    qqId = await qqRegisterService.validateQqBind(data.bindId)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to validate QQ bind'
    res.status(400).json({ error: { message: msg } })
    return
  }

  const existingQq = getRow<{ id: number }>(db.prepare("SELECT id FROM users WHERE qq_id = ? AND qq_id != ''"), qqId)
  if (existingQq) {
    res.status(409).json({ error: { message: 'This QQ account is already bound to another user' } })
    return
  }

  try {
    const result = await qqRegisterService.registerWithQq(data.email, data.password, qqId, data.displayName)
    res.status(201).json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create user'
    res.status(500).json({ error: { message: msg } })
  }
}
