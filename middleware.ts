import { NextResponse, type NextRequest } from 'next/server'
import { ADMIN_COOKIE, verifySessionToken } from '@/lib/admin-session'

/**
 * Guards the staff dashboard.
 *
 * An unauthenticated request is redirected to /admin/login rather than
 * answered with a 401. That difference matters more than it looks: a 401
 * carrying `WWW-Authenticate: Basic` makes the browser draw its own sign in
 * dialog, and it does so for prefetches too. Next.js prefetches links as they
 * scroll into view, and the footer links to /admin, so scrolling to the bottom
 * of any public page used to pop a login box out of nowhere. A redirect is
 * invisible to a prefetch.
 *
 * Basic auth is appropriate for a demo behind HTTPS, but a real clinic would
 * put a proper identity provider here, with per staff accounts tied to
 * `core.organization_members` rather than one shared password.
 */
export const config = {
  // The login page and its API route must stay reachable, or nobody can sign in.
  matcher: ['/admin/:path*'],
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Without a password configured there is no safe way to serve the dashboard,
  // and no point sending anyone to a login page they could never pass.
  if (!process.env.ADMIN_PASSWORD) {
    return new NextResponse(
      'The staff dashboard is not configured. Set ADMIN_PASSWORD and redeploy.',
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const hasSession = await verifySessionToken(request.cookies.get(ADMIN_COOKIE)?.value)

  if (pathname === '/admin/login') {
    // Already signed in: skip the form.
    if (hasSession) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    return NextResponse.next()
  }

  if (hasSession) return NextResponse.next()

  // Remember where they were heading so the login can send them back.
  const loginUrl = new URL('/admin/login', request.url)
  const target = pathname + request.nextUrl.search
  if (target && target !== '/admin') loginUrl.searchParams.set('next', target)

  const response = NextResponse.redirect(loginUrl)
  response.headers.set('Cache-Control', 'no-store')
  return response
}
