import type { Request, Response, NextFunction } from 'express'
import { RateLimitError } from '../utils/errors.js'

const store = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const key = req.ip ?? req.headers['x-forwarded-for'] as string ?? 'unknown'
    const now = Date.now()
    let entry = store.get(key)

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs }
      store.set(key, entry)
    }

    entry.count++
    if (entry.count > maxRequests) {
      throw new RateLimitError('Too many requests')
    }

    next()
  }
}

export function clearExpiredEntries(): void {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key)
    }
  }
}

setInterval(clearExpiredEntries, 60_000)
