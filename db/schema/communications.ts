/**
 * Postgres schema `communications`: inbound messages, outbound reminders and
 * the ratings patients leave after a visit.
 */
import {
  pgSchema,
  uuid,
  text,
  smallint,
  timestamp,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { organizations } from './core'
import { appointments } from './medical'

export const communications = pgSchema('communications')

export const contactTopic = communications.enum('contact_topic', [
  'billing',
  'appointment',
  'general',
  'complaint',
])

export const contactStatus = communications.enum('contact_status', [
  'new',
  'in_review',
  'replied',
])

export const reminderType = communications.enum('reminder_type', ['24h_reminder', 'post_visit'])

export const reminderStatus = communications.enum('reminder_status', ['pending', 'sent', 'failed'])

export const reminderChannelComms = communications.enum('reminder_channel', ['email', 'sms'])

export const contactMessages = communications.table(
  'contact_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    email: text('email').notNull(),
    topic: contactTopic('topic').notNull().default('general'),
    message: text('message').notNull(),
    /** Topic the automation classified it as, which may differ from the patient's pick. */
    aiTopic: text('ai_topic'),
    /** Draft reply for a staff member to review. Never sent automatically. */
    aiDraftReply: text('ai_draft_reply'),
    status: contactStatus('status').notNull().default('new'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index('contact_messages_organization_id_idx').on(t.organizationId),
    statusIdx: index('contact_messages_status_created_at_idx').on(t.status, t.createdAt),
  }),
)

export const reminders = communications.table(
  'reminders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    appointmentId: uuid('appointment_id')
      .notNull()
      .references(() => appointments.id, { onDelete: 'cascade' }),
    channel: reminderChannelComms('channel').notNull().default('email'),
    type: reminderType('type').notNull(),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    status: reminderStatus('status').notNull().default('pending'),
    /** Last failure message, for staff debugging. Never contains patient data. */
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    appointmentIdx: index('reminders_appointment_id_idx').on(t.appointmentId),
    dueIdx: index('reminders_status_scheduled_for_idx').on(t.status, t.scheduledFor),
    oneOfEachType: uniqueIndex('reminders_appointment_type_key').on(t.appointmentId, t.type),
  }),
)

export const feedback = communications.table(
  'feedback',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    appointmentId: uuid('appointment_id')
      .notNull()
      .references(() => appointments.id, { onDelete: 'cascade' }),
    rating: smallint('rating').notNull(),
    comment: text('comment'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    appointmentUnique: uniqueIndex('feedback_appointment_id_key').on(t.appointmentId),
    ratingCheck: check('feedback_rating_range', sql`${t.rating} >= 1 AND ${t.rating} <= 5`),
  }),
)

export type ContactMessage = typeof contactMessages.$inferSelect
export type Reminder = typeof reminders.$inferSelect
export type Feedback = typeof feedback.$inferSelect
