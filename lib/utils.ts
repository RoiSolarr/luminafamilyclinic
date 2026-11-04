import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind classes without fighting over conflicting utilities. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Peso range such as "₱800 to ₱1,200", or a single value when they match. */
export function formatPriceRange(min: number, max: number, currency = 'PHP'): string {
  const fmt = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  })
  return min === max ? fmt.format(min) : `${fmt.format(min)} to ${fmt.format(max)}`
}

/** "30 min", "1 hr", "1 hr 30 min". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  const hoursPart = `${hours} hr`
  return rest ? `${hoursPart} ${rest} min` : hoursPart
}

/** Day names for a set of weekday numbers, e.g. [1,3,5] to "Mon, Wed, Fri". */
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function formatWeekdays(days: number[]): string {
  const unique = [...new Set(days)].sort((a, b) => a - b)
  return unique.map((d) => DAY_NAMES[d] ?? '').filter(Boolean).join(', ')
}

export function dayName(day: number): string {
  return DAY_NAMES[day] ?? ''
}

/** "9:00 AM to 12:00 PM" from two HH:mm or HH:mm:ss strings. */
export function formatClockTimeRange(start: string, end: string): string {
  const to12 = (value: string) => {
    const [h, m] = value.split(':').map(Number)
    const suffix = (h ?? 0) < 12 ? 'AM' : 'PM'
    const hour = (h ?? 0) % 12 === 0 ? 12 : (h ?? 0) % 12
    return `${hour}:${String(m ?? 0).padStart(2, '0')} ${suffix}`
  }
  return `${to12(start)} to ${to12(end)}`
}

/** Strip control characters and collapse runs of whitespace. */
export function sanitizeText(value: string): string {
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

/** First name only, for a friendly greeting. */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName
}

/** Initials from a name, for the avatar circles. */
export function initialsFrom(fullName: string): string {
  const parts = fullName.replace(/^Dr\.?\s+/i, '').trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1]![0] : ''
  return (first + last).toUpperCase()
}

export const STATUS_LABEL: Record<string, string> = {
  pending: 'Awaiting confirmation',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  rescheduled: 'Rescheduled',
  completed: 'Completed',
  no_show: 'Missed',
}

export const URGENCY_LABEL: Record<string, string> = {
  routine: 'Routine',
  soon: 'See soon',
  urgent: 'Urgent',
  emergency: 'Emergency',
}
