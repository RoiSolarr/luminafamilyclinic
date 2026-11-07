import type { Metadata } from 'next'
import { CalendarDays } from 'lucide-react'

import { clinic } from '@/config/clinic'
import { getOrganization, listAppointmentsForAdmin, listProviders } from '@/lib/repo'
import { formatLongDate, todayInZone } from '@/lib/time'
import { Badge } from '@/components/ui/primitives'
import { AdminFilters } from '@/components/admin/filters'
import { AppointmentList } from '@/components/admin/appointment-list'
import { AdminPage, AdminPageHeader } from '@/components/admin/page-shell'
import type { AppointmentStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Appointments',
  robots: { index: false, follow: false, nocache: true },
}

type SearchParams = {
  date?: string
  provider?: string
  status?: string
  past?: string
  q?: string
}

/**
 * The full booking list.
 *
 * Same filters and same rows as the dashboard preview, with nothing else on
 * the page competing for the space. This is where someone sits when they are
 * working through a day rather than glancing at it.
 */
export default async function AdminAppointmentsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const org = await getOrganization()
  const today = todayInZone(org.timezone)

  const filters = {
    date: searchParams.date || undefined,
    providerId: searchParams.provider || undefined,
    status: (searchParams.status as AppointmentStatus) || undefined,
    includePast: searchParams.past === '1',
    search: searchParams.q || undefined,
  }

  const hasFilters = Boolean(
    filters.date || filters.providerId || filters.status || filters.includePast || filters.search,
  )

  const [appointments, providers] = await Promise.all([
    listAppointmentsForAdmin(filters),
    listProviders(),
  ])

  return (
    <AdminPage>
      <AdminPageHeader
        title="Appointments"
        subtitle={`Approve or decline from here. ${formatLongDate(today, org.timezone)}, ${clinic.timezoneLabel}.`}
        actions={
          <Badge tone="neutral">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            {appointments.length} {appointments.length === 1 ? 'booking' : 'bookings'}
            {hasFilters ? ' matching' : ' upcoming'}
          </Badge>
        }
      />

      <section className="mt-8" aria-labelledby="filters-heading">
        <h2 id="filters-heading" className="sr-only">
          Filters
        </h2>
        <AdminFilters
          providers={providers.map((p) => ({ id: p.id, fullName: p.fullName }))}
          today={today}
          current={{
            date: searchParams.date ?? '',
            provider: searchParams.provider ?? '',
            status: searchParams.status ?? '',
            past: searchParams.past === '1',
            q: searchParams.q ?? '',
          }}
        />
      </section>

      <section className="mt-2" aria-label="Appointment list">
        <AppointmentList appointments={appointments} />
      </section>
    </AdminPage>
  )
}
