/**
 * Postgres schema `medical`: clinicians, what they offer, when they work,
 * the patients and the appointments themselves.
 */
import {
  pgSchema,
  uuid,
  text,
  boolean,
  integer,
  smallint,
  numeric,
  date,
  time,
  timestamp,
  index,
  uniqueIndex,
  primaryKey,
  check,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { organizations } from './core'

export const medical = pgSchema('medical')

export const patientType = medical.enum('patient_type', ['new', 'returning'])

export const appointmentStatus = medical.enum('appointment_status', [
  'pending',
  'confirmed',
  'cancelled',
  'rescheduled',
  'completed',
  'no_show',
])

export const reminderChannel = medical.enum('reminder_channel', ['email', 'sms'])

export const aiUrgency = medical.enum('ai_urgency', ['routine', 'soon', 'urgent', 'emergency'])

export const providers = medical.table(
  'providers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    fullName: text('full_name').notNull(),
    specialty: text('specialty').notNull(),
    languages: text('languages').array().notNull().default(sql`ARRAY[]::text[]`),
    initials: text('initials').notNull(),
    bio: text('bio').notNull().default(''),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index('providers_organization_id_idx').on(t.organizationId),
    activeIdx: index('providers_is_active_idx').on(t.isActive),
  }),
)

export const services = medical.table(
  'services',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description').notNull().default(''),
    durationMinutes: integer('duration_minutes').notNull(),
    priceMin: numeric('price_min', { precision: 10, scale: 2 }).notNull(),
    priceMax: numeric('price_max', { precision: 10, scale: 2 }).notNull(),
    isTelehealth: boolean('is_telehealth').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgSlugUnique: uniqueIndex('services_org_slug_key').on(t.organizationId, t.slug),
    orgIdx: index('services_organization_id_idx').on(t.organizationId),
    durationCheck: check('services_duration_positive', sql`${t.durationMinutes} > 0`),
    priceCheck: check('services_price_range', sql`${t.priceMax} >= ${t.priceMin}`),
  }),
)

/** Join table: which doctor offers which service. */
export const providerServices = medical.table(
  'provider_services',
  {
    providerId: uuid('provider_id')
      .notNull()
      .references(() => providers.id, { onDelete: 'cascade' }),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.providerId, t.serviceId] }),
    providerIdx: index('provider_services_provider_id_idx').on(t.providerId),
    serviceIdx: index('provider_services_service_id_idx').on(t.serviceId),
  }),
)

/** Recurring weekly working hours, expressed in the organization timezone. */
export const providerSchedules = medical.table(
  'provider_schedules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => providers.id, { onDelete: 'cascade' }),
    dayOfWeek: smallint('day_of_week').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    providerIdx: index('provider_schedules_provider_id_idx').on(t.providerId),
    dowCheck: check(
      'provider_schedules_day_of_week_range',
      sql`${t.dayOfWeek} >= 0 AND ${t.dayOfWeek} <= 6`,
    ),
    rangeCheck: check('provider_schedules_time_range', sql`${t.endTime} > ${t.startTime}`),
  }),
)

export const patients = medical.table(
  'patients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    fullName: text('full_name').notNull(),
    email: text('email').notNull(),
    phone: text('phone').notNull(),
    dateOfBirth: date('date_of_birth').notNull(),
    patientType: patientType('patient_type').notNull().default('new'),
    insurance: text('insurance'),
    consentGivenAt: timestamp('consent_given_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgEmailUnique: uniqueIndex('patients_org_email_key').on(t.organizationId, t.email),
    orgIdx: index('patients_organization_id_idx').on(t.organizationId),
  }),
)

export const appointments = medical.table(
  'appointments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingRef: text('booking_ref').notNull(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'restrict' }),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => providers.id, { onDelete: 'restrict' }),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'restrict' }),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    status: appointmentStatus('status').notNull().default('pending'),
    reasonForVisit: text('reason_for_visit').notNull().default(''),
    reminderChannel: reminderChannel('reminder_channel').notNull().default('email'),
    /** SHA-256 of the manage token. The raw token is never stored. */
    manageTokenHash: text('manage_token_hash').notNull(),
    calendarEventId: text('calendar_event_id'),
    aiUrgency: aiUrgency('ai_urgency'),
    aiSummary: text('ai_summary'),
    aiRedFlag: boolean('ai_red_flag').notNull().default(false),
    aiConfirmationMessage: text('ai_confirmation_message'),
    cancelledReason: text('cancelled_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    bookingRefUnique: uniqueIndex('appointments_booking_ref_key').on(t.bookingRef),
    orgIdx: index('appointments_organization_id_idx').on(t.organizationId),
    patientIdx: index('appointments_patient_id_idx').on(t.patientId),
    serviceIdx: index('appointments_service_id_idx').on(t.serviceId),
    providerStartIdx: index('appointments_provider_id_starts_at_idx').on(t.providerId, t.startsAt),
    statusStartIdx: index('appointments_status_starts_at_idx').on(t.status, t.startsAt),
    rangeCheck: check('appointments_time_range', sql`${t.endsAt} > ${t.startsAt}`),
    refFormatCheck: check('appointments_booking_ref_format', sql`${t.bookingRef} ~ '^[A-Z]{2,5}-[A-Z0-9]{6}$'`),
    // The partial unique index that actually prevents double booking is created
    // in the SQL migration, because drizzle cannot express a WHERE clause here.
  }),
)

export type Provider = typeof providers.$inferSelect
export type Service = typeof services.$inferSelect
export type ProviderSchedule = typeof providerSchedules.$inferSelect
export type Patient = typeof patients.$inferSelect
export type Appointment = typeof appointments.$inferSelect
export type NewAppointment = typeof appointments.$inferInsert
