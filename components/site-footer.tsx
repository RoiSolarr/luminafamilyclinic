import Link from 'next/link'
import { Phone, Mail, MapPin } from 'lucide-react'
import { clinic } from '@/config/clinic'

export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-section border-t border-line bg-surface-2/60">
      <div className="container grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:py-16">
        <div className="sm:col-span-2 lg:col-span-1">
          <p className="font-display text-fluid-xl font-semibold">{clinic.name}</p>
          <p className="mt-3 max-w-sm text-fluid-sm leading-relaxed text-ink-soft">
            {clinic.tagline}
          </p>
        </div>

        <nav aria-label="Footer pages">
          <h2 className="font-display text-fluid-base">Pages</h2>
          <ul className="mt-4 flex flex-col gap-2.5 text-fluid-sm text-ink-soft">
            {[{ href: '/', label: 'Home' }, ...clinic.nav, { href: '/book', label: 'Book an appointment' }].map(
              (item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-ink link-underline">
                    {item.label}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </nav>

        <div>
          <h2 className="font-display text-fluid-base">Visit or call</h2>
          <ul className="mt-4 flex flex-col gap-3 text-fluid-sm text-ink-soft">
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>
                {clinic.contact.addressLine1}
                <br />
                {clinic.contact.addressLine2}
                <br />
                {clinic.contact.city}, {clinic.contact.region} {clinic.contact.postalCode}
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <a href={`tel:${clinic.contact.phoneHref}`} className="hover:text-ink link-underline">
                {clinic.contact.phone}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <a href={`mailto:${clinic.contact.email}`} className="hover:text-ink link-underline break-all">
                {clinic.contact.email}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-fluid-base">Opening hours</h2>
          <ul className="mt-4 flex flex-col gap-2.5 text-fluid-sm text-ink-soft">
            {clinic.hours.map((row) => (
              <li key={row.label} className="flex flex-col">
                <span className="text-ink">{row.label}</span>
                <span>{row.value}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-fluid-xs text-ink-muted">All times in {clinic.timezoneLabel}.</p>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-fluid-xs text-ink-muted">
            &copy; {year} {clinic.name}. All content is fictional.
          </p>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-fluid-xs text-ink-muted">
            <li>
              <Link href="/privacy" className="hover:text-ink link-underline">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-ink link-underline">
                Terms of Use
              </Link>
            </li>
            <li>
              <Link href="/admin" prefetch={false} className="hover:text-ink link-underline">
                Staff
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* The notice the brief requires, kept visible on every page. */}
      <div className="border-t border-accent/25 bg-accent-soft">
        <div className="container py-3">
          <p className="text-center text-fluid-xs font-medium text-accent">{clinic.demoNotice}</p>
        </div>
      </div>
    </footer>
  )
}
