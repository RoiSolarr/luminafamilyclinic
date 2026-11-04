import 'server-only'
import {
  minutesFromTimeString,
  timeStringFromMinutes,
  weekdayOfDateString,
  zonedToUtc,
} from '@/lib/time'
import { closedReasonFor, type ClosedReason } from '@/lib/schedule'
import { listBusy, listProvidersForService, getOrganization } from '@/lib/repo'
import type { OrgRecord, ProviderRecord, ServiceRecord } from '@/lib/types'

/**
 * Slot generation.
 *
 * A slot exists when some provider who offers the service is rostered for the
 * whole duration and has nothing booked that overlaps it. Nothing about a
 * patient is read here, so the response can be cached and is safe to expose.
 */

export type Slot = {
  /** HH:mm in clinic local time. */
  time: string
  /** Provider ids free for the whole duration at that time. */
  providerIds: string[]
}

export type AvailabilityResult = {
  date: string
  timezone: string
  serviceId: string
  durationMinutes: number
  /** Why the day is empty, when it is. */
  closedReason: ClosedReason | null
  slots: Slot[]
}

const GRID_MINUTES = 30

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && aEnd > bStart
}

/** Dates the booking calendar should disable, for a whole month at a time. */
export function isDateBookable(
  dateStr: string,
  org: OrgRecord,
  now = new Date(),
): ClosedReason | null {
  return closedReasonFor(dateStr, org.settings, org.timezone, now)
}

export async function getAvailability(args: {
  date: string
  service: ServiceRecord
  providerId?: string
  now?: Date
}): Promise<AvailabilityResult> {
  const now = args.now ?? new Date()
  const org = await getOrganization()

  const base: AvailabilityResult = {
    date: args.date,
    timezone: org.timezone,
    serviceId: args.service.id,
    durationMinutes: args.service.durationMinutes,
    closedReason: null,
    slots: [],
  }

  const closedReason = isDateBookable(args.date, org, now)
  if (closedReason) return { ...base, closedReason }

  let providers: ProviderRecord[] = await listProvidersForService(args.service.id)
  if (args.providerId) providers = providers.filter((p) => p.id === args.providerId)
  if (providers.length === 0) return base

  const duration = args.service.durationMinutes
  const weekday = weekdayOfDateString(args.date)

  // Candidate start minutes per provider, from their roster for that weekday.
  const candidateByProvider = new Map<string, Set<number>>()
  for (const provider of providers) {
    const starts = new Set<number>()
    for (const block of provider.schedule) {
      if (block.dayOfWeek !== weekday) continue
      const blockStart = minutesFromTimeString(block.startTime)
      const blockEnd = minutesFromTimeString(block.endTime)
      // Align to the 30 minute grid.
      let cursor = Math.ceil(blockStart / GRID_MINUTES) * GRID_MINUTES
      for (; cursor + duration <= blockEnd; cursor += GRID_MINUTES) {
        starts.add(cursor)
      }
    }
    if (starts.size > 0) candidateByProvider.set(provider.id, starts)
  }
  if (candidateByProvider.size === 0) return base

  // Everything already booked that day, for the providers in play.
  const dayStart = zonedToUtc(args.date, '00:00', org.timezone)
  const dayEnd = new Date(dayStart.getTime() + 36 * 3600 * 1000)
  const busy = await listBusy(
    [...candidateByProvider.keys()],
    dayStart.toISOString(),
    dayEnd.toISOString(),
  )

  const busyByProvider = new Map<string, { start: number; end: number }[]>()
  for (const b of busy) {
    const list = busyByProvider.get(b.providerId) ?? []
    list.push({ start: new Date(b.startsAt).getTime(), end: new Date(b.endsAt).getTime() })
    busyByProvider.set(b.providerId, list)
  }

  // Earliest instant a patient may book, honouring the notice period.
  const earliest = now.getTime() + org.settings.minNoticeHours * 3600 * 1000

  const slotMap = new Map<string, string[]>()
  for (const [providerId, starts] of candidateByProvider) {
    const taken = busyByProvider.get(providerId) ?? []
    for (const startMinutes of starts) {
      const time = timeStringFromMinutes(startMinutes)
      const startInstant = zonedToUtc(args.date, time, org.timezone).getTime()
      const endInstant = startInstant + duration * 60000

      if (startInstant < earliest) continue
      if (taken.some((t) => overlaps(startInstant, endInstant, t.start, t.end))) continue

      const list = slotMap.get(time) ?? []
      list.push(providerId)
      slotMap.set(time, list)
    }
  }

  const slots: Slot[] = [...slotMap.entries()]
    .map(([time, providerIds]) => ({ time, providerIds }))
    .sort((a, b) => a.time.localeCompare(b.time))

  return { ...base, slots }
}

/** Split a slot list into the two groups the wizard shows. */
export function groupSlots(slots: Slot[]): { morning: Slot[]; afternoon: Slot[] } {
  const morning: Slot[] = []
  const afternoon: Slot[] = []
  for (const slot of slots) {
    if (minutesFromTimeString(slot.time) < 12 * 60) morning.push(slot)
    else afternoon.push(slot)
  }
  return { morning, afternoon }
}
