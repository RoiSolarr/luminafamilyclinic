import type { Metadata } from 'next'
import { Suspense } from 'react'

import { clinic } from '@/config/clinic'
import { getOrganization, listProviders, listServices } from '@/lib/repo'
import { todayInZone } from '@/lib/time'
import { BookingWizard, EmergencyBanner } from '@/components/booking/wizard'
import { Skeleton } from '@/components/ui/primitives'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Book an appointment',
  description:
    'Choose a service, a doctor and a time that suits you. Four short steps, no account needed.',
  robots: { index: true, follow: true },
}

export default async function BookPage() {
  const [org, services, providers] = await Promise.all([
    getOrganization(),
    listServices(),
    listProviders(),
  ])

  const today = todayInZone(org.timezone)

  return (
    <div className="container py-10 lg:py-16">
      <header className="mb-8 max-w-2xl">
        <h1 className="text-fluid-3xl font-semibold">Book an appointment</h1>
        <p className="mt-3 text-fluid-base text-ink-soft">
          Four short steps. Nothing is confirmed until the last one, and you can go back at any
          point without losing what you have typed.
        </p>
      </header>

      <div className="mb-8">
        <EmergencyBanner />
      </div>

      <Suspense fallback={<WizardSkeleton />}>
        <BookingWizard
          services={services}
          providers={providers}
          org={{ timezone: org.timezone, settings: org.settings }}
          today={today}
        />
      </Suspense>

      <p className="mt-12 text-center text-fluid-xs text-ink-muted">{clinic.demoNotice}</p>
    </div>
  )
}

function WizardSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10">
      <div className="flex flex-col gap-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr))]">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
      <Skeleton className="hidden h-64 lg:block" />
    </div>
  )
}
