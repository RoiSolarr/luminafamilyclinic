/**
 * Postgres schema `core`: the organization and who may act on its behalf.
 * Nothing clinical lives here.
 */
import {
  pgSchema,
  uuid,
  text,
  boolean,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const core = pgSchema('core')

export const memberRole = core.enum('member_role', ['owner', 'admin', 'staff'])

/** Settings blob stored on `core.organizations.settings`. */
export type OrganizationSettings = {
  /** Length of one slot in the booking grid, in minutes. */
  slotMinutes: number
  /** How many days ahead patients may book. */
  bookingWindowDays: number
  /** Minimum hours between now and the first bookable slot. */
  minNoticeHours: number
  /** Closed dates as YYYY-MM-DD. */
  holidays: string[]
  /** Weekdays the clinic never opens. 0 = Sunday. */
  closedWeekdays: number[]
}

export const organizations = core.table(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    timezone: text('timezone').notNull().default('Asia/Manila'),
    phone: text('phone').notNull(),
    email: text('email').notNull(),
    address: text('address').notNull(),
    settings: jsonb('settings').$type<OrganizationSettings>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugUnique: uniqueIndex('organizations_slug_key').on(t.slug),
  }),
)

export const organizationMembers = core.table(
  'organization_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userEmail: text('user_email').notNull(),
    fullName: text('full_name').notNull(),
    role: memberRole('role').notNull().default('staff'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgEmailUnique: uniqueIndex('organization_members_org_email_key').on(
      t.organizationId,
      t.userEmail,
    ),
    orgIdx: index('organization_members_organization_id_idx').on(t.organizationId),
  }),
)

export type Organization = typeof organizations.$inferSelect
export type OrganizationMember = typeof organizationMembers.$inferSelect

/** Convenience: `now()` expression for manual updates. */
export const nowSql = sql`now()`
