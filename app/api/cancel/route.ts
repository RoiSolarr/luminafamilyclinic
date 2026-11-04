import type { NextRequest } from 'next/server'

import { fail, failRateLimit, failServer, failValidation, ok, readJson } from '@/lib/api'
import { clientIp, hit, LIMITS } from '@/lib/rate-limit'
import { cancelRequestSchema } from '@/lib/validation'
import { cancelAppointment, findAppointmentByRef, getManageTokenHash } from '@/lib/repo'
import { verifyManageToken } from '@/lib/tokens'
import { sendToZapier } from '@/lib/zapier'
import { errorInfo, log } from '@/lib/logger'
import { sanitizeText } from '@/lib/utils'
import { NotFoundError } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/cancel
 *
 * Setting the status to `cancelled` takes the row out of the partial unique
 * index, which frees the slot for the next patient with no extra bookkeeping.
 */
export async function POST(request: NextRequest) {
  const ip = clientIp(request.headers)
  const limited = hit(`cancel:${ip}`, LIMITS.manage.limit, LIMITS.manage.windowMs)
  if (!limited.allowed) return failRateLimit(limited.retryAfter)

  const body = await readJson(request)
  if (!body) return fail(400, 'bad_request', 'We could not read that request.')

  const parsed = cancelRequestSchema.safeParse(body)
  if (!parsed.success) return failValidation(parsed.error)

  const { bookingRef, token, reason } = parsed.data

  try {
    const storedHash = await getManageTokenHash(bookingRef)
    if (!storedHash || !verifyManageToken(token, storedHash)) {
      log.warn('cancel.token_rejected', { bookingRef })
      return fail(404, 'not_found', 'That link does not match a booking.')
    }

    const before = await findAppointmentByRef(bookingRef)
    if (!before) return fail(404, 'not_found', 'That link does not match a booking.')

    if (before.status === 'cancelled') {
      return ok({ bookingRef, status: 'cancelled', alreadyCancelled: true })
    }
    if (before.status === 'completed' || before.status === 'no_show') {
      return fail(
        409,
        'already_past',
        'That appointment has already taken place, so it cannot be cancelled.',
      )
    }

    const after = await cancelAppointment(bookingRef, reason ? sanitizeText(reason) : null)

    await sendToZapier(
      'cancel',
      {
        type: 'cancel',
        bookingId: after.bookingRef,
        cancelledAt: new Date().toISOString(),
        service: after.serviceName,
        providerId: after.providerId,
        doctorName: after.providerName,
        date: after.localDate,
        time: after.localTime,
        timezone: after.timezone,
        calendarEventId: after.calendarEventId,
        patient: {
          fullName: after.patientName,
          email: after.patientEmail,
          phone: after.patientPhone,
        },
        cancelledReason: after.cancelledReason ?? '',
      },
      { bookingRef },
    )

    log.info('cancel.done', { bookingRef, providerId: after.providerId })

    return ok({ bookingRef, status: after.status, alreadyCancelled: false })
  } catch (err) {
    if (err instanceof NotFoundError) return fail(404, 'not_found', err.message)
    log.error('cancel.failed', { bookingRef, ...errorInfo(err) })
    return failServer('We could not cancel that booking just now. Please try again.')
  }
}
