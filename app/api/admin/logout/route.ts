import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { ADMIN_COOKIE, sessionCookieOptions } from '@/lib/admin-session'
import { log } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Clears the session cookie.
 *
 * POST only. A GET would let any page log a staff member out with an image tag
 * pointed at this URL.
 */
export async function POST(request: NextRequest) {
  log.info('admin.logout', {})

  const response = NextResponse.json({ ok: true, data: { redirectTo: '/admin/login' } })
  response.cookies.set(ADMIN_COOKIE, '', {
    ...sessionCookieOptions(request.nextUrl.protocol === 'https:'),
    maxAge: 0,
  })
  response.headers.set('Cache-Control', 'no-store')
  return response
}
