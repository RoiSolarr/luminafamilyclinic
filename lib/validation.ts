import { z } from 'zod'

/**
 * Shared Zod schemas. The booking form validates against these in the browser
 * and every API route re validates the same object on the server, so a crafted
 * request cannot get past the form's rules.
 */

const trimmed = (max: number) => z.string().trim().max(max)

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
export const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/
export const BOOKING_REF_RE = /^[A-Z]{2,5}-[A-Z0-9]{6}$/

export const dateString = z.string().regex(DATE_RE, 'Use the format YYYY-MM-DD')
export const timeString = z.string().regex(TIME_RE, 'Use the format HH:mm')
export const bookingRefSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(BOOKING_REF_RE, 'That booking reference does not look right')

/** Philippine mobile and landline formats, plus generic international. */
export const phoneSchema = trimmed(32)
  .min(7, 'Enter a contact number we can reach you on')
  .regex(/^[+()\d\s-]{7,32}$/, 'Use digits, spaces, dashes, brackets and an optional leading +')

export const emailSchema = trimmed(254)
  .min(5, 'Enter your email address')
  .email('That email address does not look right')
  .toLowerCase()

export const fullNameSchema = trimmed(120)
  .min(2, 'Enter the full name of the patient')
  .regex(/^[\p{L}\p{M}' .-]+$/u, 'Letters, spaces, apostrophes, periods and hyphens only')

/** Date of birth: a real past date, and nobody older than 130. */
export const dateOfBirthSchema = dateString.refine(
  (value) => {
    const d = new Date(`${value}T00:00:00Z`)
    if (Number.isNaN(d.getTime())) return false
    const now = Date.now()
    const oldest = now - 130 * 365.25 * 86400000
    return d.getTime() <= now && d.getTime() >= oldest
  },
  { message: 'Enter a date of birth in the past' },
)

/**
 * A boolean that survives being sent as a string.
 *
 * Zapier, and most no code tools, send every field as text. `z.coerce.boolean()`
 * is the wrong tool for that, because it follows JavaScript truthiness: the
 * string "false" is a non empty string, so it coerces to `true`. That turns
 * every "no" into a "yes" silently, which is how a red flag ended up on a
 * routine dental booking.
 *
 * This accepts real booleans, numbers, and the usual text spellings, and
 * rejects anything it does not recognise rather than guessing.
 */
const booleanish = z.preprocess((value) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true
    if (['false', '0', 'no', 'n', 'off', '', 'null', 'undefined'].includes(normalized)) {
      return false
    }
  }
  // Anything else falls through and fails z.boolean(), which is deliberate:
  // a typo should be a visible 400, not a silent true.
  return value
}, z.boolean())

export const patientTypeSchema = z.enum(['new', 'returning'])
export const reminderChannelSchema = z.enum(['email', 'sms'])
export const contactTopicSchema = z.enum(['billing', 'appointment', 'general', 'complaint'])
export const aiUrgencySchema = z.enum(['routine', 'soon', 'urgent', 'emergency'])

/** Step 1 of the wizard. `providerId` is null when "Any available doctor" is chosen. */
export const wizardServiceStepSchema = z.object({
  serviceId: z.string().uuid('Choose a service'),
  providerId: z.string().uuid().nullable(),
})

/** Step 2. */
export const wizardSlotStepSchema = z.object({
  date: dateString,
  time: timeString,
})

/** Step 3. */
export const patientDetailsSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  phone: phoneSchema,
  dateOfBirth: dateOfBirthSchema,
  patientType: patientTypeSchema,
  reasonForVisit: trimmed(500).min(10, 'Tell us in a sentence or two what the visit is about'),
  insurance: trimmed(80).optional().or(z.literal('')),
  reminderChannel: reminderChannelSchema,
  consentGiven: z.literal(true, {
    errorMap: () => ({ message: 'We need your consent before we can store these details' }),
  }),
  /**
   * Honeypot. A real person never sees this field, so it must stay empty.
   *
   * The schema accepts any short string rather than rejecting a filled one:
   * the route checks it afterwards and answers a bot with a bland success,
   * which tells it nothing about why its submission went nowhere. Failing
   * validation here would hand it a usable error message instead.
   */
  website: z.string().max(200).optional(),
})

/** The full payload POSTed to /api/book. */
export const bookRequestSchema = wizardServiceStepSchema
  .merge(wizardSlotStepSchema)
  .merge(patientDetailsSchema)

export type BookRequest = z.infer<typeof bookRequestSchema>
export type PatientDetails = z.infer<typeof patientDetailsSchema>

export const availabilityQuerySchema = z.object({
  date: dateString,
  serviceId: z.string().uuid(),
  providerId: z.string().uuid().optional(),
})

export const cancelRequestSchema = z.object({
  bookingRef: bookingRefSchema,
  token: z.string().min(16).max(64),
  reason: trimmed(300).optional().or(z.literal('')),
})

export const rescheduleRequestSchema = z.object({
  bookingRef: bookingRefSchema,
  token: z.string().min(16).max(64),
  date: dateString,
  time: timeString,
})

export const contactRequestSchema = z.object({
  name: fullNameSchema,
  email: emailSchema,
  topic: contactTopicSchema,
  message: trimmed(2000).min(10, 'Tell us a little more so we can route your message'),
  /** Honeypot. See the note on the booking schema above. */
  website: z.string().max(200).optional(),
})

export const feedbackRequestSchema = z.object({
  bookingRef: bookingRefSchema,
  signature: z.string().min(8).max(64),
  rating: z.coerce.number().int().min(1).max(5),
  comment: trimmed(1000).optional().or(z.literal('')),
})

/**
 * Callback payload from Zapier. One endpoint, several shapes, chosen by `type`.
 * Everything optional is written only when present, so a Zap can send partial
 * results as each step finishes.
 */
export const zapierCallbackSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('booking_triage'),
    bookingRef: bookingRefSchema,
    aiUrgency: aiUrgencySchema.optional(),
    aiSummary: trimmed(1000).optional(),
    aiRedFlag: booleanish.optional(),
    aiConfirmationMessage: trimmed(1000).optional(),
    /** Set to true once the Zap has confirmed the booking end to end. */
    confirm: booleanish.optional(),
    /**
     * The raw manage token, passed back so the confirmation email can carry a
     * working link. Only the hash is stored, so the server cannot rebuild it.
     *
     * The token is accepted rather than a whole URL on purpose: the server
     * builds the link from its own site URL, so a compromised automation
     * cannot make us email patients a link to somewhere else.
     */
    manageToken: z.string().min(16).max(64).optional(),
  }),
  z.object({
    type: z.literal('calendar_event'),
    bookingRef: bookingRefSchema,
    calendarEventId: trimmed(256),
  }),
  z.object({
    type: z.literal('reminder_sent'),
    reminderId: z.string().uuid(),
    status: z.enum(['sent', 'failed']).default('sent'),
    error: trimmed(300).optional(),
  }),
  z.object({
    type: z.literal('contact_triage'),
    contactMessageId: z.string().uuid(),
    aiTopic: contactTopicSchema.optional(),
    aiDraftReply: trimmed(4000).optional(),
    status: z.enum(['new', 'in_review', 'replied']).optional(),
  }),
  z.object({
    type: z.literal('feedback'),
    bookingRef: bookingRefSchema,
    rating: z.coerce.number().int().min(1).max(5),
    comment: trimmed(1000).optional(),
  }),
])

export type ZapierCallback = z.infer<typeof zapierCallbackSchema>

/** Turn a ZodError into a flat `{ field: message }` map for the UI. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_'
    if (!out[key]) out[key] = issue.message
  }
  return out
}
