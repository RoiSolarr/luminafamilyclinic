import type { NextRequest } from 'next/server'
import { z } from 'zod'

import {
  fail,
  failRateLimit,
  failServer,
  failUnauthorized,
  failValidation,
  ok,
  readJson,
} from '@/lib/api'
import { clientIp, hit } from '@/lib/rate-limit'
import { ADMIN_COOKIE, verifySessionToken } from '@/lib/admin-session'
import { cancelAppointment, confirmAppointment, findAppointmentByRef } from '@/lib/repo'
import { sendToZapier } from '@/lib/zapier'
import { sendEmail } from '@/lib/email'
import { bookingCancelledEmail } from '@/lib/email-templates'
import { errorInfo, log } from '@/lib/logger'
import { sanitizeText } from '@/lib/utils'
import { NotFoundError } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/appointments/status
 *
 * Approve or decline a booking from the staff dashboard.
 *
 * This route checks the session itself. The middleware matcher is
 * `/admin/:path*`, which covers the pages but not `/api/admin/*`, and it has
 * to stay that way or the login endpoint would be unreachable. A write route
 * that assumed the middleware had already run would be open to anyone.
 */
const bodySchema = z.object({
  bookingRef: z.string().trim().min(4).max(32),
  action: z.enum(['approve', 'decline']),
  reason: z.string().trim().max(400).optional(),
})

export async function POST(request: NextRequest) {
  const authorized = await verifySessionToken(request.cookies.get(ADMIN_COOKIE)?.value)
  if (!authorized) return failUnauthorized()

  // Generous, but not unlimited: a stuck button should not be able to hammer
  // Brevo and Zapier on every retry.
  const ip = clientIp(request.headers)
  const limited = hit(`admin-status:${ip}`, 60, 10 * 60 * 1000)
  if (!limited.allowed) return failRateLimit(limited.retryAfter)

  const body = await readJson(request)
  if (!body) return fail(400, 'bad_request', 'We could not read that request.')

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return failValidation(parsed.error)

  const { bookingRef, action, reason } = parsed.data

  try {
    const before = await findAppointmentByRef(bookingRef)
    if (!before) return fail(404, 'not_found', 'We could not find that booking.')

    if (before.status === 'completed' || before.status === 'no_show') {
      return fail(409, 'already_past', 'That appointment has already taken place.')
    }

    // ------------------------------------------------------------ approve
    if (action === 'approve') {
      if (before.status === 'confirmed') {
        return ok({ bookingRef, status: 'confirmed', changed: false })
      }
      if (before.status !== 'pending') {
        return fail(409, 'bad_status', 'Only a booking awaiting confirmation can be approved.')
      }

      const after = await confirmAppointment(bookingRef)
      log.info('admin.appointment_approved', { bookingRef, providerId: after.providerId })

      // No email here on purpose. The patient was already sent "You are booked
      // in" when they booked, and the manage token is stored only as a hash,
      // so a second email could not carry a working manage link anyway.
      return ok({ bookingRef, status: after.status, changed: true })
    }

    // ------------------------------------------------------------ decline
    if (before.status === 'cancelled') {
      return ok({ bookingRef, status: 'cancelled', changed: false })
    }

    const note = reason ? sanitizeText(reason) : null
    const after = await cancelAppointment(
      bookingRef,
      note ? `Declined by the clinic: ${note}` : 'Declined by the clinic',
    )

    await sendToZapier(
      'cancel',
      {
        type: 'cancel',
        bookingId: after.bookingRef,
        cancelledAt: new Date().toISOString(),
        cancelledBy: 'clinic',
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

    // Declining without telling the patient would leave them turning up to a
    // slot that no longer exists, so the email goes out from here rather than
    // waiting on a Zap that may not be built.
    const email = await sendEmail(
      bookingCancelledEmail({
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
      }),
    )

    log.info('admin.appointment_declined', {
      bookingRef,
      providerId: after.providerId,
      emailDelivered: email.delivered,
    })

    return ok({ bookingRef, status: after.status, changed: true })
  } catch (err) {
    if (err instanceof NotFoundError) return fail(409, 'bad_status', err.message)
    log.error('admin.status_change_failed', { bookingRef, action, ...errorInfo(err) })
    return failServer('We could not update that booking just now. Please try again.')
  }
}
