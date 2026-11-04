'use client'

import * as React from 'react'
import * as AccordionPrimitive from '@radix-ui/react-accordion'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ badge */

const badgeTones = {
  neutral: 'bg-surface-2 text-ink-soft border-line',
  primary: 'bg-primary-soft text-primary-strong border-primary/25',
  accent: 'bg-accent-soft text-accent border-accent/25',
  ok: 'bg-ok/10 text-ok border-ok/25',
  warn: 'bg-warn/10 text-warn border-warn/25',
  danger: 'bg-danger/10 text-danger border-danger/30',
} as const

export type BadgeTone = keyof typeof badgeTones

export function Badge({
  tone = 'neutral',
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-fluid-xs font-medium',
        badgeTones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}

/* ------------------------------------------------------------------- card */

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('surface-card p-5 xs:p-6', className)} {...props}>
      {children}
    </div>
  )
}

/* --------------------------------------------------------------- skeleton */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden="true" />
}

/* --------------------------------------------------------------- accordion */

export const Accordion = AccordionPrimitive.Root

export const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(function AccordionItem({ className, ...props }, ref) {
  return (
    <AccordionPrimitive.Item
      ref={ref}
      className={cn('border-b border-line last:border-b-0', className)}
      {...props}
    />
  )
})

export const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(function AccordionTrigger({ className, children, ...props }, ref) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        ref={ref}
        className={cn(
          'tap-target group flex flex-1 items-start justify-between gap-4 py-5 text-left',
          'font-display text-fluid-lg text-ink transition-colors hover:text-primary',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown
          aria-hidden="true"
          className="mt-1 h-5 w-5 shrink-0 text-ink-muted transition-transform duration-200 group-data-[state=open]:rotate-180"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
})

export const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(function AccordionContent({ className, children, ...props }, ref) {
  return (
    <AccordionPrimitive.Content
      ref={ref}
      className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
      {...props}
    >
      <div className={cn('pb-6 pr-8 text-fluid-base leading-relaxed text-ink-soft', className)}>
        {children}
      </div>
    </AccordionPrimitive.Content>
  )
})

/* ------------------------------------------------------------------ dialog */

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { title: string; description?: string }
>(function DialogContent({ className, children, title, description, ...props }, ref) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/45 backdrop-blur-sm" />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2',
          'max-h-[85svh] overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-lift',
          className,
        )}
        {...props}
      >
        <DialogPrimitive.Title className="font-display text-fluid-xl">{title}</DialogPrimitive.Title>
        {description && (
          <DialogPrimitive.Description className="mt-2 text-fluid-sm text-ink-soft">
            {description}
          </DialogPrimitive.Description>
        )}
        <div className="mt-5">{children}</div>
        <DialogPrimitive.Close
          aria-label="Close"
          className="tap-target absolute right-3 top-3 inline-flex items-center justify-center rounded-full text-ink-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
})

/* ------------------------------------------------------------------ avatar */

export function InitialsAvatar({
  initials,
  size = 'md',
  className,
}: {
  initials: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const dims = {
    sm: 'h-10 w-10 text-fluid-sm',
    md: 'h-14 w-14 text-fluid-lg',
    lg: 'h-20 w-20 text-fluid-2xl',
  }[size]

  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full',
        'bg-primary-soft font-display font-semibold text-primary-strong',
        'ring-1 ring-inset ring-primary/20',
        dims,
        className,
      )}
    >
      {initials}
    </span>
  )
}

/* ------------------------------------------------------------- empty state */

export function EmptyState({
  title,
  body,
  action,
  icon,
  className,
}: {
  title: string
  body: string
  action?: React.ReactNode
  icon?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line bg-surface-2/50 px-6 py-12 text-center',
        className,
      )}
    >
      {icon && <div className="text-ink-muted">{icon}</div>}
      <h3 className="font-display text-fluid-lg">{title}</h3>
      <p className="max-w-sm text-fluid-sm text-ink-soft">{body}</p>
      {action}
    </div>
  )
}
