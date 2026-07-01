import type { Request, Response, NextFunction } from 'express'
import { RateLimitError } from '../utils/errors.js'

const store = new Map<string, { count: number; resetAt: number }>()
const MAX_ENTRIES = 10000

export function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // Use X-Forwarded-For first if behind proxy, but only the first IP (client IP)
    const forwarded = req.headers['x-forwarded-for']
    const clientIp = typeof forwarded === 'string' ? forwarded.split(',')[0]!.trim() : undefined
    const key = clientIp || req.ip || 'unknown'
    const now = Date.now()
    let entry = store.get(key)

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs }
      store.set(key, entry)
      // Evict oldest entry if store is too large
      if (store.size > MAX_ENTRIES) {
        const oldest = store.entries().next().value
        if (oldest) store.delete(oldest[0])
      }
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

export function clearRateLimitStore(): void {
  store.clear()
}

setInterval(clearExpiredEntries, 60_000)
