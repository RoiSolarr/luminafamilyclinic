-- Lumina Family Clinic: initial schema.
-- Three Postgres schemas, one per domain. Every table has RLS enabled and no
-- policies, so the anon and authenticated Supabase roles can read nothing.
-- Only the owner role (the connection string in DATABASE_URL) reaches the data.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS "core";
CREATE SCHEMA IF NOT EXISTS "medical";
CREATE SCHEMA IF NOT EXISTS "communications";

--> statement-breakpoint

-- ---------------------------------------------------------------- enum types
DO $$ BEGIN
  CREATE TYPE "core"."member_role" AS ENUM ('owner', 'admin', 'staff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "medical"."patient_type" AS ENUM ('new', 'returning');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "medical"."appointment_status" AS ENUM ('pending', 'confirmed', 'cancelled', 'rescheduled', 'completed', 'no_show');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "medical"."reminder_channel" AS ENUM ('email', 'sms');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "medical"."ai_urgency" AS ENUM ('routine', 'soon', 'urgent', 'emergency');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "communications"."contact_topic" AS ENUM ('billing', 'appointment', 'general', 'complaint');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "communications"."contact_status" AS ENUM ('new', 'in_review', 'replied');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "communications"."reminder_type" AS ENUM ('24h_reminder', 'post_visit');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "communications"."reminder_status" AS ENUM ('pending', 'sent', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "communications"."reminder_channel" AS ENUM ('email', 'sms');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

--> statement-breakpoint

-- ------------------------------------------------------------- schema: core
CREATE TABLE IF NOT EXISTS "core"."organizations" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"       text NOT NULL,
  "slug"       text NOT NULL,
  "timezone"   text NOT NULL DEFAULT 'Asia/Manila',
  "phone"      text NOT NULL,
  "email"      text NOT NULL,
  "address"    text NOT NULL,
  "settings"   jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "organizations_slug_key" ON "core"."organizations" ("slug");

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "core"."organization_members" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "core"."organizations"("id") ON DELETE CASCADE,
  "user_email"      text NOT NULL,
  "full_name"       text NOT NULL,
  "role"            "core"."member_role" NOT NULL DEFAULT 'staff',
  "is_active"       boolean NOT NULL DEFAULT true,
  "created_at"      timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "organization_members_org_email_key" ON "core"."organization_members" ("organization_id", "user_email");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organization_members_organization_id_idx" ON "core"."organization_members" ("organization_id");

--> statement-breakpoint

-- ---------------------------------------------------------- schema: medical
CREATE TABLE IF NOT EXISTS "medical"."providers" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "core"."organizations"("id") ON DELETE CASCADE,
  "full_name"       text NOT NULL,
  "specialty"       text NOT NULL,
  "languages"       text[] NOT NULL DEFAULT ARRAY[]::text[],
  "initials"        text NOT NULL,
  "bio"             text NOT NULL DEFAULT '',
  "is_active"       boolean NOT NULL DEFAULT true,
  "created_at"      timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "providers_organization_id_idx" ON "medical"."providers" ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "providers_is_active_idx" ON "medical"."providers" ("is_active");

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "medical"."services" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"  uuid NOT NULL REFERENCES "core"."organizations"("id") ON DELETE CASCADE,
  "name"             text NOT NULL,
  "slug"             text NOT NULL,
  "description"      text NOT NULL DEFAULT '',
  "duration_minutes" integer NOT NULL,
  "price_min"        numeric(10,2) NOT NULL,
  "price_max"        numeric(10,2) NOT NULL,
  "is_telehealth"    boolean NOT NULL DEFAULT false,
  "is_active"        boolean NOT NULL DEFAULT true,
  "created_at"       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "services_duration_positive" CHECK ("duration_minutes" > 0),
  CONSTRAINT "services_price_range" CHECK ("price_max" >= "price_min")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "services_org_slug_key" ON "medical"."services" ("organization_id", "slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "services_organization_id_idx" ON "medical"."services" ("organization_id");

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "medical"."provider_services" (
  "provider_id" uuid NOT NULL REFERENCES "medical"."providers"("id") ON DELETE CASCADE,
  "service_id"  uuid NOT NULL REFERENCES "medical"."services"("id") ON DELETE CASCADE,
  CONSTRAINT "provider_services_pkey" PRIMARY KEY ("provider_id", "service_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "provider_services_provider_id_idx" ON "medical"."provider_services" ("provider_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "provider_services_service_id_idx" ON "medical"."provider_services" ("service_id");

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "medical"."provider_schedules" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "provider_id" uuid NOT NULL REFERENCES "medical"."providers"("id") ON DELETE CASCADE,
  "day_of_week" smallint NOT NULL,
  "start_time"  time NOT NULL,
  "end_time"    time NOT NULL,
  "is_active"   boolean NOT NULL DEFAULT true,
  "created_at"  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "provider_schedules_day_of_week_range" CHECK ("day_of_week" >= 0 AND "day_of_week" <= 6),
  CONSTRAINT "provider_schedules_time_range" CHECK ("end_time" > "start_time")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "provider_schedules_provider_id_idx" ON "medical"."provider_schedules" ("provider_id");

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "medical"."patients" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"  uuid NOT NULL REFERENCES "core"."organizations"("id") ON DELETE CASCADE,
  "full_name"        text NOT NULL,
  "email"            text NOT NULL,
  "phone"            text NOT NULL,
  "date_of_birth"    date NOT NULL,
  "patient_type"     "medical"."patient_type" NOT NULL DEFAULT 'new',
  "insurance"        text,
  "consent_given_at" timestamptz,
  "created_at"       timestamptz NOT NULL DEFAULT now(),
  "updated_at"       timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "patients_org_email_key" ON "medical"."patients" ("organization_id", "email");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_organization_id_idx" ON "medical"."patients" ("organization_id");

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "medical"."appointments" (
  "id"                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "booking_ref"             text NOT NULL,
  "organization_id"         uuid NOT NULL REFERENCES "core"."organizations"("id") ON DELETE CASCADE,
  "patient_id"              uuid NOT NULL REFERENCES "medical"."patients"("id") ON DELETE RESTRICT,
  "provider_id"             uuid NOT NULL REFERENCES "medical"."providers"("id") ON DELETE RESTRICT,
  "service_id"              uuid NOT NULL REFERENCES "medical"."services"("id") ON DELETE RESTRICT,
  "starts_at"               timestamptz NOT NULL,
  "ends_at"                 timestamptz NOT NULL,
  "status"                  "medical"."appointment_status" NOT NULL DEFAULT 'pending',
  "reason_for_visit"        text NOT NULL DEFAULT '',
  "reminder_channel"        "medical"."reminder_channel" NOT NULL DEFAULT 'email',
  "manage_token_hash"       text NOT NULL,
  "calendar_event_id"       text,
  "ai_urgency"              "medical"."ai_urgency",
  "ai_summary"              text,
  "ai_red_flag"             boolean NOT NULL DEFAULT false,
  "ai_confirmation_message" text,
  "cancelled_reason"        text,
  "created_at"              timestamptz NOT NULL DEFAULT now(),
  "updated_at"              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "appointments_time_range" CHECK ("ends_at" > "starts_at"),
  CONSTRAINT "appointments_booking_ref_format" CHECK ("booking_ref" ~ '^[A-Z]{2,5}-[A-Z0-9]{6}$')
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "appointments_booking_ref_key" ON "medical"."appointments" ("booking_ref");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_organization_id_idx" ON "medical"."appointments" ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_patient_id_idx" ON "medical"."appointments" ("patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_service_id_idx" ON "medical"."appointments" ("service_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_provider_id_starts_at_idx" ON "medical"."appointments" ("provider_id", "starts_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_status_starts_at_idx" ON "medical"."appointments" ("status", "starts_at");

--> statement-breakpoint
-- The double booking guard. A provider can hold only one live appointment at a
-- given start time. Cancelled, rescheduled, completed and no_show rows are
-- excluded, so cancelling frees the slot with no extra work.
CREATE UNIQUE INDEX IF NOT EXISTS "appointments_live_slot_key"
  ON "medical"."appointments" ("provider_id", "starts_at")
  WHERE "status" IN ('pending', 'confirmed');

--> statement-breakpoint

-- -------------------------------------------------- schema: communications
CREATE TABLE IF NOT EXISTS "communications"."contact_messages" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "core"."organizations"("id") ON DELETE CASCADE,
  "name"            text NOT NULL,
  "email"           text NOT NULL,
  "topic"           "communications"."contact_topic" NOT NULL DEFAULT 'general',
  "message"         text NOT NULL,
  "ai_topic"        text,
  "ai_draft_reply"  text,
  "status"          "communications"."contact_status" NOT NULL DEFAULT 'new',
  "created_at"      timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contact_messages_organization_id_idx" ON "communications"."contact_messages" ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contact_messages_status_created_at_idx" ON "communications"."contact_messages" ("status", "created_at");

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communications"."reminders" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "appointment_id" uuid NOT NULL REFERENCES "medical"."appointments"("id") ON DELETE CASCADE,
  "channel"        "communications"."reminder_channel" NOT NULL DEFAULT 'email',
  "type"           "communications"."reminder_type" NOT NULL,
  "scheduled_for"  timestamptz NOT NULL,
  "sent_at"        timestamptz,
  "status"         "communications"."reminder_status" NOT NULL DEFAULT 'pending',
  "last_error"     text,
  "created_at"     timestamptz NOT NULL DEFAULT now(),
  "updated_at"     timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminders_appointment_id_idx" ON "communications"."reminders" ("appointment_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminders_status_scheduled_for_idx" ON "communications"."reminders" ("status", "scheduled_for");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "reminders_appointment_type_key" ON "communications"."reminders" ("appointment_id", "type");

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communications"."feedback" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "appointment_id" uuid NOT NULL REFERENCES "medical"."appointments"("id") ON DELETE CASCADE,
  "rating"         smallint NOT NULL,
  "comment"        text,
  "created_at"     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "feedback_rating_range" CHECK ("rating" >= 1 AND "rating" <= 5)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "feedback_appointment_id_key" ON "communications"."feedback" ("appointment_id");

--> statement-breakpoint

-- ------------------------------------------------- keep updated_at honest
CREATE OR REPLACE FUNCTION "core"."set_updated_at"() RETURNS trigger AS $$
BEGIN
  NEW."updated_at" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

--> statement-breakpoint
DROP TRIGGER IF EXISTS "organizations_set_updated_at" ON "core"."organizations";
CREATE TRIGGER "organizations_set_updated_at" BEFORE UPDATE ON "core"."organizations"
  FOR EACH ROW EXECUTE FUNCTION "core"."set_updated_at"();
--> statement-breakpoint
DROP TRIGGER IF EXISTS "patients_set_updated_at" ON "medical"."patients";
CREATE TRIGGER "patients_set_updated_at" BEFORE UPDATE ON "medical"."patients"
  FOR EACH ROW EXECUTE FUNCTION "core"."set_updated_at"();
--> statement-breakpoint
DROP TRIGGER IF EXISTS "appointments_set_updated_at" ON "medical"."appointments";
CREATE TRIGGER "appointments_set_updated_at" BEFORE UPDATE ON "medical"."appointments"
  FOR EACH ROW EXECUTE FUNCTION "core"."set_updated_at"();
--> statement-breakpoint
DROP TRIGGER IF EXISTS "reminders_set_updated_at" ON "communications"."reminders";
CREATE TRIGGER "reminders_set_updated_at" BEFORE UPDATE ON "communications"."reminders"
  FOR EACH ROW EXECUTE FUNCTION "core"."set_updated_at"();

--> statement-breakpoint

-- --------------------------------------------------- row level security
-- Enabled everywhere, with zero policies. Any role that is subject to RLS
-- (Supabase `anon`, `authenticated`, and anything using the public API) sees an
-- empty table. The owner role used by this application bypasses RLS, which is
-- why FORCE is deliberately NOT used: the app would lock itself out.
ALTER TABLE "core"."organizations"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."organization_members"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "medical"."providers"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "medical"."services"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "medical"."provider_services"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "medical"."provider_schedules"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "medical"."patients"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "medical"."appointments"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "communications"."contact_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "communications"."reminders"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "communications"."feedback"       ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
-- Belt and braces: make sure the PostgREST roles cannot reach these schemas at
-- all, so nothing is exposed even if a policy is added by mistake later.
REVOKE ALL ON SCHEMA "core", "medical", "communications" FROM PUBLIC;
DO $$ BEGIN
  EXECUTE 'REVOKE ALL ON SCHEMA "core", "medical", "communications" FROM anon, authenticated';
EXCEPTION WHEN undefined_object THEN NULL; END $$;
