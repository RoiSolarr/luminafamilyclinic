'use client'

import { Check, Clock, Sparkles, Stethoscope, Video } from 'lucide-react'
import { cn, formatDuration, formatPriceRange, formatWeekdays } from '@/lib/utils'
import { Badge, InitialsAvatar } from '@/components/ui/primitives'
import type { ProviderRecord, ServiceRecord } from '@/lib/types'

/**
 * Step 1. Choose the service, then the doctor.
 *
 * Both lists are radio groups rather than selects: on a phone they are easier
 * to hit, and the extra context (length, price, languages) stays visible.
 */
export function StepService({
  services,
  providers,
  serviceId,
  providerId,
  onServiceChange,
  onProviderChange,
}: {
  services: ServiceRecord[]
  providers: ProviderRecord[]
  serviceId: string | null
  providerId: string | null
  onServiceChange: (id: string) => void
  onProviderChange: (id: string | null) => void
}) {
  const eligible = serviceId ? providers.filter((p) => p.serviceIds.includes(serviceId)) : []

  return (
    <div className="flex flex-col gap-10">
      <fieldset>
        <legend className="font-display text-fluid-xl">What do you need?</legend>
        <p className="mt-2 text-fluid-sm text-ink-soft">
          Pick the closest match. If none of them fit, choose General Consultation.
        </p>

        <div
          role="radiogroup"
          aria-label="Service"
          className="mt-5 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr))]"
        >
          {services.map((service) => {
            const selected = serviceId === service.id
            return (
              <button
                key={service.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onServiceChange(service.id)}
                className={cn(
                  'group relative flex flex-col rounded-2xl border p-4 text-left transition-all duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
                  selected
                    ? 'border-primary bg-primary-soft shadow-soft'
                    : 'border-line bg-surface hover:border-primary/45 hover:bg-surface-2',
                )}
              >
                <span className="flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      'inline-flex h-10 w-10 items-center justify-center rounded-xl',
                      selected ? 'bg-primary text-primary-ink' : 'bg-primary-soft text-primary-strong',
                    )}
                  >
                    {service.isTelehealth ? (
                      <Video className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Stethoscope className="h-4 w-4" aria-hidden="true" />
                    )}
                  </span>
                  {selected && (
                    <Check className="h-5 w-5 text-primary-strong" aria-hidden="true" />
                  )}
                </span>

                <span className="mt-3 font-display text-fluid-lg text-ink">{service.name}</span>
                <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-fluid-xs text-ink-muted">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {formatDuration(service.durationMinutes)}
                  </span>
                  <span>{formatPriceRange(service.priceMin, service.priceMax)}</span>
                </span>
              </button>
            )
          })}
        </div>
      </fieldset>

      {serviceId && (
        <fieldset>
          <legend className="font-display text-fluid-xl">Who would you like to see?</legend>
          <p className="mt-2 text-fluid-sm text-ink-soft">
            Only the doctors who offer this service are shown.
          </p>

          <div role="radiogroup" aria-label="Doctor" className="mt-5 flex flex-col gap-3">
            {/* "Any" first: it is the fastest route to an appointment. */}
            <button
              type="button"
              role="radio"
              aria-checked={providerId === null}
              onClick={() => onProviderChange(null)}
              className={cn(
                'flex items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
                providerId === null
                  ? 'border-primary bg-primary-soft shadow-soft'
                  : 'border-line bg-surface hover:border-primary/45 hover:bg-surface-2',
              )}
            >
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Sparkles className="h-6 w-6" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-fluid-lg text-ink">
                  Any available doctor
                </span>
                <span className="mt-1 block text-fluid-sm text-ink-soft">
                  Shows every free time across the {eligible.length} doctors who offer this. We
                  assign one when you confirm.
                </span>
              </span>
              {providerId === null && (
                <Check className="h-5 w-5 shrink-0 text-primary-strong" aria-hidden="true" />
              )}
            </button>

            {eligible.map((doctor) => {
              const selected = providerId === doctor.id
              return (
                <button
                  key={doctor.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onProviderChange(doctor.id)}
                  className={cn(
                    'flex items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
                    selected
                      ? 'border-primary bg-primary-soft shadow-soft'
                      : 'border-line bg-surface hover:border-primary/45 hover:bg-surface-2',
                  )}
                >
                  <InitialsAvatar initials={doctor.initials} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-fluid-lg text-ink">
                      {doctor.fullName}
                    </span>
                    <span className="block text-fluid-sm text-primary">{doctor.specialty}</span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-2">
                      <Badge tone="neutral">
                        {formatWeekdays(doctor.schedule.map((s) => s.dayOfWeek))}
                      </Badge>
                      <span className="text-fluid-xs text-ink-muted">
                        {doctor.languages.join(', ')}
                      </span>
                    </span>
                  </span>
                  {selected && (
                    <Check className="h-5 w-5 shrink-0 text-primary-strong" aria-hidden="true" />
                  )}
                </button>
              )
            })}
          </div>
        </fieldset>
      )}
    </div>
  )
}
