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
 * Payload shapes are documented in docs/AUTOMATION.md.
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
        // Read first, so a repeat delivery of the same callback can be told
        // apart from the real one. Zapier retries, and without this check a
        // patient would get the same email again on every retry.
        const before = await findAppointmentByRef(payload.bookingRef)
        const firstTriage = before !== null && before.aiUrgency === null

        /**
         * Nothing the triage flagged is ever auto confirmed, whatever the
         * automation asked for.
         *
         * "Do not auto confirm an emergency" is a clinical safety rule, and a
         * safety rule does not belong in a prompt. A model can forget a field,
         * a Zap can be edited by someone in a hurry, and either would silently
         * start confirming chest pain. Deciding it here means the automation
         * can only ever be more cautious than the clinic, never less.
         */
        const flagged =
          payload.aiRedFlag === true ||
          payload.aiUrgency === 'urgent' ||
          payload.aiUrgency === 'emergency'
        const confirm = payload.confirm === true && !flagged

        const updated = await saveTriage(payload.bookingRef, {
          aiUrgency: payload.aiUrgency,
          aiSummary: payload.aiSummary,
          aiRedFlag: payload.aiRedFlag,
          aiConfirmationMessage: payload.aiConfirmationMessage,
          confirm,
        })
        if (!updated) return fail(404, 'not_found', 'No booking with that reference.')
        log.info('zapier.callback.booking_triage', {
          bookingRef: payload.bookingRef,
          urgency: payload.aiUrgency,
          redFlag: payload.aiRedFlag,
          confirmed: confirm,
          // Visible in the logs when the Zap asked to confirm and we refused.
          heldForReview: payload.confirm === true && flagged,
        })

        // The email goes out from here rather than from the automation,
        // because this is the first moment the triage message exists. The Zap
        // only has to call the callback; it no longer needs a mail step.
        //
        // It is sent whether or not the booking was auto confirmed. A booking
        // the Zap held back for a person to look at is exactly the one whose
        // patient is most anxious to hear something, and leaving them with
        // nothing until a staff member gets to it would be the worst outcome
        // of the whole flow. The wording differs: a held booking is told the
        // slot is reserved while the clinic confirms, not that it is booked.
        let emailDelivered = false
        const appointment = await findAppointmentByRef(payload.bookingRef)
        const live =
          appointment !== null &&
          (appointment.status === 'pending' || appointment.status === 'confirmed')

        if (firstTriage && live) {
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
              // The triage message is used only when the booking really is
              // confirmed. It is written by the automation, which believes it
              // is confirming every booking, so on a held booking it would
              // open with "your appointment is confirmed" directly under a
              // heading saying we have not confirmed it yet. The template's
              // own wording is correct in that case, so it wins.
              aiConfirmationMessage: confirm
                ? (payload.aiConfirmationMessage ?? appointment.aiConfirmationMessage)
                : null,
              // Read back after the update, so this reflects what actually
              // happened rather than what the Zap asked for.
              awaitingConfirmation: appointment.status !== 'confirmed',
            }),
          )
          emailDelivered = result.delivered
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