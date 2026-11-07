import { AlertTriangle } from 'lucide-react'

import { formatClockTime } from '@/lib/time'
import { STATUS_LABEL, URGENCY_LABEL } from '@/lib/utils'
import { Badge, Card, EmptyState, type BadgeTone } from '@/components/ui/primitives'
import { AppointmentActions } from '@/components/admin/appointment-actions'
import type { AppointmentRecord } from '@/lib/types'

/**
 * The appointment list, in both of its shapes.
 *
 * Lifted out of the dashboard page so the dedicated Appointments page shows
 * exactly the same rows. Two copies of a table this detailed would drift
 * apart the first time a column changed.
 */

export const STATUS_TONE: Record<string, BadgeTone> = {
  pending: 'primary',
  confirmed: 'ok',
  cancelled: 'danger',
  rescheduled: 'warn',
  completed: 'neutral',
  no_show: 'warn',
}

export const URGENCY_TONE: Record<string, BadgeTone> = {
  routine: 'neutral',
  soon: 'primary',
  urgent: 'warn',
  emergency: 'danger',
}

export function AppointmentList({
  appointments,
  emptyTitle = 'Nothing matches those filters',
  emptyBody = 'Try clearing the date, or include past appointments.',
  actions = true,
}: {
  appointments: AppointmentRecord[]
  emptyTitle?: string
  emptyBody?: string
  /** Off on the history page, where every row is already closed. */
  actions?: boolean
}) {
  if (appointments.length === 0) {
    return <EmptyState className="mt-5" title={emptyTitle} body={emptyBody} />
  }

  return (
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
              {actions && <Th>Decision</Th>}
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
                {actions && (
                  <Td>
                    <AppointmentActions
                      bookingRef={a.bookingRef}
                      patientName={a.patientName}
                      status={a.status}
                      when={`${a.localDate} at ${formatClockTime(a.localTime)}`}
                    />
                  </Td>
                )}
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
                <p className="mt-3 text-fluid-sm leading-relaxed text-ink-soft">{a.aiSummary}</p>
              )}

              {actions && (
                <div className="mt-4 border-t border-line pt-4 empty:mt-0 empty:border-0 empty:pt-0">
                  <AppointmentActions
                    bookingRef={a.bookingRef}
                    patientName={a.patientName}
                    status={a.status}
                    when={`${a.localDate} at ${formatClockTime(a.localTime)}`}
                  />
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="px-4 py-3 text-fluid-xs font-medium uppercase tracking-wide text-ink-muted"
    >
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
