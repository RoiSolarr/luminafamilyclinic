'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  History,
  Inbox,
  LayoutDashboard,
  Menu,
  Phone,
  Plug,
  Stethoscope,
  Users,
  X,
} from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Staff navigation.
 *
 * One list, rendered two ways: a fixed rail from `lg` up, and a slide over
 * drawer below that. Defining the items once means the two can never drift
 * apart, which is the usual failure of hand written mobile menus.
 *
 * Grouped rather than flat. Seven links in an undifferentiated column all look
 * equally likely, and a receptionist hunting for the inbox has to read every
 * one of them.
 */

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  /** Shown under the label in the drawer, where there is room for it. */
  hint: string
}

type NavGroup = {
  heading: string
  items: NavItem[]
}

export const ADMIN_NAV: NavGroup[] = [
  {
    heading: 'Front desk',
    items: [
      {
        href: '/admin',
        label: 'Dashboard',
        icon: LayoutDashboard,
        hint: 'Counts, flags and what is next',
      },
      {
        href: '/admin/appointments',
        label: 'Appointments',
        icon: CalendarDays,
        hint: 'Search and filter every booking',
      },
      {
        href: '/admin/messages',
        label: 'Messages',
        icon: Inbox,
        hint: 'Contact form enquiries',
      },
    ],
  },
  {
    heading: 'Records',
    items: [
      {
        href: '/admin/history',
        label: 'Booking History',
        icon: History,
        hint: 'Past, completed and cancelled',
      },
      {
        href: '/admin/patients',
        label: 'Patients',
        icon: Users,
        hint: 'Everyone who has booked',
      },
      {
        href: '/admin/doctors',
        label: 'Doctors',
        icon: Stethoscope,
        hint: 'Weekly roster and specialties',
      },
    ],
  },
  {
    heading: 'Clinic',
    items: [
      {
        href: '/admin/contact',
        label: 'Contact',
        icon: Phone,
        hint: 'Details to read out to patients',
      },
      {
        href: '/admin/automation',
        label: 'Automation',
        icon: Plug,
        hint: 'Zapier hooks and reminders',
      },
    ],
  },
]

/**
 * `/admin` would otherwise light up on every child route, since every one of
 * them starts with it.
 */
function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavLink({
  item,
  active,
  showHint,
  onNavigate,
}: {
  item: NavItem
  active: boolean
  showHint?: boolean
  onNavigate?: () => void
}) {
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        active
          ? 'bg-primary-soft text-primary-strong'
          : 'text-ink-soft hover:bg-surface-2 hover:text-ink',
      )}
    >
      <Icon
        className={cn('mt-0.5 h-[1.125rem] w-[1.125rem] shrink-0', active && 'text-primary-strong')}
      />
      <span className="min-w-0">
        <span className={cn('block text-fluid-sm leading-tight', active && 'font-medium')}>
          {item.label}
        </span>
        {showHint && (
          <span className="mt-0.5 block text-fluid-xs leading-snug text-ink-muted">
            {item.hint}
          </span>
        )}
      </span>
    </Link>
  )
}

function NavList({
  pathname,
  showHints,
  onNavigate,
}: {
  pathname: string
  showHints?: boolean
  onNavigate?: () => void
}) {
  return (
    <nav aria-label="Staff sections" className="flex flex-col gap-6">
      {ADMIN_NAV.map((group) => (
        <div key={group.heading}>
          <p className="px-3 text-fluid-xs font-medium uppercase tracking-wide text-ink-muted">
            {group.heading}
          </p>
          <ul className="mt-2 flex flex-col gap-0.5">
            {group.items.map((item) => (
              <li key={item.href}>
                <NavLink
                  item={item}
                  active={isActive(pathname, item.href)}
                  showHint={showHints}
                  onNavigate={onNavigate}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

/** The persistent rail. Hidden below `lg`, where the drawer takes over. */
export function AdminSidebar() {
  const pathname = usePathname()

  // Nothing to navigate to before signing in, and a rail of links that all
  // bounce back to this page would be a false promise.
  if (pathname === '/admin/login') return null

  return (
    <aside className="hidden w-60 shrink-0 border-r border-line bg-surface lg:block">
      {/* Sticky under the 4rem header, so the links stay reachable on a long
          appointment table. */}
      <div className="sticky top-16 max-h-[calc(100svh-4rem)] overflow-y-auto px-3 py-6">
        <NavList pathname={pathname} />
      </div>
    </aside>
  )
}

/** The `lg` and below equivalent: a button in the header opening a panel. */
export function AdminNavDrawer() {
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)

  // The panel is portalled to the body. The header above it carries
  // `backdrop-blur`, and a backdrop-filter makes an element the containing
  // block for its fixed position descendants: rendered in place, `inset-0`
  // resolved against the 4rem header and the drawer was sliced off at the
  // bottom of it. The portal takes it out of that context entirely.
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Close on route change. Without this the panel stays up over the page the
  // staff member just asked for.
  React.useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Escape closes, and the body does not scroll behind the panel.
  React.useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const panel = (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Staff sections"
        className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col border-r border-line bg-surface shadow-xl"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
          <p className="font-display text-fluid-base font-semibold">Staff area</p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close staff menu"
            className="tap-target inline-flex items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-5">
          <NavList pathname={pathname} showHints onNavigate={() => setOpen(false)} />
        </div>
      </div>
    </div>
  )

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open staff menu"
        aria-expanded={open}
        className="tap-target -ml-2 inline-flex items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {open && mounted && createPortal(panel, document.body)}
    </>
  )
}
