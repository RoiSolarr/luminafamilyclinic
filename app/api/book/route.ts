import type { NextRequest } from 'next/server'

import { fail, failRateLimit, failServer, failValidation, ok, readJson } from '@/lib/api'
import { clientIp, hit, LIMITS } from '@/lib/rate-limit'
import { bookRequestSchema } from '@/lib/validation'
import { createBooking, flagAutomationRetry, getOrganization, manageUrlFor } from '@/lib/repo'
import { NoProviderError, NotFoundError, SlotTakenError } from '@/lib/types'
import { sendToZapier } from '@/lib/zapier'
import { sendEmail } from '@/lib/email'
import { bookingConfirmationEmail } from '@/lib/email-templates'
import { errorInfo, log } from '@/lib/logger'
import { sanitizeText } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/book
 *
 * Order of operations matters here. The appointment is committed to the
 * database first and only then handed to Zapier, so an automation outage can
 * never lose a booking. If the webhook fails after three attempts the booking
 * stands, the reminder row is flagged for a retry, and the patient still sees a
 * success screen, because from their side the appointment really does exist.
 */
export async function POST(request: NextRequest) {
  const ip = clientIp(request.headers)
  const limited = hit(`book:${ip}`, LIMITS.book.limit, LIMITS.book.windowMs)
  if (!limited.allowed) {
    log.warn('book.rate_limited', { retryAfter: limited.retryAfter })
    return failRateLimit(limited.retryAfter)
  }

  const body = await readJson(request)
  if (!body) return fail(400, 'bad_request', 'We could not read that request.')

  const parsed = bookRequestSchema.safeParse(body)
  if (!parsed.success) return failValidation(parsed.error)

  const input = parsed.data

  // Honeypot. A browser never fills this, so anything in it is a bot. Respond
  // with a plain success so the bot has nothing to learn, and write nothing.
  if (input.website && input.website.length > 0) {
    log.warn('book.honeypot_triggered', {})
    return ok({
      bookingRef: 'LFC-000000',
      status: 'pending',
      manageUrl: '',
      startsAt: new Date().toISOString(),
      endsAt: new Date().toISOString(),
      localDate: input.date,
      localTime: input.time,
      providerName: '',
      serviceName: '',
      timezone: 'Asia/Manila',
      automationQueued: false,
    })
  }

  try {
    const org = await getOrganization()

    const { appointment, manageToken } = await createBooking({
      serviceId: input.serviceId,
      providerId: input.providerId,
      date: input.date,
      time: input.time,
      fullName: sanitizeText(input.fullName),
      email: input.email,
      phone: sanitizeText(input.phone),
      dateOfBirth: input.dateOfBirth,
      patientType: input.patientType,
      insurance: input.insurance ? sanitizeText(input.insurance) : null,
      reasonForVisit: sanitizeText(input.reasonForVisit),
      reminderChannel: input.reminderChannel,
    })

    const manageUrl = manageUrlFor(appointment.bookingRef, manageToken)

    // Documented booking payload. See docs/AUTOMATION.md.
    const dispatch = await sendToZapier(
      'booking',
      {
        bookingId: appointment.bookingRef,
        manageToken,
        createdAt: appointment.createdAt,
        service: appointment.serviceName,
        providerId: appointment.providerId,
        doctorName: appointment.providerName,
        date: appointment.localDate,
        time: appointment.localTime,
        endTime: appointment.localEndTime,
        timezone: org.timezone,
        patient: {
          fullName: appointment.patientName,
          email: appointment.patientEmail,
          phone: appointment.patientPhone,
          dob: input.dateOfBirth,
          patientType: appointment.patientType,
          insurance: appointment.insurance ?? '',
        },
        reasonForVisit: appointment.reasonForVisit,
        reminderChannel: appointment.reminderChannel,
        consentGiven: true,
        manageUrl,
      },
      { bookingRef: appointment.bookingRef },
    )

    if (!dispatch.delivered && dispatch.reason !== 'not_configured') {
      await flagAutomationRetry(appointment.id)
    }

    // Normally the confirmation goes out from the Zapier callback, once the
    // triage message exists. If the automation never received the booking, no
    // callback is coming, so send a plain confirmation from here instead.
    // The two paths are mutually exclusive, so the patient never gets both.
    let emailDelivered = false
    if (!dispatch.delivered) {
      const result = await sendEmail(
        bookingConfirmationEmail({
          bookingRef: appointment.bookingRef,
          patientName: appointment.patientName,
          patientEmail: appointment.patientEmail,
          serviceName: appointment.serviceName,
          providerName: appointment.providerName,
          localDate: appointment.localDate,
          localTime: appointment.localTime,
          localEndTime: appointment.localEndTime,
          durationMinutes: appointment.durationMinutes,
          isTelehealth: appointment.isTelehealth,
          timezone: appointment.timezone,
          manageUrl,
          aiConfirmationMessage: null,
        }),
      )
      emailDelivered = result.delivered
    }

    log.info('book.created', {
      bookingRef: appointment.bookingRef,
      providerId: appointment.providerId,
      serviceId: appointment.serviceId,
      automationDelivered: dispatch.delivered,
      emailDelivered,
    })

    return ok({
      bookingRef: appointment.bookingRef,
      status: appointment.status,
      manageUrl,
      manageToken,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      localDate: appointment.localDate,
      localTime: appointment.localTime,
      localEndTime: appointment.localEndTime,
      timezone: appointment.timezone,
      providerName: appointment.providerName,
      providerSpecialty: appointment.providerSpecialty,
      serviceName: appointment.serviceName,
      durationMinutes: appointment.durationMinutes,
      isTelehealth: appointment.isTelehealth,
      patientName: appointment.patientName,
      // True when the patient can expect a confirmation: either the automation
      // took the booking, or we sent the email ourselves.
      automationQueued: dispatch.delivered || emailDelivered,
    })
  } catch (err) {
    if (err instanceof SlotTakenError) {
      return fail(
        409,
        'slot_taken',
        'That slot was just taken, please choose another.',
      )
    }
    if (err instanceof NoProviderError) {
      return fail(
        409,
        'no_provider',
        'No doctor offering that service is free at that time. Please pick another slot.',
      )
    }
    if (err instanceof NotFoundError) {
      return fail(404, 'not_found', err.message)
    }
    log.error('book.failed', errorInfo(err))
    return failServer('We could not complete your booking. Nothing was charged and nothing was saved.')
  }
}
