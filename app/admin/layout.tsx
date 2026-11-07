import type { Metadata } from 'next'

import { clinic } from '@/config/clinic'
import { AdminHeader } from '@/components/admin/admin-header'
import { AdminSidebar } from '@/components/admin/admin-nav'

export const metadata: Metadata = {
  title: { default: 'Staff area', template: `%s | ${clinic.shortName} staff` },
  robots: { index: false, follow: false, nocache: true },
}

/**
 * Shell for everything under /admin.
 *
 * The patient chrome is suppressed by SiteChrome in the root layout, so this
 * supplies the staff header, the section rail and a short footer in its place.
 * Keeping the two shells apart means a change to the patient navigation cannot
 * quietly alter the dashboard, and vice versa.
 *
 * The sidebar renders on the login page too, but as nothing: AdminSidebar is
 * only mounted for signed in routes, below.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100svh] flex-col bg-bg">
      <AdminHeader />

      <div className="flex flex-1 items-stretch">
        <AdminSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1">{children}</div>

          <footer className="mt-auto border-t border-line bg-surface-2/50">
            <div className="container py-5">
              <p className="text-fluid-xs text-ink-muted">{clinic.demoNotice}</p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
