'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'

/**
 * Decides which shell wraps the page.
 *
 * The staff dashboard is a different product from the patient site and should
 * not carry patient navigation: a staff member has no use for "Book an
 * appointment", and showing it invites someone to create a booking from a tool
 * that is deliberately read only.
 *
 * The header and footer arrive as props rather than being imported here,
 * because they are server components and this has to read the pathname. Passing
 * them in keeps them on the server and still lets this choose whether to render
 * them. Routes under /admin bring their own shell from app/admin/layout.tsx.
 */
export function SiteChrome({
  header,
  footer,
  mobileBar,
  children,
}: {
  header: React.ReactNode
  footer: React.ReactNode
  mobileBar: React.ReactNode
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/')

  if (isAdmin) {
    return (
      <main id="main" className="flex-1">
        {children}
      </main>
    )
  }

  return (
    <>
      {header}
      <main id="main" className="flex-1">
        {children}
      </main>
      {footer}
      {mobileBar}
      {/* Breathing room so the sticky mobile bar never covers the footer. */}
      <div aria-hidden="true" className="h-20 md:hidden" />
    </>
  )
}
