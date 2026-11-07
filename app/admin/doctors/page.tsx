import type { Metadata } from 'next'
import Link from 'next/link'
import { Stethoscope } from 'lucide-react'

import { getOrganization, listAppointmentsForAdmin, listProviders, listServices } from '@/lib/repo'
import { formatClockTime, todayInZone } from '@/lib/time'
import { Badge, Card, InitialsAvatar } from '@/components/ui/primitives'
import { AdminPage, AdminPageHeader } from '@/components/admin/page-shell'
import type { ScheduleBlock } from '@/lib/types'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Doctors',
  robots: { index: false, follow: false, nocache: true },
}

/** Index 0 is Sunday, matching `weekdayOfDateString`. */
const DAY_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * Merge the blocks for one weekday into a single readable range list, so a
 * doctor working 08:00 to 12:00 and 13:00 to 17:00 reads as one line.
 */
function groupByDay(schedule: ScheduleBlock[]) {
  const byDay = new Map<number, string[]>()

  for (const block of [...schedule].sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime),
  )) {
    const ranges = byDay.get(block.dayOfWeek) ?? []
    ranges.push(`${formatClockTime(block.startTime)} to ${formatClockTime(block.endTime)}`)
    byDay.set(block.dayOfWeek, ranges)
  }

  // Monday first. A clinic week does not start on Sunday.
  const order = [1, 2, 3, 4, 5, 6, 0]
  return order
    .filter((day) => byDay.has(day))
    .map((day) => ({ day, label: DAY_LABEL[day]!, ranges: byDay.get(day)! }))
}

/**
 * The roster.
 *
 * Answers the question reception is actually asked at the desk: who is in
 * today, and what do they cover. The booking flow reads the same rows, so
 * what appears here is what patients can actually book.
 */
export default async function AdminDoctorsPage() {
  const org = await getOrganization()
  const today = todayInZone(org.timezone)

  const [providers, services, upcoming] = await Promise.all([
    listProviders(),
    listServices(),
    listAppointmentsForAdmin({ date: today }),
  ])

  const serviceName = new Map(services.map((s) => [s.id, s.name]))
  const todayCount = new Map<string, number>()
  for (const a of upcoming) {
    if (a.status === 'cancelled') continue
    todayCount.set(a.providerId, (todayCount.get(a.providerId) ?? 0) + 1)
  }

  return (
    <AdminPage>
      <AdminPageHeader
        title="Doctors"
        subtitle="Weekly roster, specialties and today's load. Read only."
        actions={
          <Badge tone="neutral">
            <Stethoscope className="h-3.5 w-3.5" aria-hidden="true" />
            {providers.length} on the roster
          </Badge>
        }
      />

      <ul className="mt-8 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,24rem),1fr))]">
        {providers.map((p) => {
          const days = groupByDay(p.schedule)
          const booked = todayCount.get(p.id) ?? 0

          return (
            <li key={p.id}>
              <Card className="flex h-full flex-col">
                <div className="flex items-start gap-4">
                  <InitialsAvatar initials={p.initials} />
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-fluid-lg leading-tight">{p.fullName}</p>
                    <p className="text-fluid-sm text-ink-soft">{p.specialty}</p>
                    {p.languages.length > 0 && (
                      <p className="mt-1 text-fluid-xs text-ink-muted">
                        Speaks {p.languages.join(', ')}
                      </p>
                    )}
                  </div>
                  <Badge tone={booked > 0 ? 'primary' : 'neutral'}>
                    {booked} today
                  </Badge>
                </div>

                <div className="mt-4 border-t border-line pt-4">
                  <p className="text-fluid-xs uppercase tracking-wide text-ink-muted">
                    Weekly roster
                  </p>
                  {days.length === 0 ? (
                    <p className="mt-2 text-fluid-sm text-ink-muted">
                      No hours set, so nothing can be booked.
                    </p>
                  ) : (
                    <dl className="mt-2 flex flex-col gap-1 text-fluid-sm">
                      {days.map((d) => (
                        <div key={d.day} className="flex items-baseline justify-between gap-4">
                          <dt className="w-10 shrink-0 font-medium text-ink">{d.label}</dt>
                          <dd className="text-right tabular-nums text-ink-soft">
                            {d.ranges.join(', ')}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>

                <div className="mt-4 flex-1 border-t border-line pt-4">
                  <p className="text-fluid-xs uppercase tracking-wide text-ink-muted">Covers</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {p.serviceIds.length === 0 ? (
                      <span className="text-fluid-sm text-ink-muted">No services assigned</span>
                    ) : (
                      p.serviceIds.map((id) => (
                        <Badge key={id} tone="neutral">
                          {serviceName.get(id) ?? 'Unknown service'}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>

                <Link
                  href={`/admin/appointments?provider=${encodeURIComponent(p.id)}`}
                  className="link-underline mt-4 text-fluid-sm text-primary"
                >
                  View their appointments
                </Link>
              </Card>
            </li>
          )
        })}
      </ul>
    </AdminPage>
  )
}
