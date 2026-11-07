import type { Metadata } from 'next'
import { CheckCircle2, History, UserX, XCircle } from 'lucide-react'

import { getOrganization, listAppointmentsForAdmin, listProviders } from '@/lib/repo'
import { todayInZone } from '@/lib/time'
import { AdminFilters } from '@/components/admin/filters'
import { AppointmentList } from '@/components/admin/appointment-list'
import { AdminPage, AdminPageHeader, StatCard } from '@/components/admin/page-shell'
import type { AppointmentRecord, AppointmentStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Booking History',
  robots: { index: false, follow: false, nocache: true },
}

type SearchParams = {
  date?: string
  provider?: string
  status?: string
  q?: string
}

/** Statuses that close a booking, whatever date it was for. */
const CLOSED: AppointmentStatus[] = ['cancelled', 'completed', 'no_show']

/**
 * A booking belongs in the history once it can no longer be acted on: either
 * the day has passed, or someone has closed it. A cancellation for next month
 * is history even though its date is in the future, which is exactly the row
 * someone comes here looking for.
 */
function isHistoric(a: AppointmentRecord, today: string) {
  return a.localDate < today || CLOSED.includes(a.status)
}

export default async function AdminHistoryPage({ searchParams }: { searchParams: SearchParams }) {
  const org = await getOrganization()
  const today = todayInZone(org.timezone)

  const [all, providers] = await Promise.all([
    listAppointmentsForAdmin(
      {
        date: searchParams.date || undefined,
        providerId: searchParams.provider || undefined,
        status: (searchParams.status as AppointmentStatus) || undefined,
        // Always. Without it the query would exclude the very rows this page
        // exists to show.
        includePast: true,
        search: searchParams.q || undefined,
      },
      500,
    ),
    listProviders(),
  ])

  // Newest first: the thing you are looking up is usually the thing that
  // happened most recently.
  const history = all
    .filter((a) => isHistoric(a, today))
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))

  const completed = history.filter((a) => a.status === 'completed').length
  const cancelled = history.filter((a) => a.status === 'cancelled').length
  const missed = history.filter((a) => a.status === 'no_show').length

  const hasFilters = Boolean(
    searchParams.date || searchParams.provider || searchParams.status || searchParams.q,
  )

  return (
    <AdminPage>
      <AdminPageHeader
        title="Booking History"
        subtitle="Everything that has already happened, been cancelled or been declined."
      />

      <section className="mt-8" aria-labelledby="history-filters-heading">
        <h2 id="history-filters-heading" className="sr-only">
          Filters
        </h2>
        <AdminFilters
          providers={providers.map((p) => ({ id: p.id, fullName: p.fullName }))}
          today={today}
          showPastToggle={false}
          searchPlaceholder="Search past bookings by reference, patient, email, phone"
          dateHint={`Pick a day to narrow the history. Today is ${today}.`}
          current={{
            date: searchParams.date ?? '',
            provider: searchParams.provider ?? '',
            status: searchParams.status ?? '',
            past: true,
            q: searchParams.q ?? '',
          }}
        />
      </section>

      <div className="mt-6 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,13rem),1fr))]">
        <StatCard
          icon={<History className="h-5 w-5" aria-hidden="true" />}
          label="Records listed"
          value={String(history.length)}
          hint={hasFilters ? 'matching your filters' : 'in the history'}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
          label="Completed"
          value={String(completed)}
          hint="the visit went ahead"
        />
        <StatCard
          icon={<XCircle className="h-5 w-5" aria-hidden="true" />}
          label="Cancelled"
          value={String(cancelled)}
          hint="by the patient or the clinic"
        />
        <StatCard
          icon={<UserX className="h-5 w-5" aria-hidden="true" />}
          label="Missed"
          value={String(missed)}
          hint="nobody turned up"
          tone={missed > 0 ? 'danger' : 'neutral'}
        />
      </div>

      {/* No approve or decline here. Every row is closed, and a pair of
          disabled buttons on each one would only be in the way. */}
      <section className="mt-8" aria-label="Past bookings">
        <AppointmentList
          appointments={history}
          actions={false}
          emptyTitle="Nothing in the history yet"
          emptyBody="Bookings move here once the date has passed, or once they are cancelled or completed."
        />
      </section>
    </AdminPage>
  )
}
