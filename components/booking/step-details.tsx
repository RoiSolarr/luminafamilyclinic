'use client'

import * as React from 'react'
import { Mail, MessageSquare, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { SelectField, TextAreaField, TextField } from '@/components/ui/field'
import type { WizardState } from './types'

/**
 * Step 3. Patient details.
 *
 * Validation errors come from the parent, which runs the same Zod schema the
 * server uses, so the browser and the API never disagree about what is valid.
 */
export function StepDetails({
  details,
  errors,
  onChange,
  honeypot,
  onHoneypotChange,
}: {
  details: WizardState['details']
  errors: Record<string, string>
  onChange: (patch: Partial<WizardState['details']>) => void
  honeypot: string
  onHoneypotChange: (value: string) => void
}) {
  const consentId = React.useId()

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-fluid-xl">Who is the appointment for?</h2>
        <p className="mt-2 text-fluid-sm text-ink-soft">
          Enter the details of the person being seen. Use your own email and number if you are
          booking for a child or a parent, so the reminders reach you.
        </p>
      </div>

      {/* Honeypot. Hidden from sight and from assistive technology, but a bot
          filling every field will trip it and the booking is silently dropped. */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(event) => onHoneypotChange(event.target.value)}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="fullName"
          label="Full name of the patient"
          autoComplete="name"
          required
          value={details.fullName}
          error={errors.fullName}
          onChange={(e) => onChange({ fullName: e.target.value })}
          containerClassName="sm:col-span-2"
        />

        <TextField
          id="email"
          label="Email address"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={details.email}
          error={errors.email}
          hint="Your confirmation and manage link go here."
          onChange={(e) => onChange({ email: e.target.value })}
        />

        <TextField
          id="phone"
          label="Mobile number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          value={details.phone}
          error={errors.phone}
          hint="For example +63 917 555 0142."
          onChange={(e) => onChange({ phone: e.target.value })}
        />

        <TextField
          id="dateOfBirth"
          label="Date of birth"
          type="date"
          autoComplete="bday"
          required
          max={new Date().toISOString().slice(0, 10)}
          value={details.dateOfBirth}
          error={errors.dateOfBirth}
          onChange={(e) => onChange({ dateOfBirth: e.target.value })}
        />

        <SelectField
          id="patientType"
          label="Have you been here before?"
          required
          value={details.patientType}
          error={errors.patientType}
          onChange={(e) => onChange({ patientType: e.target.value as 'new' | 'returning' })}
        >
          <option value="new">This is my first visit</option>
          <option value="returning">I have been here before</option>
        </SelectField>

        <TextAreaField
          id="reasonForVisit"
          label="What is the visit about?"
          required
          rows={4}
          counterMax={500}
          currentLength={details.reasonForVisit.length}
          value={details.reasonForVisit}
          error={errors.reasonForVisit}
          hint="A sentence or two is plenty. It helps the clinical team prepare before you arrive."
          onChange={(e) => onChange({ reasonForVisit: e.target.value })}
          containerClassName="sm:col-span-2"
        />

        <TextField
          id="insurance"
          label="HMO or insurance (optional)"
          autoComplete="off"
          value={details.insurance}
          error={errors.insurance}
          hint="Coverage is confirmed at reception, not at booking."
          onChange={(e) => onChange({ insurance: e.target.value })}
          containerClassName="sm:col-span-2"
        />
      </div>

      <fieldset>
        <legend className="font-display text-fluid-lg">How should we remind you?</legend>
        <p className="mt-1.5 text-fluid-sm text-ink-soft">
          One reminder, roughly a day before your appointment.
        </p>

        <div role="radiogroup" aria-label="Reminder channel" className="mt-4 grid gap-3 xs:grid-cols-2">
          {(
            [
              { value: 'email', label: 'Email', icon: <Mail className="h-4 w-4" aria-hidden="true" />, hint: details.email || 'To your email address' },
              { value: 'sms', label: 'SMS', icon: <MessageSquare className="h-4 w-4" aria-hidden="true" />, hint: details.phone || 'To your mobile number' },
            ] as const
          ).map((option) => {
            const active = details.reminderChannel === option.value
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange({ reminderChannel: option.value })}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border p-4 text-left transition-all duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
                  active
                    ? 'border-primary bg-primary-soft'
                    : 'border-line bg-surface hover:border-primary/45 hover:bg-surface-2',
                )}
              >
                <span
                  className={cn(
                    'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                    active ? 'bg-primary text-primary-ink' : 'bg-surface-2 text-ink-soft',
                  )}
                >
                  {option.icon}
                </span>
                <span className="min-w-0">
                  <span className="block font-medium text-ink">{option.label}</span>
                  <span className="block truncate text-fluid-xs text-ink-muted">{option.hint}</span>
                </span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <div
        className={cn(
          'rounded-2xl border p-4',
          errors.consentGiven ? 'border-danger bg-danger/5' : 'border-line bg-surface-2/60',
        )}
      >
        <div className="flex items-start gap-3">
          <input
            id={consentId}
            type="checkbox"
            checked={details.consentGiven}
            onChange={(e) => onChange({ consentGiven: e.target.checked })}
            aria-describedby={errors.consentGiven ? `${consentId}-error` : undefined}
            aria-invalid={errors.consentGiven ? true : undefined}
            className="mt-1 h-5 w-5 shrink-0 rounded border-line text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <label htmlFor={consentId} className="text-fluid-sm leading-relaxed text-ink-soft">
            I agree that {`Lumina Family Clinic`} may store and process the details above, including
            the health information in my reason for visit, in order to manage this appointment and
            the reminders around it.{' '}
            <Link href="/privacy" className="link-underline text-primary" target="_blank">
              Read the Privacy Policy
            </Link>
            .
          </label>
        </div>

        {errors.consentGiven && (
          <p id={`${consentId}-error`} role="alert" className="mt-2 text-fluid-xs text-danger">
            {errors.consentGiven}
          </p>
        )}

        <p className="mt-3 flex items-start gap-2 text-fluid-xs text-ink-muted">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          No tracking cookies are set and nothing you type here reaches an analytics tool.
        </p>
      </div>
    </div>
  )
}
