import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

import { clinic } from '@/config/clinic'
import { AdminLoginForm } from '@/components/admin/login-form'
import { Skeleton } from '@/components/ui/primitives'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Staff sign in',
  description: 'Sign in to the Lumina Family Clinic staff dashboard.',
  robots: { index: false, follow: false, nocache: true },
}

export default function AdminLoginPage() {
  return (
    <div className="relative flex min-h-[calc(100svh-4rem)] items-center justify-center overflow-hidden px-4 pb-12 pt-24">
      {/* Decorative wash, matching the home page hero so this does not feel
          like a bolted on admin tool. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-32 h-[26rem] w-[26rem] rounded-full bg-primary-soft blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-accent-soft blur-3xl"
      />

      {/* Pinned to the left edge of the page rather than to the card.
          Anchored to the card it still read as centred, because the card is.
          A back link belongs in the top left corner, where every browser and
          every app has trained people to look for it. */}
      <div className="absolute inset-x-0 top-0 px-4 pt-6 xs:px-5 md:px-8">
        <Link
          href="/"
          prefetch={false}
          className="link-underline inline-flex items-center gap-1.5 text-fluid-sm text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to the clinic site
        </Link>
      </div>

      <div className="relative w-full max-w-md">
        <div className="surface-card p-6 xs:p-8">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-ink">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </span>

          <h1 className="mt-5 font-display text-fluid-2xl font-semibold">Staff sign in</h1>
          <p className="mt-2 text-fluid-sm leading-relaxed text-ink-soft">
            The dashboard shows patient names and appointment details, so it sits behind a
            password. Ask the clinic manager if you do not have it.
          </p>

          <div className="mt-7">
            <Suspense fallback={<Skeleton className="h-40 w-full" />}>
              <AdminLoginForm />
            </Suspense>
          </div>
        </div>

        <p className="mt-6 text-center text-fluid-xs leading-relaxed text-ink-muted">
          {clinic.demoNotice}
          <br />
          This demo uses one shared password. A real clinic would use per person
          accounts.
        </p>
      </div>
    </div>
  )
}
