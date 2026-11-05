import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle, CalendarDays, Inbox, MessageSquareWarning, Plug } from 'lucide-react'

import { clinic } from '@/config/clinic'
import { MOCK_MODE } from '@/db'
import {
  getOrganization,
  listAppointmentsForAdmin,
  listContactMessages,
  listProviders,
} from '@/lib/repo'
import { zapierStatus } from '@/lib/zapier'
import { formatClockTime, formatLongDate, todayInZone } from '@/lib/time'
import { STATUS_LABEL, URGENCY_LABEL } from '@/lib/utils'
import { Badge, Card, EmptyState, type BadgeTone } from '@/components/ui/primitives'
import { AdminFilters } from '@/components/admin/filters'
import type { AppointmentStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Staff dashboard',
  robots: { index: false, follow: false, nocache: true },
}

const STATUS_TONE: Record<string, BadgeTone> = {
  pending: 'primary',
  confirmed: 'ok',
  cancelled: 'danger',
  rescheduled: 'warn',
  completed: 'neutral',
  no_show: 'warn',
}

const URGENCY_TONE: Record<string, BadgeTone> = {
  routine: 'neutral',
  soon: 'primary',
  urgent: 'warn',
  emergency: 'danger',
}

type SearchParams = {
  date?: string
  provider?: string
  status?: string
  past?: string
  /** Free text search across reference, patient name, email and phone. */
  q?: string
}

export default async function AdminPage({
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

  return (
    <div className="container py-8 lg:py-12">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-fluid-3xl font-semibold">Staff dashboard</h1>
          <p className="mt-2 text-fluid-sm text-ink-soft">
            Read only. {formatLongDate(today, org.timezone)}, {clinic.timezoneLabel}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {MOCK_MODE && <Badge tone="warn">Mock mode: data resets on restart</Badge>}
          <Badge tone={hooksConfigured === 4 ? 'ok' : 'warn'}>
            <Plug className="h-3.5 w-3.5" aria-hidden="true" />
            {hooksConfigured} of 4 Zapier hooks set
          </Badge>
        </div>
      </header>

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

      {/* -------------------------------------------------- appointments */}
      <section className="mt-8" aria-labelledby="appointments-heading">
        <h2 id="appointments-heading" className="font-display text-fluid-2xl">
          Appointments
        </h2>

        {appointments.length === 0 ? (
          <EmptyState
            className="mt-5"
            title="Nothing matches those filters"
            body="Try clearing the date, or include past appointments."
          />
        ) : (
          <>
            {/* Table from `lg` up. */}
            <div className="mt-5 hidden overflow-hidden rounded-2xl border border-line lg:block">
              <table className="w-full border-collapse text-left text-fluid-sm">
                <thead className="bg-surface-2">
                  <tr>
                    <Th>When</Th>
                    <Th>Patient</Th>
                    <Th>Service</Th>
                    <Th>Doctor</Th>
                    <Th>Status</Th>
                    <Th>Triage</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line bg-surface">
                  {appointments.map((a) => (
                    <tr key={a.id} className={a.aiRedFlag ? 'bg-danger/5' : undefined}>
                      <Td>
                        <span className="block font-medium text-ink">{a.localDate}</span>
                        <span className="block tabular-nums text-ink-muted">
                          {formatClockTime(a.localTime)}
                        </span>
                      </Td>
                      <Td>
                        <span className="block text-ink">{a.patientName}</span>
                        <span className="block text-fluid-xs text-ink-muted">{a.bookingRef}</span>
                      </Td>
                      <Td>{a.serviceName}</Td>
                      <Td>{a.providerName}</Td>
                      <Td>
                        <Badge tone={STATUS_TONE[a.status] ?? 'neutral'}>
                          {STATUS_LABEL[a.status] ?? a.status}
                        </Badge>
                      </Td>
                      <Td>
                        <div className="flex flex-col items-start gap-1.5">
                          {a.aiUrgency ? (
                            <Badge tone={URGENCY_TONE[a.aiUrgency] ?? 'neutral'}>
                              {URGENCY_LABEL[a.aiUrgency] ?? a.aiUrgency}
                            </Badge>
                          ) : (
                            <span className="text-fluid-xs text-ink-muted">Not triaged</span>
                          )}
                          {a.aiRedFlag && (
                            <Badge tone="danger">
                              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                              Call the patient
                            </Badge>
                          )}
                          {a.aiSummary && (
                            <span className="max-w-xs text-fluid-xs leading-relaxed text-ink-soft">
                              {a.aiSummary}
                            </span>
                          )}
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Stacked cards below `lg`, so nothing scrolls sideways. */}
            <ul className="mt-5 flex flex-col gap-3 lg:hidden">
              {appointments.map((a) => (
                <li key={a.id}>
                  <Card className={a.aiRedFlag ? 'border-danger/40 bg-danger/5' : undefined}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-display text-fluid-lg">{a.patientName}</p>
                        <p className="text-fluid-xs text-ink-muted">{a.bookingRef}</p>
                      </div>
                      <Badge tone={STATUS_TONE[a.status] ?? 'neutral'}>
                        {STATUS_LABEL[a.status] ?? a.status}
                      </Badge>
                    </div>

                    <dl className="mt-4 flex flex-col gap-2 text-fluid-sm">
                      <RowItem label="When">
                        {a.localDate} at {formatClockTime(a.localTime)}
                      </RowItem>
                      <RowItem label="Service">{a.serviceName}</RowItem>
                      <RowItem label="Doctor">{a.providerName}</RowItem>
                    </dl>

                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                      {a.aiUrgency ? (
                        <Badge tone={URGENCY_TONE[a.aiUrgency] ?? 'neutral'}>
                          {URGENCY_LABEL[a.aiUrgency] ?? a.aiUrgency}
                        </Badge>
                      ) : (
                        <span className="text-fluid-xs text-ink-muted">Not triaged yet</span>
                      )}
                      {a.aiRedFlag && (
                        <Badge tone="danger">
                          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                          Call the patient
                        </Badge>
                      )}
                    </div>

                    {a.aiSummary && (
                      <p className="mt-3 text-fluid-sm leading-relaxed text-ink-soft">
                        {a.aiSummary}
                      </p>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* ----------------------------------------------------- messages */}
      <section className="mt-12" aria-labelledby="messages-heading">
        <h2 id="messages-heading" className="font-display text-fluid-2xl">
          Contact messages
        </h2>

        {messages.length === 0 ? (
          <EmptyState
            className="mt-5"
            icon={<MessageSquareWarning className="h-8 w-8" aria-hidden="true" />}
            title="No messages"
            body="Anything sent through the contact form or the FAQ page appears here."
          />
        ) : (
          <ul className="mt-5 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr))]">
            {messages.map((m) => (
              <li key={m.id}>
                <Card className="flex h-full flex-col">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{m.name}</p>
                      <p className="truncate text-fluid-xs text-ink-muted">{m.email}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      <Badge tone="neutral">{m.topic}</Badge>
                      <Badge tone={m.status === 'new' ? 'primary' : m.status === 'replied' ? 'ok' : 'warn'}>
                        {m.status === 'in_review' ? 'in review' : m.status}
                      </Badge>
                    </div>
                  </div>

                  <p className="mt-3 flex-1 text-fluid-sm leading-relaxed text-ink-soft">
                    {m.message}
                  </p>

                  {m.aiDraftReply && (
                    <div className="mt-4 rounded-xl border border-primary/25 bg-primary-soft p-3">
                      <p className="text-fluid-xs font-medium uppercase tracking-wide text-primary-strong">
                        Suggested reply, for review
                      </p>
                      <p className="mt-1.5 text-fluid-sm leading-relaxed text-ink-soft">
                        {m.aiDraftReply}
                      </p>
                    </div>
                  )}

                  <p className="mt-4 text-fluid-xs text-ink-muted">
                    {new Date(m.createdAt).toLocaleString('en-PH', { timeZone: org.timezone })}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="mt-12 border-t border-line pt-6">
        <p className="text-fluid-xs text-ink-muted">
          This dashboard reads from the database and changes nothing. {clinic.demoNotice}{' '}
          <Link href="/" className="link-underline text-primary">
            Back to the public site
          </Link>
        </p>
      </footer>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint: string
  tone?: 'neutral' | 'danger'
}) {
  return (
    <Card className={tone === 'danger' ? 'border-danger/35' : undefined}>
      <span
        className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${
          tone === 'danger' ? 'bg-danger/10 text-danger' : 'bg-primary-soft text-primary-strong'
        }`}
      >
        {icon}
      </span>
      <p className="mt-3 font-display text-fluid-3xl font-semibold leading-none">{value}</p>
      <p className="mt-2 text-fluid-sm text-ink">{label}</p>
      <p className="text-fluid-xs text-ink-muted">{hint}</p>
    </Card>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th scope="col" className="px-4 py-3 text-fluid-xs font-medium uppercase tracking-wide text-ink-muted">
      {children}
    </th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-4 align-top text-ink-soft">{children}</td>
}

function RowItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-fluid-xs uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="text-right text-ink">{children}</dd>
    </div>
  )
}
