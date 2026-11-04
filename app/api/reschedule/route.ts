import type { NextRequest } from 'next/server'

import { fail, failRateLimit, failServer, failValidation, ok, readJson } from '@/lib/api'
import { clientIp, hit, LIMITS } from '@/lib/rate-limit'
import { rescheduleRequestSchema } from '@/lib/validation'
import {
  findAppointmentByRef,
  getManageTokenHash,
  getOrganization,
  listServices,
  rescheduleAppointment,
} from '@/lib/repo'
import { getAvailability } from '@/lib/availability'
import { verifyManageToken } from '@/lib/tokens'
import { sendToZapier } from '@/lib/zapier'
import { sendEmail } from '@/lib/email'
import { bookingRescheduledEmail } from '@/lib/email-templates'
import { siteUrl } from '@/config/clinic'
import { errorInfo, log } from '@/lib/logger'
import { NotFoundError, SlotTakenError } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/reschedule
 *
 * Moves an existing appointment to a new slot with the same doctor. The same
 * partial unique index guards the move, so two patients racing for one slot
 * still produce exactly one winner.
 */
export async function POST(request: NextRequest) {
  const ip = clientIp(request.headers)
  const limited = hit(`reschedule:${ip}`, LIMITS.manage.limit, LIMITS.manage.windowMs)
  if (!limited.allowed) return failRateLimit(limited.retryAfter)

  const body = await readJson(request)
  if (!body) return fail(400, 'bad_request', 'We could not read that request.')

  const parsed = rescheduleRequestSchema.safeParse(body)
  if (!parsed.success) return failValidation(parsed.error)

  const { bookingRef, token, date, time } = parsed.data

  try {
    const storedHash = await getManageTokenHash(bookingRef)
    if (!storedHash || !verifyManageToken(token, storedHash)) {
      log.warn('reschedule.token_rejected', { bookingRef })
      return fail(404, 'not_found', 'That link does not match a booking.')
    }

    const before = await findAppointmentByRef(bookingRef)
    if (!before) return fail(404, 'not_found', 'That link does not match a booking.')

    if (before.status === 'cancelled') {
      return fail(409, 'already_cancelled', 'That booking was cancelled, so it cannot be moved.')
    }
    if (before.status === 'completed' || before.status === 'no_show') {
      return fail(409, 'already_past', 'That appointment has already taken place.')
    }

    // Re check the requested slot against the roster before trying the write,
    // so an out of hours request gets a clear message rather than a 409.
    const services = await listServices()
    const service = services.find((s) => s.id === before.serviceId)
    if (!service) return fail(409, 'unknown_service', 'That service is no longer offered.')

    const availability = await getAvailability({
      date,
      service,
      providerId: before.providerId,
    })
    const slot = availability.slots.find((s) => s.time === time)
    const movingToSameSlot = before.localDate === date && before.localTime === time

    if (!slot && !movingToSameSlot) {
      return fail(
        409,
        'slot_unavailable',
        'That time is not available with this doctor. Please choose another.',
      )
    }

    const after = await rescheduleAppointment(bookingRef, date, time)
    const org = await getOrganization()

    await sendToZapier(
      'reschedule',
      {
        type: 'reschedule',
        bookingId: after.bookingRef,
        rescheduledAt: new Date().toISOString(),
        service: after.serviceName,
        providerId: after.providerId,
        doctorName: after.providerName,
        previous: {
          date: before.localDate,
          time: before.localTime,
          startsAt: before.startsAt,
        },
        date: after.localDate,
        time: after.localTime,
        endTime: after.localEndTime,
        startsAt: after.startsAt,
        endsAt: after.endsAt,
        timezone: org.timezone,
        calendarEventId: after.calendarEventId,
        patient: {
          fullName: after.patientName,
          email: after.patientEmail,
          phone: after.patientPhone,
        },
        reminderChannel: after.reminderChannel,
      },
      { bookingRef },
    )

    // The patient still holds the same manage token, so the link stays valid.
    const email = await sendEmail(
      bookingRescheduledEmail({
        bookingRef: after.bookingRef,
        patientName: after.patientName,
        patientEmail: after.patientEmail,
        serviceName: after.serviceName,
        providerName: after.providerName,
        localDate: after.localDate,
        localTime: after.localTime,
        localEndTime: after.localEndTime,
        durationMinutes: after.durationMinutes,
        isTelehealth: after.isTelehealth,
        timezone: after.timezone,
        manageUrl: `${siteUrl()}/manage?ref=${encodeURIComponent(after.bookingRef)}&token=${encodeURIComponent(token)}`,
        previousDate: before.localDate,
        previousTime: before.localTime,
      }),
    )

    log.info('reschedule.done', {
      bookingRef,
      providerId: after.providerId,
      emailDelivered: email.delivered,
    })

    return ok({
      bookingRef: after.bookingRef,
      status: after.status,
      localDate: after.localDate,
      localTime: after.localTime,
      localEndTime: after.localEndTime,
      startsAt: after.startsAt,
      endsAt: after.endsAt,
      timezone: after.timezone,
      providerName: after.providerName,
      serviceName: after.serviceName,
    })
  } catch (err) {
    if (err instanceof SlotTakenError) {
      return fail(409, 'slot_taken', 'That slot was just taken, please choose another.')
    }
    if (err instanceof NotFoundError) return fail(404, 'not_found', err.message)
    log.error('reschedule.failed', { bookingRef, ...errorInfo(err) })
    return failServer('We could not move that booking just now. Please try again.')
  }
}
