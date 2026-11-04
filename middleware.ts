import { NextResponse, type NextRequest } from 'next/server'

/**
 * HTTP Basic auth for the staff dashboard.
 *
 * Runs on the edge before the page is rendered, so an unauthenticated request
 * never reaches the database. The username is fixed; the password comes from
 * ADMIN_PASSWORD.
 *
 * Basic auth is appropriate for a demo behind HTTPS. A real clinic would put a
 * proper identity provider in front of this, with per staff accounts tied to
 * `core.organization_members`.
 */
export const config = {
  matcher: ['/admin/:path*'],
}

const USERNAME = 'staff'

/**
 * Constant time string comparison.
 *
 * `node:crypto` is not available in the edge runtime, so this compares every
 * character and accumulates the difference rather than returning early.
 */
function safeEqual(a: string, b: string): boolean {
  const max = Math.max(a.length, b.length)
  let diff = a.length ^ b.length
  for (let i = 0; i < max; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }
  return diff === 0
}

function unauthorized() {
  return new NextResponse('Authentication required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Lumina staff dashboard", charset="UTF-8"',
      'Cache-Control': 'no-store',
    },
  })
}

export function middleware(request: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD

  if (!expected) {
    return new NextResponse(
      'The staff dashboard is not configured. Set ADMIN_PASSWORD and redeploy.',
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const header = request.headers.get('authorization')
  if (!header?.startsWith('Basic ')) return unauthorized()

  let decoded: string
  try {
    decoded = atob(header.slice(6))
  } catch {
    return unauthorized()
  }

  const separator = decoded.indexOf(':')
  if (separator === -1) return unauthorized()

  const user = decoded.slice(0, separator)
  const password = decoded.slice(separator + 1)

  // Both comparisons always run, so a wrong username and a wrong password take
  // the same amount of time.
  const userOk = safeEqual(user, USERNAME)
  const passwordOk = safeEqual(password, expected)

  if (!userOk || !passwordOk) return unauthorized()

  return NextResponse.next()
}
