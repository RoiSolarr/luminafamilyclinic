import Link from 'next/link'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { clinic } from '@/config/clinic'

export const metadata = {
  title: 'Page not found',
}

export default function NotFound() {
  return (
    <div className="container flex min-h-[60svh] flex-col items-center justify-center py-16 text-center">
      <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary-strong">
        <Compass className="h-8 w-8" aria-hidden="true" />
      </span>

      <p className="mt-6 font-display text-fluid-xl text-ink-muted">404</p>
      <h1 className="mt-2 text-fluid-3xl font-semibold">We cannot find that page</h1>
      <p className="mt-4 max-w-md text-fluid-base text-ink-soft">
        The link may be out of date, or the address may have a typo in it. The pages below cover
        almost everything this site does.
      </p>

      <div className="mt-8 flex flex-col gap-3 xs:flex-row">
        <Button asChild size="lg">
          <Link href="/book">Book an appointment</Link>
        </Button>
        <Button asChild variant="secondary" size="lg">
          <Link href="/">Back to the home page</Link>
        </Button>
      </div>

      <nav aria-label="Suggested pages" className="mt-8">
        <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-fluid-sm text-ink-soft">
          {clinic.nav.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="link-underline hover:text-ink">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
