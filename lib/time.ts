/**
 * Timezone helpers.
 *
 * Every appointment is stored as `timestamptz` (an absolute instant). The
 * clinic, however, thinks in local wall clock time: "Dr Reyes works 09:00 to
 * 12:00 on Tuesdays" is a statement about Asia/Manila, not about UTC.
 *
 * These helpers convert between the two using Intl, so there is no dependency
 * on a timezone library and no drift when daylight saving rules change.
 */

const PAD = (n: number) => String(n).padStart(2, '0')

/** Parts of an instant as seen in a given IANA timezone. */
export type ZonedParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  /** 0 = Sunday. */
  weekday: number
  /** YYYY-MM-DD */
  date: string
  /** HH:mm */
  time: string
}

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>()

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let fmt = partsFormatterCache.get(timeZone)
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
    })
    partsFormatterCache.set(timeZone, fmt)
  }
  return fmt
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

/** Break an instant into wall clock parts for a timezone. */
export function zonedParts(instant: Date, timeZone: string): ZonedParts {
  const parts = partsFormatter(timeZone).formatToParts(instant)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0'

  const year = Number(get('year'))
  const month = Number(get('month'))
  const day = Number(get('day'))
  const hour = Number(get('hour'))
  const minute = Number(get('minute'))
  const second = Number(get('second'))
  const weekday = WEEKDAY_INDEX[get('weekday')] ?? 0

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    weekday,
    date: `${year}-${PAD(month)}-${PAD(day)}`,
    time: `${PAD(hour)}:${PAD(minute)}`,
  }
}

/** Offset of a timezone from UTC at a given instant, in minutes (positive east). */
export function zoneOffsetMinutes(instant: Date, timeZone: string): number {
  const p = zonedParts(instant, timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return Math.round((asUtc - instant.getTime()) / 60000)
}

/**
 * Turn a local date and time in a timezone into the matching UTC instant.
 *
 * Two passes: guess using the offset at the naive instant, then correct using
 * the offset that actually applies at the guessed instant. This resolves the
 * handful of cases near a daylight saving boundary.
 */
export function zonedToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  const [hh, mm] = timeStr.split(':').map(Number)
  const naive = Date.UTC(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0)

  let guess = new Date(naive - zoneOffsetMinutes(new Date(naive), timeZone) * 60000)
  guess = new Date(naive - zoneOffsetMinutes(guess, timeZone) * 60000)
  return guess
}

/** YYYY-MM-DD for an instant as seen in a timezone. */
export function zonedDateString(instant: Date, timeZone: string): string {
  return zonedParts(instant, timeZone).date
}

/** HH:mm for an instant as seen in a timezone. */
export function zonedTimeString(instant: Date, timeZone: string): string {
  return zonedParts(instant, timeZone).time
}

/** Minutes since midnight for an "HH:mm" or "HH:mm:ss" string. */
export function minutesFromTimeString(value: string): number {
  const [h, m] = value.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

/** "HH:mm" from minutes since midnight. */
export function timeStringFromMinutes(total: number): string {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${PAD(h)}:${PAD(m)}`
}

/** Add days to a YYYY-MM-DD string without touching timezones. */
export function addDaysToDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const base = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1))
  base.setUTCDate(base.getUTCDate() + days)
  return `${base.getUTCFullYear()}-${PAD(base.getUTCMonth() + 1)}-${PAD(base.getUTCDate())}`
}

/** Weekday (0 = Sunday) of a YYYY-MM-DD string, read as a plain calendar date. */
export function weekdayOfDateString(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1)).getUTCDay()
}

/** Whole days between two YYYY-MM-DD strings (b minus a). */
export function daysBetweenDateStrings(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  const ms = Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)
  return Math.round(ms / 86400000)
}

const LONG_DATE_CACHE = new Map<string, Intl.DateTimeFormat>()

/** "Tuesday, 18 November 2026" for a YYYY-MM-DD string. */
export function formatLongDate(dateStr: string, timeZone: string, locale = 'en-PH'): string {
  const key = `${locale}|${timeZone}`
  let fmt = LONG_DATE_CACHE.get(key)
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale, {
      timeZone: 'UTC',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    LONG_DATE_CACHE.set(key, fmt)
  }
  const [y, m, d] = dateStr.split('-').map(Number)
  return fmt.format(new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1)))
}

/** "9:30 AM" from an "HH:mm" string. */
export function formatClockTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const suffix = (h ?? 0) < 12 ? 'AM' : 'PM'
  const hour12 = (h ?? 0) % 12 === 0 ? 12 : (h ?? 0) % 12
  return `${hour12}:${PAD(m ?? 0)} ${suffix}`
}

/** Compact UTC stamp used inside .ics files: 20261118T013000Z */
export function toIcsStamp(instant: Date): string {
  return instant.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/** Today as YYYY-MM-DD in a timezone. */
export function todayInZone(timeZone: string, now = new Date()): string {
  return zonedDateString(now, timeZone)
}
