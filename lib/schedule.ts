/**
 * Pure roster rules, with no database access.
 *
 * Both the availability endpoint and the booking write import these, so there
 * is exactly one definition of "this doctor can be seen at this time". Keeping
 * it here rather than in `lib/availability.ts` avoids a circular import, since
 * availability reads through the repository and the repository needs these
 * rules too.
 */
import {
  daysBetweenDateStrings,
  minutesFromTimeString,
  todayInZone,
  weekdayOfDateString,
  zonedToUtc,
} from '@/lib/time'
import type { OrgSettings, ProviderRecord } from '@/lib/types'

export type ClosedReason = 'holiday' | 'closed_day' | 'past' | 'out_of_window'

/** Why the clinic cannot take a booking on this date, or null when it can. */
export function closedReasonFor(
  dateStr: string,
  settings: OrgSettings,
  timezone: string,
  now = new Date(),
): ClosedReason | null {
  const delta = daysBetweenDateStrings(todayInZone(timezone, now), dateStr)

  if (delta < 0) return 'past'
  if (delta > settings.bookingWindowDays) return 'out_of_window'
  if (settings.holidays.includes(dateStr)) return 'holiday'
  if (settings.closedWeekdays.includes(weekdayOfDateString(dateStr))) return 'closed_day'
  return null
}

/**
 * True when the provider's weekly roster covers the whole appointment.
 *
 * The appointment must fit inside a single block: a 60 minute service cannot
 * straddle the gap between a morning and an afternoon clinic.
 */
export function isRostered(
  provider: Pick<ProviderRecord, 'schedule'>,
  dateStr: string,
  time: string,
  durationMinutes: number,
): boolean {
  const weekday = weekdayOfDateString(dateStr)
  const start = minutesFromTimeString(time)
  const end = start + durationMinutes

  return provider.schedule.some(
    (block) =>
      block.dayOfWeek === weekday &&
      start >= minutesFromTimeString(block.startTime) &&
      end <= minutesFromTimeString(block.endTime),
  )
}

/** True when the slot still satisfies the clinic's minimum notice period. */
export function meetsNoticePeriod(
  dateStr: string,
  time: string,
  settings: OrgSettings,
  timezone: string,
  now = new Date(),
): boolean {
  const startsAt = zonedToUtc(dateStr, time, timezone).getTime()
  return startsAt >= now.getTime() + settings.minNoticeHours * 3600 * 1000
}

/**
 * The full check a booking must pass before the database is even asked.
 * Returns null when the slot is bookable, or a short reason when it is not.
 */
export function slotRejectionReason(
  provider: Pick<ProviderRecord, 'schedule'>,
  dateStr: string,
  time: string,
  durationMinutes: number,
  settings: OrgSettings,
  timezone: string,
  now = new Date(),
): ClosedReason | 'not_rostered' | 'too_soon' | null {
  const closed = closedReasonFor(dateStr, settings, timezone, now)
  if (closed) return closed
  if (!meetsNoticePeriod(dateStr, time, settings, timezone, now)) return 'too_soon'
  if (!isRostered(provider, dateStr, time, durationMinutes)) return 'not_rostered'
  return null
}
