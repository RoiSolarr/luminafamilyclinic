import 'server-only'
import { log, errorInfo } from '@/lib/logger'

/**
 * Transactional email through Brevo.
 *
 * Patient facing mail is sent from here rather than from an automation step,
 * for three reasons: an automation platform charges per task and this is the
 * highest volume message in the system; a failure here lands in our own logs
 * where we can see it; and the templates live in the repository with the rest
 * of the code instead of in a web form nobody can diff.
 *
 * Staff alerts stay in Zapier, where a clinic manager can edit them without a
 * deploy. That split is deliberate.
 *
 * Like the Zapier dispatcher, this resolves rather than throws. Email failing
 * must never fail a booking that is already committed.
 */

const ENDPOINT = 'https://api.brevo.com/v3/smtp/email'
const TIMEOUT_MS = 8000
const MAX_ATTEMPTS = 3
const BACKOFF_MS = [0, 400, 1200]

export type EmailMessage = {
  to: string
  toName?: string
  subject: string
  html: string
  /** Plain text alternative. Always send one: it improves deliverability. */
  text: string
  /** Grouping label visible in Brevo's dashboard. No patient data. */
  tag?: string
}

export type EmailResult = {
  delivered: boolean
  reason?: 'not_configured' | 'http_error' | 'network_error'
  messageId?: string
  attempts: number
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function senderIdentity() {
  return {
    name: process.env.EMAIL_FROM_NAME || 'Lumina Family Clinic',
    email: process.env.EMAIL_FROM_ADDRESS || '',
  }
}

/** True when Brevo is configured. Used by /admin to show setup status. */
export function emailConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_FROM_ADDRESS)
}

export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const apiKey = process.env.BREVO_API_KEY
  const sender = senderIdentity()

  if (!apiKey || !sender.email) {
    // Expected before Brevo is wired up. Not an error.
    log.info('email.skipped', { skipReason: 'not_configured', tag: message.tag })
    return { delivered: false, reason: 'not_configured', attempts: 0 }
  }

  const replyTo = process.env.EMAIL_REPLY_TO
  const body = {
    sender,
    to: [{ email: message.to, ...(message.toName ? { name: message.toName } : {}) }],
    ...(replyTo ? { replyTo: { email: replyTo, name: sender.name } } : {}),
    subject: message.subject,
    htmlContent: message.html,
    textContent: message.text,
    ...(message.tag ? { tags: [message.tag] } : {}),
  }

  let lastReason: EmailResult['reason'] = 'network_error'

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (BACKOFF_MS[attempt - 1]) await sleep(BACKOFF_MS[attempt - 1]!)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
        cache: 'no-store',
      })
      clearTimeout(timer)

      if (response.ok) {
        const json = (await response.json().catch(() => ({}))) as { messageId?: string }
        // The recipient address is deliberately absent from this log line.
        log.info('email.delivered', {
          tag: message.tag,
          attempt,
          status: response.status,
          messageId: json.messageId ?? null,
        })
        return { delivered: true, messageId: json.messageId, attempts: attempt }
      }

      lastReason = 'http_error'
      // 4xx will not fix itself on a retry, so stop early.
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        log.error('email.rejected', {
          tag: message.tag,
          status: response.status,
          hint:
            response.status === 401
              ? 'BREVO_API_KEY is wrong'
              : 'check that EMAIL_FROM_ADDRESS is a verified Brevo sender',
        })
        return { delivered: false, reason: 'http_error', attempts: attempt }
      }

      log.warn('email.http_error', { tag: message.tag, attempt, status: response.status })
    } catch (err) {
      clearTimeout(timer)
      lastReason = 'network_error'
      log.warn('email.network_error', { tag: message.tag, attempt, ...errorInfo(err) })
    }
  }

  log.error('email.exhausted', { tag: message.tag, attempts: MAX_ATTEMPTS, failureReason: lastReason })
  return { delivered: false, reason: lastReason, attempts: MAX_ATTEMPTS }
}
