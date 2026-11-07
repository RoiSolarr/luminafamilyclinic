'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { clinic } from '@/config/clinic'
import { ThemeToggle } from '@/components/theme-toggle'
import { SignOutButton } from '@/components/admin/sign-out-button'
import { AdminNavDrawer } from '@/components/admin/admin-nav'

/**
 * Top bar for the staff area.
 *
 * Deliberately not the patient header. No Services, Doctors, FAQ or Contact,
 * and no "Book an appointment": the dashboard is read only, and offering a
 * booking button on it would be offering something it cannot do.
 *
 * There is no link out to the patient site either. Staff keep this open all
 * shift, and a stray click that drops them back on the marketing home page is
 * a small annoyance every time.
 *
 * Sign out is hidden on the login page, where there is no session to end.
 */
export function AdminHeader() {
  const pathname = usePathname()
  const onLoginPage = pathname === '/admin/login'

  return (
    <header className="sticky top-0 z-40 w-full border-b border-line bg-surface/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {/* The sidebar collapses below `lg`, so below that width the same
              links live behind this button. */}
          {!onLoginPage && <AdminNavDrawer />}

          {/* The mark returns to the dashboard, the way a logo does in every
              other admin tool. It is not a route out to the patient site. */}
          <Link
            href="/admin"
            aria-label="Staff dashboard"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
              <path
                d="M4 17h16M7.5 17a4.5 4.5 0 0 1 9 0"
                stroke="rgb(var(--c-primary-ink))"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M12 4v2.5M5.6 6.6l1.8 1.8M18.4 6.6l-1.8 1.8"
                stroke="rgb(var(--c-primary-ink))"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.75"
              />
            </svg>
          </Link>

          <div className="min-w-0">
            <p className="truncate font-display text-fluid-base font-semibold leading-tight">
              {clinic.shortName}
              <span className="hidden text-ink-muted xs:inline"> Family Clinic</span>
            </p>
            <p className="text-fluid-xs leading-tight text-ink-muted">Staff area</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle className="hidden sm:inline-flex" />

          {!onLoginPage && <SignOutButton />}
        </div>
      </div>
    </header>
  )
}
