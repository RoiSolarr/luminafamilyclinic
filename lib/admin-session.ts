/**
 * Signed session cookie for the staff dashboard.
 *
 * This replaces HTTP Basic auth, for two reasons.
 *
 * First, Basic auth has no sign in page: the browser draws its own dialog,
 * which cannot be styled and looks nothing like the rest of the site.
 *
 * Second, and worse, a 401 carrying `WWW-Authenticate: Basic` makes the browser
 * show that dialog for *any* request, including the prefetch Next.js fires when
 * a link scrolls into view. The footer links to /admin, so simply scrolling to
 * the bottom of a public page popped a sign in box. Cookie auth answers an
 * unauthenticated request with a redirect instead, which a prefetch ignores.
 *
 * The token is `<payload>.<signature>`, both base64url:
 *   payload   = JSON {exp} , an expiry in epoch milliseconds
 *   signature = HMAC-SHA256 of the payload
 *
 * Web Crypto is used rather than node:crypto because this has to verify inside
 * middleware, which runs on the edge runtime where node:crypto is unavailable.
 */

export const ADMIN_COOKIE = 'lumina_admin_session'

/** Twelve hours. Long enough for a shift, short enough that a shared computer forgets. */
export const SESSION_DURATION_MS = 12 * 60 * 60 * 1000

/**
 * The HMAC key. Derived from ADMIN_PASSWORD unless ADMIN_SESSION_SECRET is set,
 * so there is nothing extra to configure. Changing the password therefore
 * invalidates every existing session, which is the behaviour you want.
 */
function signingSecret(): string | null {
  const explicit = process.env.ADMIN_SESSION_SECRET
  if (explicit) return explicit
  const password = process.env.ADMIN_PASSWORD
  if (!password) return null
  return `lumina-admin-session:${password}`
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function hmac(payload: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return new Uint8Array(signature)
}

/** Length independent comparison, so a wrong signature leaks nothing through timing. */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!
  return diff === 0
}

/** Mints a token that expires in SESSION_DURATION_MS. */
export async function createSessionToken(now = Date.now()): Promise<string | null> {
  const secret = signingSecret()
  if (!secret) return null

  const payload = toBase64Url(
    new TextEncoder().encode(JSON.stringify({ exp: now + SESSION_DURATION_MS })),
  )
  const signature = toBase64Url(await hmac(payload, secret))
  return `${payload}.${signature}`
}

/**
 * True when the token is well formed, correctly signed and not expired.
 * Never throws: any malformed input is simply invalid.
 */
export async function verifySessionToken(
  token: string | undefined | null,
  now = Date.now(),
): Promise<boolean> {
  const secret = signingSecret()
  if (!secret || !token) return false

  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [payload, signature] = parts as [string, string]

  try {
    const expected = await hmac(payload, secret)
    if (!constantTimeEqual(fromBase64Url(signature), expected)) return false

    const decoded = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as {
      exp?: unknown
    }
    return typeof decoded.exp === 'number' && decoded.exp > now
  } catch {
    return false
  }
}

/** Cookie attributes used when setting and clearing the session. */
export function sessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
  }
}
