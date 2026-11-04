import type { NextRequest } from 'next/server'

import { fail, failUnauthorized, failServer, failValidation, ok, readJson } from '@/lib/api'
import { zapierCallbackSchema } from '@/lib/validation'
import { verifyZapierSecret } from '@/lib/tokens'
import {
  findAppointmentByRef,
  markReminder,
  saveCalendarEventId,
  saveContactTriage,
  saveFeedback,
  saveTriage,
} from '@/lib/repo'
import { sendEmail } from '@/lib/email'
import { bookingConfirmationEmail } from '@/lib/email-templates'
import { siteUrl } from '@/config/clinic'
import { errorInfo, log } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/zapier/callback
 *
 * The one way results come back from Zapier. Authenticated with the shared
 * secret in `x-zapier-secret`, compared in constant time. Zapier never gets a
 * database credential, and this endpoint can only write the handful of fields
 * the automations are responsible for.
 *
 * Payload shapes are documented in docs/ZAPIER_SETUP.md.
 */
export async function POST(request: NextRequest) {
  if (!verifyZapierSecret(request.headers.get('x-zapier-secret'))) {
    log.warn('zapier.callback_unauthorized', {})
    return failUnauthorized()
  }

  const body = await readJson(request)
  if (!body) return fail(400, 'bad_request', 'We could not read that request.')

  const parsed = zapierCallbackSchema.safeParse(body)
  if (!parsed.success) return failValidation(parsed.error)

  const payload = parsed.data

  try {
    switch (payload.type) {
      case 'booking_triage': {
        const updated = await saveTriage(payload.bookingRef, {
          aiUrgency: payload.aiUrgency,
          aiSummary: payload.aiSummary,
          aiRedFlag: payload.aiRedFlag,
          aiConfirmationMessage: payload.aiConfirmationMessage,
          confirm: payload.confirm,
        })
        if (!updated) return fail(404, 'not_found', 'No booking with that reference.')
        log.info('zapier.callback.booking_triage', {
          bookingRef: payload.bookingRef,
          urgency: payload.aiUrgency,
          redFlag: payload.aiRedFlag,
        })

        // The confirmation is sent from here rather than from the automation,
        // because this is the first moment the triage message exists. The Zap
        // only has to call the callback; it no longer needs a mail step.
        let emailDelivered = false
        if (payload.confirm) {
          const appointment = await findAppointmentByRef(payload.bookingRef)
          if (appointment) {
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
                // Only present when the Zap passes the token back. The link is
                // built here from our own site URL rather than accepted whole.
                manageUrl: payload.manageToken
                  ? `${siteUrl()}/manage?ref=${encodeURIComponent(appointment.bookingRef)}` +
                    `&token=${encodeURIComponent(payload.manageToken)}`
                  : null,
                aiConfirmationMessage: payload.aiConfirmationMessage ?? appointment.aiConfirmationMessage,
              }),
            )
            emailDelivered = result.delivered
          }
        }

        return ok({ applied: 'booking_triage', emailDelivered })
      }

      case 'calendar_event': {
        const updated = await saveCalendarEventId(payload.bookingRef, payload.calendarEventId)
        if (!updated) return fail(404, 'not_found', 'No booking with that reference.')
        log.info('zapier.callback.calendar_event', { bookingRef: payload.bookingRef })
        return ok({ applied: 'calendar_event' })
      }

      case 'reminder_sent': {
        const updated = await markReminder(payload.reminderId, payload.status, payload.error)
        if (!updated) return fail(404, 'not_found', 'No reminder with that id.')
        log.info('zapier.callback.reminder_sent', {
          reminderId: payload.reminderId,
          status: payload.status,
        })
        return ok({ applied: 'reminder_sent' })
      }

      case 'contact_triage': {
        const updated = await saveContactTriage(payload.contactMessageId, {
          aiTopic: payload.aiTopic,
          aiDraftReply: payload.aiDraftReply,
          status: payload.status,
        })
        if (!updated) return fail(404, 'not_found', 'No message with that id.')
        log.info('zapier.callback.contact_triage', {
          contactMessageId: payload.contactMessageId,
        })
        return ok({ applied: 'contact_triage' })
      }

      case 'feedback': {
        const updated = await saveFeedback(payload.bookingRef, payload.rating, payload.comment ?? null)
        if (!updated) return fail(404, 'not_found', 'No booking with that reference.')
        log.info('zapier.callback.feedback', { bookingRef: payload.bookingRef })
        return ok({ applied: 'feedback' })
      }
    }
  } catch (err) {
    log.error('zapier.callback_failed', { type: payload.type, ...errorInfo(err) })
    return failServer('The callback could not be applied.')
  }
}
