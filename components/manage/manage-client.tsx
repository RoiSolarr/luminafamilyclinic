'use client'

import * as React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  CalendarClock,
  CalendarX2,
  CheckCircle2,
  Link2Off,
  RefreshCw,
  Video,
} from 'lucide-react'

import { clinic, clinicAddressLine } from '@/config/clinic'
import { addDaysToDateString, formatClockTime, formatLongDate } from '@/lib/time'
import { formatDuration } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge, Card, Dialog, DialogContent, DialogTrigger, EmptyState, InitialsAvatar, Skeleton } from '@/components/ui/primitives'
import { TextAreaField } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { useBlockingLoader } from '@/components/loading-overlay'
import { Calendar } from '@/components/booking/calendar'
import type { OrgSettings } from '@/lib/types'

type Booking = {
  bookingRef: string
  status: string
  startsAt: string
  endsAt: string
  localDate: string
  localTime: string
  localEndTime: string
  timezone: string
  providerId: string
  providerName: string
  providerInitials: string
  providerSpecialty: string
  serviceId: string
  serviceName: string
  durationMinutes: number
  isTelehealth: boolean
  patientName: string
  reminderChannel: 'email' | 'sms'
  aiConfirmationMessage: string | null
  cancelledReason: string | null
}

const STATUS_TONE: Record<string, 'ok' | 'warn' | 'danger' | 'neutral' | 'primary'> = {
  confirmed: 'ok',
  pending: 'primary',
  cancelled: 'danger',
  rescheduled: 'warn',
  completed: 'neutral',
  no_show: 'warn',
}

const STATUS_COPY: Record<string, string> = {
  confirmed: 'Confirmed',
  pending: 'Awaiting confirmation',
  cancelled: 'Cancelled',
  rescheduled: 'Rescheduled',
  completed: 'Completed',
  no_show: 'Recorded as missed',
}

/**
 * Manage booking.
 *
 * The reference and token come from the query string. Everything else is
 * fetched from /api/manage, which checks the token against the stored hash.
 * No booking data is rendered on the server, so the link cannot leak through a
 * cached HTML response.
 */
export function ManageClient({ settings, today }: { settings: OrgSettings; today: string }) {
  const params = useSearchParams()
  const { toast } = useToast()
  const loader = useBlockingLoader()

  // The brief used `id`; `ref` reads better in an email. Both are accepted.
  const bookingRef = (params.get('ref') ?? params.get('id') ?? '').trim().toUpperCase()
  const token = params.get('token') ?? ''

  const [booking, setBooking] = React.useState<Booking | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [working, setWorking] = React.useState(false)
  const [cancelReason, setCancelReason] = React.useState('')
  const [cancelOpen, setCancelOpen] = React.useState(false)
  const [rescheduling, setRescheduling] = React.useState(false)

  const load = React.useCallback(async () => {
    if (!bookingRef || !token) {
      setLoading(false)
      setError('missing')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/manage?ref=${encodeURIComponent(bookingRef)}&token=${encodeURIComponent(token)}`,
        { cache: 'no-store' },
      )
      const json = await response.json()
      if (!response.ok || !json.ok) {
        setError(response.status === 404 ? 'not_found' : 'server')
        setBooking(null)
        return
      }
      setBooking(json.data as Booking)
    } catch {
      setError('network')
    } finally {
      setLoading(false)
    }
  }, [bookingRef, token])

  React.useEffect(() => {
    void load()
  }, [load])

  /* ---------------------------------------------------------------- cancel */

  const cancel = async () => {
    setWorking(true)
    const done = loader.start('Cancelling your appointment')
    try {
      const response = await fetch('/api/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingRef, token, reason: cancelReason }),
      })
      const json = await response.json()
      if (!response.ok || !json.ok) {
        toast({
          title: 'We could not cancel that',
          description: json?.error?.message ?? 'Please try again in a moment.',
          tone: 'error',
        })
        return
      }
      setCancelOpen(false)
      toast({ title: 'Appointment cancelled', description: 'The slot is free again.', tone: 'success' })
      await load()
    } catch {
      toast({ title: 'We could not reach the clinic', tone: 'error' })
    } finally {
      setWorking(false)
      done()
    }
  }

  /* ----------------------------------------------------------- reschedule */

  const reschedule = async (date: string, time: string) => {
    setWorking(true)
    const done = loader.start('Moving your appointment')
    try {
      const response = await fetch('/api/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingRef, token, date, time }),
      })
      const json = await response.json()
      if (!response.ok || !json.ok) {
        toast({
          title: 'We could not move that appointment',
          description: json?.error?.message ?? 'Please choose another time.',
          tone: 'error',
        })
        return
      }
      setRescheduling(false)
      toast({ title: 'Appointment moved', tone: 'success' })
      await load()
    } catch {
      toast({ title: 'We could not reach the clinic', tone: 'error' })
    } finally {
      setWorking(false)
      done()
    }
  }

  /* -------------------------------------------------------------- render */

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-2xl" aria-busy="true">
        <span className="sr-only">Loading your booking</span>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    )
  }

  if (error || !booking) {
    const copy =
      error === 'missing'
        ? 'This page needs the full link from your confirmation email, including the part after the question mark.'
        : error === 'not_found'
          ? 'That link does not match a booking. It may have been typed by hand, or the appointment may have been removed.'
          : 'We could not load that booking just now.'

    return (
      <div className="mx-auto w-full max-w-xl">
        <EmptyState
          icon={<Link2Off className="h-8 w-8" aria-hidden="true" />}
          title="We could not open that booking"
          body={copy}
          action={
            <div className="mt-2 flex flex-col gap-3 xs:flex-row">
              <Button variant="secondary" onClick={() => void load()}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Try again
              </Button>
              <Button asChild>
                <Link href="/book">Make a new booking</Link>
              </Button>
            </div>
          }
        />
        <p className="mt-6 text-center text-fluid-sm text-ink-soft">
          Still stuck? Call{' '}
          <a href={`tel:${clinic.contact.phoneHref}`} className="link-underline text-primary">
            {clinic.contact.phone}
          </a>{' '}
          and quote your reference.
        </p>
      </div>
    )
  }

  const isLive = booking.status === 'pending' || booking.status === 'confirmed'
  const isPast = new Date(booking.endsAt).getTime() < Date.now()

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-fluid-xs uppercase tracking-wide text-ink-muted">Booking reference</p>
          <p className="font-display text-fluid-2xl font-semibold tracking-wide text-primary">
            {booking.bookingRef}
          </p>
        </div>
        <Badge tone={STATUS_TONE[booking.status] ?? 'neutral'}>
          {booking.status === 'confirmed' && (
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {STATUS_COPY[booking.status] ?? booking.status}
        </Badge>
      </div>

      {booking.status === 'cancelled' && (
        <Card className="mt-6 border-danger/30 bg-danger/5">
          <p className="flex items-start gap-2.5 text-fluid-base text-danger">
            <CalendarX2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <span>
              This appointment is cancelled and the slot has been released.
              {booking.cancelledReason ? ` Reason given: ${booking.cancelledReason}` : ''}
            </span>
          </p>
          <Button asChild className="mt-4">
            <Link href="/book">Book a new appointment</Link>
          </Button>
        </Card>
      )}

      <Card className="mt-6">
        <div className="flex items-start gap-4">
          <InitialsAvatar initials={booking.providerInitials} />
          <div className="min-w-0">
            <h2 className="font-display text-fluid-xl">{booking.serviceName}</h2>
            <p className="text-fluid-base text-primary">{booking.providerName}</p>
            <p className="text-fluid-sm text-ink-muted">{booking.providerSpecialty}</p>
          </div>
        </div>

        <dl className="mt-6 flex flex-col gap-3 border-t border-line pt-5">
          <Row label="Date">{formatLongDate(booking.localDate, booking.timezone)}</Row>
          <Row label="Time">
            {formatClockTime(booking.localTime)} to {formatClockTime(booking.localEndTime)}
            <span className="block text-fluid-xs text-ink-muted">{clinic.timezoneLabel}</span>
          </Row>
          <Row label="Length">{formatDuration(booking.durationMinutes)}</Row>
          <Row label="Patient">{booking.patientName}</Row>
          <Row label="Reminder">
            {booking.reminderChannel === 'sms' ? 'By SMS' : 'By email'}
          </Row>
          <Row label="Where">
            {booking.isTelehealth ? (
              <span className="inline-flex items-center gap-2">
                <Video className="h-4 w-4 text-accent" aria-hidden="true" />
                Video consultation
              </span>
            ) : (
              clinicAddressLine()
            )}
          </Row>
        </dl>

        {booking.aiConfirmationMessage && (
          <p className="mt-5 rounded-xl bg-primary-soft p-4 text-fluid-sm leading-relaxed text-primary-strong">
            {booking.aiConfirmationMessage}
          </p>
        )}
      </Card>

      {isLive && !isPast && (
        <>
          <div className="mt-6 flex flex-col gap-3 xs:flex-row">
            <Button
              variant="secondary"
              className="xs:flex-1"
              onClick={() => setRescheduling((v) => !v)}
              aria-expanded={rescheduling}
            >
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
              {rescheduling ? 'Keep this time' : 'Reschedule'}
            </Button>

            <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
              <DialogTrigger asChild>
                <Button variant="danger" className="xs:flex-1">
                  <CalendarX2 className="h-4 w-4" aria-hidden="true" />
                  Cancel appointment
                </Button>
              </DialogTrigger>
              <DialogContent
                title="Cancel this appointment?"
                description="The slot goes back into the diary straight away. You can always book again."
              >
                <TextAreaField
                  id="cancelReason"
                  label="Reason (optional)"
                  rows={3}
                  counterMax={300}
                  currentLength={cancelReason.length}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  hint="It helps the clinic understand why slots are released, and it is never shared."
                />
                <div className="mt-5 flex flex-col gap-3 xs:flex-row-reverse">
                  <Button
                    variant="danger"
                    className="xs:flex-1"
                    loading={working}
                    loadingLabel="Cancelling"
                    onClick={() => void cancel()}
                  >
                    Yes, cancel it
                  </Button>
                  <Button
                    variant="secondary"
                    className="xs:flex-1"
                    disabled={working}
                    onClick={() => setCancelOpen(false)}
                  >
                    Keep my appointment
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {rescheduling && (
            <Card className="mt-5">
              <h2 className="font-display text-fluid-lg">Pick a new time</h2>
              <p className="mt-2 text-fluid-sm text-ink-soft">
                Same service, same doctor. Only times {booking.providerName} actually has free are
                offered.
              </p>
              <ReschedulePicker
                booking={booking}
                settings={settings}
                today={today}
                working={working}
                onConfirm={reschedule}
              />
            </Card>
          )}
        </>
      )}

      {isPast && isLive && (
        <Card className="mt-6 bg-surface-2/60">
          <p className="flex items-start gap-2.5 text-fluid-sm text-ink-soft">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden="true" />
            This appointment time has already passed, so it can no longer be changed here. Call the
            clinic if you need to rebook.
          </p>
        </Card>
      )}

      <p className="mt-8 text-center text-fluid-xs text-ink-muted">{clinic.demoNotice}</p>
    </div>
  )
}

/** Calendar and slot chips scoped to one existing booking. */
function ReschedulePicker({
  booking,
  settings,
  today,
  working,
  onConfirm,
}: {
  booking: Booking
  settings: OrgSettings
  today: string
  working: boolean
  onConfirm: (date: string, time: string) => void | Promise<void>
}) {
  const [date, setDate] = React.useState<string>(booking.localDate)
  const [time, setTime] = React.useState<string | null>(null)
  const [slots, setSlots] = React.useState<{ time: string }[] | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [failed, setFailed] = React.useState(false)

  React.useEffect(() => {
    let active = true
    setLoading(true)
    setFailed(false)
    setTime(null)

    const params = new URLSearchParams({
      date,
      serviceId: booking.serviceId,
      providerId: booking.providerId,
    })

    fetch(`/api/availability?${params.toString()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => {
        if (!active) return
        if (!json?.ok) {
          setFailed(true)
          setSlots(null)
          return
        }
        setSlots(json.data.slots as { time: string }[])
      })
      .catch(() => {
        if (active) setFailed(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [date, booking.serviceId, booking.providerId])

  return (
    <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,20rem)_1fr]">
      <div className="rounded-2xl border border-line p-3">
        <Calendar
          value={date}
          onChange={setDate}
          minDate={today}
          maxDate={addDaysToDateString(today, settings.bookingWindowDays)}
          holidays={settings.holidays}
          closedWeekdays={settings.closedWeekdays}
          timezone={booking.timezone}
          today={today}
        />
      </div>

      <div>
        {loading && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2" aria-busy="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        )}

        {!loading && failed && (
          <p className="text-fluid-sm text-danger">
            We could not load times for that day. Try another date.
          </p>
        )}

        {!loading && !failed && slots && slots.length === 0 && (
          <p className="text-fluid-sm text-ink-soft">
            Nothing free that day with {booking.providerName}. Try another date.
          </p>
        )}

        {!loading && !failed && slots && slots.length > 0 && (
          <div
            role="radiogroup"
            aria-label="New time"
            className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2"
          >
            {slots.map((slot) => {
              const active = time === slot.time
              return (
                <button
                  key={slot.time}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setTime(slot.time)}
                  className={`tap-target rounded-xl border px-2 text-fluid-sm tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    active
                      ? 'border-primary bg-primary font-semibold text-primary-ink'
                      : 'border-line bg-surface text-ink hover:border-primary/50 hover:bg-primary-soft'
                  }`}
                >
                  {formatClockTime(slot.time)}
                </button>
              )
            })}
          </div>
        )}

        <Button
          className="mt-6"
          disabled={!time}
          loading={working}
          loadingLabel="Moving"
          onClick={() => time && void onConfirm(date, time)}
        >
          Move my appointment
        </Button>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 xs:flex-row xs:items-baseline xs:justify-between xs:gap-6">
      <dt className="shrink-0 text-fluid-xs uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="text-fluid-base text-ink xs:text-right">{children}</dd>
    </div>
  )
}
