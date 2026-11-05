'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FilterX, RotateCw, Search, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { addDaysToDateString } from '@/lib/time'
import { Button } from '@/components/ui/button'
import { SelectField, TextField } from '@/components/ui/field'
import { useBlockingLoader } from '@/components/loading-overlay'

/**
 * Filter bar for the staff dashboard.
 *
 * State lives in the query string rather than in React, so a filtered view can
 * be bookmarked, shared between staff and reloaded without losing its place.
 *
 * Search is the field reception actually reaches for: someone is on the phone
 * offering a surname or a reference read off an email, and scrolling a date
 * filtered table is the wrong tool for that.
 */
export function AdminFilters({
  providers,
  today,
  current,
}: {
  providers: { id: string; fullName: string }[]
  today: string
  current: { date: string; provider: string; status: string; past: boolean; q: string }
}) {
  const router = useRouter()
  const params = useSearchParams()
  const loader = useBlockingLoader()

  const [search, setSearch] = React.useState(current.q)
  const [refreshing, setRefreshing] = React.useState(false)

  // Keep the box in step when the query string changes from elsewhere, such as
  // the browser back button or Clear filters.
  React.useEffect(() => {
    setSearch(current.q)
  }, [current.q])

  const push = React.useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(params.toString())
      mutate(next)
      const query = next.toString()
      router.push(query ? `/admin?${query}` : '/admin')
    },
    [params, router],
  )

  const apply = (key: string, value: string) =>
    push((next) => {
      if (value) next.set(key, value)
      else next.delete(key)
    })

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault()
    apply('q', search.trim())
  }

  /**
   * Quick ranges. A date input is precise but slow, and "today" is the view a
   * receptionist wants most mornings.
   */
  const quickDates: { label: string; date: string }[] = [
    { label: 'Today', date: today },
    { label: 'Tomorrow', date: addDaysToDateString(today, 1) },
  ]

  const refresh = async () => {
    setRefreshing(true)
    const done = loader.start('Refreshing')
    router.refresh()
    // router.refresh resolves before the new data paints, so a short hold stops
    // the button flickering back to idle while the table is still updating.
    setTimeout(() => {
      setRefreshing(false)
      done()
    }, 600)
  }

  const hasFilters = Boolean(
    current.date || current.provider || current.status || current.past || current.q,
  )

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      {/* Search sits on its own row: it is the widest input and the one most
          often used on its own. */}
      <form onSubmit={submitSearch} className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reference, patient, email, phone, doctor"
            aria-label="Search appointments"
            className={cn(
              'h-12 w-full rounded-xl border border-line bg-surface pl-11 pr-10 text-ink',
              'placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary',
            )}
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                apply('q', '')
              }}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <Button type="submit" className="shrink-0 sm:w-auto">
          <Search className="h-4 w-4" aria-hidden="true" />
          Search
        </Button>
      </form>

      {/* Quick ranges */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-fluid-xs uppercase tracking-wide text-ink-muted">Jump to</span>
        {quickDates.map((quick) => {
          const active = current.date === quick.date
          return (
            <button
              key={quick.label}
              type="button"
              aria-pressed={active}
              onClick={() => apply('date', active ? '' : quick.date)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-fluid-xs transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                active
                  ? 'border-primary bg-primary text-primary-ink'
                  : 'border-line bg-surface text-ink-soft hover:border-primary/50 hover:text-ink',
              )}
            >
              {quick.label}
            </button>
          )
        })}

        <button
          type="button"
          aria-pressed={current.past}
          onClick={() => apply('past', current.past ? '' : '1')}
          className={cn(
            'rounded-full border px-3 py-1.5 text-fluid-xs transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            current.past
              ? 'border-primary bg-primary text-primary-ink'
              : 'border-line bg-surface text-ink-soft hover:border-primary/50 hover:text-ink',
          )}
        >
          Include past
        </button>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={refresh}
            loading={refreshing}
            loadingLabel="Refreshing"
          >
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => router.push('/admin')}>
              <FilterX className="h-4 w-4" aria-hidden="true" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Precise filters */}
      <div className="mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-2 lg:grid-cols-3">
        <TextField
          id="filter-date"
          label="Date"
          type="date"
          value={current.date}
          onChange={(e) => apply('date', e.target.value)}
          hint={`Empty shows everything upcoming. Today is ${today}.`}
        />

        <SelectField
          id="filter-provider"
          label="Doctor"
          value={current.provider}
          onChange={(e) => apply('provider', e.target.value)}
        >
          <option value="">All doctors</option>
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.fullName}
            </option>
          ))}
        </SelectField>

        <SelectField
          id="filter-status"
          label="Status"
          value={current.status}
          onChange={(e) => apply('status', e.target.value)}
        >
          <option value="">Any status</option>
          <option value="pending">Awaiting confirmation</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
          <option value="no_show">Missed</option>
        </SelectField>
      </div>
    </div>
  )
}
