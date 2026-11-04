import type { Metadata } from 'next'
import Link from 'next/link'
import { Clock, Stethoscope, Video, Users } from 'lucide-react'

import { listProviders, listServices } from '@/lib/repo'
import { formatDuration, formatPriceRange } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge, Card, EmptyState } from '@/components/ui/primitives'
import { Reveal, StaggerItem, StaggerList } from '@/components/motion'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Services',
  description:
    'Six outpatient services with their real length and price range: general consultation, pediatrics, dental, dermatology, laboratory tests and telehealth.',
}

export default async function ServicesPage() {
  const [services, providers] = await Promise.all([listServices(), listProviders()])

  return (
    <div className="container section-y">
      <Reveal className="max-w-2xl">
        <h1 className="text-fluid-4xl font-semibold">Services</h1>
        <p className="mt-5 text-fluid-lg leading-relaxed text-ink-soft">
          Every appointment length below is the time actually blocked in the doctor&apos;s diary,
          not an optimistic estimate. Prices are a range because what you pay depends on what the
          visit turns out to need.
        </p>
      </Reveal>

      {services.length === 0 ? (
        <EmptyState
          className="mt-12"
          title="No services are listed yet"
          body="Run the seed script, or switch on mock mode, to populate the clinic with demo data."
        />
      ) : (
        <StaggerList className="mt-12 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr))]">
          {services.map((service) => {
            const doctors = providers.filter((p) => p.serviceIds.includes(service.id))

            return (
              <StaggerItem key={service.id}>
                <Card className="@container flex h-full flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary-strong">
                      {service.isTelehealth ? (
                        <Video className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <Stethoscope className="h-5 w-5" aria-hidden="true" />
                      )}
                    </span>
                    {service.isTelehealth && <Badge tone="accent">Video consultation</Badge>}
                  </div>

                  <h2 className="mt-4 font-display text-fluid-xl">{service.name}</h2>
                  <p className="mt-3 flex-1 text-fluid-base leading-relaxed text-ink-soft">
                    {service.description}
                  </p>

                  <dl className="mt-6 grid grid-cols-1 gap-3 border-t border-line pt-5 @xs:grid-cols-2">
                    <div>
                      <dt className="text-fluid-xs uppercase tracking-wide text-ink-muted">
                        Appointment length
                      </dt>
                      <dd className="mt-1 flex items-center gap-1.5 text-fluid-base text-ink">
                        <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
                        {formatDuration(service.durationMinutes)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-fluid-xs uppercase tracking-wide text-ink-muted">
                        Price range
                      </dt>
                      <dd className="mt-1 text-fluid-base text-ink">
                        {formatPriceRange(service.priceMin, service.priceMax)}
                      </dd>
                    </div>
                  </dl>

                  {doctors.length > 0 && (
                    <p className="mt-4 flex items-start gap-2 text-fluid-xs text-ink-muted">
                      <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>
                        Offered by {doctors.map((d) => d.fullName).join(', ')}
                      </span>
                    </p>
                  )}

                  <Button asChild className="mt-6 self-start">
                    <Link href={`/book?service=${service.slug}`}>Book this</Link>
                  </Button>
                </Card>
              </StaggerItem>
            )
          })}
        </StaggerList>
      )}

      <Reveal className="mt-14">
        <Card className="bg-surface-2/70">
          <h2 className="font-display text-fluid-xl">Not sure which one to pick?</h2>
          <p className="mt-2 max-w-2xl text-fluid-base text-ink-soft">
            Book a General Consultation. A family physician will see you, and if you need a
            specialist or a test they will arrange it from there rather than sending you back to the
            booking page.
          </p>
          <Button asChild variant="secondary" className="mt-5">
            <Link href="/book?service=general-consultation">Book a general consultation</Link>
          </Button>
        </Card>
      </Reveal>
    </div>
  )
}
