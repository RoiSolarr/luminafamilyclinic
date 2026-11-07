import type { Metadata } from 'next'
import { Clock, Mail, MapPin, Phone } from 'lucide-react'

import { clinic } from '@/config/clinic'
import { getOrganization } from '@/lib/repo'
import { formatLongDate } from '@/lib/time'
import { Badge, Card } from '@/components/ui/primitives'
import { AdminPage, AdminPageHeader } from '@/components/admin/page-shell'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Contact',
  robots: { index: false, follow: false, nocache: true },
}

const DAY_LABEL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/**
 * The clinic's own details, as patients see them.
 *
 * Reception reads these out several times a day, and the alternative is
 * opening the public site in another tab to check the address. The booking
 * rules are here too, because "why can't I book tomorrow at 7am" is the same
 * conversation.
 */
export default async function AdminContactPage() {
  const org = await getOrganization()
  const { contact, hours } = clinic
  const { settings } = org

  const closedDays = settings.closedWeekdays.map((d) => DAY_LABEL[d] ?? String(d))
  const holidays = [...settings.holidays].sort()

  return (
    <AdminPage>
      <AdminPageHeader
        title="Contact"
        subtitle="What patients see, and the rules the booking form enforces."
      />

      <div className="mt-8 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr))]">
        <Card>
          <CardTitle icon={<Phone className="h-5 w-5" aria-hidden="true" />} title="Reach us" />
          <dl className="mt-4 flex flex-col gap-3 text-fluid-sm">
            <Row label="Phone">
              <a href={`tel:${contact.phoneHref}`} className="link-underline text-primary">
                {contact.phone}
              </a>
            </Row>
            <Row label="Email">
              <a href={`mailto:${contact.email}`} className="link-underline break-all text-primary">
                {contact.email}
              </a>
            </Row>
          </dl>
        </Card>

        <Card>
          <CardTitle icon={<MapPin className="h-5 w-5" aria-hidden="true" />} title="Address" />
          <address className="mt-4 not-italic text-fluid-sm leading-relaxed text-ink-soft">
            {contact.addressLine1}
            <br />
            {contact.addressLine2}
            <br />
            {contact.city}, {contact.region} {contact.postalCode}
            <br />
            {contact.country}
          </address>
        </Card>

        <Card>
          <CardTitle icon={<Clock className="h-5 w-5" aria-hidden="true" />} title="Opening hours" />
          <dl className="mt-4 flex flex-col gap-3 text-fluid-sm">
            {hours.map((h) => (
              <Row key={h.label} label={h.label}>
                {h.value}
              </Row>
            ))}
          </dl>
          <p className="mt-4 border-t border-line pt-3 text-fluid-xs text-ink-muted">
            Bookable hours come from each doctor's roster, not from this list.
          </p>
        </Card>
      </div>

      <section className="mt-10" aria-labelledby="rules-heading">
        <h2 id="rules-heading" className="font-display text-fluid-2xl">
          Booking rules
        </h2>
        <p className="mt-1 text-fluid-xs text-ink-muted">
          Live values from the clinic record. The booking form enforces every one of them.
        </p>

        <div className="mt-5 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,15rem),1fr))]">
          <Card>
            <p className="font-display text-fluid-2xl font-semibold leading-none">
              {settings.slotMinutes} min
            </p>
            <p className="mt-2 text-fluid-sm text-ink">Slot length</p>
            <p className="text-fluid-xs text-ink-muted">Longer services take several slots</p>
          </Card>
          <Card>
            <p className="font-display text-fluid-2xl font-semibold leading-none">
              {settings.bookingWindowDays} days
            </p>
            <p className="mt-2 text-fluid-sm text-ink">Booking window</p>
            <p className="text-fluid-xs text-ink-muted">How far ahead patients can book</p>
          </Card>
          <Card>
            <p className="font-display text-fluid-2xl font-semibold leading-none">
              {settings.minNoticeHours} hrs
            </p>
            <p className="mt-2 text-fluid-sm text-ink">Minimum notice</p>
            <p className="text-fluid-xs text-ink-muted">Anything sooner is refused</p>
          </Card>
          <Card>
            <p className="font-display text-fluid-2xl font-semibold leading-none">
              {org.timezone.split('/')[1]?.replace('_', ' ') ?? org.timezone}
            </p>
            <p className="mt-2 text-fluid-sm text-ink">Timezone</p>
            <p className="text-fluid-xs text-ink-muted">{clinic.timezoneLabel}</p>
          </Card>
        </div>

        <div className="mt-4 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr))]">
          <Card>
            <p className="text-fluid-xs uppercase tracking-wide text-ink-muted">Closed weekdays</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {closedDays.length === 0 ? (
                <span className="text-fluid-sm text-ink-muted">Open every weekday</span>
              ) : (
                closedDays.map((d) => (
                  <Badge key={d} tone="warn">
                    {d}
                  </Badge>
                ))
              )}
            </div>
          </Card>

          <Card>
            <p className="text-fluid-xs uppercase tracking-wide text-ink-muted">
              Holidays, no bookings taken
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {holidays.length === 0 ? (
                <span className="text-fluid-sm text-ink-muted">None set</span>
              ) : (
                holidays.map((d) => (
                  <Badge key={d} tone="neutral">
                    {formatLongDate(d, org.timezone)}
                  </Badge>
                ))
              )}
            </div>
          </Card>
        </div>
      </section>

      <p className="mt-10 border-t border-line pt-6 text-fluid-xs text-ink-muted">
        <Mail className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
        Enquiries sent through the contact form land in Messages, not in this inbox.
      </p>
    </AdminPage>
  )
}

function CardTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary-strong">
        {icon}
      </span>
      <h2 className="font-display text-fluid-lg">{title}</h2>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <dt className="text-fluid-xs uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="text-right text-ink">{children}</dd>
    </div>
  )
}
