import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { fail, failRateLimit, readJson } from '@/lib/api'
import { clientIp, hit } from '@/lib/rate-limit'
import { safeEqual } from '@/lib/tokens'
import {
  ADMIN_COOKIE,
  SESSION_DURATION_MS,
  createSessionToken,
  sessionCookieOptions,
} from '@/lib/admin-session'
import { log } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const loginSchema = z.object({
  password: z.string().min(1).max(200),
  /** Where to send the user afterwards. Validated below to stop open redirects. */
  next: z.string().max(200).optional(),
})

/**
 * Deliberately strict: five attempts per IP per fifteen minutes. A staff member
 * mistyping twice is fine; anything beyond that on a single shared password is
 * someone guessing.
 */
const LOGIN_LIMIT = { limit: 5, windowMs: 15 * 60 * 1000 }

/** Only same origin dashboard paths, so `?next=` cannot bounce anyone off site. */
function safeRedirect(next: string | undefined): string {
  if (!next) return '/admin'
  if (!next.startsWith('/admin')) return '/admin'
  // `//evil.example` and `/\evil.example` are both read as protocol relative.
  if (next.startsWith('//') || next.startsWith('/\\')) return '/admin'
  return next
}

export async function POST(request: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) {
    return fail(503, 'not_configured', 'The staff dashboard is not configured.')
  }

  const ip = clientIp(request.headers)
  const limited = hit(`admin-login:${ip}`, LOGIN_LIMIT.limit, LOGIN_LIMIT.windowMs)
  if (!limited.allowed) {
    log.warn('admin.login_rate_limited', { retryAfter: limited.retryAfter })
    return failRateLimit(limited.retryAfter)
  }

  const body = await readJson(request)
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return fail(400, 'bad_request', 'Enter the staff password.')
  }

  if (!safeEqual(parsed.data.password, expected)) {
    log.warn('admin.login_failed', {})
    // One message for every failure. Nothing here should hint at how close
    // an attempt was, or whether a password is set at all.
    return fail(401, 'invalid_password', 'That password is not correct.')
  }

  const token = await createSessionToken()
  if (!token) return fail(503, 'not_configured', 'The staff dashboard is not configured.')

  log.info('admin.login_succeeded', {})

  const response = NextResponse.json({
    ok: true,
    data: { redirectTo: safeRedirect(parsed.data.next) },
  })

  response.cookies.set(ADMIN_COOKIE, token, {
    ...sessionCookieOptions(request.nextUrl.protocol === 'https:'),
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  })
  response.headers.set('Cache-Control', 'no-store')
  return response
}
