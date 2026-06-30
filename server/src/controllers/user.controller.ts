import type { Response } from 'express'
import type { AuthenticatedRequest } from '../middleware/auth.js'
import { z } from 'zod'
import * as userService from '../services/user.service.js'
import * as apiKeyService from '../services/api-key.service.js'

export function getProfile(req: AuthenticatedRequest, res: Response): void {
  const user = userService.getUserById(req.user.id)
  if (!user) {
    res.status(404).json({ error: { message: 'User not found' } })
    return
  }
  const { password_hash, ...safe } = user
  res.json({ user: safe })
}

const updateProfileSchema = z.object({
  displayName: z.string().optional(),
})

export function updateProfile(req: AuthenticatedRequest, res: Response): void {
  const data = updateProfileSchema.parse(req.body)
  const updated = userService.updateUser(req.user.id, {
    display_name: data.displayName,
  })
  res.json({ user: updated })
}

export function listMyApiKeys(req: AuthenticatedRequest, res: Response): void {
  const keys = apiKeyService.listApiKeys(req.user.id)
  res.json({ apiKeys: keys })
}

const createApiKeySchema = z.object({
  name: z.string().optional(),
})

export function createApiKeyHandler(req: AuthenticatedRequest, res: Response): void {
  const data = createApiKeySchema.parse(req.body)
  const key = apiKeyService.createApiKey(req.user.id, data.name)
  res.status(201).json({ apiKey: key })
}

const updateApiKeySchema = z.object({
  name: z.string().optional(),
  status: z.number().int().min(0).max(1).optional(),
})

export function updateApiKeyHandler(req: AuthenticatedRequest, res: Response): void {
  const id = parseInt(req.params.id, 10)
  const data = updateApiKeySchema.parse(req.body)
  const updated = apiKeyService.updateApiKey(id, req.user.id, data)
  if (!updated) {
    res.status(404).json({ error: { message: 'API key not found' } })
    return
  }
  res.json({ apiKey: updated })
}

export function deleteApiKeyHandler(req: AuthenticatedRequest, res: Response): void {
  const id = parseInt(req.params.id, 10)
  const ok = apiKeyService.deleteApiKey(id, req.user.id)
  if (!ok) {
    res.status(404).json({ error: { message: 'API key not found' } })
    return
  }
  res.json({ message: 'API key deleted' })
}
