import type { Metadata } from 'next'
import Link from 'next/link'
import { Languages, CalendarDays } from 'lucide-react'

import { listProviders, listServices } from '@/lib/repo'
import { dayName, formatClockTimeRange } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge, Card, EmptyState, InitialsAvatar } from '@/components/ui/primitives'
import { Reveal, StaggerItem, StaggerList } from '@/components/motion'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Doctors',
  description:
    'Six fictional doctors across family medicine, pediatrics, dermatology, dentistry, internal medicine and laboratory medicine.',
}

export default async function DoctorsPage() {
  const [providers, services] = await Promise.all([listProviders(), listServices()])
  const serviceById = new Map(services.map((s) => [s.id, s]))

  return (
    <div className="container section-y">
      <Reveal className="max-w-2xl">
        <h1 className="text-fluid-4xl font-semibold">Doctors</h1>
        <p className="mt-5 text-fluid-lg leading-relaxed text-ink-soft">
          Six clinicians, each with their own diary. The days listed are the days they hold clinic;
          the booking page shows the exact times still free.
        </p>
        <p className="mt-3 text-fluid-sm text-ink-muted">
          These people are invented. Avatars are initials rather than stock photographs, so nobody
          real is implied.
        </p>
      </Reveal>

      {providers.length === 0 ? (
        <EmptyState
          className="mt-12"
          title="No doctors are listed yet"
          body="Run the seed script, or switch on mock mode, to populate the clinic with demo data."
        />
      ) : (
        <StaggerList className="mt-12 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr))]">
          {providers.map((doctor) => {
            // Group the roster by weekday so each day appears once.
            const byDay = new Map<number, string[]>()
            for (const block of doctor.schedule) {
              const list = byDay.get(block.dayOfWeek) ?? []
              list.push(formatClockTimeRange(block.startTime, block.endTime))
              byDay.set(block.dayOfWeek, list)
            }
            const days = [...byDay.entries()].sort((a, b) => a[0] - b[0])

            return (
              <StaggerItem key={doctor.id}>
                <Card className="@container flex h-full flex-col">
                  <div className="flex items-start gap-4">
                    <InitialsAvatar initials={doctor.initials} size="lg" />
                    <div className="min-w-0">
                      <h2 className="font-display text-fluid-xl">{doctor.fullName}</h2>
                      <p className="text-fluid-base text-primary">{doctor.specialty}</p>
                      <p className="mt-2 flex items-center gap-1.5 text-fluid-xs text-ink-muted">
                        <Languages className="h-3.5 w-3.5" aria-hidden="true" />
                        {doctor.languages.join(', ')}
                      </p>
                    </div>
                  </div>

                  <p className="mt-5 flex-1 text-fluid-base leading-relaxed text-ink-soft">
                    {doctor.bio}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {doctor.serviceIds.map((id) => {
                      const service = serviceById.get(id)
                      if (!service) return null
                      return (
                        <Badge key={id} tone="primary">
                          {service.name}
                        </Badge>
                      )
                    })}
                  </div>

                  <div className="mt-6 border-t border-line pt-5">
                    <h3 className="flex items-center gap-1.5 text-fluid-xs uppercase tracking-wide text-ink-muted">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                      Clinic days
                    </h3>
                    <dl className="mt-3 grid gap-x-6 gap-y-1.5 @sm:grid-cols-2">
                      {days.map(([day, ranges]) => (
                        <div key={day} className="flex items-baseline justify-between gap-3">
                          <dt className="text-fluid-sm font-medium text-ink">{dayName(day)}</dt>
                          <dd className="text-right text-fluid-xs tabular-nums text-ink-soft">
                            {ranges.join(', ')}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  <Button asChild className="mt-6 self-start">
                    <Link href={`/book?doctor=${doctor.id}`}>
                      Book with {doctor.fullName.replace(/^Dr\.\s*/, 'Dr. ')}
                    </Link>
                  </Button>
                </Card>
              </StaggerItem>
            )
          })}
        </StaggerList>
      )}
    </div>
  )
}
