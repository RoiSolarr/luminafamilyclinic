import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, CalendarDays, Inbox, Plug } from 'lucide-react'

import { clinic } from '@/config/clinic'
import { MOCK_MODE } from '@/db'
import {
  getOrganization,
  listAppointmentsForAdmin,
  listContactMessages,
  listProviders,
} from '@/lib/repo'
import { zapierStatus } from '@/lib/zapier'
import { formatLongDate, todayInZone } from '@/lib/time'
import { Badge } from '@/components/ui/primitives'
import { AdminFilters } from '@/components/admin/filters'
import { AppointmentList } from '@/components/admin/appointment-list'
import { MessageList } from '@/components/admin/message-list'
import { AdminPage, AdminPageHeader, StatCard } from '@/components/admin/page-shell'
import type { AppointmentStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Staff dashboard',
  robots: { index: false, follow: false, nocache: true },
}

/** How much of each list the dashboard previews before handing off. */
const PREVIEW_APPOINTMENTS = 5
const PREVIEW_MESSAGES = 3

type SearchParams = {
  date?: string
  provider?: string
  status?: string
  past?: string
  /** Free text search across reference, patient name, email and phone. */
  q?: string
}

export default async function AdminPage_({ searchParams }: { searchParams: SearchParams }) {
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

  const [appointments, providers, messages] = await Promise.all([
    listAppointmentsForAdmin(filters),
    listProviders(),
    listContactMessages(25),
  ])

  const hooks = zapierStatus()
  const hooksConfigured = Object.values(hooks).filter(Boolean).length
  const flagged = appointments.filter(
    (a) => a.aiRedFlag || a.aiUrgency === 'urgent' || a.aiUrgency === 'emergency',
  )
  const newMessages = messages.filter((m) => m.status === 'new').length

  // The filters already carry into the appointments page, so "see all" lands
  // on the same selection rather than resetting it.
  const query = new URLSearchParams(
    Object.entries(searchParams).filter(([, v]) => Boolean(v)) as [string, string][],
  ).toString()
  const appointmentsHref = query ? `/admin/appointments?${query}` : '/admin/appointments'

  return (
    <AdminPage>
      <AdminPageHeader
        title="Staff dashboard"
        subtitle={`${formatLongDate(today, org.timezone)}, ${clinic.timezoneLabel}.`}
        actions={
          <>
            {MOCK_MODE && <Badge tone="warn">Mock mode: data resets on restart</Badge>}
            <Badge tone={hooksConfigured === 4 ? 'ok' : 'warn'}>
              <Plug className="h-3.5 w-3.5" aria-hidden="true" />
              {hooksConfigured} of 4 Zapier hooks set
            </Badge>
          </>
        }
      />

      {/* Filters come before the counts, because the counts describe whatever
          the filters have selected. Showing them the other way round invites
          someone to read "11 appointments" as a total. */}
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

      {/* ------------------------------------------------------- summary */}
      <div className="mt-6 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,13rem),1fr))]">
        <StatCard
          icon={<CalendarDays className="h-5 w-5" aria-hidden="true" />}
          label="Appointments listed"
          value={String(appointments.length)}
          hint={hasFilters ? 'matching your filters' : 'upcoming'}
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
          label="Needing attention"
          value={String(flagged.length)}
          hint="urgent, emergency or flagged"
          tone={flagged.length > 0 ? 'danger' : 'neutral'}
        />
        <StatCard
          icon={<Inbox className="h-5 w-5" aria-hidden="true" />}
          label="Unread messages"
          value={String(newMessages)}
          hint={`${messages.length} in total`}
        />
      </div>

      {/* ---------------------------------------------- needing attention */}
      {flagged.length > 0 && (
        <section className="mt-10" aria-labelledby="flagged-heading">
          <SectionHeading
            id="flagged-heading"
            title="Needing attention"
            note="Triage marked these urgent, an emergency, or raised a red flag."
          />
          <AppointmentList appointments={flagged} />
        </section>
      )}

      {/* ----------------------------------------------------- next up */}
      <section className="mt-10" aria-labelledby="next-heading">
        <SectionHeading
          id="next-heading"
          title="Next up"
          note={
            appointments.length > PREVIEW_APPOINTMENTS
              ? `The ${PREVIEW_APPOINTMENTS} soonest of ${appointments.length}.`
              : undefined
          }
          href={appointmentsHref}
          linkLabel="All appointments"
        />
        <AppointmentList
          appointments={appointments.slice(0, PREVIEW_APPOINTMENTS)}
          emptyTitle="Nothing matches those filters"
          emptyBody="Try clearing the date, or include past appointments."
        />
      </section>

      {/* ----------------------------------------------------- messages */}
      <section className="mt-10" aria-labelledby="messages-heading">
        <SectionHeading
          id="messages-heading"
          title="Latest messages"
          note={
            messages.length > PREVIEW_MESSAGES
              ? `The ${PREVIEW_MESSAGES} newest of ${messages.length}.`
              : undefined
          }
          href="/admin/messages"
          linkLabel="All messages"
        />
        <MessageList messages={messages.slice(0, PREVIEW_MESSAGES)} timezone={org.timezone} />
      </section>

      <p className="mt-12 border-t border-line pt-6 text-fluid-xs text-ink-muted">
        Approving or declining a booking writes to the database. Everything else on this dashboard
        only reads from it.
      </p>
    </AdminPage>
  )
}

function SectionHeading({
  id,
  title,
  note,
  href,
  linkLabel,
}: {
  id: string
  title: string
  note?: string
  href?: string
  linkLabel?: string
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
      <div>
        <h2 id={id} className="font-display text-fluid-2xl">
          {title}
        </h2>
        {note && <p className="mt-1 text-fluid-xs text-ink-muted">{note}</p>}
      </div>

      {href && linkLabel && (
        <Link
          href={href}
          className="link-underline inline-flex items-center gap-1.5 text-fluid-sm text-primary"
        >
          {linkLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  )
}
