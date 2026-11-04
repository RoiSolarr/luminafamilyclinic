import type { Metadata } from 'next'
import Link from 'next/link'
import { Clock, Mail, MapPin, Phone, Train } from 'lucide-react'

import { clinic } from '@/config/clinic'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/primitives'
import { ContactForm } from '@/components/contact-form'
import { Reveal } from '@/components/motion'

export const metadata: Metadata = {
  title: 'Contact',
  description: `Phone, email, opening hours and directions for ${clinic.name}.`,
}

export default function ContactPage() {
  return (
    <div className="container section-y">
      <Reveal className="max-w-2xl">
        <h1 className="text-fluid-4xl font-semibold">Contact</h1>
        <p className="mt-5 text-fluid-lg leading-relaxed text-ink-soft">
          For anything about an existing appointment, the fastest route is the link in your
          confirmation email. For everything else, here is how to reach us.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-16">
        <div className="min-w-0">
          <Reveal>
            <h2 className="font-display text-fluid-2xl">Send a message</h2>
            <p className="mt-2 text-fluid-base text-ink-soft">
              Messages are read by a person and answered by email, usually within one working day.
            </p>
            <div className="mt-6">
              <ContactForm idPrefix="page" />
            </div>
          </Reveal>
        </div>

        <aside className="flex flex-col gap-5">
          <Reveal delay={0.06}>
            <Card>
              <h2 className="font-display text-fluid-xl">Where to find us</h2>

              {/* Map placeholder. A real deployment would embed a map here;
                  this demo draws a simple schematic instead of loading a third
                  party script, which keeps the page cookie free. */}
              <div
                role="img"
                aria-label={`Schematic map showing ${clinic.name} on ${clinic.contact.addressLine2}`}
                className="relative mt-4 aspect-[4/3] w-full overflow-hidden rounded-xl border border-line bg-surface-2"
              >
                <svg viewBox="0 0 320 240" className="h-full w-full" aria-hidden="true">
                  <rect width="320" height="240" fill="rgb(var(--c-surface-2))" />
                  <g stroke="rgb(var(--c-line))" strokeWidth="10" fill="none">
                    <path d="M-10 90 H330" />
                    <path d="M-10 175 H330" />
                    <path d="M95 -10 V250" />
                    <path d="M225 -10 V250" />
                  </g>
                  <g fill="rgb(var(--c-line))" opacity="0.6">
                    <rect x="18" y="18" width="60" height="55" rx="4" />
                    <rect x="240" y="18" width="62" height="55" rx="4" />
                    <rect x="18" y="192" width="60" height="40" rx="4" />
                    <rect x="240" y="192" width="62" height="40" rx="4" />
                  </g>
                  <rect
                    x="112"
                    y="104"
                    width="96"
                    height="58"
                    rx="6"
                    fill="rgb(var(--c-primary-soft))"
                    stroke="rgb(var(--c-primary))"
                    strokeWidth="2"
                  />
                  <circle cx="160" cy="133" r="9" fill="rgb(var(--c-primary))" />
                  <path
                    d="M160 124a9 9 0 0 0-9 9c0 6 9 15 9 15s9-9 9-15a9 9 0 0 0-9-9z"
                    fill="rgb(var(--c-primary))"
                  />
                  <text
                    x="160"
                    y="172"
                    textAnchor="middle"
                    fill="rgb(var(--c-ink-soft))"
                    fontSize="11"
                    fontFamily="system-ui"
                  >
                    Mirasol Avenue
                  </text>
                </svg>
                <span className="absolute bottom-2 right-2 rounded-full bg-bg/85 px-2.5 py-1 text-fluid-xs text-ink-muted">
                  Illustrative only
                </span>
              </div>

              <address className="mt-4 not-italic">
                <p className="flex items-start gap-2.5 text-fluid-sm leading-relaxed text-ink-soft">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>
                    {clinic.contact.addressLine1}
                    <br />
                    {clinic.contact.addressLine2}
                    <br />
                    {clinic.contact.city}, {clinic.contact.region} {clinic.contact.postalCode}
                    <br />
                    {clinic.contact.country}
                  </span>
                </p>
              </address>

              <p className="mt-4 flex items-start gap-2.5 text-fluid-xs text-ink-muted">
                <Train className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Two minutes on foot from the Mirasol jeepney stop. Parking for eight cars at the
                rear, with step free access from the car park.
              </p>
            </Card>
          </Reveal>

          <Reveal delay={0.1}>
            <Card>
              <h2 className="font-display text-fluid-xl">Phone and email</h2>
              <ul className="mt-4 flex flex-col gap-3 text-fluid-base">
                <li className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <a href={`tel:${clinic.contact.phoneHref}`} className="link-underline">
                    {clinic.contact.phone}
                  </a>
                </li>
                <li className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <a href={`mailto:${clinic.contact.email}`} className="link-underline break-all">
                    {clinic.contact.email}
                  </a>
                </li>
              </ul>
            </Card>
          </Reveal>

          <Reveal delay={0.14}>
            <Card>
              <h2 className="flex items-center gap-2 font-display text-fluid-xl">
                <Clock className="h-5 w-5 text-primary" aria-hidden="true" />
                Opening hours
              </h2>
              <dl className="mt-4 flex flex-col gap-2.5 text-fluid-sm">
                {clinic.hours.map((row) => (
                  <div key={row.label} className="flex items-baseline justify-between gap-4">
                    <dt className="text-ink">{row.label}</dt>
                    <dd className="text-right text-ink-soft">{row.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-fluid-xs text-ink-muted">
                All times in {clinic.timezoneLabel}.
              </p>
            </Card>
          </Reveal>

          <Reveal delay={0.18}>
            <Card className="border-accent/30 bg-accent-soft">
              <h2 className="font-display text-fluid-lg text-accent">In an emergency</h2>
              <p className="mt-2 text-fluid-sm leading-relaxed text-accent">
                {clinic.emergencyNotice}
              </p>
            </Card>
          </Reveal>

          <Reveal delay={0.22}>
            <Button asChild full size="lg">
              <Link href="/book">Book an appointment</Link>
            </Button>
          </Reveal>
        </aside>
      </div>
    </div>
  )
}
