'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X, Phone } from 'lucide-react'

import { clinic } from '@/config/clinic'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { useReducedMotion } from '@/components/motion'

/**
 * Sticky header. Full horizontal navigation from `lg` up, a full screen drawer
 * below that. The drawer is a Radix dialog, so focus is trapped, Escape closes
 * it and the page behind it is inert.
 */
export function SiteHeader() {
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)
  const [scrolled, setScrolled] = React.useState(false)
  const reduced = useReducedMotion()

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close the drawer whenever the route changes.
  React.useEffect(() => {
    setOpen(false)
  }, [pathname])

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <header
      className={cn(
        'glass sticky top-0 z-40 w-full border-b transition-colors duration-300',
        scrolled ? 'border-line' : 'border-transparent',
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-4 lg:h-20">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`${clinic.name} home`}
        >
          <LuminaMark />
          <span className="font-display text-fluid-lg font-semibold leading-none tracking-tight">
            {clinic.shortName}
            <span className="hidden text-ink-muted xs:inline"> Family Clinic</span>
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {clinic.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={cn(
                'rounded-full px-4 py-2 text-fluid-sm transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                isActive(item.href)
                  ? 'bg-primary-soft text-primary-strong'
                  : 'text-ink-soft hover:bg-surface-2 hover:text-ink',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={`tel:${clinic.contact.phoneHref}`}
            className="tap-target hidden items-center gap-2 rounded-full px-3 text-fluid-sm text-ink-soft hover:text-ink md:inline-flex"
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            <span className="hidden xl:inline">{clinic.contact.phone}</span>
            <span className="xl:hidden">Call</span>
          </a>

          <ThemeToggle className="hidden sm:inline-flex" />

          <Button asChild size="sm" className="hidden lg:inline-flex">
            <Link href="/book">Book an appointment</Link>
          </Button>

          <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
            <DialogPrimitive.Trigger asChild>
              <button
                type="button"
                className="tap-target inline-flex items-center justify-center rounded-full text-ink hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-6 w-6" aria-hidden="true" />
              </button>
            </DialogPrimitive.Trigger>

            <AnimatePresence>
              {open && (
                <DialogPrimitive.Portal forceMount>
                  <DialogPrimitive.Overlay asChild forceMount>
                    <motion.div
                      className="fixed inset-0 z-50 bg-ink/35 backdrop-blur-sm lg:hidden"
                      initial={reduced ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    />
                  </DialogPrimitive.Overlay>

                  <DialogPrimitive.Content asChild forceMount aria-label="Site menu">
                    <motion.div
                      className="safe-top fixed inset-0 z-50 flex h-[100dvh] flex-col bg-bg lg:hidden"
                      initial={reduced ? false : { opacity: 0, y: -12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduced ? { opacity: 0 } : { opacity: 0, y: -12 }}
                      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <DialogPrimitive.Title className="sr-only">Site menu</DialogPrimitive.Title>

                      <div className="container flex h-16 items-center justify-between">
                        <span className="flex items-center gap-2.5">
                          <LuminaMark />
                          <span className="font-display text-fluid-lg font-semibold">
                            {clinic.shortName}
                          </span>
                        </span>
                        <DialogPrimitive.Close asChild>
                          <button
                            type="button"
                            aria-label="Close menu"
                            className="tap-target inline-flex items-center justify-center rounded-full text-ink hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <X className="h-6 w-6" aria-hidden="true" />
                          </button>
                        </DialogPrimitive.Close>
                      </div>

                      <nav aria-label="Mobile" className="container flex-1 overflow-y-auto py-6">
                        <ul className="flex flex-col gap-1">
                          {[{ href: '/', label: 'Home' }, ...clinic.nav].map((item) => (
                            <li key={item.href}>
                              <Link
                                href={item.href}
                                aria-current={isActive(item.href) ? 'page' : undefined}
                                className={cn(
                                  'flex min-h-[56px] items-center rounded-xl px-4 font-display text-fluid-xl',
                                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                                  isActive(item.href)
                                    ? 'bg-primary-soft text-primary-strong'
                                    : 'text-ink hover:bg-surface-2',
                                )}
                              >
                                {item.label}
                              </Link>
                            </li>
                          ))}
                        </ul>

                        <div className="mt-8 flex items-center justify-between gap-4 border-t border-line pt-6">
                          <a
                            href={`tel:${clinic.contact.phoneHref}`}
                            className="tap-target inline-flex items-center gap-2 text-fluid-base text-ink-soft"
                          >
                            <Phone className="h-4 w-4" aria-hidden="true" />
                            {clinic.contact.phone}
                          </a>
                          <ThemeToggle />
                        </div>
                      </nav>

                      <div className="safe-bottom container border-t border-line pt-3">
                        <Button asChild full size="lg">
                          <Link href="/book">Book an appointment</Link>
                        </Button>
                      </div>
                    </motion.div>
                  </DialogPrimitive.Content>
                </DialogPrimitive.Portal>
              )}
            </AnimatePresence>
          </DialogPrimitive.Root>
        </div>
      </div>
    </header>
  )
}

/** The wordmark glyph. An abstract sunrise, not a medical cross. */
function LuminaMark() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
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
    </span>
  )
}
