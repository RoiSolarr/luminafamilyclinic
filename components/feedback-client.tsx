'use client'

import * as React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Star, CheckCircle2, Link2Off } from 'lucide-react'

import { clinic } from '@/config/clinic'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, EmptyState } from '@/components/ui/primitives'
import { TextAreaField } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { useBlockingLoader } from '@/components/loading-overlay'

const RATING_LABELS = ['Poor', 'Not great', 'Fine', 'Good', 'Excellent']

/**
 * Post visit rating.
 *
 * The link carries the booking reference and an HMAC signature. The server
 * checks the signature, so a rating cannot be left against a reference somebody
 * guessed, and the page itself never reveals anything about the appointment.
 */
export function FeedbackClient() {
  const params = useSearchParams()
  const { toast } = useToast()
  const loader = useBlockingLoader()

  const bookingRef = (params.get('ref') ?? '').trim().toUpperCase()
  const signature = params.get('sig') ?? ''

  const [rating, setRating] = React.useState<number | null>(null)
  const [hovered, setHovered] = React.useState<number | null>(null)
  const [comment, setComment] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [done, setDone] = React.useState(false)

  if (!bookingRef || !signature) {
    return (
      <div className="mx-auto max-w-lg">
        <EmptyState
          icon={<Link2Off className="h-8 w-8" aria-hidden="true" />}
          title="This link is incomplete"
          body="Open the full link from the email we sent after your visit, including everything after the question mark."
          action={
            <Button asChild variant="secondary">
              <Link href="/">Back to the home page</Link>
            </Button>
          }
        />
      </div>
    )
  }

  if (done) {
    return (
      <Card className="mx-auto flex max-w-lg flex-col items-center gap-3 text-center">
        <CheckCircle2 className="h-10 w-10 text-primary" aria-hidden="true" />
        <h1 className="font-display text-fluid-2xl">Thank you</h1>
        <p className="text-fluid-base leading-relaxed text-ink-soft">
          Your rating has been recorded. The clinic reviews these every week and they genuinely do
          change how the front desk runs.
        </p>
        <Button asChild className="mt-2">
          <Link href="/book">Book another appointment</Link>
        </Button>
      </Card>
    )
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!rating) {
      toast({ title: 'Choose a rating first', tone: 'error' })
      return
    }

    setSubmitting(true)
    const done = loader.start('Sending your rating')
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingRef, signature, rating, comment }),
      })
      const json = await response.json()

      if (!response.ok || !json.ok) {
        toast({
          title: 'We could not record that',
          description: json?.error?.message ?? 'Please try again in a moment.',
          tone: 'error',
        })
        return
      }
      setDone(true)
    } catch {
      toast({ title: 'We could not reach the clinic', tone: 'error' })
    } finally {
      setSubmitting(false)
      done()
    }
  }

  const shown = hovered ?? rating ?? 0

  return (
    <Card className="mx-auto max-w-lg">
      <h1 className="font-display text-fluid-2xl">How was your visit?</h1>
      <p className="mt-2 text-fluid-base text-ink-soft">
        One tap is plenty. Anything you add in the box is read by the clinic manager, not published.
      </p>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-6">
        <fieldset>
          <legend className="text-fluid-sm font-medium text-ink">Your rating</legend>
          <div
            role="radiogroup"
            aria-label="Rating out of five"
            className="mt-3 flex items-center gap-1"
            onMouseLeave={() => setHovered(null)}
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rating === value}
                aria-label={`${value} out of 5, ${RATING_LABELS[value - 1]}`}
                onClick={() => setRating(value)}
                onMouseEnter={() => setHovered(value)}
                onFocus={() => setHovered(value)}
                onBlur={() => setHovered(null)}
                className="tap-target inline-flex items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Star
                  className={cn(
                    'h-9 w-9 transition-colors',
                    value <= shown ? 'fill-accent text-accent' : 'text-line',
                  )}
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
          <p aria-live="polite" className="mt-2 h-5 text-fluid-sm text-ink-soft">
            {shown ? RATING_LABELS[shown - 1] : ''}
          </p>
        </fieldset>

        <TextAreaField
          id="feedbackComment"
          label="Anything you would like to add? (optional)"
          rows={4}
          counterMax={1000}
          currentLength={comment.length}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        <Button type="submit" loading={submitting} loadingLabel="Sending" disabled={!rating}>
          Send rating
        </Button>
      </form>

      <p className="mt-6 text-fluid-xs text-ink-muted">{clinic.demoNotice}</p>
    </Card>
  )
}
