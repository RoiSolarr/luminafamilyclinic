import { clinic, clinicAddressLine, siteUrl } from '@/config/clinic'
import { formatClockTime, formatLongDate } from '@/lib/time'
import { formatDuration, firstName } from '@/lib/utils'
import type { EmailMessage } from '@/lib/email'

/**
 * Patient facing email bodies.
 *
 * Written as inline styled tables because that is what survives Outlook, Gmail
 * and the various mobile clients. Every message carries a plain text version,
 * which matters for deliverability as much as for accessibility.
 *
 * Everything user supplied is escaped before it reaches the HTML. A patient
 * could put a quote mark or an angle bracket in their name, and an unescaped
 * one would break the markup.
 */

/** Escapes the five characters that matter in HTML. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const COLORS = {
  ink: '#0f2a38',
  soft: '#475d6a',
  muted: '#70828c',
  line: '#e2e2db',
  primary: '#0d7b6e',
  accent: '#d65e42',
  bg: '#faf9f6',
}

type Row = { label: string; value: string }

function detailTable(rows: Row[]): string {
  return `
  <table role="presentation" style="width:100%;border-collapse:collapse;font-size:15px;margin:20px 0">
    ${rows
      .map(
        (row) => `
    <tr>
      <td style="padding:9px 0;color:${COLORS.muted};vertical-align:top">${esc(row.label)}</td>
      <td style="padding:9px 0;text-align:right;color:${COLORS.ink}">${esc(row.value)}</td>
    </tr>`,
      )
      .join('')}
  </table>`
}

function button(href: string, label: string): string {
  return `
  <table role="presentation" style="margin:26px 0">
    <tr><td style="border-radius:999px;background:${COLORS.primary}">
      <a href="${esc(href)}"
         style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;
                color:#ffffff;text-decoration:none;border-radius:999px">${esc(label)}</a>
    </td></tr>
  </table>`
}

function layout(args: { heading: string; intro: string; body: string; footerNote?: string }): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(args.heading)}</title></head>
<body style="margin:0;padding:0;background:${COLORS.bg}">
  <table role="presentation" style="width:100%;border-collapse:collapse;background:${COLORS.bg}">
    <tr><td align="center" style="padding:28px 16px">
      <table role="presentation" style="width:100%;max-width:560px;border-collapse:collapse;
             background:#ffffff;border:1px solid ${COLORS.line};border-radius:16px">
        <tr><td style="padding:32px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${COLORS.ink}">

          <p style="margin:0 0 20px;font-size:16px;font-weight:600;color:${COLORS.primary}">
            ${esc(clinic.name)}
          </p>

          <h1 style="margin:0 0 10px;font-size:23px;line-height:1.25;color:${COLORS.ink}">
            ${esc(args.heading)}
          </h1>

          <p style="margin:0;font-size:15px;line-height:1.65;color:${COLORS.soft}">
            ${esc(args.intro)}
          </p>

          ${args.body}

          <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:${COLORS.soft}">
            ${esc(clinicAddressLine())}
          </p>

          <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:${COLORS.soft}">
            Questions? Call ${esc(clinic.contact.phone)}.
          </p>

          <hr style="border:none;border-top:1px solid ${COLORS.line};margin:26px 0 16px">

          ${
            args.footerNote
              ? `<p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:${COLORS.muted}">${esc(args.footerNote)}</p>`
              : ''
          }

          <p style="margin:0;font-size:12px;line-height:1.6;color:${COLORS.muted}">
            ${esc(clinic.demoNotice)}
          </p>

        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function textFooter(): string {
  return [
    '',
    clinicAddressLine(),
    `Questions? Call ${clinic.contact.phone}.`,
    '',
    clinic.demoNotice,
  ].join('\n')
}

export type BookingEmailInput = {
  bookingRef: string
  patientName: string
  patientEmail: string
  serviceName: string
  providerName: string
  localDate: string
  localTime: string
  localEndTime: string
  durationMinutes: number
  isTelehealth: boolean
  timezone: string
  /**
   * Link with the raw manage token. Null when the token is not available,
   * in which case the email tells the patient how to reach us instead of
   * showing a button that cannot work.
   */
  manageUrl: string | null
  /** The three sentence message written by the triage step, when it exists. */
  aiConfirmationMessage?: string | null
  /**
   * True when the slot is held but the clinic has not confirmed it yet, which
   * is what happens to a booking triage flagged for a person to look at.
   *
   * Telling that patient "you are booked in" would be a promise the clinic has
   * not made, and the one they most need to be able to trust.
   */
  awaitingConfirmation?: boolean
}

/** Sent once triage has run, whether or not it confirmed the booking. */
export function bookingConfirmationEmail(input: BookingEmailInput): EmailMessage {
  const when = `${formatLongDate(input.localDate, input.timezone)} at ${formatClockTime(input.localTime)}`
  const pending = input.awaitingConfirmation === true

  const heading = pending ? 'We have your request' : 'You are booked in'

  const intro =
    input.aiConfirmationMessage?.trim() ||
    (pending
      ? `Hi ${firstName(input.patientName)}, we have your request for a ${input.serviceName} with ` +
        `${input.providerName} on ${when}. The slot is held for you while the clinic confirms it, ` +
        `and we will be in touch shortly.`
      : `Hi ${firstName(input.patientName)}, your ${input.serviceName} with ${input.providerName} is booked. ` +
        `We will see you on ${when}.`)

  const rows: Row[] = [
    { label: 'Reference', value: input.bookingRef },
    { label: 'Service', value: input.serviceName },
    { label: 'Doctor', value: input.providerName },
    { label: 'Date', value: formatLongDate(input.localDate, input.timezone) },
    {
      label: 'Time',
      value: `${formatClockTime(input.localTime)} to ${formatClockTime(input.localEndTime)} (${clinic.timezoneLabel})`,
    },
    { label: 'Length', value: formatDuration(input.durationMinutes) },
    {
      label: 'Where',
      value: input.isTelehealth ? 'Video consultation, link sent before your slot' : 'At the clinic',
    },
  ]

  const manageBlock = input.manageUrl
    ? button(input.manageUrl, 'Reschedule or cancel')
    : `<p style="margin:22px 0;font-size:15px;line-height:1.65;color:${COLORS.soft}">
         To change or cancel this appointment, open the link from the screen shown when you
         booked, or call ${esc(clinic.contact.phone)} and quote
         <strong>${esc(input.bookingRef)}</strong>.
       </p>`

  const closingLine = pending
    ? 'There is nothing you need to do. If anything changes before we call, use the link above.'
    : input.isTelehealth
      ? 'Join a few minutes early and find somewhere quiet with a stable connection.'
      : 'Arriving ten minutes early is plenty, or fifteen if it is your first visit.'

  const html = layout({
    heading,
    intro,
    body: `
      ${detailTable(rows)}
      ${manageBlock}
      <p style="margin:0;font-size:14px;line-height:1.6;color:${COLORS.soft}">
        ${closingLine}
      </p>`,
    footerNote: input.manageUrl
      ? 'Keep the link above private. Anyone who has it can change or cancel this appointment.'
      : undefined,
  })

  const text = [
    `${clinic.name}`,
    '',
    heading,
    '',
    intro,
    '',
    `Reference: ${input.bookingRef}`,
    `Service:   ${input.serviceName}`,
    `Doctor:    ${input.providerName}`,
    `When:      ${when} (${clinic.timezoneLabel})`,
    `Length:    ${formatDuration(input.durationMinutes)}`,
    '',
    ...(input.manageUrl
      ? [
          `Reschedule or cancel: ${input.manageUrl}`,
          '',
          'Keep that link private. Anyone who has it can change this appointment.',
        ]
      : [
          'To change or cancel, use the link from the screen shown when you booked,',
          `or call ${clinic.contact.phone} and quote ${input.bookingRef}.`,
        ]),
    textFooter(),
  ].join('\n')

  return {
    to: input.patientEmail,
    toName: input.patientName,
    subject: pending
      ? `We have your booking request: ${input.bookingRef}`
      : `Your appointment is booked: ${input.bookingRef}`,
    html,
    text,
    tag: 'booking-confirmation',
  }
}

/** Sent when the patient cancels through their manage link. */
export function bookingCancelledEmail(
  input: Omit<BookingEmailInput, 'manageUrl' | 'aiConfirmationMessage'>,
): EmailMessage {
  const when = `${formatLongDate(input.localDate, input.timezone)} at ${formatClockTime(input.localTime)}`
  const intro =
    `Hi ${firstName(input.patientName)}, your ${input.serviceName} with ${input.providerName} on ` +
    `${when} has been cancelled. The slot has been released.`

  const html = layout({
    heading: 'Your appointment has been cancelled',
    intro,
    body: `
      ${detailTable([
        { label: 'Reference', value: input.bookingRef },
        { label: 'Was', value: `${when} (${clinic.timezoneLabel})` },
      ])}
      ${button(`${siteUrl()}/book`, 'Book another appointment')}`,
    footerNote: 'If you did not request this, please call the clinic.',
  })

  const text = [
    `${clinic.name}`,
    '',
    'Your appointment has been cancelled',
    '',
    intro,
    '',
    `Reference: ${input.bookingRef}`,
    '',
    `Book again: ${siteUrl()}/book`,
    '',
    'If you did not request this, please call the clinic.',
    textFooter(),
  ].join('\n')

  return {
    to: input.patientEmail,
    toName: input.patientName,
    subject: `Appointment cancelled: ${input.bookingRef}`,
    html,
    text,
    tag: 'booking-cancelled',
  }
}

/** Sent when the patient moves their appointment. Shows both times. */
export function bookingRescheduledEmail(
  input: BookingEmailInput & { previousDate: string; previousTime: string },
): EmailMessage {
  const wasWhen = `${formatLongDate(input.previousDate, input.timezone)} at ${formatClockTime(input.previousTime)}`
  const nowWhen = `${formatLongDate(input.localDate, input.timezone)} at ${formatClockTime(input.localTime)}`

  const intro =
    `Hi ${firstName(input.patientName)}, your ${input.serviceName} with ${input.providerName} has moved. ` +
    `Nothing else has changed, and your reminder will follow the new time.`

  const html = layout({
    heading: 'Your appointment has moved',
    intro,
    body: `
      ${detailTable([
        { label: 'Reference', value: input.bookingRef },
        { label: 'Was', value: wasWhen },
        { label: 'Now', value: `${nowWhen} (${clinic.timezoneLabel})` },
        { label: 'Doctor', value: input.providerName },
      ])}
      ${input.manageUrl ? button(input.manageUrl, 'View or change again') : ''}`,
    footerNote: input.manageUrl
      ? 'Keep the link above private. Anyone who has it can change this appointment.'
      : undefined,
  })

  const text = [
    `${clinic.name}`,
    '',
    'Your appointment has moved',
    '',
    intro,
    '',
    `Reference: ${input.bookingRef}`,
    `Was: ${wasWhen}`,
    `Now: ${nowWhen} (${clinic.timezoneLabel})`,
    '',
    ...(input.manageUrl ? [`View or change again: ${input.manageUrl}`] : []),
    textFooter(),
  ].join('\n')

  return {
    to: input.patientEmail,
    toName: input.patientName,
    subject: `Appointment moved: ${input.bookingRef}`,
    html,
    text,
    tag: 'booking-rescheduled',
  }
}

/* ---------------------------------------------------------------- reminders */

export type ReminderEmailInput = {
  bookingRef: string
  patientFirstName: string
  patientEmail: string
  serviceName: string
  providerName: string
  localDate: string
  localTime: string
  timezone: string
  isTelehealth?: boolean
  /** Null when the raw manage token is not available. */
  manageUrl: string | null
}

/** The day before nudge. Short on purpose: it is read on a phone, in passing. */
export function appointmentReminderEmail(input: ReminderEmailInput): EmailMessage {
  const when = `${formatLongDate(input.localDate, input.timezone)} at ${formatClockTime(input.localTime)}`
  const intro =
    `Hi ${esc(input.patientFirstName) ? input.patientFirstName : 'there'}, a quick reminder about ` +
    `your ${input.serviceName} with ${input.providerName}.`

  const changeBlock = input.manageUrl
    ? button(input.manageUrl, 'Reschedule or cancel')
    : `<p style="margin:22px 0;font-size:15px;line-height:1.65;color:${COLORS.soft}">
         Need to change it? Call ${esc(clinic.contact.phone)} and quote
         <strong>${esc(input.bookingRef)}</strong>.
       </p>`

  const html = layout({
    heading: 'Your appointment is tomorrow',
    intro,
    body: `
      ${detailTable([
        { label: 'When', value: `${when} (${clinic.timezoneLabel})` },
        { label: 'Service', value: input.serviceName },
        { label: 'Doctor', value: input.providerName },
        { label: 'Reference', value: input.bookingRef },
      ])}
      ${changeBlock}
      <p style="margin:0;font-size:14px;line-height:1.6;color:${COLORS.soft}">
        ${
          input.isTelehealth
            ? 'Join a few minutes early and find somewhere quiet with a stable connection.'
            : 'Arriving ten minutes early is plenty, or fifteen if it is your first visit.'
        }
      </p>`,
    footerNote: 'If you can no longer make it, releasing the slot helps someone else get seen.',
  })

  const text = [
    `${clinic.name}`,
    '',
    'Your appointment is tomorrow',
    '',
    intro,
    '',
    `When:      ${when} (${clinic.timezoneLabel})`,
    `Service:   ${input.serviceName}`,
    `Doctor:    ${input.providerName}`,
    `Reference: ${input.bookingRef}`,
    '',
    ...(input.manageUrl
      ? [`Reschedule or cancel: ${input.manageUrl}`]
      : [`Need to change it? Call ${clinic.contact.phone} and quote ${input.bookingRef}.`]),
    textFooter(),
  ].join('\n')

  return {
    to: input.patientEmail,
    toName: input.patientFirstName,
    subject: `Reminder: your appointment tomorrow at ${formatClockTime(input.localTime)}`,
    html,
    text,
    tag: 'appointment-reminder',
  }
}

/** Sent about a day after the visit, with a signed rating link. */
export function postVisitFeedbackEmail(
  input: Omit<ReminderEmailInput, 'manageUrl'> & { feedbackUrl: string },
): EmailMessage {
  const intro =
    `Hi ${input.patientFirstName}, thank you for coming in on ` +
    `${formatLongDate(input.localDate, input.timezone)} to see ${input.providerName}.`

  const html = layout({
    heading: 'How was your visit?',
    intro,
    body: `
      <p style="margin:18px 0 0;font-size:15px;line-height:1.65;color:${COLORS.soft}">
        If you have a moment, how did it go? One tap is plenty.
      </p>
      ${button(input.feedbackUrl, 'Leave a rating')}
      <p style="margin:0;font-size:14px;line-height:1.6;color:${COLORS.soft}">
        It goes straight to the clinic manager and is not published anywhere.
      </p>`,
  })

  const text = [
    `${clinic.name}`,
    '',
    'How was your visit?',
    '',
    intro,
    '',
    'If you have a moment, how did it go? One tap is plenty:',
    input.feedbackUrl,
    '',
    'It goes straight to the clinic manager and is not published anywhere.',
    textFooter(),
  ].join('\n')

  return {
    to: input.patientEmail,
    toName: input.patientFirstName,
    subject: 'How was your visit?',
    html,
    text,
    tag: 'post-visit-feedback',
  }
}
