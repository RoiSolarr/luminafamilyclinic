import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { failServer, failUnauthorized } from '@/lib/api'
import { verifyZapierSecret } from '@/lib/tokens'
import { ensurePostVisitReminders, listDueReminders, markReminder } from '@/lib/repo'
import { sendEmail } from '@/lib/email'
import { appointmentReminderEmail, postVisitFeedbackEmail } from '@/lib/email-templates'
import { errorInfo, log } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * POST or GET /api/cron/send-reminders
 *
 * Drains the reminder queue and sends each message through Brevo. Meant to be
 * called on a schedule, either by Vercel Cron or by a scheduled Zap.
 *
 * Why this exists rather than a loop inside an automation: a Zap that loops
 * over reminders costs one task per message, sends from a different provider
 * than every other patient email, and keeps the template somewhere that cannot
 * be reviewed in a pull request. Here the schedule is the only thing outside
 * the codebase, and it costs one task per run however many reminders are due.
 *
 * Secured with the same shared secret as the other machine endpoints.
 */

/** Keeps one run inside the function timeout even on a busy morning. */
const MAX_PER_RUN = 40

async function handle(request: NextRequest) {
  if (!verifyZapierSecret(request.headers.get('x-zapier-secret'))) {
    log.warn('cron.send_reminders_unauthorized', {})
    return failUnauthorized()
  }

  try {
    const created = await ensurePostVisitReminders()
    const due = (await listDueReminders()).slice(0, MAX_PER_RUN)

    let sent = 0
    let failed = 0
    let pending = 0
    let smsFallback = 0

    for (const reminder of due) {
      // SMS is not wired up in this demo. Rather than leaving the row pending
      // forever, send the same content by email and record that it happened.
      if (reminder.channel === 'sms') smsFallback += 1

      const message =
        reminder.type === 'post_visit' && reminder.feedbackUrl
          ? postVisitFeedbackEmail({
              bookingRef: reminder.bookingRef,
              patientFirstName: reminder.patientFirstName,
              patientEmail: reminder.patientEmail,
              serviceName: reminder.serviceName,
              providerName: reminder.providerName,
              localDate: reminder.localDate,
              localTime: reminder.localTime,
              timezone: reminder.timezone,
              feedbackUrl: reminder.feedbackUrl,
            })
          : appointmentReminderEmail({
              bookingRef: reminder.bookingRef,
              patientFirstName: reminder.patientFirstName,
              patientEmail: reminder.patientEmail,
              serviceName: reminder.serviceName,
              providerName: reminder.providerName,
              localDate: reminder.localDate,
              localTime: reminder.localTime,
              timezone: reminder.timezone,
              // The raw manage token is not recoverable from a hash, so the
              // reminder tells the patient to call instead of showing a link
              // that would not work.
              manageUrl: null,
            })

      const result = await sendEmail(message)

      if (result.delivered) {
        // Marking it sent is what stops it going out again on the next run.
        await markReminder(reminder.reminderId, 'sent')
        sent += 1
      } else if (result.reason === 'http_error') {
        // Brevo rejected the message itself: a bad recipient address, a sender
        // that is not verified. Retrying hourly would never fix that, so the
        // row is closed and the reason recorded for staff.
        await markReminder(reminder.reminderId, 'failed', result.reason)
        failed += 1
      } else {
        // A network blip, a timeout, or Brevo not configured yet. The row is
        // deliberately left pending so the next run tries again. Marking these
        // failed would mean one bad minute costs a patient their reminder.
        pending += 1
      }
    }

    log.info('cron.send_reminders', {
      due: due.length,
      sent,
      failed,
      // Left pending on purpose, to be retried on the next run.
      pending,
      smsFallback,
      postVisitCreated: created,
    })

    const response = NextResponse.json({
      ok: true,
      data: { due: due.length, sent, failed, pending, smsFallback, postVisitCreated: created },
    })
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (err) {
    log.error('cron.send_reminders_failed', errorInfo(err))
    return failServer('Could not process the reminder queue.')
  }
}

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}
