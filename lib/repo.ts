import 'server-only'
import { and, asc, desc, eq, gte, inArray, lt, lte, or, sql } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'

import { getDb, MOCK_MODE, schema } from '@/db'
import { clinic, siteUrl } from '@/config/clinic'
import { mockStore } from '@/lib/mock/store'
import { generateBookingRef, generateManageToken, hashToken, signFeedbackRef } from '@/lib/tokens'
import { zonedParts, zonedToUtc } from '@/lib/time'
import { slotRejectionReason } from '@/lib/schedule'
import type {
  AppointmentRecord,
  AppointmentStatus,
  BookingResult,
  BusySlot,
  ContactMessageRecord,
  DueReminder,
  OrgRecord,
  ProviderRecord,
  ReminderChannel,
  ServiceRecord,
} from '@/lib/types'
import { NoProviderError, NotFoundError, SlotTakenError } from '@/lib/types'

/**
 * The only module that knows whether the data lives in Postgres or in memory.
 *
 * Every function returns plain serialisable objects so route handlers and
 * server components can hand them straight to the client.
 */

const LIVE_STATUSES: AppointmentStatus[] = ['pending', 'confirmed']

/**
 * Which appointment statuses each kind of reminder is allowed to go out for.
 *
 * These differ, and getting it wrong is silent. A day before reminder must only
 * go to an appointment that is still happening, otherwise a patient who
 * cancelled is told to turn up. A post visit note is the opposite case: by the
 * time it is due the appointment has finished, so requiring it to still be
 * "live" would mean it could never be sent at all.
 *
 * `confirmed` appears in both because a clinic does not always get round to
 * marking an appointment completed, and the patient should still be asked how
 * it went. `cancelled` and `no_show` appear in neither.
 */
const REMINDER_APPOINTMENT_STATUSES: Record<'24h_reminder' | 'post_visit', AppointmentStatus[]> = {
  '24h_reminder': ['pending', 'confirmed'],
  post_visit: ['completed', 'confirmed'],
}

// --------------------------------------------------------------------------
// organization, services, providers
// --------------------------------------------------------------------------

export async function getOrganization(): Promise<OrgRecord> {
  if (MOCK_MODE) return mockStore().organization

  const db = getDb()
  const [row] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.slug, clinic.slug))
    .limit(1)

  if (!row) {
    throw new NotFoundError(
      `No organization with slug "${clinic.slug}". Run npm run db:seed, or set NEXT_PUBLIC_MOCK_MODE=true.`,
    )
  }

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    timezone: row.timezone,
    phone: row.phone,
    email: row.email,
    address: row.address,
    settings: row.settings,
  }
}

export async function listServices(): Promise<ServiceRecord[]> {
  if (MOCK_MODE) return mockStore().services

  const db = getDb()
  const org = await getOrganization()
  const rows = await db
    .select()
    .from(schema.services)
    .where(and(eq(schema.services.organizationId, org.id), eq(schema.services.isActive, true)))
    .orderBy(asc(schema.services.name))

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    durationMinutes: r.durationMinutes,
    priceMin: Number(r.priceMin),
    priceMax: Number(r.priceMax),
    isTelehealth: r.isTelehealth,
  }))
}

export async function listProviders(): Promise<ProviderRecord[]> {
  if (MOCK_MODE) return mockStore().providers

  const db = getDb()
  const org = await getOrganization()

  const providerRows = await db
    .select()
    .from(schema.providers)
    .where(and(eq(schema.providers.organizationId, org.id), eq(schema.providers.isActive, true)))
    .orderBy(asc(schema.providers.fullName))

  if (providerRows.length === 0) return []
  const ids = providerRows.map((p) => p.id)

  const [links, schedules] = await Promise.all([
    db
      .select()
      .from(schema.providerServices)
      .where(inArray(schema.providerServices.providerId, ids)),
    db
      .select()
      .from(schema.providerSchedules)
      .where(
        and(
          inArray(schema.providerSchedules.providerId, ids),
          eq(schema.providerSchedules.isActive, true),
        ),
      )
      .orderBy(asc(schema.providerSchedules.dayOfWeek), asc(schema.providerSchedules.startTime)),
  ])

  return providerRows.map((p) => ({
    id: p.id,
    fullName: p.fullName,
    specialty: p.specialty,
    initials: p.initials,
    languages: p.languages ?? [],
    bio: p.bio,
    serviceIds: links.filter((l) => l.providerId === p.id).map((l) => l.serviceId),
    schedule: schedules
      .filter((s) => s.providerId === p.id)
      .map((s) => ({
        dayOfWeek: s.dayOfWeek,
        // Postgres `time` comes back as HH:mm:ss.
        startTime: s.startTime.slice(0, 5),
        endTime: s.endTime.slice(0, 5),
      })),
  }))
}

/** Providers who offer a given service. */
export async function listProvidersForService(serviceId: string): Promise<ProviderRecord[]> {
  const all = await listProviders()
  return all.filter((p) => p.serviceIds.includes(serviceId))
}

// --------------------------------------------------------------------------
// availability support
// --------------------------------------------------------------------------

/** Live appointments for a set of providers inside a window. */
export async function listBusy(
  providerIds: string[],
  fromIso: string,
  toIso: string,
): Promise<BusySlot[]> {
  if (providerIds.length === 0) return []

  if (MOCK_MODE) {
    const from = new Date(fromIso).getTime()
    const to = new Date(toIso).getTime()
    return mockStore()
      .appointments.filter(
        (a) =>
          providerIds.includes(a.providerId) &&
          LIVE_STATUSES.includes(a.status) &&
          a.endsAt.getTime() > from &&
          a.startsAt.getTime() < to,
      )
      .map((a) => ({
        providerId: a.providerId,
        startsAt: a.startsAt.toISOString(),
        endsAt: a.endsAt.toISOString(),
      }))
  }

  const db = getDb()
  const rows = await db
    .select({
      providerId: schema.appointments.providerId,
      startsAt: schema.appointments.startsAt,
      endsAt: schema.appointments.endsAt,
    })
    .from(schema.appointments)
    .where(
      and(
        inArray(schema.appointments.providerId, providerIds),
        inArray(schema.appointments.status, LIVE_STATUSES),
        lt(schema.appointments.startsAt, new Date(toIso)),
        gte(schema.appointments.endsAt, new Date(fromIso)),
      ),
    )

  return rows.map((r) => ({
    providerId: r.providerId,
    startsAt: r.startsAt.toISOString(),
    endsAt: r.endsAt.toISOString(),
  }))
}

// --------------------------------------------------------------------------
// appointment reading
// --------------------------------------------------------------------------

function toRecord(args: {
  appointment: {
    id: string
    bookingRef: string
    status: AppointmentStatus
    startsAt: Date
    endsAt: Date
    reasonForVisit: string
    reminderChannel: ReminderChannel
    calendarEventId: string | null
    aiUrgency: AppointmentRecord['aiUrgency']
    aiSummary: string | null
    aiRedFlag: boolean
    aiConfirmationMessage: string | null
    cancelledReason: string | null
    createdAt: Date
  }
  provider: { id: string; fullName: string; initials: string; specialty: string }
  service: { id: string; name: string; durationMinutes: number; isTelehealth: boolean }
  patient: {
    fullName: string
    email: string
    phone: string
    patientType: 'new' | 'returning'
    insurance: string | null
  }
  timezone: string
}): AppointmentRecord {
  const { appointment: a, provider, service, patient, timezone } = args
  const start = zonedParts(a.startsAt, timezone)
  const end = zonedParts(a.endsAt, timezone)

  return {
    id: a.id,
    bookingRef: a.bookingRef,
    status: a.status,
    startsAt: a.startsAt.toISOString(),
    endsAt: a.endsAt.toISOString(),
    localDate: start.date,
    localTime: start.time,
    localEndTime: end.time,
    timezone,
    providerId: provider.id,
    providerName: provider.fullName,
    providerInitials: provider.initials,
    providerSpecialty: provider.specialty,
    serviceId: service.id,
    serviceName: service.name,
    durationMinutes: service.durationMinutes,
    isTelehealth: service.isTelehealth,
    patientName: patient.fullName,
    patientEmail: patient.email,
    patientPhone: patient.phone,
    patientType: patient.patientType,
    insurance: patient.insurance,
    reasonForVisit: a.reasonForVisit,
    reminderChannel: a.reminderChannel,
    aiUrgency: a.aiUrgency,
    aiSummary: a.aiSummary,
    aiRedFlag: a.aiRedFlag,
    aiConfirmationMessage: a.aiConfirmationMessage,
    calendarEventId: a.calendarEventId,
    cancelledReason: a.cancelledReason,
    createdAt: a.createdAt.toISOString(),
  }
}

function mockRecord(appointmentId: string): AppointmentRecord | null {
  const store = mockStore()
  const a = store.appointments.find((x) => x.id === appointmentId)
  if (!a) return null
  const provider = store.providers.find((p) => p.id === a.providerId)!
  const service = store.services.find((s) => s.id === a.serviceId)!
  const patient = store.patients.find((p) => p.id === a.patientId)!
  return toRecord({
    appointment: a,
    provider,
    service,
    patient,
    timezone: store.organization.timezone,
  })
}

export async function findAppointmentByRef(bookingRef: string): Promise<AppointmentRecord | null> {
  if (MOCK_MODE) {
    const a = mockStore().appointments.find((x) => x.bookingRef === bookingRef)
    return a ? mockRecord(a.id) : null
  }

  const db = getDb()
  const org = await getOrganization()
  const [row] = await db
    .select({
      a: schema.appointments,
      p: schema.providers,
      s: schema.services,
      pt: schema.patients,
    })
    .from(schema.appointments)
    .innerJoin(schema.providers, eq(schema.providers.id, schema.appointments.providerId))
    .innerJoin(schema.services, eq(schema.services.id, schema.appointments.serviceId))
    .innerJoin(schema.patients, eq(schema.patients.id, schema.appointments.patientId))
    .where(eq(schema.appointments.bookingRef, bookingRef))
    .limit(1)

  if (!row) return null

  return toRecord({
    appointment: row.a,
    provider: row.p,
    service: { ...row.s, durationMinutes: row.s.durationMinutes },
    patient: row.pt,
    timezone: org.timezone,
  })
}

/** The stored hash for a reference, so a route can verify a manage token. */
export async function getManageTokenHash(bookingRef: string): Promise<string | null> {
  if (MOCK_MODE) {
    return mockStore().appointments.find((a) => a.bookingRef === bookingRef)?.manageTokenHash ?? null
  }
  const db = getDb()
  const [row] = await db
    .select({ h: schema.appointments.manageTokenHash })
    .from(schema.appointments)
    .where(eq(schema.appointments.bookingRef, bookingRef))
    .limit(1)
  return row?.h ?? null
}

// --------------------------------------------------------------------------
// booking
// --------------------------------------------------------------------------

export type CreateBookingInput = {
  serviceId: string
  /** null means "any available doctor". */
  providerId: string | null
  /** Local clinic date and time. */
  date: string
  time: string
  fullName: string
  email: string
  phone: string
  dateOfBirth: string
  patientType: 'new' | 'returning'
  insurance: string | null
  reasonForVisit: string
  reminderChannel: ReminderChannel
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505'
}

/**
 * Writes the patient and the appointment inside one transaction.
 *
 * The partial unique index on (provider_id, starts_at) is what actually stops a
 * double booking: two simultaneous requests both pass the availability check,
 * both try to insert, and the loser gets a 23505 which we turn into a 409.
 */
export async function createBooking(input: CreateBookingInput): Promise<BookingResult> {
  const org = await getOrganization()
  const services = await listServices()
  const service = services.find((s) => s.id === input.serviceId)
  if (!service) throw new NotFoundError('That service is no longer offered.')

  const startsAt = zonedToUtc(input.date, input.time, org.timezone)
  const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60000)

  // Work out the candidate providers, in order of preference.
  const eligible = await listProvidersForService(service.id)
  if (eligible.length === 0) throw new NoProviderError()

  const requested = input.providerId
    ? eligible.filter((p) => p.id === input.providerId)
    : eligible

  // The unique index stops two patients taking one slot, but it says nothing
  // about whether the doctor actually works then. Without this filter, "any
  // available doctor" could hand the booking to someone who is off that day.
  const candidates = requested.filter(
    (provider) =>
      slotRejectionReason(
        provider,
        input.date,
        input.time,
        service.durationMinutes,
        org.settings,
        org.timezone,
      ) === null,
  )
  if (candidates.length === 0) throw new NoProviderError()

  const manageToken = generateManageToken()
  const manageTokenHash = hashToken(manageToken)

  // ------------------------------------------------------------- mock path
  if (MOCK_MODE) {
    const store = mockStore()

    const free = candidates.find(
      (p) =>
        !store.appointments.some(
          (a) =>
            a.providerId === p.id &&
            LIVE_STATUSES.includes(a.status) &&
            a.startsAt.getTime() < endsAt.getTime() &&
            a.endsAt.getTime() > startsAt.getTime(),
        ),
    )
    if (!free) throw new SlotTakenError()

    let patient = store.patients.find((p) => p.email === input.email)
    if (patient) {
      patient.fullName = input.fullName
      patient.phone = input.phone
      patient.dateOfBirth = input.dateOfBirth
      patient.patientType = input.patientType
      patient.insurance = input.insurance
      patient.consentGivenAt = new Date().toISOString()
    } else {
      patient = {
        id: randomUUID(),
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        dateOfBirth: input.dateOfBirth,
        patientType: input.patientType,
        insurance: input.insurance,
        consentGivenAt: new Date().toISOString(),
      }
      store.patients.push(patient)
    }

    const id = randomUUID()
    const bookingRef = generateBookingRef()
    store.appointments.push({
      id,
      bookingRef,
      patientId: patient.id,
      providerId: free.id,
      serviceId: service.id,
      startsAt,
      endsAt,
      status: 'pending',
      reasonForVisit: input.reasonForVisit,
      reminderChannel: input.reminderChannel,
      manageTokenHash,
      calendarEventId: null,
      aiUrgency: null,
      aiSummary: null,
      aiRedFlag: false,
      aiConfirmationMessage: null,
      cancelledReason: null,
      createdAt: new Date(),
    })
    store.reminders.push({
      id: randomUUID(),
      appointmentId: id,
      channel: input.reminderChannel,
      type: '24h_reminder',
      scheduledFor: new Date(startsAt.getTime() - 86400000),
      sentAt: null,
      status: 'pending',
      lastError: null,
    })

    return { appointment: mockRecord(id)!, manageToken }
  }

  // --------------------------------------------------------------- db path
  const db = getDb()

  const appointmentId = await db.transaction(async (tx) => {
    // Upsert the patient on (organization_id, email).
    const [patientRow] = await tx
      .insert(schema.patients)
      .values({
        organizationId: org.id,
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        dateOfBirth: input.dateOfBirth,
        patientType: input.patientType,
        insurance: input.insurance,
        consentGivenAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [schema.patients.organizationId, schema.patients.email],
        set: {
          fullName: input.fullName,
          phone: input.phone,
          dateOfBirth: input.dateOfBirth,
          patientType: input.patientType,
          insurance: input.insurance,
          consentGivenAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .returning({ id: schema.patients.id })

    if (!patientRow) throw new Error('Could not save the patient record.')

    // Try each candidate provider until one insert survives the unique index.
    let lastError: unknown = null
    for (const candidate of candidates) {
      // A fresh savepoint per attempt, so a rejected insert does not poison the
      // outer transaction.
      try {
        const inserted = await tx.transaction(async (inner) => {
          const [row] = await inner
            .insert(schema.appointments)
            .values({
              bookingRef: generateBookingRef(),
              organizationId: org.id,
              patientId: patientRow.id,
              providerId: candidate.id,
              serviceId: service.id,
              startsAt,
              endsAt,
              status: 'pending',
              reasonForVisit: input.reasonForVisit,
              reminderChannel: input.reminderChannel,
              manageTokenHash,
            })
            .returning({ id: schema.appointments.id })
          return row?.id ?? null
        })

        if (inserted) {
          await tx.insert(schema.reminders).values({
            appointmentId: inserted,
            channel: input.reminderChannel,
            type: '24h_reminder',
            scheduledFor: new Date(startsAt.getTime() - 86400000),
            status: 'pending',
          })
          return inserted
        }
      } catch (err) {
        lastError = err
        if (!isUniqueViolation(err)) throw err
        // Otherwise: this doctor just got taken, try the next candidate.
      }
    }

    if (lastError && isUniqueViolation(lastError)) throw new SlotTakenError()
    throw new SlotTakenError()
  })

  const record = await findAppointmentById(appointmentId)
  if (!record) throw new Error('The appointment was saved but could not be read back.')
  return { appointment: record, manageToken }
}

async function findAppointmentById(id: string): Promise<AppointmentRecord | null> {
  if (MOCK_MODE) return mockRecord(id)

  const db = getDb()
  const org = await getOrganization()
  const [row] = await db
    .select({
      a: schema.appointments,
      p: schema.providers,
      s: schema.services,
      pt: schema.patients,
    })
    .from(schema.appointments)
    .innerJoin(schema.providers, eq(schema.providers.id, schema.appointments.providerId))
    .innerJoin(schema.services, eq(schema.services.id, schema.appointments.serviceId))
    .innerJoin(schema.patients, eq(schema.patients.id, schema.appointments.patientId))
    .where(eq(schema.appointments.id, id))
    .limit(1)

  if (!row) return null
  return toRecord({
    appointment: row.a,
    provider: row.p,
    service: row.s,
    patient: row.pt,
    timezone: org.timezone,
  })
}

// --------------------------------------------------------------------------
// cancel and reschedule
// --------------------------------------------------------------------------

export async function cancelAppointment(
  bookingRef: string,
  reason: string | null,
): Promise<AppointmentRecord> {
  if (MOCK_MODE) {
    const store = mockStore()
    const a = store.appointments.find((x) => x.bookingRef === bookingRef)
    if (!a) throw new NotFoundError('We could not find that booking.')
    a.status = 'cancelled'
    a.cancelledReason = reason
    for (const r of store.reminders) {
      if (r.appointmentId === a.id && r.status === 'pending') r.status = 'failed'
    }
    return mockRecord(a.id)!
  }

  const db = getDb()
  const [updated] = await db
    .update(schema.appointments)
    .set({ status: 'cancelled', cancelledReason: reason, updatedAt: new Date() })
    .where(eq(schema.appointments.bookingRef, bookingRef))
    .returning({ id: schema.appointments.id })

  if (!updated) throw new NotFoundError('We could not find that booking.')

  // Stop any reminder that has not gone out yet.
  await db
    .update(schema.reminders)
    .set({ status: 'failed', lastError: 'appointment cancelled', updatedAt: new Date() })
    .where(
      and(
        eq(schema.reminders.appointmentId, updated.id),
        eq(schema.reminders.status, 'pending'),
      ),
    )

  const record = await findAppointmentById(updated.id)
  if (!record) throw new NotFoundError('We could not find that booking.')
  return record
}

export async function rescheduleAppointment(
  bookingRef: string,
  date: string,
  time: string,
): Promise<AppointmentRecord> {
  const org = await getOrganization()
  const existing = await findAppointmentByRef(bookingRef)
  if (!existing) throw new NotFoundError('We could not find that booking.')

  const startsAt = zonedToUtc(date, time, org.timezone)
  const endsAt = new Date(startsAt.getTime() + existing.durationMinutes * 60000)

  if (MOCK_MODE) {
    const store = mockStore()
    const clash = store.appointments.some(
      (a) =>
        a.bookingRef !== bookingRef &&
        a.providerId === existing.providerId &&
        LIVE_STATUSES.includes(a.status) &&
        a.startsAt.getTime() < endsAt.getTime() &&
        a.endsAt.getTime() > startsAt.getTime(),
    )
    if (clash) throw new SlotTakenError()

    const a = store.appointments.find((x) => x.bookingRef === bookingRef)!
    a.startsAt = startsAt
    a.endsAt = endsAt
    a.status = 'pending'
    for (const r of store.reminders) {
      if (r.appointmentId === a.id && r.type === '24h_reminder') {
        r.scheduledFor = new Date(startsAt.getTime() - 86400000)
        r.status = 'pending'
        r.sentAt = null
      }
    }
    return mockRecord(a.id)!
  }

  const db = getDb()
  try {
    const [updated] = await db
      .update(schema.appointments)
      .set({ startsAt, endsAt, status: 'pending', updatedAt: new Date() })
      .where(eq(schema.appointments.bookingRef, bookingRef))
      .returning({ id: schema.appointments.id })

    if (!updated) throw new NotFoundError('We could not find that booking.')

    await db
      .update(schema.reminders)
      .set({
        scheduledFor: new Date(startsAt.getTime() - 86400000),
        status: 'pending',
        sentAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.reminders.appointmentId, updated.id),
          eq(schema.reminders.type, '24h_reminder'),
        ),
      )

    const record = await findAppointmentById(updated.id)
    if (!record) throw new NotFoundError('We could not find that booking.')
    return record
  } catch (err) {
    if (isUniqueViolation(err)) throw new SlotTakenError()
    throw err
  }
}

// --------------------------------------------------------------------------
// contact messages
// --------------------------------------------------------------------------

export async function createContactMessage(input: {
  name: string
  email: string
  topic: ContactMessageRecord['topic']
  message: string
}): Promise<ContactMessageRecord> {
  if (MOCK_MODE) {
    const record: ContactMessageRecord = {
      id: randomUUID(),
      name: input.name,
      email: input.email,
      topic: input.topic,
      message: input.message,
      aiTopic: null,
      aiDraftReply: null,
      status: 'new',
      createdAt: new Date().toISOString(),
    }
    mockStore().contactMessages.unshift(record)
    return record
  }

  const db = getDb()
  const org = await getOrganization()
  const [row] = await db
    .insert(schema.contactMessages)
    .values({
      organizationId: org.id,
      name: input.name,
      email: input.email,
      topic: input.topic,
      message: input.message,
    })
    .returning()

  if (!row) throw new Error('Could not save that message.')
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    topic: row.topic,
    message: row.message,
    aiTopic: row.aiTopic,
    aiDraftReply: row.aiDraftReply,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  }
}

export async function listContactMessages(limit = 50): Promise<ContactMessageRecord[]> {
  if (MOCK_MODE) return mockStore().contactMessages.slice(0, limit)

  const db = getDb()
  const org = await getOrganization()
  const rows = await db
    .select()
    .from(schema.contactMessages)
    .where(eq(schema.contactMessages.organizationId, org.id))
    .orderBy(desc(schema.contactMessages.createdAt))
    .limit(limit)

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    topic: r.topic,
    message: r.message,
    aiTopic: r.aiTopic,
    aiDraftReply: r.aiDraftReply,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  }))
}

// --------------------------------------------------------------------------
// admin listing
// --------------------------------------------------------------------------

export type AdminFilters = {
  date?: string
  providerId?: string
  status?: AppointmentStatus
  /** Include appointments that have already happened. */
  includePast?: boolean
}

export async function listAppointmentsForAdmin(
  filters: AdminFilters = {},
  limit = 200,
): Promise<AppointmentRecord[]> {
  const org = await getOrganization()

  const matches = (r: AppointmentRecord) => {
    if (filters.date && r.localDate !== filters.date) return false
    if (filters.providerId && r.providerId !== filters.providerId) return false
    if (filters.status && r.status !== filters.status) return false
    if (!filters.includePast && !filters.date && new Date(r.endsAt).getTime() < Date.now())
      return false
    return true
  }

  if (MOCK_MODE) {
    const store = mockStore()
    return store.appointments
      .map((a) => mockRecord(a.id)!)
      .filter(matches)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .slice(0, limit)
  }

  const db = getDb()
  const conditions = [eq(schema.appointments.organizationId, org.id)]
  if (filters.providerId) conditions.push(eq(schema.appointments.providerId, filters.providerId))
  if (filters.status) conditions.push(eq(schema.appointments.status, filters.status))
  if (!filters.includePast && !filters.date) {
    conditions.push(gte(schema.appointments.endsAt, new Date()))
  }

  const rows = await db
    .select({
      a: schema.appointments,
      p: schema.providers,
      s: schema.services,
      pt: schema.patients,
    })
    .from(schema.appointments)
    .innerJoin(schema.providers, eq(schema.providers.id, schema.appointments.providerId))
    .innerJoin(schema.services, eq(schema.services.id, schema.appointments.serviceId))
    .innerJoin(schema.patients, eq(schema.patients.id, schema.appointments.patientId))
    .where(and(...conditions))
    .orderBy(asc(schema.appointments.startsAt))
    .limit(limit)

  return rows
    .map((row) =>
      toRecord({
        appointment: row.a,
        provider: row.p,
        service: row.s,
        patient: row.pt,
        timezone: org.timezone,
      }),
    )
    .filter((r) => (filters.date ? r.localDate === filters.date : true))
}

// --------------------------------------------------------------------------
// reminders for Zapier
// --------------------------------------------------------------------------

function manageUrlFor(bookingRef: string, token: string | null) {
  const base = `${siteUrl()}/manage?ref=${encodeURIComponent(bookingRef)}`
  return token ? `${base}&token=${encodeURIComponent(token)}` : base
}

function feedbackUrlFor(bookingRef: string) {
  return `${siteUrl()}/feedback?ref=${encodeURIComponent(bookingRef)}&sig=${signFeedbackRef(bookingRef)}`
}

/**
 * Work queue for Zap 2 and Zap 5.
 *
 * Returns the minimum each automation needs to send one message: no date of
 * birth, no insurance, no reason for visit. The manage link is included without
 * a token because the raw token is not recoverable once hashed; the patient's
 * own confirmation email carries the tokenised link.
 */
export async function listDueReminders(now = new Date()): Promise<DueReminder[]> {
  const org = await getOrganization()

  if (MOCK_MODE) {
    const store = mockStore()
    return store.reminders
      .filter((r) => r.status === 'pending' && r.scheduledFor.getTime() <= now.getTime())
      .map((r) => {
        const a = store.appointments.find((x) => x.id === r.appointmentId)
        if (!a || !REMINDER_APPOINTMENT_STATUSES[r.type].includes(a.status)) return null
        const provider = store.providers.find((p) => p.id === a.providerId)!
        const service = store.services.find((s) => s.id === a.serviceId)!
        const patient = store.patients.find((p) => p.id === a.patientId)!
        const parts = zonedParts(a.startsAt, org.timezone)
        return {
          reminderId: r.id,
          type: r.type,
          channel: r.channel,
          scheduledFor: r.scheduledFor.toISOString(),
          bookingRef: a.bookingRef,
          startsAt: a.startsAt.toISOString(),
          localDate: parts.date,
          localTime: parts.time,
          timezone: org.timezone,
          providerName: provider.fullName,
          serviceName: service.name,
          patientFirstName: patient.fullName.split(' ')[0] ?? patient.fullName,
          patientEmail: patient.email,
          patientPhone: patient.phone,
          manageUrl: manageUrlFor(a.bookingRef, null),
          feedbackUrl: r.type === 'post_visit' ? feedbackUrlFor(a.bookingRef) : null,
        } satisfies DueReminder
      })
      .filter((x): x is DueReminder => x !== null)
  }

  const db = getDb()
  const rows = await db
    .select({
      r: schema.reminders,
      a: schema.appointments,
      p: schema.providers,
      s: schema.services,
      pt: schema.patients,
    })
    .from(schema.reminders)
    .innerJoin(schema.appointments, eq(schema.appointments.id, schema.reminders.appointmentId))
    .innerJoin(schema.providers, eq(schema.providers.id, schema.appointments.providerId))
    .innerJoin(schema.services, eq(schema.services.id, schema.appointments.serviceId))
    .innerJoin(schema.patients, eq(schema.patients.id, schema.appointments.patientId))
    .where(
      and(
        eq(schema.reminders.status, 'pending'),
        lte(schema.reminders.scheduledFor, now),
        // Each reminder type allows a different set of appointment statuses.
        or(
          and(
            eq(schema.reminders.type, '24h_reminder'),
            inArray(schema.appointments.status, REMINDER_APPOINTMENT_STATUSES['24h_reminder']),
          ),
          and(
            eq(schema.reminders.type, 'post_visit'),
            inArray(schema.appointments.status, REMINDER_APPOINTMENT_STATUSES.post_visit),
          ),
        ),
      ),
    )
    .orderBy(asc(schema.reminders.scheduledFor))
    .limit(100)

  return rows.map((row) => {
    const parts = zonedParts(row.a.startsAt, org.timezone)
    return {
      reminderId: row.r.id,
      type: row.r.type,
      channel: row.r.channel,
      scheduledFor: row.r.scheduledFor.toISOString(),
      bookingRef: row.a.bookingRef,
      startsAt: row.a.startsAt.toISOString(),
      localDate: parts.date,
      localTime: parts.time,
      timezone: org.timezone,
      providerName: row.p.fullName,
      serviceName: row.s.name,
      patientFirstName: row.pt.fullName.split(' ')[0] ?? row.pt.fullName,
      patientEmail: row.pt.email,
      patientPhone: row.pt.phone,
      manageUrl: manageUrlFor(row.a.bookingRef, null),
      feedbackUrl: row.r.type === 'post_visit' ? feedbackUrlFor(row.a.bookingRef) : null,
    }
  })
}

/**
 * Creates the post visit reminder rows for appointments that finished roughly a
 * day ago, so Zap 5 has something to pick up. Called by the due-reminders route.
 */
export async function ensurePostVisitReminders(now = new Date()): Promise<number> {
  const windowStart = new Date(now.getTime() - 3 * 86400000)
  const windowEnd = new Date(now.getTime() - 20 * 3600 * 1000)

  if (MOCK_MODE) {
    const store = mockStore()
    let created = 0
    for (const a of store.appointments) {
      if (a.endsAt < windowStart || a.endsAt > windowEnd) continue
      if (a.status !== 'completed' && a.status !== 'confirmed') continue
      if (store.reminders.some((r) => r.appointmentId === a.id && r.type === 'post_visit')) continue
      store.reminders.push({
        id: randomUUID(),
        appointmentId: a.id,
        channel: 'email',
        type: 'post_visit',
        scheduledFor: new Date(a.endsAt.getTime() + 86400000),
        sentAt: null,
        status: 'pending',
        lastError: null,
      })
      created += 1
    }
    return created
  }

  const db = getDb()

  // The Date objects are converted to ISO strings and cast in SQL rather than
  // passed straight in. Drizzle's query builder knows a timestamptz column is
  // expected and serialises a Date for it, but this raw statement gives it no
  // such context, and the driver throws "Received an instance of Date".
  const result = await db.execute(sql`
    INSERT INTO "communications"."reminders" ("appointment_id", "channel", "type", "scheduled_for", "status")
    SELECT a."id", 'email'::"communications"."reminder_channel", 'post_visit'::"communications"."reminder_type",
           a."ends_at" + interval '24 hours', 'pending'::"communications"."reminder_status"
    FROM "medical"."appointments" a
    WHERE a."ends_at" BETWEEN ${windowStart.toISOString()}::timestamptz
                          AND ${windowEnd.toISOString()}::timestamptz
      AND a."status" IN ('completed', 'confirmed')
    ON CONFLICT ("appointment_id", "type") DO NOTHING
  `)
  return (result as unknown as { count?: number }).count ?? 0
}

export async function markReminder(
  reminderId: string,
  status: 'sent' | 'failed',
  error?: string,
): Promise<boolean> {
  if (MOCK_MODE) {
    const r = mockStore().reminders.find((x) => x.id === reminderId)
    if (!r) return false
    r.status = status
    r.sentAt = status === 'sent' ? new Date() : null
    r.lastError = error ?? null
    return true
  }

  const db = getDb()
  const [row] = await db
    .update(schema.reminders)
    .set({
      status,
      sentAt: status === 'sent' ? new Date() : null,
      lastError: error ?? null,
      updatedAt: new Date(),
    })
    .where(eq(schema.reminders.id, reminderId))
    .returning({ id: schema.reminders.id })
  return Boolean(row)
}

/** Marks a booking's automation as needing another attempt. */
export async function flagAutomationRetry(appointmentId: string): Promise<void> {
  if (MOCK_MODE) {
    const r = mockStore().reminders.find(
      (x) => x.appointmentId === appointmentId && x.type === '24h_reminder',
    )
    if (r) r.lastError = 'zapier booking webhook not delivered'
    return
  }
  const db = getDb()
  await db
    .update(schema.reminders)
    .set({ lastError: 'zapier booking webhook not delivered', updatedAt: new Date() })
    .where(
      and(
        eq(schema.reminders.appointmentId, appointmentId),
        eq(schema.reminders.type, '24h_reminder'),
      ),
    )
}

// --------------------------------------------------------------------------
// callback writes
// --------------------------------------------------------------------------

export async function saveTriage(
  bookingRef: string,
  patch: {
    aiUrgency?: AppointmentRecord['aiUrgency']
    aiSummary?: string
    aiRedFlag?: boolean
    aiConfirmationMessage?: string
    confirm?: boolean
  },
): Promise<boolean> {
  if (MOCK_MODE) {
    const a = mockStore().appointments.find((x) => x.bookingRef === bookingRef)
    if (!a) return false
    if (patch.aiUrgency !== undefined) a.aiUrgency = patch.aiUrgency
    if (patch.aiSummary !== undefined) a.aiSummary = patch.aiSummary
    if (patch.aiRedFlag !== undefined) a.aiRedFlag = patch.aiRedFlag
    if (patch.aiConfirmationMessage !== undefined) {
      a.aiConfirmationMessage = patch.aiConfirmationMessage
    }
    if (patch.confirm && a.status === 'pending') a.status = 'confirmed'
    return true
  }

  const db = getDb()
  const set: Record<string, unknown> = { updatedAt: new Date() }
  if (patch.aiUrgency !== undefined) set.aiUrgency = patch.aiUrgency
  if (patch.aiSummary !== undefined) set.aiSummary = patch.aiSummary
  if (patch.aiRedFlag !== undefined) set.aiRedFlag = patch.aiRedFlag
  if (patch.aiConfirmationMessage !== undefined) {
    set.aiConfirmationMessage = patch.aiConfirmationMessage
  }
  if (patch.confirm) set.status = 'confirmed'

  const [row] = await db
    .update(schema.appointments)
    .set(set)
    .where(eq(schema.appointments.bookingRef, bookingRef))
    .returning({ id: schema.appointments.id })
  return Boolean(row)
}

export async function saveCalendarEventId(
  bookingRef: string,
  calendarEventId: string,
): Promise<boolean> {
  if (MOCK_MODE) {
    const a = mockStore().appointments.find((x) => x.bookingRef === bookingRef)
    if (!a) return false
    a.calendarEventId = calendarEventId
    return true
  }
  const db = getDb()
  const [row] = await db
    .update(schema.appointments)
    .set({ calendarEventId, updatedAt: new Date() })
    .where(eq(schema.appointments.bookingRef, bookingRef))
    .returning({ id: schema.appointments.id })
  return Boolean(row)
}

export async function saveContactTriage(
  contactMessageId: string,
  patch: { aiTopic?: ContactMessageRecord['topic']; aiDraftReply?: string; status?: ContactMessageRecord['status'] },
): Promise<boolean> {
  if (MOCK_MODE) {
    const m = mockStore().contactMessages.find((x) => x.id === contactMessageId)
    if (!m) return false
    if (patch.aiTopic !== undefined) m.aiTopic = patch.aiTopic
    if (patch.aiDraftReply !== undefined) m.aiDraftReply = patch.aiDraftReply
    if (patch.status !== undefined) m.status = patch.status
    return true
  }

  const db = getDb()
  const set: Record<string, unknown> = {}
  if (patch.aiTopic !== undefined) set.aiTopic = patch.aiTopic
  if (patch.aiDraftReply !== undefined) set.aiDraftReply = patch.aiDraftReply
  if (patch.status !== undefined) set.status = patch.status
  if (Object.keys(set).length === 0) return true

  const [row] = await db
    .update(schema.contactMessages)
    .set(set)
    .where(eq(schema.contactMessages.id, contactMessageId))
    .returning({ id: schema.contactMessages.id })
  return Boolean(row)
}

export async function saveFeedback(
  bookingRef: string,
  rating: number,
  comment: string | null,
): Promise<boolean> {
  if (MOCK_MODE) {
    const store = mockStore()
    const a = store.appointments.find((x) => x.bookingRef === bookingRef)
    if (!a) return false
    const existing = store.feedback.find((f) => f.appointmentId === a.id)
    if (existing) {
      existing.rating = rating
      existing.comment = comment
    } else {
      store.feedback.push({
        id: randomUUID(),
        appointmentId: a.id,
        rating,
        comment,
        createdAt: new Date(),
      })
    }
    return true
  }

  const db = getDb()
  const [appointment] = await db
    .select({ id: schema.appointments.id })
    .from(schema.appointments)
    .where(eq(schema.appointments.bookingRef, bookingRef))
    .limit(1)
  if (!appointment) return false

  await db
    .insert(schema.feedback)
    .values({ appointmentId: appointment.id, rating, comment })
    .onConflictDoUpdate({
      target: schema.feedback.appointmentId,
      set: { rating, comment },
    })
  return true
}

export { manageUrlFor, feedbackUrlFor }