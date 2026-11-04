import type { NextRequest } from 'next/server'

import { fail, failRateLimit, failServer, failValidation, ok, readJson } from '@/lib/api'
import { clientIp, hit, LIMITS } from '@/lib/rate-limit'
import { contactRequestSchema } from '@/lib/validation'
import { createContactMessage } from '@/lib/repo'
import { sendToZapier } from '@/lib/zapier'
import { errorInfo, log } from '@/lib/logger'
import { sanitizeText } from '@/lib/utils'
import { siteUrl } from '@/config/clinic'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** POST /api/contact - stores the message, then hands it to Zap 4 for triage. */
export async function POST(request: NextRequest) {
  const ip = clientIp(request.headers)
  const limited = hit(`contact:${ip}`, LIMITS.contact.limit, LIMITS.contact.windowMs)
  if (!limited.allowed) return failRateLimit(limited.retryAfter)

  const body = await readJson(request)
  if (!body) return fail(400, 'bad_request', 'We could not read that request.')

  const parsed = contactRequestSchema.safeParse(body)
  if (!parsed.success) return failValidation(parsed.error)

  const input = parsed.data

  if (input.website && input.website.length > 0) {
    log.warn('contact.honeypot_triggered', {})
    return ok({ received: true })
  }

  try {
    const record = await createContactMessage({
      name: sanitizeText(input.name),
      email: input.email,
      topic: input.topic,
      message: sanitizeText(input.message),
    })

    await sendToZapier(
      'contact',
      {
        type: 'contact',
        contactMessageId: record.id,
        receivedAt: record.createdAt,
        name: record.name,
        email: record.email,
        topic: record.topic,
        message: record.message,
        callbackUrl: `${siteUrl()}/api/zapier/callback`,
      },
      { contactMessageId: record.id },
    )

    log.info('contact.received', { contactMessageId: record.id, topic: record.topic })
    return ok({ received: true })
  } catch (err) {
    log.error('contact.failed', errorInfo(err))
    return failServer('We could not send that message just now. Please try again.')
  }
}
