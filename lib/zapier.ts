import 'server-only'
import { log, errorInfo } from './logger'

/**
 * Outbound calls to Zapier.
 *
 * Rules this file enforces:
 *   - webhook URLs live in server env vars and are never returned to a client
 *   - a Zapier failure never fails a booking: the row is already committed
 *   - three attempts total (one plus two retries) with a short backoff
 *   - every request has a timeout so a hanging hook cannot hold a function open
 */

export type ZapierHook = 'booking' | 'cancel' | 'reschedule' | 'contact'

const ENV_BY_HOOK: Record<ZapierHook, string> = {
  booking: 'ZAPIER_BOOKING_WEBHOOK_URL',
  cancel: 'ZAPIER_CANCEL_WEBHOOK_URL',
  reschedule: 'ZAPIER_RESCHEDULE_WEBHOOK_URL',
  contact: 'ZAPIER_CONTACT_WEBHOOK_URL',
}

const TIMEOUT_MS = 8000
const MAX_ATTEMPTS = 3
const BACKOFF_MS = [0, 400, 1200]

export type DispatchResult = {
  delivered: boolean
  /** Why it did not go out, for logging and for the retry flag on the row. */
  reason?: 'not_configured' | 'http_error' | 'network_error'
  attempts: number
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * POST a payload to one of the configured catch hooks.
 * Resolves rather than throws, so callers can carry on regardless.
 */
export async function sendToZapier(
  hook: ZapierHook,
  payload: Record<string, unknown>,
  context: Record<string, unknown> = {},
): Promise<DispatchResult> {
  const url = process.env[ENV_BY_HOOK[hook]]

  if (!url) {
    // Expected while the Zaps are still being built. Not an error.
    log.info('zapier.skipped', { hook, skipReason: 'not_configured', ...context })
    return { delivered: false, reason: 'not_configured', attempts: 0 }
  }

  let lastReason: DispatchResult['reason'] = 'network_error'

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (BACKOFF_MS[attempt - 1]) await sleep(BACKOFF_MS[attempt - 1]!)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LuminaFamilyClinic/1.0',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
        cache: 'no-store',
      })
      clearTimeout(timer)

      if (response.ok) {
        log.info('zapier.delivered', { hook, attempt, status: response.status, ...context })
        return { delivered: true, attempts: attempt }
      }

      lastReason = 'http_error'
      log.warn('zapier.http_error', { hook, attempt, status: response.status, ...context })
    } catch (err) {
      clearTimeout(timer)
      lastReason = 'network_error'
      log.warn('zapier.network_error', { hook, attempt, ...errorInfo(err), ...context })
    }
  }

  log.error('zapier.exhausted', { hook, attempts: MAX_ATTEMPTS, failureReason: lastReason, ...context })
  return { delivered: false, reason: lastReason, attempts: MAX_ATTEMPTS }
}

/** Which hooks are configured. Used by /admin to show setup status. */
export function zapierStatus(): Record<ZapierHook, boolean> {
  return {
    booking: Boolean(process.env.ZAPIER_BOOKING_WEBHOOK_URL),
    cancel: Boolean(process.env.ZAPIER_CANCEL_WEBHOOK_URL),
    reschedule: Boolean(process.env.ZAPIER_RESCHEDULE_WEBHOOK_URL),
    contact: Boolean(process.env.ZAPIER_CONTACT_WEBHOOK_URL),
  }
}
