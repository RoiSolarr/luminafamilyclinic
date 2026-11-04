'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarPlus, Phone } from 'lucide-react'
import { clinic } from '@/config/clinic'

/**
 * Sticky call to action, phones and small tablets only.
 *
 * Hidden on /book and /manage, where it would compete with the wizard's own
 * sticky controls, and on /admin, which is a staff tool.
 */
export function MobileBookBar() {
  const pathname = usePathname()
  const hidden = ['/book', '/manage', '/admin', '/feedback'].some((p) => pathname.startsWith(p))
  if (hidden) return null

  return (
    <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 px-4 pt-3 backdrop-blur md:hidden">
      <div className="flex items-center gap-3">
        <a
          href={`tel:${clinic.contact.phoneHref}`}
          className="tap-target inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 text-fluid-sm text-ink"
          aria-label={`Call ${clinic.name}`}
        >
          <Phone className="h-4 w-4" aria-hidden="true" />
          Call
        </a>
        <Link
          href="/book"
          className="tap-target inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-5 font-medium text-primary-ink shadow-soft"
        >
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          Book now
        </Link>
      </div>
    </div>
  )
}
