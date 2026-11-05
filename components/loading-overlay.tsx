'use client'

import * as React from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Suspense } from 'react'

import { clinic } from '@/config/clinic'
import { useReducedMotion } from '@/components/motion'

/**
 * Full screen blocking loader.
 *
 * Two jobs. It covers the page while a navigation or a slow action is in
 * flight, and it swallows input so nothing can be clicked twice.
 *
 * The hard part of a blocking loader is not showing it, it is being certain it
 * goes away. A loader that sticks is worse than no loader, because the site
 * looks broken and nothing can be clicked. Three safeguards:
 *
 *   1. A navigation loader clears when the path or query actually changes.
 *   2. Everything clears after SAFETY_TIMEOUT_MS no matter what, so a failed
 *      navigation or a request that never settles cannot trap anyone.
 *   3. Links that do not navigate this tab are ignored up front: new tab
 *      clicks, downloads, hash links, external hosts, and clicking the page
 *      you are already on.
 */

const SAFETY_TIMEOUT_MS = 8000

/** Below this, a flash of overlay is more distracting than no overlay. */
const SHOW_DELAY_MS = 120

type LoaderContextValue = {
  /** Shows the overlay. Returns a function that hides it again. */
  start: (message?: string) => () => void
  /** Wraps a promise: shows while it runs, hides when it settles either way. */
  track: <T>(work: Promise<T>, message?: string) => Promise<T>
}

const LoaderContext = React.createContext<LoaderContextValue | null>(null)

/**
 * Access the blocking loader from any client component.
 *
 * Safe to call outside the provider, where it becomes a no op, so a component
 * can use it without caring whether it was mounted inside the provider.
 */
export function useBlockingLoader(): LoaderContextValue {
  const context = React.useContext(LoaderContext)
  return React.useMemo(
    () =>
      context ?? {
        start: () => () => {},
        track: async <T,>(work: Promise<T>) => work,
      },
    [context],
  )
}

/**
 * Watches the query string and reports when it changes.
 *
 * Split out and wrapped in its own Suspense boundary below, because
 * `useSearchParams` opts a whole subtree out of static rendering in this
 * version of Next. Isolating it here keeps that cost to a component that
 * renders nothing, instead of the entire page.
 */
function SearchParamsWatcher({ onChange }: { onChange: (search: string) => void }) {
  const searchParams = useSearchParams()
  const search = searchParams.toString()

  React.useEffect(() => {
    onChange(search)
  }, [search, onChange])

  return null
}

export function LoadingOverlayProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const reduced = useReducedMotion()

  const [visible, setVisible] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)

  /** Counts overlapping requests, so two at once do not fight over the overlay. */
  const pending = React.useRef(0)
  const showTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const safetyTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  /** The location the current navigation started from. */
  const navigatingFrom = React.useRef<string | null>(null)

  const clearTimers = React.useCallback(() => {
    if (showTimer.current) clearTimeout(showTimer.current)
    if (safetyTimer.current) clearTimeout(safetyTimer.current)
    showTimer.current = null
    safetyTimer.current = null
  }, [])

  const hideNow = React.useCallback(() => {
    pending.current = 0
    navigatingFrom.current = null
    clearTimers()
    setVisible(false)
    setMessage(null)
  }, [clearTimers])

  const show = React.useCallback(
    (text?: string) => {
      pending.current += 1
      setMessage(text ?? null)

      if (!showTimer.current && !visible) {
        showTimer.current = setTimeout(() => {
          showTimer.current = null
          if (pending.current > 0) setVisible(true)
        }, SHOW_DELAY_MS)
      }

      // Restarted on every new request, so a sequence of actions each get a
      // full window rather than sharing one.
      if (safetyTimer.current) clearTimeout(safetyTimer.current)
      safetyTimer.current = setTimeout(hideNow, SAFETY_TIMEOUT_MS)
    },
    [hideNow, visible],
  )

  const release = React.useCallback(() => {
    pending.current = Math.max(0, pending.current - 1)
    if (pending.current === 0) hideNow()
  }, [hideNow])

  const start = React.useCallback(
    (text?: string) => {
      show(text)
      let released = false
      // Guarded so a caller invoking the returned function twice cannot drive
      // the counter negative and hide an unrelated loader.
      return () => {
        if (released) return
        released = true
        release()
      }
    },
    [release, show],
  )

  const track = React.useCallback(
    async <T,>(work: Promise<T>, text?: string): Promise<T> => {
      const done = start(text)
      try {
        return await work
      } finally {
        done()
      }
    },
    [start],
  )

  /* ------------------------------------------------- navigation detection */

  // The App Router gives no navigation events in this version, so link clicks
  // are caught during the capture phase before React sees them.
  React.useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return
      // Modifier clicks open a new tab, so this tab is not going anywhere.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return
      }

      const anchor = (event.target as HTMLElement | null)?.closest('a')
      if (!anchor) return

      const href = anchor.getAttribute('href')
      if (!href) return
      if (anchor.target && anchor.target !== '_self') return
      if (anchor.hasAttribute('download')) return
      // mailto:, tel:, and in page anchors all stay on this page.
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return
      if (anchor.dataset.noLoader === 'true') return

      let destination: URL
      try {
        destination = new URL(anchor.href, window.location.href)
      } catch {
        return
      }
      if (destination.origin !== window.location.origin) return

      const current = window.location.pathname + window.location.search
      const target = destination.pathname + destination.search
      // Clicking the page you are already on fires no navigation, so the
      // overlay would have nothing to wait for.
      if (target === current) return

      navigatingFrom.current = current
      show()
    }

    document.addEventListener('click', onClick, { capture: true })
    return () => document.removeEventListener('click', onClick, { capture: true })
  }, [show])

  // The browser back and forward buttons do navigate, and the effect below
  // clears the overlay once the new location lands.
  React.useEffect(() => {
    const onPopState = () => {
      navigatingFrom.current = window.location.pathname + window.location.search
      show()
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [show])

  /**
   * Arrival. When the location differs from where the navigation began, the
   * new page is rendering and the overlay has done its job.
   *
   * Called both when the path changes and when only the query changes, which
   * is what the admin filters do.
   */
  const checkArrival = React.useCallback(
    (search: string) => {
      if (navigatingFrom.current === null) return
      const now = pathname + (search ? `?${search}` : '')
      if (now !== navigatingFrom.current) hideNow()
    },
    [pathname, hideNow],
  )

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    checkArrival(window.location.search.replace(/^\?/, ''))
  }, [pathname, checkArrival])

  // A full page load, or returning through the back/forward cache, must never
  // restore a page with the overlay still up.
  React.useEffect(() => {
    const onPageShow = () => hideNow()
    window.addEventListener('pageshow', onPageShow)
    return () => {
      window.removeEventListener('pageshow', onPageShow)
      clearTimers()
    }
  }, [hideNow, clearTimers])

  const value = React.useMemo<LoaderContextValue>(() => ({ start, track }), [start, track])

  return (
    <LoaderContext.Provider value={value}>
      <Suspense fallback={null}>
        <SearchParamsWatcher onChange={checkArrival} />
      </Suspense>

      {children}

      <AnimatePresence>
        {visible && (
          <motion.div
            key="blocking-loader"
            // aria-live rather than a dialog role: this is a status, and it
            // should not steal focus or trap it.
            role="status"
            aria-live="polite"
            aria-busy="true"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.16 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-bg/92 backdrop-blur-sm"
            // Swallows clicks, taps and key presses while it is up.
            onPointerDownCapture={(e) => e.preventDefault()}
            onKeyDownCapture={(e) => {
              if (e.key !== 'Tab') e.preventDefault()
            }}
          >
            <LuminaSpinner reduced={reduced} />

            <p className="px-6 text-center text-fluid-sm text-ink-soft">
              {message ?? 'One moment'}
            </p>

            <span className="sr-only">Loading, please wait</span>

            <p className="absolute bottom-6 px-6 text-center text-fluid-xs text-ink-muted">
              {clinic.name}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </LoaderContext.Provider>
  )
}

/**
 * The clinic mark, drawn stroke by stroke.
 *
 * Reusing the logo rather than a generic spinner means the wait still looks
 * like this clinic. Under reduced motion it holds still and only pulses
 * opacity, which conveys activity without movement.
 */
function LuminaSpinner({ reduced }: { reduced: boolean }) {
  return (
    <span className="relative inline-flex h-20 w-20 items-center justify-center">
      <motion.span
        aria-hidden="true"
        className="absolute inset-0 rounded-2xl bg-primary-soft"
        animate={reduced ? { opacity: [0.5, 1, 0.5] } : { scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      />

      <svg viewBox="0 0 24 24" className="relative h-10 w-10" fill="none" aria-hidden="true">
        <motion.path
          d="M4 17h16"
          stroke="rgb(var(--c-primary))"
          strokeWidth="2.2"
          strokeLinecap="round"
          initial={reduced ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
        />
        <motion.path
          d="M7.5 17a4.5 4.5 0 0 1 9 0"
          stroke="rgb(var(--c-primary))"
          strokeWidth="2.2"
          strokeLinecap="round"
          initial={reduced ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
            delay: 0.15,
          }}
        />
        <motion.g
          stroke="rgb(var(--c-primary))"
          strokeWidth="2.2"
          strokeLinecap="round"
          animate={reduced ? { opacity: 0.7 } : { opacity: [0.3, 0.9, 0.3] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <path d="M12 4v2.5" />
          <path d="M5.6 6.6l1.8 1.8" />
          <path d="M18.4 6.6l-1.8 1.8" />
        </motion.g>
      </svg>
    </span>
  )
}
