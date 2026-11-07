import type { Metadata } from 'next'
import { BellRing, CheckCircle2, Mail, MinusCircle, Plug, ShieldCheck } from 'lucide-react'

import { getOrganization, listDueReminders } from '@/lib/repo'
import { zapierStatus, type ZapierHook } from '@/lib/zapier'
import { emailConfigured } from '@/lib/email'
import { formatClockTime } from '@/lib/time'
import { Badge, Card, EmptyState } from '@/components/ui/primitives'
import { AdminPage, AdminPageHeader } from '@/components/admin/page-shell'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Automation',
  robots: { index: false, follow: false, nocache: true },
}

const HOOK_COPY: Record<ZapierHook, { title: string; body: string }> = {
  booking: {
    title: 'New booking',
    body: 'Fires the moment a booking is saved. Zapier triages the reason for visit, writes the urgency back, and alerts staff when it raises a red flag.',
  },
  cancel: {
    title: 'Cancellation',
    body: 'Fires when a patient cancels through their manage link, so the slot can be offered again and the calendar entry removed.',
  },
  reschedule: {
    title: 'Reschedule',
    body: 'Fires when a patient moves an appointment, carrying both the old and the new time.',
  },
  contact: {
    title: 'Contact message',
    body: 'Fires on every contact form submission. Zapier classifies the topic and drafts a reply for a human to approve.',
  },
}

/**
 * What is wired up, and what is queued.
 *
 * A webhook that quietly is not configured looks identical to one that is
 * working, right up until a patient does not get their email. This page makes
 * the difference visible without putting any secret on screen: every value
 * here is a boolean derived from an environment variable, never its contents.
 */
export default async function AdminAutomationPage() {
  const org = await getOrganization()

  const hooks = zapierStatus()
  const hookEntries = Object.entries(hooks) as [ZapierHook, boolean][]
  const configured = hookEntries.filter(([, on]) => on).length

  const emailOn = emailConfigured()
  const callbackSecretOn = Boolean(process.env.ZAPIER_CALLBACK_SECRET)

  // What the next cron run would send, right now.
  const due = await listDueReminders()
  const reminders24h = due.filter((r) => r.type === '24h_reminder')
  const postVisit = due.filter((r) => r.type === 'post_visit')

  return (
    <AdminPage>
      <AdminPageHeader
        title="Automation"
        subtitle="Zapier hooks, email delivery and the reminder queue."
        actions={
          <Badge tone={configured === 4 ? 'ok' : 'warn'}>
            <Plug className="h-3.5 w-3.5" aria-hidden="true" />
            {configured} of 4 hooks set
          </Badge>
        }
      />

      {/* ------------------------------------------------------ services */}
      <section className="mt-8" aria-labelledby="services-heading">
        <h2 id="services-heading" className="font-display text-fluid-2xl">
          Connections
        </h2>
        <div className="mt-5 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr))]">
          <StatusCard
            icon={<Mail className="h-5 w-5" aria-hidden="true" />}
            title="Patient email"
            on={emailOn}
            onLabel="Brevo is sending confirmations, reminders and feedback requests."
            offLabel="Not configured. Bookings still save, but no patient email goes out."
          />
          <StatusCard
            icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
            title="Callback secret"
            on={callbackSecretOn}
            onLabel="Zapier can write triage results back to the database."
            offLabel="Not set. Write backs from Zapier will be rejected."
          />
        </div>
      </section>

      {/* --------------------------------------------------------- hooks */}
      <section className="mt-10" aria-labelledby="hooks-heading">
        <h2 id="hooks-heading" className="font-display text-fluid-2xl">
          Webhooks
        </h2>
        <p className="mt-1 text-fluid-xs text-ink-muted">
          A hook that is not set is skipped silently. Nothing here fails a booking.
        </p>

        <ul className="mt-5 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr))]">
          {hookEntries.map(([hook, on]) => (
            <li key={hook}>
              <Card className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-fluid-lg">{HOOK_COPY[hook].title}</h3>
                  <Badge tone={on ? 'ok' : 'warn'}>
                    {on ? (
                      <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                    ) : (
                      <MinusCircle className="h-3 w-3" aria-hidden="true" />
                    )}
                    {on ? 'Connected' : 'Not set'}
                  </Badge>
                </div>
                <p className="mt-3 flex-1 text-fluid-sm leading-relaxed text-ink-soft">
                  {HOOK_COPY[hook].body}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      {/* ----------------------------------------------------- reminders */}
      <section className="mt-10" aria-labelledby="reminders-heading">
        <h2 id="reminders-heading" className="font-display text-fluid-2xl">
          Reminder queue
        </h2>
        <p className="mt-1 text-fluid-xs text-ink-muted">
          Due now, so these go out on the next scheduled run. {reminders24h.length} day before,{' '}
          {postVisit.length} post visit.
        </p>

        {due.length === 0 ? (
          <EmptyState
            className="mt-5"
            icon={<BellRing className="h-8 w-8" aria-hidden="true" />}
            title="Nothing due"
            body="Reminders appear here once an appointment is close enough, or once a visit has finished."
          />
        ) : (
          <div className="mt-5 overflow-x-auto rounded-2xl border border-line">
            <table className="w-full border-collapse text-left text-fluid-sm">
              <thead className="bg-surface-2">
                <tr>
                  <Th>Type</Th>
                  <Th>Patient</Th>
                  <Th>Appointment</Th>
                  <Th>Reference</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface">
                {due.map((r) => (
                  <tr key={r.reminderId}>
                    <Td>
                      <Badge tone={r.type === '24h_reminder' ? 'primary' : 'neutral'}>
                        {r.type === '24h_reminder' ? 'Day before' : 'Post visit'}
                      </Badge>
                    </Td>
                    <Td>
                      <span className="block text-ink">{r.patientFirstName}</span>
                      <span className="block text-fluid-xs text-ink-muted">{r.patientEmail}</span>
                    </Td>
                    <Td>
                      {r.localDate} at {formatClockTime(r.localTime)}
                      <span className="block text-fluid-xs text-ink-muted">
                        {r.serviceName} with {r.providerName}
                      </span>
                    </Td>
                    <Td>{r.bookingRef}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="mt-10 border-t border-line pt-6 text-fluid-xs text-ink-muted">
        Times shown in {org.timezone}. No webhook URL, API key or secret is ever sent to this page,
        only whether one is present.
      </p>
    </AdminPage>
  )
}

function StatusCard({
  icon,
  title,
  on,
  onLabel,
  offLabel,
}: {
  icon: React.ReactNode
  title: string
  on: boolean
  onLabel: string
  offLabel: string
}) {
  return (
    <Card className={on ? undefined : 'border-warn/40'}>
      <div className="flex items-start justify-between gap-3">
        <span
          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${
            on ? 'bg-primary-soft text-primary-strong' : 'bg-warn/10 text-warn'
          }`}
        >
          {icon}
        </span>
        <Badge tone={on ? 'ok' : 'warn'}>{on ? 'Connected' : 'Not set'}</Badge>
      </div>
      <h3 className="mt-3 font-display text-fluid-lg">{title}</h3>
      <p className="mt-1 text-fluid-sm leading-relaxed text-ink-soft">{on ? onLabel : offLabel}</p>
    </Card>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="whitespace-nowrap px-4 py-3 text-fluid-xs font-medium uppercase tracking-wide text-ink-muted"
    >
      {children}
    </th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-4 align-top text-ink-soft">{children}</td>
}
