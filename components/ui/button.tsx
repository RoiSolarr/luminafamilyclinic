'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  // Base. `tap-target` keeps every control at 44px minimum on touch screens.
  'tap-target inline-flex items-center justify-center gap-2 rounded-full font-medium ' +
    'transition-[background-color,color,box-shadow,transform] duration-200 ease-out ' +
    'disabled:pointer-events-none disabled:opacity-55 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ' +
    'focus-visible:ring-offset-bg active:scale-[0.985] select-none',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-ink shadow-soft hover:bg-primary-strong hover:shadow-lift',
        secondary:
          'bg-surface text-ink border border-line hover:bg-surface-2 hover:border-ink-muted',
        ghost: 'bg-transparent text-ink hover:bg-surface-2',
        accent: 'bg-accent text-accent-ink hover:brightness-95 shadow-soft',
        danger: 'bg-transparent text-danger border border-danger/40 hover:bg-danger/10',
        link: 'bg-transparent text-primary underline underline-offset-4 hover:text-primary-strong min-h-0',
      },
      size: {
        sm: 'h-11 px-4 text-fluid-sm',
        md: 'h-12 px-5 text-fluid-base',
        lg: 'h-14 px-7 text-fluid-lg',
        icon: 'h-11 w-11 p-0',
      },
      full: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md', full: false },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  /** Announced to screen readers while `loading` is true. */
  loadingLabel?: string
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, full, asChild, loading, loadingLabel = 'Working', children, disabled, ...props },
  ref,
) {
  const Comp = asChild ? Slot : 'button'

  if (asChild) {
    return (
      <Comp className={cn(buttonVariants({ variant, size, full }), className)} ref={ref} {...props}>
        {children}
      </Comp>
    )
  }

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, full }), className)}
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>{loadingLabel}</span>
        </>
      ) : (
        children
      )}
    </Comp>
  )
})

export { buttonVariants }
