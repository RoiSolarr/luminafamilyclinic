'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  addDaysToDateString,
  daysBetweenDateStrings,
  formatLongDate,
  weekdayOfDateString,
} from '@/lib/time'

/**
 * Month calendar built from plain date strings rather than Date objects, so a
 * visitor in another timezone still sees the clinic's calendar and never an
 * off by one day.
 *
 * Keyboard support follows the grid pattern: arrows move by day and week,
 * Home and End jump to the ends of the week, PageUp and PageDown change month.
 */

export type CalendarProps = {
  /** Selected day, YYYY-MM-DD. */
  value: string | null
  onChange: (date: string) => void
  /** Earliest selectable day, YYYY-MM-DD. */
  minDate: string
  /** Latest selectable day, YYYY-MM-DD. */
  maxDate: string
  /** Closed dates, YYYY-MM-DD. */
  holidays: string[]
  /** Weekdays the clinic never opens. 0 = Sunday. */
  closedWeekdays: number[]
  timezone: string
  /** Today in the clinic timezone, so "today" is the clinic's today. */
  today: string
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function monthKeyOf(dateStr: string) {
  return dateStr.slice(0, 7)
}

function firstOfMonth(monthKey: string) {
  return `${monthKey}-01`
}

function daysInMonth(monthKey: string) {
  const [y, m] = monthKey.split('-').map(Number)
  return new Date(Date.UTC(y!, m!, 0)).getUTCDate()
}

function shiftMonth(monthKey: string, delta: number) {
  const [y, m] = monthKey.split('-').map(Number)
  const d = new Date(Date.UTC(y!, m! - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function monthLabel(monthKey: string) {
  const [y, m] = monthKey.split('-').map(Number)
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(y!, m! - 1, 1)))
}

export function Calendar({
  value,
  onChange,
  minDate,
  maxDate,
  holidays,
  closedWeekdays,
  today,
}: CalendarProps) {
  const [month, setMonth] = React.useState(() => monthKeyOf(value ?? minDate))
  const [focusedDate, setFocusedDate] = React.useState(() => value ?? minDate)
  const gridRef = React.useRef<HTMLDivElement>(null)
  const shouldFocus = React.useRef(false)

  // Keep the visible month in step when the selection is changed elsewhere.
  React.useEffect(() => {
    if (value) {
      setMonth(monthKeyOf(value))
      setFocusedDate(value)
    }
  }, [value])

  React.useEffect(() => {
    if (!shouldFocus.current) return
    shouldFocus.current = false
    const node = gridRef.current?.querySelector<HTMLButtonElement>(
      `[data-date="${focusedDate}"]`,
    )
    node?.focus()
  }, [focusedDate])

  const disabledReason = React.useCallback(
    (dateStr: string): string | null => {
      if (daysBetweenDateStrings(minDate, dateStr) < 0) return 'Before the first bookable date'
      if (daysBetweenDateStrings(dateStr, maxDate) < 0) return 'Beyond the booking window'
      if (holidays.includes(dateStr)) return 'Clinic closed, holiday'
      if (closedWeekdays.includes(weekdayOfDateString(dateStr))) return 'Clinic closed'
      return null
    },
    [minDate, maxDate, holidays, closedWeekdays],
  )

  const moveFocus = (delta: number) => {
    const next = addDaysToDateString(focusedDate, delta)
    if (daysBetweenDateStrings(minDate, next) < 0) return
    if (daysBetweenDateStrings(next, maxDate) < 0) return
    shouldFocus.current = true
    setFocusedDate(next)
    if (monthKeyOf(next) !== month) setMonth(monthKeyOf(next))
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault()
        moveFocus(-1)
        break
      case 'ArrowRight':
        event.preventDefault()
        moveFocus(1)
        break
      case 'ArrowUp':
        event.preventDefault()
        moveFocus(-7)
        break
      case 'ArrowDown':
        event.preventDefault()
        moveFocus(7)
        break
      case 'Home':
        event.preventDefault()
        moveFocus(-weekdayOfDateString(focusedDate))
        break
      case 'End':
        event.preventDefault()
        moveFocus(6 - weekdayOfDateString(focusedDate))
        break
      case 'PageUp':
        event.preventDefault()
        moveFocus(-28)
        break
      case 'PageDown':
        event.preventDefault()
        moveFocus(28)
        break
      default:
        break
    }
  }

  const monthStart = firstOfMonth(month)
  const leadingBlanks = weekdayOfDateString(monthStart)
  const total = daysInMonth(month)

  const canGoBack = daysBetweenDateStrings(minDate, `${shiftMonth(month, -1)}-28`) >= 0
  const canGoForward = daysBetweenDateStrings(`${shiftMonth(month, 1)}-01`, maxDate) >= 0

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setMonth(shiftMonth(month, -1))}
          disabled={!canGoBack}
          aria-label="Previous month"
          className="tap-target inline-flex items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:bg-surface-2 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>

        <p aria-live="polite" className="font-display text-fluid-lg font-semibold">
          {monthLabel(month)}
        </p>

        <button
          type="button"
          onClick={() => setMonth(shiftMonth(month, 1))}
          disabled={!canGoForward}
          aria-label="Next month"
          className="tap-target inline-flex items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:bg-surface-2 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1" aria-hidden="true">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-2 text-center text-fluid-xs font-medium text-ink-muted">
            <span className="hidden xs:inline">{label}</span>
            <span className="xs:hidden">{label[0]}</span>
          </div>
        ))}
      </div>

      <div
        ref={gridRef}
        role="grid"
        aria-label="Choose a date"
        onKeyDown={onKeyDown}
        className="grid grid-cols-7 gap-1"
      >
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} role="presentation" />
        ))}

        {Array.from({ length: total }).map((_, i) => {
          const dateStr = `${month}-${String(i + 1).padStart(2, '0')}`
          const reason = disabledReason(dateStr)
          const selected = value === dateStr
          const isToday = dateStr === today
          const tabbable = dateStr === focusedDate

          return (
            <button
              key={dateStr}
              type="button"
              role="gridcell"
              data-date={dateStr}
              disabled={Boolean(reason)}
              tabIndex={tabbable ? 0 : -1}
              aria-selected={selected}
              aria-label={`${formatLongDate(dateStr, 'UTC')}${reason ? `, ${reason}` : ''}`}
              aria-current={isToday ? 'date' : undefined}
              onFocus={() => setFocusedDate(dateStr)}
              onClick={() => {
                if (reason) return
                onChange(dateStr)
              }}
              className={cn(
                'relative flex aspect-square min-h-[44px] items-center justify-center rounded-xl text-fluid-sm tabular-nums transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
                reason && 'cursor-not-allowed text-ink-muted/45 line-through decoration-1',
                !reason && !selected && 'text-ink hover:bg-primary-soft hover:text-primary-strong',
                selected && 'bg-primary font-semibold text-primary-ink shadow-soft',
              )}
            >
              {i + 1}
              {isToday && !selected && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-1.5 h-1 w-1 rounded-full bg-primary"
                />
              )}
            </button>
          )
        })}
      </div>

      <p className="mt-3 text-fluid-xs text-ink-muted">
        Crossed out days are closed. The clinic is shut on Sundays and public holidays.
      </p>
    </div>
  )
}
