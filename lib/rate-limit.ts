/**
 * A small fixed window rate limiter held in process memory.
 *
 * Good enough for a demo and for a single Vercel instance. On a fleet of
 * serverless instances each one keeps its own counter, so the effective limit
 * is per instance. If you take this to production, swap the `hit` function for
 * Upstash Redis or Vercel KV and keep the same signature.
 */

type Bucket = { count: number; resetAt: number }

declare global {
  // eslint-disable-next-line no-var
  var __luminaRateBuckets: Map<string, Bucket> | undefined
}

function buckets(): Map<string, Bucket> {
  if (!globalThis.__luminaRateBuckets) globalThis.__luminaRateBuckets = new Map()
  return globalThis.__luminaRateBuckets
}

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  /** Seconds until the window resets. */
  retryAfter: number
}

export function hit(key: string, limit: number, windowMs: number): RateLimitResult {
  const store = buckets()
  const now = Date.now()

  // Opportunistic cleanup so the map cannot grow without bound.
  if (store.size > 5000) {
    for (const [k, b] of store) if (b.resetAt <= now) store.delete(k)
  }

  const existing = store.get(key)
  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, retryAfter: 0 }
  }

  existing.count += 1
  const allowed = existing.count <= limit
  return {
    allowed,
    remaining: Math.max(0, limit - existing.count),
    retryAfter: Math.ceil((existing.resetAt - now) / 1000),
  }
}

/** Best effort client IP from the proxy headers Vercel sets. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]!.trim()
  return headers.get('x-real-ip') ?? '0.0.0.0'
}

export const LIMITS = {
  /** 5 bookings per IP per 10 minutes, as specified. */
  book: { limit: 5, windowMs: 10 * 60 * 1000 },
  contact: { limit: 5, windowMs: 10 * 60 * 1000 },
  manage: { limit: 20, windowMs: 10 * 60 * 1000 },
  feedback: { limit: 10, windowMs: 60 * 60 * 1000 },
  availability: { limit: 120, windowMs: 60 * 1000 },
} as const
