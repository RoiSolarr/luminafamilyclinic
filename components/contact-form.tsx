'use client'

import * as React from 'react'
import { Send, CheckCircle2 } from 'lucide-react'

import { contactRequestSchema, fieldErrors } from '@/lib/validation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/primitives'
import { SelectField, TextAreaField, TextField } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { useBlockingLoader } from '@/components/loading-overlay'

/**
 * Contact and "still have a question" form.
 *
 * Shares its Zod schema with POST /api/contact, so the browser cannot accept
 * anything the server would reject. Includes the same honeypot as the booking
 * wizard.
 */
export function ContactForm({
  defaultTopic = 'general',
  compact = false,
  idPrefix = 'contact',
}: {
  defaultTopic?: 'billing' | 'appointment' | 'general' | 'complaint'
  compact?: boolean
  idPrefix?: string
}) {
  const { toast } = useToast()
  const loader = useBlockingLoader()
  const [values, setValues] = React.useState({
    name: '',
    email: '',
    topic: defaultTopic,
    message: '',
  })
  const [honeypot, setHoneypot] = React.useState('')
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [submitting, setSubmitting] = React.useState(false)
  const [sent, setSent] = React.useState(false)

  const field = (name: string) => `${idPrefix}-${name}`

  const update = (patch: Partial<typeof values>) => {
    setValues((current) => ({ ...current, ...patch }))
    setErrors((current) => {
      const copy = { ...current }
      for (const key of Object.keys(patch)) delete copy[key]
      return copy
    })
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()

    const parsed = contactRequestSchema.safeParse({ ...values, website: honeypot })
    if (!parsed.success) {
      const flat = fieldErrors(parsed.error)
      setErrors(flat)
      const firstKey = Object.keys(flat)[0]
      if (firstKey) document.getElementById(field(firstKey))?.focus()
      return
    }

    setSubmitting(true)
    const done = loader.start('Sending your message')
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, website: honeypot }),
      })
      const json = await response.json()

      if (!response.ok || !json.ok) {
        if (json?.error?.fields) setErrors(json.error.fields)
        toast({
          title: 'We could not send that',
          description: json?.error?.message ?? 'Please try again in a moment.',
          tone: 'error',
        })
        return
      }

      setSent(true)
      setValues({ name: '', email: '', topic: defaultTopic, message: '' })
      toast({
        title: 'Message sent',
        description: 'Someone from the clinic will reply by email.',
        tone: 'success',
      })
    } catch {
      toast({ title: 'We could not reach the clinic', tone: 'error' })
    } finally {
      setSubmitting(false)
      done()
    }
  }

  if (sent) {
    return (
      <Card className="flex flex-col items-start gap-3 bg-primary-soft">
        <CheckCircle2 className="h-8 w-8 text-primary-strong" aria-hidden="true" />
        <h3 className="font-display text-fluid-xl text-primary-strong">Message received</h3>
        <p className="text-fluid-base leading-relaxed text-ink-soft">
          A member of staff reads every message and replies by email, usually within one working
          day. Urgent matters are better handled by phone.
        </p>
        <Button variant="secondary" onClick={() => setSent(false)} className="mt-2">
          Send another message
        </Button>
      </Card>
    )
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      {/* Honeypot, hidden from sight and from assistive technology. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label htmlFor={field('website')}>Website</label>
        <input
          id={field('website')}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <div className={compact ? 'grid gap-5' : 'grid gap-5 sm:grid-cols-2'}>
        <TextField
          id={field('name')}
          label="Your name"
          autoComplete="name"
          required
          value={values.name}
          error={errors.name}
          onChange={(e) => update({ name: e.target.value })}
        />
        <TextField
          id={field('email')}
          label="Email address"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={values.email}
          error={errors.email}
          onChange={(e) => update({ email: e.target.value })}
        />
      </div>

      <SelectField
        id={field('topic')}
        label="What is this about?"
        required
        value={values.topic}
        error={errors.topic}
        onChange={(e) => update({ topic: e.target.value as typeof values.topic })}
      >
        <option value="general">A general question</option>
        <option value="appointment">An appointment</option>
        <option value="billing">Billing or a receipt</option>
        <option value="complaint">A complaint</option>
      </SelectField>

      <TextAreaField
        id={field('message')}
        label="Your message"
        required
        rows={compact ? 4 : 6}
        counterMax={2000}
        currentLength={values.message.length}
        value={values.message}
        error={errors.message}
        onChange={(e) => update({ message: e.target.value })}
      />

      <div className="flex flex-col gap-3 xs:flex-row xs:items-center">
        <Button type="submit" loading={submitting} loadingLabel="Sending">
          <Send className="h-4 w-4" aria-hidden="true" />
          Send message
        </Button>
        <p className="text-fluid-xs text-ink-muted">
          Please do not send urgent medical details here.
        </p>
      </div>
    </form>
  )
}
