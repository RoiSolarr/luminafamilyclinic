import type { NextRequest } from 'next/server'

import { fail, failRateLimit, failServer, failValidation, ok, readJson } from '@/lib/api'
import { clientIp, hit, LIMITS } from '@/lib/rate-limit'
import { feedbackRequestSchema } from '@/lib/validation'
import { saveFeedback } from '@/lib/repo'
import { verifyFeedbackSignature } from '@/lib/tokens'
import { errorInfo, log } from '@/lib/logger'
import { sanitizeText } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/feedback
 *
 * Public, but only reachable with a signed link. The signature is an HMAC of
 * the booking reference, so a rating cannot be left for a reference someone
 * guessed, and no token has to be stored for it.
 */
export async function POST(request: NextRequest) {
  const ip = clientIp(request.headers)
  const limited = hit(`feedback:${ip}`, LIMITS.feedback.limit, LIMITS.feedback.windowMs)
  if (!limited.allowed) return failRateLimit(limited.retryAfter)

  const body = await readJson(request)
  if (!body) return fail(400, 'bad_request', 'We could not read that request.')

  const parsed = feedbackRequestSchema.safeParse(body)
  if (!parsed.success) return failValidation(parsed.error)

  const { bookingRef, signature, rating, comment } = parsed.data

  if (!verifyFeedbackSignature(bookingRef, signature)) {
    log.warn('feedback.signature_rejected', { bookingRef })
    return fail(404, 'not_found', 'That feedback link is not valid.')
  }

  try {
    const saved = await saveFeedback(bookingRef, rating, comment ? sanitizeText(comment) : null)
    if (!saved) return fail(404, 'not_found', 'That feedback link is not valid.')

    log.info('feedback.saved', { bookingRef, rating })
    return ok({ received: true })
  } catch (err) {
    log.error('feedback.failed', { bookingRef, ...errorInfo(err) })
    return failServer('We could not record that rating just now. Please try again.')
  }
}
