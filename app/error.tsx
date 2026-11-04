'use client'

import * as React from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Route level error boundary.
 *
 * It never prints the raw error to the page, because a database error message
 * can contain a connection string or a column value. The digest is enough to
 * find the matching server log.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    // Logged without any payload, so nothing personal reaches the console.
    console.error(JSON.stringify({ event: 'ui.error_boundary', digest: error.digest ?? null }))
  }, [error])

  return (
    <div className="container flex min-h-[60svh] flex-col items-center justify-center py-16 text-center">
      <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <AlertTriangle className="h-8 w-8" aria-hidden="true" />
      </span>

      <h1 className="mt-6 text-fluid-3xl font-semibold">Something went wrong</h1>
      <p className="mt-4 max-w-md text-fluid-base text-ink-soft">
        This one is on us, not on you. Nothing you were doing has been lost, and no booking was
        made or changed by this error.
      </p>

      <div className="mt-8 flex flex-col gap-3 xs:flex-row">
        <Button onClick={reset} size="lg">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </Button>
        <Button asChild variant="secondary" size="lg">
          <Link href="/">Back to the home page</Link>
        </Button>
      </div>

      {error.digest && (
        <p className="mt-8 text-fluid-xs text-ink-muted">
          Reference for support: <code>{error.digest}</code>
        </p>
      )}
    </div>
  )
}
