import type { Metadata } from 'next'
import { Suspense } from 'react'

import { getOrganization } from '@/lib/repo'
import { todayInZone } from '@/lib/time'
import { ManageClient } from '@/components/manage/manage-client'
import { Skeleton } from '@/components/ui/primitives'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Manage your booking',
  description: 'Reschedule or cancel an existing appointment using your private link.',
  // A manage link should never end up in a search index.
  robots: { index: false, follow: false, nocache: true },
}

export default async function ManagePage() {
  const org = await getOrganization()

  return (
    <div className="container py-10 lg:py-16">
      <header className="mx-auto mb-8 max-w-2xl">
        <h1 className="text-fluid-3xl font-semibold">Manage your booking</h1>
        <p className="mt-3 text-fluid-base text-ink-soft">
          Change the time or cancel. Nothing here needs a password: the link in your confirmation
          email is what proves the booking is yours.
        </p>
      </header>

      <Suspense
        fallback={
          <div className="mx-auto w-full max-w-2xl">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-6 h-64 w-full" />
          </div>
        }
      >
        <ManageClient settings={org.settings} today={todayInZone(org.timezone)} />
      </Suspense>
    </div>
  )
}
