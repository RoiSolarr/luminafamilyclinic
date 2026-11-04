'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/components/motion'
import { STEP_TITLES } from './types'

/**
 * Progress indicator.
 *
 * Rendered as an ordered list so a screen reader reads it as four steps with
 * their state, and the current step is also announced through the live region
 * in the wizard itself.
 */
export function Stepper({
  current,
  onJump,
  furthestReached,
}: {
  current: number
  onJump?: (step: 1 | 2 | 3 | 4) => void
  furthestReached: number
}) {
  const reduced = useReducedMotion()
  const percent = ((current - 1) / (STEP_TITLES.length - 1)) * 100

  return (
    <nav aria-label="Booking progress">
      <ol className="flex items-start gap-1.5 sm:gap-3">
        {STEP_TITLES.map((title, index) => {
          const step = (index + 1) as 1 | 2 | 3 | 4
          const done = step < current
          const active = step === current
          const reachable = step <= furthestReached && Boolean(onJump)

          const content = (
            <>
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-fluid-sm font-semibold transition-colors',
                  done && 'border-primary bg-primary text-primary-ink',
                  active && 'border-primary bg-primary-soft text-primary-strong',
                  !done && !active && 'border-line bg-surface text-ink-muted',
                )}
              >
                {done ? <Check className="h-4 w-4" aria-hidden="true" /> : step}
              </span>
              <span
                className={cn(
                  'hidden text-left text-fluid-xs leading-tight sm:block',
                  active ? 'font-medium text-ink' : 'text-ink-muted',
                )}
              >
                {title}
              </span>
            </>
          )

          return (
            <li key={title} className="flex min-w-0 flex-1 flex-col gap-2">
              {reachable && !active ? (
                <button
                  type="button"
                  onClick={() => onJump?.(step)}
                  aria-label={`Go back to step ${step}, ${title}`}
                  className="flex items-center gap-2.5 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {content}
                </button>
              ) : (
                <div
                  className="flex items-center gap-2.5"
                  aria-current={active ? 'step' : undefined}
                >
                  {content}
                </div>
              )}
            </li>
          )
        })}
      </ol>

      <div
        className="mt-4 h-1 w-full overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={STEP_TITLES.length}
        aria-valuenow={current}
        aria-valuetext={`Step ${current} of ${STEP_TITLES.length}: ${STEP_TITLES[current - 1]}`}
      >
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={false}
          animate={{ width: `${Math.max(percent, 4)}%` }}
          transition={reduced ? { duration: 0 } : { duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </nav>
  )
}
