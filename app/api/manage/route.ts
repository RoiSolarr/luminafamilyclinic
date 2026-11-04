import type { NextRequest } from 'next/server'

import { fail, failRateLimit, failServer, ok } from '@/lib/api'
import { clientIp, hit, LIMITS } from '@/lib/rate-limit'
import { findAppointmentByRef, getManageTokenHash } from '@/lib/repo'
import { verifyManageToken } from '@/lib/tokens'
import { bookingRefSchema } from '@/lib/validation'
import { errorInfo, log } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/manage?ref=LFC-XXXXXX&token=...
 *
 * Looks a booking up for the patient who holds the link. The token is compared
 * against the stored SHA-256 digest in constant time; a wrong token gets the
 * same answer as a reference that does not exist, so the endpoint cannot be
 * used to discover which references are real.
 */
export async function GET(request: NextRequest) {
  const ip = clientIp(request.headers)
  const limited = hit(`manage:${ip}`, LIMITS.manage.limit, LIMITS.manage.windowMs)
  if (!limited.allowed) return failRateLimit(limited.retryAfter)

  const ref = request.nextUrl.searchParams.get('ref') ?? ''
  const token = request.nextUrl.searchParams.get('token') ?? ''

  const parsedRef = bookingRefSchema.safeParse(ref)
  if (!parsedRef.success || token.length < 16 || token.length > 64) {
    return fail(404, 'not_found', 'That link does not match a booking.')
  }

  try {
    const storedHash = await getManageTokenHash(parsedRef.data)
    if (!storedHash || !verifyManageToken(token, storedHash)) {
      log.warn('manage.token_rejected', { bookingRef: parsedRef.data })
      return fail(404, 'not_found', 'That link does not match a booking.')
    }

    const appointment = await findAppointmentByRef(parsedRef.data)
    if (!appointment) return fail(404, 'not_found', 'That link does not match a booking.')

    // Deliberately narrow: enough to show the summary, nothing more.
    return ok({
      bookingRef: appointment.bookingRef,
      status: appointment.status,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      localDate: appointment.localDate,
      localTime: appointment.localTime,
      localEndTime: appointment.localEndTime,
      timezone: appointment.timezone,
      providerId: appointment.providerId,
      providerName: appointment.providerName,
      providerInitials: appointment.providerInitials,
      providerSpecialty: appointment.providerSpecialty,
      serviceId: appointment.serviceId,
      serviceName: appointment.serviceName,
      durationMinutes: appointment.durationMinutes,
      isTelehealth: appointment.isTelehealth,
      patientName: appointment.patientName,
      reminderChannel: appointment.reminderChannel,
      aiConfirmationMessage: appointment.aiConfirmationMessage,
      cancelledReason: appointment.cancelledReason,
    })
  } catch (err) {
    log.error('manage.lookup_failed', errorInfo(err))
    return failServer('We could not load that booking just now. Please try again.')
  }
}
