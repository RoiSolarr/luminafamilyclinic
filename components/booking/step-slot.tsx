'use client'

import * as React from 'react'
import { AlertTriangle, Globe, RefreshCw, Sunrise, Sunset } from 'lucide-react'

import { cn } from '@/lib/utils'
import { formatClockTime, formatLongDate } from '@/lib/time'
import { Button } from '@/components/ui/button'
import { EmptyState, Skeleton } from '@/components/ui/primitives'
import { Calendar } from './calendar'
import type { ServiceRecord } from '@/lib/types'

type Slot = { time: string; providerIds: string[] }

type AvailabilityPayload = {
  date: string
  timezone: string
  durationMinutes: number
  closedReason: 'holiday' | 'closed_day' | 'past' | 'out_of_window' | null
  slots: Slot[]
}

const CLOSED_COPY: Record<string, string> = {
  holiday: 'The clinic is closed that day for a holiday.',
  closed_day: 'The clinic does not open on that day.',
  past: 'That date has already passed.',
  out_of_window: 'That date is beyond the booking window.',
}

/**
 * Step 2. Calendar plus slot chips.
 *
 * Availability is fetched from /api/availability whenever the date, doctor or
 * service changes. A request that is superseded is ignored, so a quick run
 * through several dates never lands stale results on screen.
 */
export function StepSlot({
  service,
  providerId,
  date,
  time,
  onDateChange,
  onTimeChange,
  timezone,
  timezoneLabel,
  today,
  minDate,
  maxDate,
  holidays,
  closedWeekdays,
  onSlotProvidersChange,
}: {
  service: ServiceRecord
  providerId: string | null
  date: string | null
  time: string | null
  onDateChange: (date: string) => void
  onTimeChange: (time: string | null) => void
  timezone: string
  timezoneLabel: string
  today: string
  minDate: string
  maxDate: string
  holidays: string[]
  closedWeekdays: number[]
  onSlotProvidersChange?: (providerIds: string[]) => void
}) {
  const [data, setData] = React.useState<AvailabilityPayload | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const requestId = React.useRef(0)

  const load = React.useCallback(async () => {
    if (!date) return
    const id = ++requestId.current
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ date, serviceId: service.id })
      if (providerId) params.set('providerId', providerId)

      const response = await fetch(`/api/availability?${params.toString()}`, {
        cache: 'no-store',
      })
      const json = await response.json()

      // A newer request has already been fired; drop this result.
      if (id !== requestId.current) return

      if (!response.ok || !json.ok) {
        setData(null)
        setError(
          json?.error?.message ??
            'We could not load available times. Check your connection and try again.',
        )
        return
      }

      setData(json.data as AvailabilityPayload)
    } catch {
      if (id !== requestId.current) return
      setData(null)
      setError('We could not reach the clinic just now. Check your connection and try again.')
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [date, providerId, service.id])

  React.useEffect(() => {
    void load()
  }, [load])

  // Drop a chosen time that is no longer offered.
  React.useEffect(() => {
    if (!data || !time) return
    const match = data.slots.find((s) => s.time === time)
    if (!match) {
      onTimeChange(null)
    } else {
      onSlotProvidersChange?.(match.providerIds)
    }
    // onTimeChange is stable in the wizard; listing it would re-run on each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, time])

  const morning = (data?.slots ?? []).filter((s) => Number(s.time.slice(0, 2)) < 12)
  const afternoon = (data?.slots ?? []).filter((s) => Number(s.time.slice(0, 2)) >= 12)

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-fluid-xl">When would suit you?</h2>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-fluid-sm text-ink-soft">
          <Globe className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          All times shown in {timezoneLabel}.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-10">
        <div className="rounded-2xl border border-line bg-surface p-4">
          <Calendar
            value={date}
            onChange={(next) => {
              onDateChange(next)
              onTimeChange(null)
            }}
            minDate={minDate}
            maxDate={maxDate}
            holidays={holidays}
            closedWeekdays={closedWeekdays}
            timezone={timezone}
            today={today}
          />
        </div>

        <div>
          {!date && (
            <EmptyState
              title="Pick a date first"
              body="Choose a day on the calendar and the free times will appear here."
            />
          )}

          {date && (
            <>
              <h3 className="font-display text-fluid-lg">
                {formatLongDate(date, timezone)}
              </h3>

              {loading && (
                <div className="mt-5 flex flex-col gap-5" aria-live="polite" aria-busy="true">
                  <span className="sr-only">Loading available times</span>
                  {[0, 1].map((group) => (
                    <div key={group}>
                      <Skeleton className="h-4 w-24" />
                      <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <Skeleton key={i} className="h-12" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loading && error && (
                <div className="mt-5 rounded-2xl border border-danger/35 bg-danger/5 p-5">
                  <p className="flex items-start gap-2 text-fluid-base text-danger">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                    <span>{error}</span>
                  </p>
                  <Button variant="secondary" size="sm" className="mt-4" onClick={() => void load()}>
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    Try again
                  </Button>
                </div>
              )}

              {!loading && !error && data?.closedReason && (
                <EmptyState
                  className="mt-5"
                  title="Nothing available that day"
                  body={CLOSED_COPY[data.closedReason] ?? 'The clinic is closed that day.'}
                />
              )}

              {!loading && !error && data && !data.closedReason && data.slots.length === 0 && (
                <EmptyState
                  className="mt-5"
                  title="Fully booked that day"
                  body="Every slot for this service has gone. Try the next day, or pick a different doctor."
                />
              )}

              {!loading && !error && data && data.slots.length > 0 && (
                <div className="mt-5 flex flex-col gap-6" aria-live="polite">
                  <SlotGroup
                    label="Morning"
                    icon={<Sunrise className="h-4 w-4" aria-hidden="true" />}
                    slots={morning}
                    selected={time}
                    onSelect={(slot) => {
                      onTimeChange(slot.time)
                      onSlotProvidersChange?.(slot.providerIds)
                    }}
                    anyDoctor={providerId === null}
                  />
                  <SlotGroup
                    label="Afternoon"
                    icon={<Sunset className="h-4 w-4" aria-hidden="true" />}
                    slots={afternoon}
                    selected={time}
                    onSelect={(slot) => {
                      onTimeChange(slot.time)
                      onSlotProvidersChange?.(slot.providerIds)
                    }}
                    anyDoctor={providerId === null}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function SlotGroup({
  label,
  icon,
  slots,
  selected,
  onSelect,
  anyDoctor,
}: {
  label: string
  icon: React.ReactNode
  slots: Slot[]
  selected: string | null
  onSelect: (slot: Slot) => void
  anyDoctor: boolean
}) {
  if (slots.length === 0) return null

  return (
    <fieldset>
      <legend className="flex items-center gap-2 text-fluid-xs font-medium uppercase tracking-wide text-ink-muted">
        {icon}
        {label}
      </legend>
      <div
        role="radiogroup"
        aria-label={`${label} times`}
        className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2"
      >
        {slots.map((slot) => {
          const active = selected === slot.time
          return (
            <button
              key={slot.time}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSelect(slot)}
              className={cn(
                'tap-target flex flex-col items-center justify-center rounded-xl border px-2 py-2 text-fluid-sm tabular-nums transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
                active
                  ? 'border-primary bg-primary font-semibold text-primary-ink shadow-soft'
                  : 'border-line bg-surface text-ink hover:border-primary/50 hover:bg-primary-soft hover:text-primary-strong',
              )}
            >
              {formatClockTime(slot.time)}
              {anyDoctor && slot.providerIds.length > 1 && (
                <span
                  className={cn(
                    'text-[0.65rem] leading-tight',
                    active ? 'text-primary-ink/75' : 'text-ink-muted',
                  )}
                >
                  {slot.providerIds.length} free
                </span>
              )}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
