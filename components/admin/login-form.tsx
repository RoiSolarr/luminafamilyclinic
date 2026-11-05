'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, Eye, EyeOff, LogIn } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useBlockingLoader } from '@/components/loading-overlay'

/**
 * Staff password form.
 *
 * Replaces the browser's own Basic auth dialog, which could not be styled and,
 * worse, appeared unprompted whenever Next.js prefetched the /admin link in the
 * footer.
 *
 * No username field: the demo has one shared password, and an empty box that
 * always takes the same value is a box worth removing.
 */
export function AdminLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const loader = useBlockingLoader()

  const [password, setPassword] = React.useState('')
  const [reveal, setReveal] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const inputRef = React.useRef<HTMLInputElement>(null)
  const next = searchParams.get('next') ?? undefined

  React.useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (submitting) return

    if (!password) {
      setError('Enter the staff password.')
      inputRef.current?.focus()
      return
    }

    setSubmitting(true)
    setError(null)
    const done = loader.start('Signing you in')

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, next }),
      })
      const json = await response.json()

      if (!response.ok || !json.ok) {
        setError(json?.error?.message ?? 'That password is not correct.')
        setPassword('')
        inputRef.current?.focus()
        return
      }

      // `replace` rather than `push`, so the back button does not return to a
      // login page the session has already passed.
      router.replace(json.data.redirectTo ?? '/admin')
      router.refresh()
    } catch {
      setError('We could not reach the server. Check your connection and try again.')
    } finally {
      setSubmitting(false)
      done()
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div>
        <label htmlFor="admin-password" className="block text-fluid-sm font-medium text-ink">
          Staff password
        </label>

        <div className="relative mt-2">
          <input
            id="admin-password"
            ref={inputRef}
            type={reveal ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (error) setError(null)
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'admin-password-error' : undefined}
            className={cn(
              'h-14 w-full rounded-xl border bg-surface pl-4 pr-14 text-ink transition-colors',
              'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary',
              error ? 'border-danger focus:ring-danger' : 'border-line',
            )}
          />

          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? 'Hide password' : 'Show password'}
            aria-pressed={reveal}
            className="tap-target absolute right-1 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-lg text-ink-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {reveal ? (
              <EyeOff className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Eye className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>

        {error && (
          <p
            id="admin-password-error"
            role="alert"
            className="mt-2 flex items-start gap-1.5 text-fluid-xs text-danger"
          >
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}
      </div>

      <Button type="submit" full size="lg" loading={submitting} loadingLabel="Signing in">
        <LogIn className="h-4 w-4" aria-hidden="true" />
        Sign in
      </Button>

      <p className="text-fluid-xs leading-relaxed text-ink-muted">
        Your session lasts twelve hours. Sign out when you leave a shared computer.
      </p>
    </form>
  )
}
