/**
 * Fills an empty database with the fictional clinic.
 *
 * Idempotent: it deletes the rows belonging to the Lumina organization first,
 * then rebuilds them, so you can run it as often as you like.
 *
 * Run with `npm run db:seed` after `npm run db:migrate`.
 */
import { requireDatabaseUrl } from './env'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq } from 'drizzle-orm'
import { randomUUID, createHash } from 'node:crypto'

import * as schema from './schema'
import { clinic } from '../config/clinic'
import {
  demoAppointments,
  demoContactMessages,
  demoMembers,
  demoPatients,
  demoProviders,
  demoServices,
} from '../lib/demo-data'
import {
  addDaysToDateString,
  minutesFromTimeString,
  timeStringFromMinutes,
  todayInZone,
  weekdayOfDateString,
  zonedToUtc,
} from '../lib/time'

const TZ = clinic.timezone

function hash(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

/** True when the provider works at `time` on `dateStr`. */
function providerWorksAt(
  provider: (typeof demoProviders)[number],
  dateStr: string,
  time: string,
  durationMinutes: number,
): boolean {
  // `clinic` is `as const`, so these arrays are readonly tuples of literals.
  if ((clinic.booking.holidays as readonly string[]).includes(dateStr)) return false
  const dow = weekdayOfDateString(dateStr)
  if ((clinic.booking.closedWeekdays as readonly number[]).includes(dow)) return false

  const start = minutesFromTimeString(time)
  const end = start + durationMinutes
  return provider.schedule.some(
    (block) =>
      block.dayOfWeek === dow &&
      start >= minutesFromTimeString(block.startTime) &&
      end <= minutesFromTimeString(block.endTime),
  )
}

/**
 * Walk outward from the requested day until we find a date and time where the
 * provider is actually working and no other seeded appointment sits there.
 */
function placeAppointment(
  provider: (typeof demoProviders)[number],
  preferredDate: string,
  preferredTime: string,
  durationMinutes: number,
  taken: Set<string>,
  searchForward: boolean,
): { date: string; time: string } | null {
  const step = searchForward ? 1 : -1
  for (let dayShift = 0; dayShift < 21; dayShift++) {
    const date = addDaysToDateString(preferredDate, dayShift * step)
    for (let slotShift = 0; slotShift < 20; slotShift++) {
      const time = timeStringFromMinutes(minutesFromTimeString(preferredTime) + slotShift * 30)
      if (!providerWorksAt(provider, date, time, durationMinutes)) continue
      const key = `${provider.key}|${date}|${time}`
      if (taken.has(key)) continue
      taken.add(key)
      return { date, time }
    }
  }
  return null
}

async function main() {
  const url = requireDatabaseUrl()

  const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} })
  const db = drizzle(sql, { schema })

  console.log('Seeding Lumina Family Clinic...')

  // ------------------------------------------------------------ organization
  // Cascades remove members, providers, services, patients and appointments.
  await db.delete(schema.organizations).where(eq(schema.organizations.slug, clinic.slug))

  const orgId = randomUUID()
  await db.insert(schema.organizations).values({
    id: orgId,
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
  })
  console.log('  organization: 1')

  // ----------------------------------------------------------------- members
  await db.insert(schema.organizationMembers).values(
    demoMembers.map((m) => ({
      organizationId: orgId,
      userEmail: m.userEmail,
      fullName: m.fullName,
      role: m.role,
      isActive: true,
    })),
  )
  console.log(`  members: ${demoMembers.length}`)

  // ---------------------------------------------------------------- services
  const serviceIdBySlug = new Map<string, string>()
  await db.insert(schema.services).values(
    demoServices.map((s) => {
      const id = randomUUID()
      serviceIdBySlug.set(s.slug, id)
      return {
        id,
        organizationId: orgId,
        name: s.name,
        slug: s.slug,
        description: s.description,
        durationMinutes: s.durationMinutes,
        priceMin: s.priceMin.toFixed(2),
        priceMax: s.priceMax.toFixed(2),
        isTelehealth: s.isTelehealth,
        isActive: true,
      }
    }),
  )
  console.log(`  services: ${demoServices.length}`)

  // --------------------------------------------------------------- providers
  const providerIdByKey = new Map<string, string>()
  await db.insert(schema.providers).values(
    demoProviders.map((p) => {
      const id = randomUUID()
      providerIdByKey.set(p.key, id)
      return {
        id,
        organizationId: orgId,
        fullName: p.fullName,
        specialty: p.specialty,
        languages: p.languages,
        initials: p.initials,
        bio: p.bio,
        isActive: true,
      }
    }),
  )
  console.log(`  providers: ${demoProviders.length}`)

  // ---------------------------------------------------- provider <-> service
  const links = demoProviders.flatMap((p) =>
    p.services.map((slug) => ({
      providerId: providerIdByKey.get(p.key)!,
      serviceId: serviceIdBySlug.get(slug)!,
    })),
  )
  await db.insert(schema.providerServices).values(links)
  console.log(`  provider_services: ${links.length}`)

  // --------------------------------------------------------------- schedules
  const schedules = demoProviders.flatMap((p) =>
    p.schedule.map((block) => ({
      providerId: providerIdByKey.get(p.key)!,
      dayOfWeek: block.dayOfWeek,
      startTime: block.startTime,
      endTime: block.endTime,
      isActive: true,
    })),
  )
  await db.insert(schema.providerSchedules).values(schedules)
  console.log(`  provider_schedules: ${schedules.length}`)

  // ---------------------------------------------------------------- patients
  const patientIdByEmail = new Map<string, string>()
  await db.insert(schema.patients).values(
    demoPatients.map((p) => {
      const id = randomUUID()
      patientIdByEmail.set(p.email, id)
      return {
        id,
        organizationId: orgId,
        fullName: p.fullName,
        email: p.email,
        phone: p.phone,
        dateOfBirth: p.dateOfBirth,
        patientType: p.patientType,
        insurance: p.insurance,
        consentGivenAt: new Date(),
      }
    }),
  )
  console.log(`  patients: ${demoPatients.length}`)

  // ------------------------------------------------------------ appointments
  const today = todayInZone(TZ)
  const taken = new Set<string>()
  const refAlphabet = 'ACDEFGHJKLMNPQRTUVWXY34679'
  let refCounter = 0
  const nextRef = () => {
    // Deterministic references so the seeded data is easy to talk about.
    refCounter += 1
    let n = refCounter * 7919
    let body = ''
    for (let i = 0; i < 6; i++) {
      body += refAlphabet[n % refAlphabet.length]
      n = Math.floor(n / refAlphabet.length) + 13 * (i + 1)
    }
    return `${clinic.bookingRefPrefix}-${body}`
  }

  const appointmentRows: (typeof schema.appointments.$inferInsert)[] = []
  const reminderRows: (typeof schema.reminders.$inferInsert)[] = []

  for (const seed of demoAppointments) {
    const provider = demoProviders.find((p) => p.key === seed.providerKey)!
    const service = demoServices.find((s) => s.slug === seed.serviceSlug)!
    const preferredDate = addDaysToDateString(today, seed.dayOffset)

    const placed = placeAppointment(
      provider,
      preferredDate,
      seed.time,
      service.durationMinutes,
      taken,
      seed.dayOffset >= 0,
    )
    if (!placed) {
      console.warn(`  ! skipped one appointment for ${provider.fullName}: no free slot found`)
      continue
    }

    const startsAt = zonedToUtc(placed.date, placed.time, TZ)
    const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60000)
    const id = randomUUID()
    const bookingRef = nextRef()

    appointmentRows.push({
      id,
      bookingRef,
      organizationId: orgId,
      patientId: patientIdByEmail.get(seed.patientEmail)!,
      providerId: providerIdByKey.get(provider.key)!,
      serviceId: serviceIdBySlug.get(service.slug)!,
      startsAt,
      endsAt,
      status: seed.status,
      reasonForVisit: seed.reasonForVisit,
      reminderChannel: seed.reminderChannel,
      // Demo tokens, derived from the reference. Real bookings use random ones.
      manageTokenHash: hash(`demo-token-${bookingRef}`),
      aiUrgency: seed.aiUrgency ?? null,
      aiSummary: seed.aiSummary ?? null,
      aiRedFlag: seed.aiRedFlag ?? false,
      aiConfirmationMessage: null,
      calendarEventId: null,
    })

    if (seed.status === 'pending' || seed.status === 'confirmed') {
      reminderRows.push({
        appointmentId: id,
        channel: seed.reminderChannel,
        type: '24h_reminder',
        scheduledFor: new Date(startsAt.getTime() - 24 * 3600 * 1000),
        status: 'pending',
      })
    }
    if (seed.status === 'completed') {
      reminderRows.push({
        appointmentId: id,
        channel: 'email',
        type: 'post_visit',
        scheduledFor: new Date(endsAt.getTime() + 24 * 3600 * 1000),
        status: 'sent',
        sentAt: new Date(endsAt.getTime() + 24 * 3600 * 1000),
      })
    }
  }

  await db.insert(schema.appointments).values(appointmentRows)
  console.log(`  appointments: ${appointmentRows.length}`)

  if (reminderRows.length) {
    await db.insert(schema.reminders).values(reminderRows)
    console.log(`  reminders: ${reminderRows.length}`)
  }

  // ------------------------------------------------------- contact messages
  await db.insert(schema.contactMessages).values(
    demoContactMessages.map((m) => ({
      organizationId: orgId,
      name: m.name,
      email: m.email,
      topic: m.topic,
      message: m.message,
      aiTopic: m.aiTopic,
      aiDraftReply: null,
      status: m.status,
    })),
  )
  console.log(`  contact_messages: ${demoContactMessages.length}`)

  // --------------------------------------------------------------- feedback
  const completed = appointmentRows.filter((a) => a.status === 'completed')
  if (completed.length) {
    await db.insert(schema.feedback).values(
      completed.map((a, i) => ({
        appointmentId: a.id!,
        rating: (i % 2 === 0 ? 5 : 4) as number,
        comment: i % 2 === 0 ? 'Seen on time and the explanation was clear.' : null,
      })),
    )
    console.log(`  feedback: ${completed.length}`)
  }

  console.log('\nSeed complete.')
  console.log(`Organization id: ${orgId}`)
  await sql.end()
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
