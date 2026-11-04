/**
 * In memory database for `NEXT_PUBLIC_MOCK_MODE=true`.
 *
 * It holds the same fictional clinic as `db/seed.ts` and supports the same
 * operations, including the double booking guard, so the whole site can be
 * clicked through before Supabase exists. State lives on `globalThis` so it
 * survives Next.js hot reloads, and it resets whenever the server restarts.
 */
import { randomUUID, createHash } from 'node:crypto'
import { clinic } from '@/config/clinic'
import {
  demoAppointments,
  demoContactMessages,
  demoPatients,
  demoProviders,
  demoServices,
} from '@/lib/demo-data'
import {
  addDaysToDateString,
  minutesFromTimeString,
  timeStringFromMinutes,
  todayInZone,
  weekdayOfDateString,
  zonedToUtc,
} from '@/lib/time'
import type {
  AiUrgency,
  AppointmentStatus,
  ContactMessageRecord,
  OrgRecord,
  ProviderRecord,
  ReminderChannel,
  ServiceRecord,
} from '@/lib/types'

export type MockPatient = {
  id: string
  fullName: string
  email: string
  phone: string
  dateOfBirth: string
  patientType: 'new' | 'returning'
  insurance: string | null
  consentGivenAt: string | null
}

export type MockAppointment = {
  id: string
  bookingRef: string
  patientId: string
  providerId: string
  serviceId: string
  startsAt: Date
  endsAt: Date
  status: AppointmentStatus
  reasonForVisit: string
  reminderChannel: ReminderChannel
  manageTokenHash: string
  calendarEventId: string | null
  aiUrgency: AiUrgency | null
  aiSummary: string | null
  aiRedFlag: boolean
  aiConfirmationMessage: string | null
  cancelledReason: string | null
  createdAt: Date
}

export type MockReminder = {
  id: string
  appointmentId: string
  channel: ReminderChannel
  type: '24h_reminder' | 'post_visit'
  scheduledFor: Date
  sentAt: Date | null
  status: 'pending' | 'sent' | 'failed'
  lastError: string | null
}

export type MockFeedback = {
  id: string
  appointmentId: string
  rating: number
  comment: string | null
  createdAt: Date
}

export type MockStore = {
  organization: OrgRecord
  services: ServiceRecord[]
  providers: ProviderRecord[]
  patients: MockPatient[]
  appointments: MockAppointment[]
  reminders: MockReminder[]
  feedback: MockFeedback[]
  contactMessages: ContactMessageRecord[]
}

declare global {
  // eslint-disable-next-line no-var
  var __luminaMockStore: MockStore | undefined
}

const TZ = clinic.timezone

function sha(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

function providerWorksAt(
  provider: ProviderRecord,
  dateStr: string,
  time: string,
  durationMinutes: number,
): boolean {
  if ((clinic.booking.holidays as readonly string[]).includes(dateStr)) return false
  const dow = weekdayOfDateString(dateStr)
  if ((clinic.booking.closedWeekdays as readonly number[]).includes(dow)) return false
  const start = minutesFromTimeString(time)
  const end = start + durationMinutes
  return provider.schedule.some(
    (b) =>
      b.dayOfWeek === dow &&
      start >= minutesFromTimeString(b.startTime) &&
      end <= minutesFromTimeString(b.endTime),
  )
}

function build(): MockStore {
  const organization: OrgRecord = {
    id: randomUUID(),
    name: clinic.name,
    slug: clinic.slug,
    timezone: clinic.timezone,
    phone: clinic.contact.phone,
    email: clinic.contact.email,
    address: [
      clinic.contact.addressLine1,
      clinic.contact.addressLine2,
      `${clinic.contact.city}, ${clinic.contact.region} ${clinic.contact.postalCode}`,
      clinic.contact.country,
    ].join(', '),
    settings: {
      slotMinutes: clinic.booking.slotMinutes,
      bookingWindowDays: clinic.booking.bookingWindowDays,
      minNoticeHours: clinic.booking.minNoticeHours,
      holidays: [...clinic.booking.holidays],
      closedWeekdays: [...clinic.booking.closedWeekdays],
    },
  }

  const services: ServiceRecord[] = demoServices.map((s) => ({
    id: randomUUID(),
    name: s.name,
    slug: s.slug,
    description: s.description,
    durationMinutes: s.durationMinutes,
    priceMin: s.priceMin,
    priceMax: s.priceMax,
    isTelehealth: s.isTelehealth,
  }))
  const serviceIdBySlug = new Map(services.map((s) => [s.slug, s.id]))

  const providers: ProviderRecord[] = demoProviders.map((p) => ({
    id: randomUUID(),
    fullName: p.fullName,
    specialty: p.specialty,
    initials: p.initials,
    languages: [...p.languages],
    bio: p.bio,
    serviceIds: p.services.map((slug) => serviceIdBySlug.get(slug)!),
    schedule: p.schedule.map((b) => ({ ...b })),
  }))
  const providerIdByKey = new Map(demoProviders.map((p, i) => [p.key, providers[i]!.id]))

  const patients: MockPatient[] = demoPatients.map((p) => ({
    id: randomUUID(),
    fullName: p.fullName,
    email: p.email,
    phone: p.phone,
    dateOfBirth: p.dateOfBirth,
    patientType: p.patientType,
    insurance: p.insurance,
    consentGivenAt: new Date().toISOString(),
  }))
  const patientIdByEmail = new Map(patients.map((p) => [p.email, p.id]))

  const appointments: MockAppointment[] = []
  const reminders: MockReminder[] = []
  const feedback: MockFeedback[] = []
  const today = todayInZone(TZ)
  const taken = new Set<string>()
  let refSeed = 0

  const nextRef = () => {
    refSeed += 1
    const alphabet = 'ACDEFGHJKLMNPQRTUVWXY34679'
    let n = refSeed * 7919
    let body = ''
    for (let i = 0; i < 6; i++) {
      body += alphabet[n % alphabet.length]
      n = Math.floor(n / alphabet.length) + 13 * (i + 1)
    }
    return `${clinic.bookingRefPrefix}-${body}`
  }

  for (const seed of demoAppointments) {
    const providerId = providerIdByKey.get(seed.providerKey)!
    const provider = providers.find((p) => p.id === providerId)!
    const serviceId = serviceIdBySlug.get(seed.serviceSlug)!
    const service = services.find((s) => s.id === serviceId)!
    const preferred = addDaysToDateString(today, seed.dayOffset)
    const forward = seed.dayOffset >= 0

    let placed: { date: string; time: string } | null = null
    outer: for (let d = 0; d < 21 && !placed; d++) {
      const date = addDaysToDateString(preferred, d * (forward ? 1 : -1))
      for (let s = 0; s < 20; s++) {
        const time = timeStringFromMinutes(minutesFromTimeString(seed.time) + s * 30)
        if (!providerWorksAt(provider, date, time, service.durationMinutes)) continue
        const key = `${providerId}|${date}|${time}`
        if (taken.has(key)) continue
        taken.add(key)
        placed = { date, time }
        break outer
      }
    }
    if (!placed) continue

    const startsAt = zonedToUtc(placed.date, placed.time, TZ)
    const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60000)
    const id = randomUUID()
    const bookingRef = nextRef()

    appointments.push({
      id,
      bookingRef,
      patientId: patientIdByEmail.get(seed.patientEmail)!,
      providerId,
      serviceId,
      startsAt,
      endsAt,
      status: seed.status,
      reasonForVisit: seed.reasonForVisit,
      reminderChannel: seed.reminderChannel,
      manageTokenHash: sha(`demo-token-${bookingRef}`),
      calendarEventId: null,
      aiUrgency: seed.aiUrgency ?? null,
      aiSummary: seed.aiSummary ?? null,
      aiRedFlag: seed.aiRedFlag ?? false,
      aiConfirmationMessage: null,
      cancelledReason: seed.status === 'cancelled' ? 'Patient cancelled online.' : null,
      createdAt: new Date(startsAt.getTime() - 5 * 86400000),
    })

    if (seed.status === 'pending' || seed.status === 'confirmed') {
      reminders.push({
        id: randomUUID(),
        appointmentId: id,
        channel: seed.reminderChannel,
        type: '24h_reminder',
        scheduledFor: new Date(startsAt.getTime() - 86400000),
        sentAt: null,
        status: 'pending',
        lastError: null,
      })
    }
    if (seed.status === 'completed') {
      reminders.push({
        id: randomUUID(),
        appointmentId: id,
        channel: 'email',
        type: 'post_visit',
        scheduledFor: new Date(endsAt.getTime() + 86400000),
        sentAt: new Date(endsAt.getTime() + 86400000),
        status: 'sent',
        lastError: null,
      })
      feedback.push({
        id: randomUUID(),
        appointmentId: id,
        rating: 5,
        comment: 'Seen on time and the explanation was clear.',
        createdAt: new Date(endsAt.getTime() + 90000000),
      })
    }
  }

  const contactMessages: ContactMessageRecord[] = demoContactMessages.map((m, i) => ({
    id: randomUUID(),
    name: m.name,
    email: m.email,
    topic: m.topic,
    message: m.message,
    aiTopic: m.aiTopic,
    aiDraftReply: null,
    status: m.status,
    createdAt: new Date(Date.now() - (i + 1) * 7 * 3600 * 1000).toISOString(),
  }))

  return {
    organization,
    services,
    providers,
    patients,
    appointments,
    reminders,
    feedback,
    contactMessages,
  }
}

export function mockStore(): MockStore {
  if (!globalThis.__luminaMockStore) {
    globalThis.__luminaMockStore = build()
  }
  return globalThis.__luminaMockStore
}

/** Used by tests and by the reset affordance in the admin dashboard. */
export function resetMockStore(): void {
  globalThis.__luminaMockStore = build()
}

export function mockSha(value: string): string {
  return sha(value)
}
