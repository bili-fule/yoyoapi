import type { Request, Response, NextFunction } from 'express'
import db from '../db/index.js'
import { AuthError, ForbiddenError } from '../utils/errors.js'

export interface AuthUser {
  id: number
  email: string
  role: number
  displayName: string
  quota: number
  usedQuota: number
  qqId: string
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
      apiKeyId?: number
    }
  }
}

export function tokenAuth(req: Request, _res: Response, next: NextFunction): void {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    throw new AuthError('Missing or invalid authorization header')
  }

  const token = auth.slice(7)
  const row = db.prepare(`
    SELECT u.id, u.email, u.role, u.display_name, u.quota, u.used_quota, u.qq_id,
           ak.id as api_key_id
    FROM api_keys ak
    JOIN users u ON u.id = ak.user_id
    WHERE ak.key = ? AND ak.status = 1
  `).get(token) as {
    id: number; email: string; role: number; display_name: string
    quota: number; used_quota: number; qq_id: string; api_key_id: number
  } | undefined

  if (!row) {
    throw new AuthError('Invalid or disabled API key')
  }

  db.prepare('UPDATE api_keys SET last_used_at = datetime(\'now\') WHERE id = ?').run(row.api_key_id)

  req.user = {
    id: row.id,
    email: row.email,
    role: row.role,
    displayName: row.display_name,
    quota: row.quota,
    usedQuota: row.used_quota,
    qqId: row.qq_id,
  }
  req.apiKeyId = row.api_key_id
  next()
}

export function adminAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user || req.user.role < 10) {
    throw new ForbiddenError('Admin access required')
  }
  next()
}

export function optionalTokenAuth(req: Request, _res: Response, next: NextFunction): void {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    next()
    return
  }
  tokenAuth(req, _res, next)
}
