'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FilterX } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { SelectField, TextField } from '@/components/ui/field'

/**
 * Filter bar for the staff dashboard.
 *
 * State lives in the query string rather than in React, so a filtered view can
 * be bookmarked, shared between staff and reloaded without losing its place.
 */
export function AdminFilters({
  providers,
  today,
  current,
}: {
  providers: { id: string; fullName: string }[]
  today: string
  current: { date: string; provider: string; status: string; past: boolean }
}) {
  const router = useRouter()
  const params = useSearchParams()

  const apply = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    router.push(`/admin?${next.toString()}`)
  }

  const hasFilters = current.date || current.provider || current.status || current.past

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TextField
          id="filter-date"
          label="Date"
          type="date"
          value={current.date}
          min={undefined}
          onChange={(e) => apply('date', e.target.value)}
          hint={`Leave empty for everything upcoming. Today is ${today}.`}
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

        <div className="flex flex-col justify-end gap-3">
          <label className="flex min-h-[44px] items-center gap-2.5 text-fluid-sm text-ink">
            <input
              type="checkbox"
              checked={current.past}
              onChange={(e) => apply('past', e.target.checked ? '1' : '')}
              className="h-5 w-5 rounded border-line text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            Include past appointments
          </label>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => router.push('/admin')}>
              <FilterX className="h-4 w-4" aria-hidden="true" />
              Clear filters
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
