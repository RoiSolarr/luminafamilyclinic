import type { Metadata } from 'next'
import Link from 'next/link'

import { clinic } from '@/config/clinic'
import { AdminHeader } from '@/components/admin/admin-header'

export const metadata: Metadata = {
  title: { default: 'Staff area', template: `%s | ${clinic.shortName} staff` },
  robots: { index: false, follow: false, nocache: true },
}

/**
 * Shell for everything under /admin.
 *
 * The patient chrome is suppressed by SiteChrome in the root layout, so this
 * supplies the staff header and a short footer in its place. Keeping the two
 * shells apart means a change to the patient navigation cannot quietly alter
 * the dashboard, and vice versa.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100svh] flex-col bg-bg">
      <AdminHeader />

      <div className="flex-1">{children}</div>

      <footer className="mt-auto border-t border-line bg-surface-2/50">
        <div className="container flex flex-col gap-2 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-fluid-xs text-ink-muted">{clinic.demoNotice}</p>
          <Link
            href="/"
            prefetch={false}
            className="link-underline text-fluid-xs text-ink-muted transition-colors hover:text-ink"
          >
            Back to the clinic site
          </Link>
        </div>
      </footer>
    </div>
  )
}
