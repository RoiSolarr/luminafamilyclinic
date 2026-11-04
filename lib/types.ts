/**
 * The shapes the UI and API routes work with.
 *
 * These are deliberately not the raw Drizzle row types: the database stores
 * `numeric` as a string and `timestamptz` as a Date, while the UI wants numbers
 * and ISO strings. The repository layer does that conversion once.
 */

export type OrgSettings = {
  slotMinutes: number
  bookingWindowDays: number
  minNoticeHours: number
  holidays: string[]
  closedWeekdays: number[]
}

export type OrgRecord = {
  id: string
  name: string
  slug: string
  timezone: string
  phone: string
  email: string
  address: string
  settings: OrgSettings
}

export type ServiceRecord = {
  id: string
  name: string
  slug: string
  description: string
  durationMinutes: number
  priceMin: number
  priceMax: number
  isTelehealth: boolean
}

export type ScheduleBlock = {
  dayOfWeek: number
  startTime: string
  endTime: string
}

export type ProviderRecord = {
  id: string
  fullName: string
  specialty: string
  initials: string
  languages: string[]
  bio: string
  /** Service ids this provider offers. */
  serviceIds: string[]
  schedule: ScheduleBlock[]
}

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'rescheduled'
  | 'completed'
  | 'no_show'

export type AiUrgency = 'routine' | 'soon' | 'urgent' | 'emergency'

export type ReminderChannel = 'email' | 'sms'

/** An appointment joined with the names a human needs to read it. */
export type AppointmentRecord = {
  id: string
  bookingRef: string
  status: AppointmentStatus
  /** ISO 8601 instant. */
  startsAt: string
  endsAt: string
  /** Wall clock values in the clinic timezone, precomputed for display. */
  localDate: string
  localTime: string
  localEndTime: string
  timezone: string
  providerId: string
  providerName: string
  providerInitials: string
  providerSpecialty: string
  serviceId: string
  serviceName: string
  durationMinutes: number
  isTelehealth: boolean
  patientName: string
  patientEmail: string
  patientPhone: string
  patientType: 'new' | 'returning'
  insurance: string | null
  reasonForVisit: string
  reminderChannel: ReminderChannel
  aiUrgency: AiUrgency | null
  aiSummary: string | null
  aiRedFlag: boolean
  aiConfirmationMessage: string | null
  calendarEventId: string | null
  cancelledReason: string | null
  createdAt: string
}

export type BusySlot = {
  providerId: string
  startsAt: string
  endsAt: string
}

export type ContactMessageRecord = {
  id: string
  name: string
  email: string
  topic: 'billing' | 'appointment' | 'general' | 'complaint'
  message: string
  aiTopic: string | null
  aiDraftReply: string | null
  status: 'new' | 'in_review' | 'replied'
  createdAt: string
}

export type DueReminder = {
  reminderId: string
  type: '24h_reminder' | 'post_visit'
  channel: ReminderChannel
  scheduledFor: string
  bookingRef: string
  startsAt: string
  localDate: string
  localTime: string
  timezone: string
  providerName: string
  serviceName: string
  patientFirstName: string
  patientEmail: string
  patientPhone: string
  manageUrl: string
  feedbackUrl: string | null
}

/** What `createBooking` hands back. The raw token exists only here. */
export type BookingResult = {
  appointment: AppointmentRecord
  manageToken: string
}

/** Thrown when the slot was taken between the availability check and the insert. */
export class SlotTakenError extends Error {
  constructor() {
    super('That slot was just taken.')
    this.name = 'SlotTakenError'
  }
}

/** Thrown when no provider offering the service is free at the chosen time. */
export class NoProviderError extends Error {
  constructor() {
    super('No doctor is free at that time.')
    this.name = 'NoProviderError'
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Not found.') {
    super(message)
    this.name = 'NotFoundError'
  }
}
