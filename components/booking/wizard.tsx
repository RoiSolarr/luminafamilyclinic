'use client'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Clock, Phone } from 'lucide-react'

import { clinic } from '@/config/clinic'
import { addDaysToDateString, formatClockTime, formatLongDate } from '@/lib/time'
import { cn, formatDuration, formatPriceRange } from '@/lib/utils'
import {
  patientDetailsSchema,
  wizardServiceStepSchema,
  wizardSlotStepSchema,
  fieldErrors,
} from '@/lib/validation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/primitives'
import { StepTransition } from '@/components/motion'
import { useToast } from '@/components/ui/toast'
import { useBlockingLoader } from '@/components/loading-overlay'

import { Stepper } from './stepper'
import { StepService } from './step-service'
import { StepSlot } from './step-slot'
import { StepDetails } from './step-details'
import { StepReview } from './step-review'
import { BookingSuccessScreen } from './success'
import { emptyDetails, STEP_TITLES, type BookingSuccess, type WizardContext, type WizardState } from './types'

const STORAGE_KEY = 'lumina-booking-wizard-v1'

/**
 * The booking wizard.
 *
 * Progress is mirrored into sessionStorage after every change, so a refresh,
 * an accidental back gesture or a phone call mid booking does not wipe the
 * form. The key is cleared once the booking succeeds.
 */
export function BookingWizard({ services, providers, org, today }: WizardContext) {
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const loader = useBlockingLoader()

  const [state, setState] = React.useState<WizardState>({
    step: 1,
    serviceId: null,
    providerId: null,
    date: null,
    time: null,
    details: emptyDetails,
  })
  const [honeypot, setHoneypot] = React.useState('')
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [submitting, setSubmitting] = React.useState(false)
  const [booking, setBooking] = React.useState<BookingSuccess | null>(null)
  const [furthest, setFurthest] = React.useState(1)
  const [hydrated, setHydrated] = React.useState(false)
  const [slotProviderIds, setSlotProviderIds] = React.useState<string[]>([])

  const headingRef = React.useRef<HTMLHeadingElement>(null)

  /* ------------------------------------------------------ restore and seed */

  React.useEffect(() => {
    let restored: Partial<WizardState> | null = null
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY)
      if (raw) restored = JSON.parse(raw) as Partial<WizardState>
    } catch {
      // Storage blocked. Start fresh.
    }

    // Deep links from the services and doctors pages win over stored state.
    const serviceSlug = searchParams.get('service')
    const doctorId = searchParams.get('doctor')
    const serviceFromUrl = serviceSlug ? services.find((s) => s.slug === serviceSlug) : undefined
    const doctorFromUrl = doctorId ? providers.find((p) => p.id === doctorId) : undefined

    setState((current) => {
      const next: WizardState = {
        ...current,
        ...(restored ?? {}),
        details: { ...emptyDetails, ...(restored?.details ?? {}) },
      }

      if (serviceFromUrl) {
        next.serviceId = serviceFromUrl.id
        if (next.providerId && !serviceFromUrl.id) next.providerId = null
      }
      if (doctorFromUrl) {
        next.providerId = doctorFromUrl.id
        // Pick the doctor's first service if none was chosen yet.
        if (!next.serviceId && doctorFromUrl.serviceIds[0]) {
          next.serviceId = doctorFromUrl.serviceIds[0]
        }
      }

      // A stored doctor who no longer offers the stored service is dropped.
      if (next.serviceId && next.providerId) {
        const provider = providers.find((p) => p.id === next.providerId)
        if (!provider || !provider.serviceIds.includes(next.serviceId)) next.providerId = null
      }

      // Never restore straight into a later step without the data it needs.
      if (!next.serviceId) next.step = 1
      else if (next.step >= 3 && (!next.date || !next.time)) next.step = 2

      return next
    })

    setFurthest((f) => Math.max(f, restored?.step ?? 1))
    setHydrated(true)
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  React.useEffect(() => {
    if (!hydrated) return
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Storage blocked; the wizard still works, it just will not survive a refresh.
    }
  }, [state, hydrated])

  /* ------------------------------------------------------------- derived */

  const service = React.useMemo(
    () => services.find((s) => s.id === state.serviceId) ?? null,
    [services, state.serviceId],
  )
  const provider = React.useMemo(
    () => providers.find((p) => p.id === state.providerId) ?? null,
    [providers, state.providerId],
  )

  const minDate = React.useMemo(() => today, [today])
  const maxDate = React.useMemo(
    () => addDaysToDateString(today, org.settings.bookingWindowDays),
    [today, org.settings.bookingWindowDays],
  )

  /* -------------------------------------------------------------- actions */

  const patch = React.useCallback((next: Partial<WizardState>) => {
    setState((current) => ({ ...current, ...next }))
  }, [])

  const patchDetails = React.useCallback((next: Partial<WizardState['details']>) => {
    setState((current) => ({ ...current, details: { ...current.details, ...next } }))
    setErrors((current) => {
      const copy = { ...current }
      for (const key of Object.keys(next)) delete copy[key]
      return copy
    })
  }, [])

  const goTo = React.useCallback(
    (step: 1 | 2 | 3 | 4) => {
      setState((current) => ({ ...current, step }))
      setFurthest((f) => Math.max(f, step))
      setErrors({})
      // Move focus to the step heading so a keyboard or screen reader user is
      // taken to the new content rather than left at the bottom of the page.
      window.requestAnimationFrame(() => {
        headingRef.current?.focus()
        window.scrollTo({ top: 0, behavior: 'smooth' })
      })
    },
    [],
  )

  const validateCurrentStep = (): boolean => {
    if (state.step === 1) {
      const result = wizardServiceStepSchema.safeParse({
        serviceId: state.serviceId ?? '',
        providerId: state.providerId,
      })
      if (!result.success) {
        setErrors(fieldErrors(result.error))
        toast({ title: 'Choose a service to continue', tone: 'error' })
        return false
      }
      return true
    }

    if (state.step === 2) {
      const result = wizardSlotStepSchema.safeParse({
        date: state.date ?? '',
        time: state.time ?? '',
      })
      if (!result.success) {
        toast({ title: 'Pick a date and a time to continue', tone: 'error' })
        return false
      }
      return true
    }

    if (state.step === 3) {
      const result = patientDetailsSchema.safeParse({
        ...state.details,
        insurance: state.details.insurance || '',
        website: honeypot,
      })
      if (!result.success) {
        const flat = fieldErrors(result.error)
        setErrors(flat)
        const count = Object.keys(flat).length
        toast({
          title: count === 1 ? 'One detail needs a second look' : `${count} details need a second look`,
          description: 'The fields are marked below.',
          tone: 'error',
        })
        // Send focus to the first field with a problem.
        window.requestAnimationFrame(() => {
          const firstKey = Object.keys(flat)[0]
          if (firstKey) {
            document.getElementById(firstKey)?.focus()
          }
        })
        return false
      }
      setErrors({})
      return true
    }

    return true
  }

  const next = () => {
    if (!validateCurrentStep()) return
    if (state.step < 4) goTo((state.step + 1) as 2 | 3 | 4)
  }

  const back = () => {
    if (state.step > 1) goTo((state.step - 1) as 1 | 2 | 3)
  }

  const submit = async () => {
    if (!service || !state.date || !state.time) return
    setSubmitting(true)
    const done = loader.start('Confirming your appointment')

    try {
      const response = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: service.id,
          providerId: state.providerId,
          date: state.date,
          time: state.time,
          ...state.details,
          insurance: state.details.insurance || '',
          website: honeypot,
        }),
      })

      const json = await response.json()

      if (response.status === 409) {
        toast({
          title: 'That slot was just taken',
          description: 'Please choose another time.',
          tone: 'error',
        })
        patch({ time: null, step: 2 })
        setFurthest((f) => Math.max(f, 2))
        window.requestAnimationFrame(() => {
          headingRef.current?.focus()
          window.scrollTo({ top: 0, behavior: 'smooth' })
        })
        return
      }

      if (!response.ok || !json.ok) {
        if (json?.error?.fields) {
          setErrors(json.error.fields)
          goTo(3)
        }
        toast({
          title: 'We could not confirm that booking',
          description: json?.error?.message ?? 'Please try again in a moment.',
          tone: 'error',
        })
        return
      }

      try {
        window.sessionStorage.removeItem(STORAGE_KEY)
      } catch {
        /* ignore */
      }

      setBooking(json.data as BookingSuccess)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      toast({
        title: 'We could not reach the clinic',
        description: 'Check your connection and try again. Nothing has been booked.',
        tone: 'error',
      })
    } finally {
      setSubmitting(false)
      done()
    }
  }

  /* --------------------------------------------------------------- render */

  if (booking) {
    return <BookingSuccessScreen booking={booking} />
  }

  const canAdvance =
    (state.step === 1 && Boolean(state.serviceId)) ||
    (state.step === 2 && Boolean(state.date && state.time)) ||
    state.step === 3 ||
    state.step === 4

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-10">
      <div className="min-w-0">
        <Stepper current={state.step} furthestReached={furthest} onJump={goTo} />

        {/* Announced to screen readers whenever the step changes. */}
        <p aria-live="polite" className="sr-only">
          Step {state.step} of 4: {STEP_TITLES[state.step - 1]}
        </p>

        <h2 ref={headingRef} tabIndex={-1} className="sr-only">
          {STEP_TITLES[state.step - 1]}
        </h2>

        <div className="mt-8">
          <AnimatePresence mode="wait" initial={false}>
            <StepTransition stepKey={state.step}>
              {state.step === 1 && (
                <StepService
                  services={services}
                  providers={providers}
                  serviceId={state.serviceId}
                  providerId={state.providerId}
                  onServiceChange={(id) => {
                    // Changing the service can invalidate the doctor and the slot.
                    const stillValid =
                      state.providerId &&
                      providers.find((p) => p.id === state.providerId)?.serviceIds.includes(id)
                    patch({
                      serviceId: id,
                      providerId: stillValid ? state.providerId : null,
                      time: null,
                    })
                    setErrors({})
                  }}
                  onProviderChange={(id) => patch({ providerId: id, time: null })}
                />
              )}

              {state.step === 2 && service && (
                <StepSlot
                  service={service}
                  providerId={state.providerId}
                  date={state.date}
                  time={state.time}
                  onDateChange={(d) => patch({ date: d })}
                  onTimeChange={(t) => patch({ time: t })}
                  onSlotProvidersChange={setSlotProviderIds}
                  timezone={org.timezone}
                  timezoneLabel={clinic.timezoneLabel}
                  today={today}
                  minDate={minDate}
                  maxDate={maxDate}
                  holidays={org.settings.holidays}
                  closedWeekdays={org.settings.closedWeekdays}
                />
              )}

              {state.step === 3 && (
                <StepDetails
                  details={state.details}
                  errors={errors}
                  onChange={patchDetails}
                  honeypot={honeypot}
                  onHoneypotChange={setHoneypot}
                />
              )}

              {state.step === 4 && service && (
                <StepReview
                  service={service}
                  provider={provider}
                  state={state}
                  timezoneLabel={clinic.timezoneLabel}
                  onJump={goTo}
                />
              )}
            </StepTransition>
          </AnimatePresence>
        </div>

        {/* Sticky action bar. Fixed on phones, inline from `lg` up. */}
        <div
          className={cn(
            'safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 px-4 pt-3 backdrop-blur',
            'lg:static lg:mt-10 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none',
          )}
        >
          <div className="mx-auto flex max-w-3xl items-center gap-3 lg:max-w-none">
            <Button
              variant="secondary"
              onClick={back}
              disabled={state.step === 1 || submitting}
              className={state.step === 1 ? 'invisible' : ''}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </Button>

            <div className="flex-1" />

            {state.step < 4 ? (
              <Button onClick={next} disabled={!canAdvance} className="min-w-[8rem] flex-1 xs:flex-none">
                Next
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button
                onClick={() => void submit()}
                loading={submitting}
                loadingLabel="Confirming"
                className="min-w-[11rem] flex-1 xs:flex-none"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                Confirm booking
              </Button>
            )}
          </div>
        </div>

        {/* Clearance so the fixed bar never sits on top of the content. */}
        <div aria-hidden="true" className="h-24 lg:hidden" />
      </div>

      {/* Live summary, desktop only. On phones the review step covers this. */}
      <aside className="hidden lg:block lg:sticky lg:top-24" aria-label="Booking summary">
        <Card>
          <h2 className="font-display text-fluid-lg">Your appointment</h2>

          <dl className="mt-4 flex flex-col gap-3 text-fluid-sm">
            <SummaryRow label="Service" value={service?.name ?? 'Not chosen yet'} muted={!service} />
            <SummaryRow
              label="Doctor"
              value={
                state.serviceId
                  ? provider
                    ? provider.fullName
                    : 'Any available doctor'
                  : 'Not chosen yet'
              }
              muted={!state.serviceId}
            />
            <SummaryRow
              label="Date"
              value={state.date ? formatLongDate(state.date, org.timezone) : 'Not chosen yet'}
              muted={!state.date}
            />
            <SummaryRow
              label="Time"
              value={state.time ? formatClockTime(state.time) : 'Not chosen yet'}
              muted={!state.time}
            />
            {service && (
              <SummaryRow label="Length" value={formatDuration(service.durationMinutes)} />
            )}
            {service && (
              <SummaryRow
                label="Price range"
                value={formatPriceRange(service.priceMin, service.priceMax)}
              />
            )}
          </dl>

          {state.step === 2 && state.time && state.providerId === null && slotProviderIds.length > 1 && (
            <p className="mt-4 rounded-xl bg-primary-soft p-3 text-fluid-xs text-primary-strong">
              {slotProviderIds.length} doctors are free at that time. We assign one when you
              confirm.
            </p>
          )}

          <p className="mt-5 flex items-start gap-2 border-t border-line pt-4 text-fluid-xs text-ink-muted">
            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Times shown in {clinic.timezoneLabel}.
          </p>
        </Card>

        <Card className="mt-4 bg-surface-2/60">
          <p className="flex items-start gap-2 text-fluid-xs leading-relaxed text-ink-soft">
            <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span>
              Prefer to talk to someone? Call{' '}
              <a href={`tel:${clinic.contact.phoneHref}`} className="link-underline text-primary">
                {clinic.contact.phone}
              </a>{' '}
              during opening hours.
            </span>
          </p>
        </Card>
      </aside>
    </div>
  )
}

function SummaryRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-fluid-xs uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className={cn('text-right', muted ? 'text-ink-muted' : 'text-ink')}>{value}</dd>
    </div>
  )
}

/** Emergency banner, shown above the wizard on the Book page. */
export function EmergencyBanner() {
  return (
    <div
      role="note"
      className="flex items-start gap-3 rounded-2xl border border-accent/40 bg-accent-soft p-4"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
      <p className="text-fluid-sm leading-relaxed text-accent">{clinic.emergencyNotice}</p>
    </div>
  )
}
