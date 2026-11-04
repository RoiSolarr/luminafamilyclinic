'use client'

import * as React from 'react'
import { motion, useReducedMotion as useFramerReducedMotion, type Variants } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * Motion helpers.
 *
 * Every animation here collapses to an instant state change when the visitor
 * has asked for reduced motion, so nothing slides, fades or staggers.
 */

export function useReducedMotion(): boolean {
  return useFramerReducedMotion() ?? false
}

const EASE = [0.22, 1, 0.36, 1] as const

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
}

export const staggerParent: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
}

/** Fades a block in the first time it scrolls into view. */
export function Reveal({
  children,
  className,
  delay = 0,
  as = 'div',
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  as?: 'div' | 'section' | 'li' | 'article'
}) {
  const reduced = useReducedMotion()
  const Component = motion[as]

  if (reduced) {
    const Plain = as
    return <Plain className={className}>{children}</Plain>
  }

  return (
    <Component
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, ease: EASE, delay }}
    >
      {children}
    </Component>
  )
}

/** Staggers its direct children as they enter the viewport. */
export function StaggerList({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const reduced = useReducedMotion()
  if (reduced) return <div className={className}>{children}</div>

  return (
    <motion.div
      className={className}
      variants={staggerParent}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const reduced = useReducedMotion()
  if (reduced) return <div className={className}>{children}</div>
  return (
    <motion.div className={className} variants={fadeUp}>
      {children}
    </motion.div>
  )
}

/** Cross fade between wizard steps. */
export function StepTransition({
  stepKey,
  children,
}: {
  stepKey: string | number
  children: React.ReactNode
}) {
  const reduced = useReducedMotion()
  if (reduced) return <div key={stepKey}>{children}</div>

  return (
    <motion.div
      key={stepKey}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.26, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

/** The tick that draws itself on the booking success screen. */
export function SuccessCheck({ className }: { className?: string }) {
  const reduced = useReducedMotion()

  return (
    <svg
      viewBox="0 0 64 64"
      className={cn('h-16 w-16', className)}
      role="img"
      aria-label="Booking confirmed"
    >
      <motion.circle
        cx="32"
        cy="32"
        r="29"
        fill="none"
        stroke="rgb(var(--c-primary))"
        strokeWidth="3"
        initial={reduced ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE }}
      />
      <motion.path
        d="M20 33.5 L28.5 42 L45 24"
        fill="none"
        stroke="rgb(var(--c-primary))"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduced ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, ease: EASE, delay: reduced ? 0 : 0.35 }}
      />
    </svg>
  )
}
