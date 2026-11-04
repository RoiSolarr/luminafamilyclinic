'use client'

import * as React from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Text inputs with a floating label.
 *
 * The label starts inside the field and rises when the field has focus or a
 * value, which keeps the question visible while the user types. It is a real
 * <label> bound by htmlFor, so screen readers and click to focus both work.
 */

type BaseProps = {
  id: string
  label: string
  error?: string
  hint?: string
  className?: string
  containerClassName?: string
}

function FieldShell({
  id,
  error,
  hint,
  children,
  className,
}: {
  id: string
  error?: string
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('w-full', className)}>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-fluid-xs text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 flex items-start gap-1.5 text-fluid-xs text-danger"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}

const fieldBase =
  'peer w-full rounded-xl border bg-surface px-4 pb-2 pt-6 text-ink ' +
  'placeholder-transparent transition-colors duration-200 ' +
  'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'

const labelBase =
  'pointer-events-none absolute left-4 top-2 text-fluid-xs text-ink-muted transition-all duration-200 ' +
  'peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-fluid-base ' +
  'peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-fluid-xs peer-focus:text-primary'

export interface TextFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'>,
    BaseProps {}

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { id, label, error, hint, className, containerClassName, required, ...props },
  ref,
) {
  return (
    <FieldShell id={id} error={error} hint={hint} className={containerClassName}>
      <div className="relative">
        <input
          id={id}
          ref={ref}
          placeholder={label}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={cn(
            fieldBase,
            'h-14',
            error ? 'border-danger focus:ring-danger' : 'border-line',
            className,
          )}
          {...props}
        />
        <label htmlFor={id} className={labelBase}>
          {label}
          {required && <span className="text-accent"> *</span>}
        </label>
      </div>
    </FieldShell>
  )
})

export interface TextAreaFieldProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'>,
    BaseProps {
  /** Shows a live "n of max" counter under the field. */
  counterMax?: number
  currentLength?: number
}

export const TextAreaField = React.forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  function TextAreaField(
    {
      id,
      label,
      error,
      hint,
      className,
      containerClassName,
      counterMax,
      currentLength = 0,
      required,
      rows = 4,
      ...props
    },
    ref,
  ) {
    const nearLimit = counterMax ? currentLength > counterMax * 0.9 : false

    return (
      <FieldShell id={id} error={error} hint={hint} className={containerClassName}>
        <div className="relative">
          <textarea
            id={id}
            ref={ref}
            rows={rows}
            placeholder={label}
            required={required}
            maxLength={counterMax}
            aria-invalid={error ? true : undefined}
            aria-describedby={
              [error ? `${id}-error` : null, hint ? `${id}-hint` : null, counterMax ? `${id}-counter` : null]
                .filter(Boolean)
                .join(' ') || undefined
            }
            className={cn(
              fieldBase,
              'resize-y leading-relaxed',
              error ? 'border-danger focus:ring-danger' : 'border-line',
              className,
            )}
            {...props}
          />
          <label htmlFor={id} className={cn(labelBase, 'peer-placeholder-shown:top-5 peer-placeholder-shown:translate-y-0')}>
            {label}
            {required && <span className="text-accent"> *</span>}
          </label>
        </div>
        {counterMax && (
          <p
            id={`${id}-counter`}
            aria-live="polite"
            className={cn(
              'mt-1.5 text-right text-fluid-xs tabular-nums',
              nearLimit ? 'text-accent' : 'text-ink-muted',
            )}
          >
            {currentLength} of {counterMax}
          </p>
        )}
      </FieldShell>
    )
  },
)

export interface SelectFieldProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'id'>,
    BaseProps {
  children: React.ReactNode
}

export const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(
  function SelectField(
    { id, label, error, hint, className, containerClassName, required, children, ...props },
    ref,
  ) {
    return (
      <FieldShell id={id} error={error} hint={hint} className={containerClassName}>
        <div className="relative">
          <label htmlFor={id} className="absolute left-4 top-2 text-fluid-xs text-ink-muted">
            {label}
            {required && <span className="text-accent"> *</span>}
          </label>
          <select
            id={id}
            ref={ref}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
            className={cn(
              'h-14 w-full appearance-none rounded-xl border bg-surface px-4 pb-2 pt-6 text-ink',
              'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary',
              error ? 'border-danger focus:ring-danger' : 'border-line',
              className,
            )}
            {...props}
          >
            {children}
          </select>
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 fill-ink-muted"
          >
            <path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </div>
      </FieldShell>
    )
  },
)
