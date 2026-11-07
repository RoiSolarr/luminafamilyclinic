import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle, Mail, Phone, Users } from 'lucide-react'

import { getOrganization, listAppointmentsForAdmin } from '@/lib/repo'
import { formatClockTime, todayInZone } from '@/lib/time'
import { Badge, Card, EmptyState } from '@/components/ui/primitives'
import { AdminPage, AdminPageHeader } from '@/components/admin/page-shell'
import type { AppointmentRecord } from '@/lib/types'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Patients',
  robots: { index: false, follow: false, nocache: true },
}

type PatientSummary = {
  key: string
  name: string
  email: string
  phone: string
  visits: number
  upcoming: number
  flagged: number
  lastSeen: AppointmentRecord | null
  nextVisit: AppointmentRecord | null
}

/**
 * Patients, derived rather than stored separately.
 *
 * The booking flow keys a patient on their email address, so the same key is
 * used here. Grouping on name instead would merge two different people who
 * happen to share one, which in a clinic is not a hypothetical.
 */
function summarize(appointments: AppointmentRecord[], todayStr: string): PatientSummary[] {
  const byKey = new Map<string, PatientSummary>()

  for (const a of appointments) {
    const key = a.patientEmail.trim().toLowerCase() || a.patientPhone.replace(/\D/g, '')
    if (!key) continue

    const existing = byKey.get(key)
    const upcoming = a.localDate >= todayStr && a.status !== 'cancelled'

    if (!existing) {
      byKey.set(key, {
        key,
        name: a.patientName,
        email: a.patientEmail,
        phone: a.patientPhone,
        visits: 1,
        upcoming: upcoming ? 1 : 0,
        flagged: a.aiRedFlag ? 1 : 0,
        lastSeen: upcoming ? null : a,
        nextVisit: upcoming ? a : null,
      })
      continue
    }

    existing.visits += 1
    if (upcoming) {
      existing.upcoming += 1
      // Rows arrive sorted by time, so the earliest upcoming one wins.
      if (!existing.nextVisit || a.startsAt < existing.nextVisit.startsAt) existing.nextVisit = a
    } else if (!existing.lastSeen || a.startsAt > existing.lastSeen.startsAt) {
      existing.lastSeen = a
    }
    if (a.aiRedFlag) existing.flagged += 1
    // Keep the most recently supplied contact details.
    if (a.patientPhone) existing.phone = a.patientPhone
  }

  return [...byKey.values()].sort((a, b) => {
    // Anyone with something booked comes first, then by visit count.
    if (a.upcoming !== b.upcoming) return b.upcoming - a.upcoming
    if (a.visits !== b.visits) return b.visits - a.visits
    return a.name.localeCompare(b.name)
  })
}

export default async function AdminPatientsPage() {
  const org = await getOrganization()
  const today = todayInZone(org.timezone)

  // Past included: a patient who last came in March is still a patient.
  const appointments = await listAppointmentsForAdmin({ includePast: true }, 500)
  const patients = summarize(appointments, today)

  const returning = patients.filter((p) => p.visits > 1).length

  return (
    <AdminPage>
      <AdminPageHeader
        title="Patients"
        subtitle="Built from the booking records. Everyone who has booked at least once."
        actions={
          <>
            <Badge tone="neutral">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {patients.length} total
            </Badge>
            <Badge tone="ok">{returning} with repeat bookings</Badge>
          </>
        }
      />

      {patients.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<Users className="h-8 w-8" aria-hidden="true" />}
          title="No patients yet"
          body="Anyone who completes a booking appears here, with their visit history."
        />
      ) : (
        <ul className="mt-8 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr))]">
          {patients.map((p) => (
            <li key={p.key}>
              <Card className="flex h-full flex-col">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-display text-fluid-lg leading-tight">{p.name}</p>
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    {/* "Bookings", not "visits": these are rows in the
                        appointment table, and an upcoming one has not
                        happened yet. */}
                    <Badge tone={p.visits > 1 ? 'ok' : 'neutral'}>
                      {p.visits} {p.visits === 1 ? 'booking' : 'bookings'}
                    </Badge>
                    {p.flagged > 0 && (
                      <Badge tone="danger">
                        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                        {p.flagged} flagged
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-1.5 text-fluid-sm text-ink-soft">
                  <span className="flex min-w-0 items-center gap-2">
                    <Mail className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                    <span className="truncate">{p.email}</span>
                  </span>
                  {p.phone && (
                    <span className="flex items-center gap-2">
                      <Phone className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                      {p.phone}
                    </span>
                  )}
                </div>

                <dl className="mt-4 flex-1 border-t border-line pt-4 text-fluid-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-fluid-xs uppercase tracking-wide text-ink-muted">Next</dt>
                    <dd className="text-right text-ink">
                      {p.nextVisit
                        ? `${p.nextVisit.localDate} at ${formatClockTime(p.nextVisit.localTime)}`
                        : 'Nothing booked'}
                    </dd>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between gap-3">
                    <dt className="text-fluid-xs uppercase tracking-wide text-ink-muted">
                      Last visit
                    </dt>
                    <dd className="text-right text-ink">
                      {p.lastSeen ? p.lastSeen.localDate : 'Not been in yet'}
                    </dd>
                  </div>
                </dl>

                {/* Hands off to the one search that already does this well,
                    rather than rebuilding a filtered list here. */}
                <Link
                  href={`/admin/appointments?q=${encodeURIComponent(p.email)}&past=1`}
                  className="link-underline mt-4 text-fluid-sm text-primary"
                >
                  View their appointments
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </AdminPage>
  )
}
