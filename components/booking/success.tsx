'use client'

import * as React from 'react'
import Link from 'next/link'
import { CalendarPlus, Check, Copy, ExternalLink, Mail, MessageSquare, Video } from 'lucide-react'

import { clinic, clinicAddressLine } from '@/config/clinic'
import { buildIcs, downloadIcs } from '@/lib/ics'
import { formatClockTime, formatLongDate } from '@/lib/time'
import { formatDuration } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge, Card } from '@/components/ui/primitives'
import { SuccessCheck } from '@/components/motion'
import { useToast } from '@/components/ui/toast'
import type { BookingSuccess } from './types'

/**
 * What the patient sees once the booking is committed.
 *
 * The manage link is shown in full, because it is the only copy of the raw
 * token that will ever exist: the database holds a hash of it and nothing else.
 */
export function BookingSuccessScreen({ booking }: { booking: BookingSuccess }) {
  const { toast } = useToast()
  const [copied, setCopied] = React.useState(false)

  const addToCalendar = () => {
    const ics = buildIcs({
      uid: `${booking.bookingRef}@luminafamilyclinic.example`,
      title: `${booking.serviceName} with ${booking.providerName}`,
      description: [
        `Booking reference: ${booking.bookingRef}`,
        `Service: ${booking.serviceName} (${formatDuration(booking.durationMinutes)})`,
        `Doctor: ${booking.providerName}`,
        '',
        `Manage or cancel: ${booking.manageUrl}`,
        '',
        clinic.demoNotice,
      ].join('\n'),
      location: booking.isTelehealth ? 'Video consultation, link sent by email' : clinicAddressLine(),
      startIso: booking.startsAt,
      endIso: booking.endsAt,
      url: booking.manageUrl,
    })
    downloadIcs(`lumina-${booking.bookingRef}`, ics)
    toast({ title: 'Calendar file downloaded', tone: 'success' })
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(booking.manageUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
      toast({ title: 'Manage link copied', tone: 'success' })
    } catch {
      toast({
        title: 'Could not copy automatically',
        description: 'Select the link and copy it by hand.',
        tone: 'error',
      })
    }
  }

  const timeline = [
    {
      title: 'Right now',
      body: 'Your slot is held in the clinic diary and your doctor can see it.',
    },
    {
      title: 'Within a few minutes',
      body: `A confirmation lands in ${booking.patientName ? 'your inbox' : 'your inbox'} with these details and your manage link.`,
    },
    {
      title: 'The day before',
      body: 'One reminder goes out, with the same link in case anything has changed.',
    },
    {
      title: 'On the day',
      body: booking.isTelehealth
        ? 'Open the video link from your confirmation a few minutes early.'
        : 'Arrive about ten minutes early, or fifteen if it is your first visit.',
    },
  ]

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="flex flex-col items-center text-center">
        <SuccessCheck />
        <h1 className="mt-5 text-fluid-3xl font-semibold">You are booked in</h1>
        <p className="mt-3 max-w-md text-fluid-base text-ink-soft">
          Keep the reference below. You can change or cancel this appointment at any time with the
          link, no phone call needed.
        </p>
      </div>

      <Card className="mt-8">
        <div className="flex flex-col gap-1 border-b border-line pb-5">
          <p className="text-fluid-xs uppercase tracking-wide text-ink-muted">Booking reference</p>
          <p className="font-display text-fluid-3xl font-semibold tracking-wide text-primary">
            {booking.bookingRef}
          </p>
        </div>

        <dl className="mt-5 flex flex-col gap-3">
          <Row label="Service">
            <span className="flex flex-wrap items-center gap-2">
              {booking.serviceName}
              {booking.isTelehealth && (
                <Badge tone="accent">
                  <Video className="h-3 w-3" aria-hidden="true" />
                  Video
                </Badge>
              )}
            </span>
          </Row>
          <Row label="Doctor">
            {booking.providerName}
            <span className="block text-fluid-xs text-ink-muted">{booking.providerSpecialty}</span>
          </Row>
          <Row label="Date">{formatLongDate(booking.localDate, booking.timezone)}</Row>
          <Row label="Time">
            {formatClockTime(booking.localTime)} to {formatClockTime(booking.localEndTime)}
            <span className="block text-fluid-xs text-ink-muted">{clinic.timezoneLabel}</span>
          </Row>
          <Row label="Patient">{booking.patientName}</Row>
          {!booking.isTelehealth && <Row label="Where">{clinicAddressLine()}</Row>}
        </dl>

        <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5 xs:flex-row">
          <Button onClick={addToCalendar} variant="secondary" className="xs:flex-1">
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            Add to calendar
          </Button>
          <Button asChild className="xs:flex-1">
            <Link href={booking.manageUrl}>
              Manage booking
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </Card>

      <Card className="mt-5 bg-surface-2/60">
        <h2 className="font-display text-fluid-lg">Your private manage link</h2>
        <p className="mt-2 text-fluid-sm text-ink-soft">
          This is the only copy. We store a one way hash of it, which means we cannot send it to you
          again from here, though it is also in your confirmation email.
        </p>
        <div className="mt-4 flex flex-col gap-2 xs:flex-row">
          <code className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-line bg-surface px-3 py-3 text-fluid-xs text-ink-soft">
            {booking.manageUrl}
          </code>
          <Button variant="secondary" onClick={copyLink} className="shrink-0">
            {copied ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </Card>

      <section className="mt-8" aria-labelledby="whats-next">
        <h2 id="whats-next" className="font-display text-fluid-xl">
          What happens next
        </h2>
        <ol className="mt-5 flex flex-col gap-0">
          {timeline.map((item, index) => (
            <li key={item.title} className="relative flex gap-4 pb-6 last:pb-0">
              {index < timeline.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute left-[11px] top-7 h-[calc(100%-1.25rem)] w-px bg-line"
                />
              )}
              <span
                aria-hidden="true"
                className="relative mt-1.5 inline-flex h-[23px] w-[23px] shrink-0 items-center justify-center rounded-full border-2 border-primary bg-bg"
              >
                <span className="h-2 w-2 rounded-full bg-primary" />
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="font-medium text-ink">{item.title}</p>
                <p className="mt-1 text-fluid-sm leading-relaxed text-ink-soft">{item.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <Card className="mt-6">
        <p className="flex items-start gap-2.5 text-fluid-sm text-ink-soft">
          {booking.automationQueued ? (
            <>
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>
                Your confirmation is on its way. If it has not arrived in ten minutes, check your
                spam folder before calling us.
              </span>
            </>
          ) : (
            <>
              <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden="true" />
              <span>
                Your appointment is saved, but the automated confirmation has not gone out yet. The
                booking itself is safe. Reception will follow up if the message does not arrive.
              </span>
            </>
          )}
        </p>
      </Card>

      <div className="mt-8 text-center">
        <Button asChild variant="ghost">
          <Link href="/">Back to the home page</Link>
        </Button>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 xs:flex-row xs:items-baseline xs:justify-between xs:gap-6">
      <dt className="text-fluid-xs uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="text-fluid-base text-ink xs:text-right">{children}</dd>
    </div>
  )
}
