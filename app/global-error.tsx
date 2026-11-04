'use client'

/**
 * Last resort boundary. It replaces the whole document, so it carries its own
 * html and body and deliberately uses inline styles rather than Tailwind, which
 * may not have loaded if the failure happened early.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100svh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#faf9f6',
          color: '#0f2a38',
          padding: '1.5rem',
        }}
      >
        <main style={{ maxWidth: '32rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.75rem', margin: '0 0 0.75rem' }}>Something went wrong</h1>
          <p style={{ lineHeight: 1.6, color: '#475d6a', margin: '0 0 1.5rem' }}>
            The page could not be displayed. Reloading usually sorts it out.
          </p>
          <button
            onClick={reset}
            style={{
              minHeight: 44,
              padding: '0 1.5rem',
              borderRadius: 999,
              border: 'none',
              background: '#0d7b6e',
              color: '#fff',
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
          {error.digest && (
            <p style={{ marginTop: '2rem', fontSize: '0.8rem', color: '#70828c' }}>
              Reference: {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  )
}
