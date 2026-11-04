'use client'

import { Pencil } from 'lucide-react'

import { formatClockTime, formatLongDate } from '@/lib/time'
import { formatDuration, formatPriceRange } from '@/lib/utils'
import { Badge } from '@/components/ui/primitives'
import type { ProviderRecord, ServiceRecord } from '@/lib/types'
import type { WizardState } from './types'

/**
 * Step 4. One summary card, with an edit link beside each group that jumps
 * back to the step that owns it.
 */
export function StepReview({
  service,
  provider,
  state,
  timezoneLabel,
  onJump,
}: {
  service: ServiceRecord
  provider: ProviderRecord | null
  state: WizardState
  timezoneLabel: string
  onJump: (step: 1 | 2 | 3 | 4) => void
}) {
  const { details, date, time } = state

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-fluid-xl">Check this over</h2>
        <p className="mt-2 text-fluid-sm text-ink-soft">
          Nothing is booked until you press confirm. You can still change any part of it.
        </p>
      </div>

      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        <ReviewGroup title="Service and doctor" onEdit={() => onJump(1)} editLabel="Edit service and doctor">
          <ReviewRow label="Service" value={service.name} />
          <ReviewRow
            label="Doctor"
            value={provider ? `${provider.fullName}, ${provider.specialty}` : 'Any available doctor'}
          />
          <ReviewRow label="Length" value={formatDuration(service.durationMinutes)} />
          <ReviewRow
            label="Price range"
            value={`${formatPriceRange(service.priceMin, service.priceMax)}, settled at reception`}
          />
          {service.isTelehealth && (
            <div className="pt-1">
              <Badge tone="accent">A video link is emailed before your slot</Badge>
            </div>
          )}
        </ReviewGroup>

        <ReviewGroup title="Date and time" onEdit={() => onJump(2)} editLabel="Edit date and time">
          <ReviewRow label="Date" value={date ? formatLongDate(date, 'UTC') : '-'} />
          <ReviewRow label="Time" value={time ? `${formatClockTime(time)} (${timezoneLabel})` : '-'} />
        </ReviewGroup>

        <ReviewGroup title="Your details" onEdit={() => onJump(3)} editLabel="Edit your details">
          <ReviewRow label="Patient" value={details.fullName} />
          <ReviewRow label="Email" value={details.email} />
          <ReviewRow label="Mobile" value={details.phone} />
          <ReviewRow label="Date of birth" value={details.dateOfBirth} />
          <ReviewRow
            label="Patient type"
            value={details.patientType === 'new' ? 'First visit' : 'Returning patient'}
          />
          {details.insurance && <ReviewRow label="HMO or insurance" value={details.insurance} />}
          <ReviewRow
            label="Reminder"
            value={details.reminderChannel === 'sms' ? 'By SMS' : 'By email'}
          />
          <div className="pt-2">
            <p className="text-fluid-xs uppercase tracking-wide text-ink-muted">Reason for visit</p>
            <p className="mt-1.5 whitespace-pre-line text-fluid-sm leading-relaxed text-ink">
              {details.reasonForVisit}
            </p>
          </div>
        </ReviewGroup>
      </div>

      <p className="text-fluid-xs leading-relaxed text-ink-muted">
        By confirming you agree to the{' '}
        <a href="/terms" className="link-underline text-primary" target="_blank" rel="noreferrer">
          Terms of Use
        </a>{' '}
        and to the handling of your details described in the{' '}
        <a href="/privacy" className="link-underline text-primary" target="_blank" rel="noreferrer">
          Privacy Policy
        </a>
        .
      </p>
    </div>
  )
}

function ReviewGroup({
  title,
  onEdit,
  editLabel,
  children,
}: {
  title: string
  onEdit: () => void
  editLabel: string
  children: React.ReactNode
}) {
  return (
    <section className="p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-display text-fluid-lg">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          aria-label={editLabel}
          className="tap-target -mr-2 inline-flex items-center gap-1.5 rounded-full px-3 text-fluid-sm text-primary hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          Edit
        </button>
      </div>
      <dl className="flex flex-col gap-2">{children}</dl>
    </section>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 xs:flex-row xs:items-baseline xs:justify-between xs:gap-6">
      <dt className="text-fluid-xs uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="text-fluid-sm text-ink xs:text-right">{value}</dd>
    </div>
  )
}
