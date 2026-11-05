# Lumina Family Clinic

An appointment booking website for a **fictional** multi specialty clinic. Built
to show four things working together: a Next.js front end, a properly normalised
PostgreSQL database as the source of truth, Zapier doing AI triage, and Brevo
delivering the patient email.

> **Demo website. Fictional business. Not for real medical use.**
> Every doctor, phone number, address and review in this project is invented.

---

## What it does

Patients book, reschedule and cancel online without an account. The database
holds everything. Zapier reads events from the site and writes results back
through one secured endpoint, and never touches the database directly.

- **Four step booking wizard** with live availability, a custom accessible
  calendar, and progress that survives a page refresh
- **Real double booking protection** at the database level, not just in the UI
- **Manage links** backed by a hashed token, so the database never holds anything
  that could be replayed as a link
- **AI triage** through Zapier, writing urgency, a neutral staff summary and a red
  flag back onto the appointment
- **Patient email** sent by the application through Brevo: confirmations,
  cancellations, reschedules, reminders and post visit follow ups
- **A reminder queue** drained by one endpoint that an hourly schedule pokes, so
  nothing is ever sent twice
- **Staff dashboard** at `/admin`, read only, behind Basic auth
- **Mock mode** that runs the entire site on in memory data, so you can click
  through every screen before Supabase, Brevo or Zapier exist

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 14, App Router, TypeScript |
| Styling | Tailwind CSS with CSS variable tokens, container queries |
| Motion | Framer Motion, every animation disabled under `prefers-reduced-motion` |
| Components | Radix primitives, hand styled |
| Forms | react-hook-form patterns with Zod schemas shared by client and server |
| Database | PostgreSQL via Supabase or Neon |
| ORM | Drizzle, using `pgSchema()` for real Postgres schemas |
| AI triage | Zapier |
| Email | Brevo, called from the application |
| Hosting | Vercel |

---

## Quick start

You need Node 18.18 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. `.env.example` ships with
`NEXT_PUBLIC_MOCK_MODE=true`, so the whole site works immediately with in memory
demo data. No database, no Zapier, no accounts.

Set these two before you try `/admin` or the Zapier endpoints:

```bash
ADMIN_PASSWORD=pick-something-long
ZAPIER_CALLBACK_SECRET=$(openssl rand -hex 32)
```

---

## File structure

```
lumina-family-clinic/
├── app/
│   ├── layout.tsx              Root layout: fonts, metadata, JSON-LD, theme script
│   ├── page.tsx                Home
│   ├── globals.css             Design tokens, light and dark, base styles
│   ├── book/                   Booking wizard page
│   ├── manage/                 Reschedule and cancel
│   ├── services/ doctors/      Read from medical.services and medical.providers
│   ├── faq/ contact/           Content pages with the contact form
│   ├── privacy/ terms/         Legal templates
│   ├── feedback/               Post visit rating, opened by a signed link
│   ├── admin/                  Staff dashboard, protected by middleware.ts
│   ├── error.tsx               Route error boundary
│   ├── global-error.tsx        Last resort boundary
│   ├── not-found.tsx           Custom 404
│   ├── robots.ts sitemap.ts    SEO
│   └── api/
│       ├── availability/       GET slots for one day
│       ├── book/               POST a new appointment
│       ├── manage/             GET one booking, token checked
│       ├── cancel/             POST cancel
│       ├── reschedule/         POST move
│       ├── contact/            POST a message
│       ├── feedback/           POST a rating, signature checked
│       ├── cron/
│       │   └── send-reminders/ Drains the reminder queue, sends via Brevo
│       └── zapier/
│           ├── callback/       POST results back from Zapier
│           └── due-reminders/  GET the work queue, read only
│
├── components/
│   ├── booking/                Wizard, stepper, four steps, calendar, success
│   ├── manage/                 Manage booking client
│   ├── admin/                  Dashboard filters
│   ├── ui/                     Button, fields, primitives, toasts
│   ├── site-header.tsx         Sticky header, mobile drawer
│   ├── site-footer.tsx         Footer with the demo notice
│   ├── mobile-book-bar.tsx     Sticky Book now bar, phones only
│   ├── theme-toggle.tsx        Light, system, dark
│   ├── contact-form.tsx        Shared by /contact and /faq
│   └── motion.tsx              Reveal, stagger, success tick
│
├── config/
│   └── clinic.ts               ALL branding and copy lives here
│
├── db/
│   ├── index.ts                Server only client, cached connection
│   ├── schema/core.ts          Postgres schema `core`
│   ├── schema/medical.ts       Postgres schema `medical`
│   ├── schema/communications.ts Postgres schema `communications`
│   ├── migrations/0000_init.sql Hand written: RLS, partial unique index, triggers
│   ├── migrate.ts seed.ts reset.ts
│
├── lib/
│   ├── repo.ts                 The only module that knows mock from Postgres
│   ├── availability.ts         Slot generation
│   ├── schedule.ts             Pure roster rules, shared by booking and availability
│   ├── validation.ts           Zod schemas used by both client and server
│   ├── tokens.ts               Booking refs, manage tokens, hashing, HMAC
│   ├── zapier.ts               Outbound webhooks with retries
│   ├── email.ts                Brevo client, retries, never throws
│   ├── email-templates.ts      Every patient email, HTML and plain text
│   ├── rate-limit.ts           Fixed window limiter
│   ├── logger.ts               Structured logs that redact patient data
│   ├── time.ts                 Timezone conversion without a date library
│   ├── ics.ts                  Calendar file, built in the browser
│   ├── demo-data.ts            The fictional clinic, shared by seed and mock
│   └── mock/store.ts           In memory database for mock mode
│
├── middleware.ts               Basic auth on /admin
├── docs/
│   ├── DATABASE.md             Schema reference and ER diagram
│   ├── AUTOMATION.md           Zapier and Brevo setup, with the AI prompts
│   └── TEST_PLAN.md            Manual test cases
└── .env.example
```

### Where to change things

| To change | Edit |
| --- | --- |
| Clinic name, address, phone, copy, FAQs, holidays | `config/clinic.ts` |
| Doctors, services, schedules, demo appointments | `lib/demo-data.ts`, then re-seed |
| Colours, fonts, spacing | `app/globals.css` and `tailwind.config.ts` |
| Booking rules in a live database | `core.organizations.settings` |

---

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:generate` | Diff the schema and write a migration |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:seed` | Rebuild the demo clinic, safe to re-run |
| `npm run db:reset -- --yes` | Drop everything, migrate, seed |

---

## Setting up Supabase

Full click by click instructions, including screenshots of where each value
lives, are in the chat message that came with this project. The short version:

1. Create a project at `supabase.com`, choose a region near you, save the
   database password.
2. Open the project and click **Connect** in the top bar. Every connection
   string lives in that dialog.
3. Pick **Transaction pooler** (port 6543) for `DATABASE_URL`. That is the one
   the deployed site uses, because serverless functions open and close
   connections constantly.
4. Pick **Session pooler** (port 5432) for `DIRECT_DATABASE_URL`. Migrations
   create enum types, partial indexes and triggers in one session and hold a
   lock while they do, which transaction mode does not support properly.
   Use the session pooler rather than the option labelled **Direct connection**:
   that one is IPv6 only unless you buy Supabase's IPv4 add on, and most home
   ISPs will fail to resolve it.
5. In both strings, replace `[YOUR-PASSWORD]` and percent encode any symbols in
   it (`@` becomes `%40`). Append `?sslmode=require`.
6. Run:

```bash
npm run db:migrate
npm run db:seed
```

7. Set `NEXT_PUBLIC_MOCK_MODE=false` and restart.

Check it worked: `/doctors` should list six doctors and `/admin` should show
seeded appointments without the "Mock mode" badge.

---

## Setting up the automation

See [`docs/AUTOMATION.md`](docs/AUTOMATION.md) for the exact steps, every field
mapping, and the AI prompts to paste.

Work is split between the application and Zapier on one rule: anything a non
developer might reasonably want to reword lives in Zapier, everything else lives
in code.

| Piece | Runs in | Does |
| --- | --- | --- |
| Zap 1, new booking | Zapier, 3 steps | Catches the booking, AI triage, writes the result back |
| Zap 2, hourly tick | Zapier, 2 steps | Calls one endpoint on a schedule |
| Patient email | The app, via Brevo | Confirmation, cancellation, reschedule, reminder, follow up |
| `/api/cron/send-reminders` | The app | Drains the reminder queue, marks each row sent |
| Staff alert | Zapier, optional | Pages a human when the triage sets a red flag |
| Calendar sync | Zapier, optional | Not built. The hooks and payloads exist |

Webhooks by Zapier is a premium app, so both Zaps need a paid plan or the 14 day
trial. When the trial ends the Zaps stop, but every patient email keeps working,
because that is the application's job rather than Zapier's.

### Why email is not in Zapier

It was, at first. Moving it out came down to three things: Zapier charges per
task and email is the highest volume message in the system; a send failure now
lands in the application's own logs next to the request that caused it; and an
email template in `lib/email-templates.ts` shows up in a diff, which matters when
the text is what a patient reads about their own appointment.

The staff alert stayed in Zapier for the matching reason. A clinic manager might
well want to reword it, and should not need a deploy to do so.

---

## Deploying to Vercel

1. Push to GitHub.
2. In Vercel, **Add New → Project**, import the repo. The framework is detected.
3. Add every variable from `.env.example` under **Settings → Environment
   Variables**, for Production, Preview and Development.
4. Set `NEXT_PUBLIC_SITE_URL` to your real Vercel URL. Manage links and feedback
   links are built from it, so a wrong value produces links that go nowhere.
5. Deploy.
6. Go back to each Zap and update any URL that still points at localhost.

`vercel.json` pins the region to `sin1` (Singapore), nearest to the fictional
clinic. Change it to match your database region, because the gap between the
function and the database is the main thing that decides how fast availability
feels.

---

## How the pieces fit together

### Booking

```
Patient              Next.js              Postgres          Zapier        Brevo
   │                    │                     │                │            │
   ├─ picks a slot ────▶│                     │                │            │
   │                    ├─ read availability ▶│                │            │
   │◀─── free times ────┤                     │                │            │
   │                    │                     │                │            │
   ├─ confirms ────────▶│                     │                │            │
   │                    ├─ INSERT in a txn ──▶│                │            │
   │                    │  unique index decides                │            │
   │◀─ reference + link ┤                     │                │            │
   │                    ├─ POST booking ─────────────────────▶ │            │
   │                    │                     │                ├─ AI triage │
   │                    │◀─ POST /api/zapier/callback ──────── ┤            │
   │                    ├─ UPDATE ai_* ──────▶│                │            │
   │                    ├─ send confirmation ──────────────────────────────▶│
   │◀───────────────────────────── email ──────────────────────────────────┤
   │                    │                     │                ├─ staff alert
```

### Reminders

```
Zapier (hourly)        Next.js              Postgres                   Brevo
   │                      │                     │                        │
   ├─ GET /api/cron/send-reminders ────────────▶│                        │
   │                      ├─ create post visit rows                      │
   │                      ├─ read what is due ─▶│                        │
   │                      ├─ send each one ──────────────────────────── ▶│
   │                      ├─ mark rows sent ───▶│                        │
   │◀── {due, sent, failed, pending} ───────────┤                        │
```

Four things worth noticing.

**The booking is committed before any automation hears about it.** If the
webhook fails three times, the appointment still exists, and the patient still
gets a confirmation from the fallback path in `/api/book`. An automation outage
cannot lose a booking.

**Zapier has no database credential.** It receives an event, and it writes back
through one endpoint that can only touch a handful of fields.

**The unique index is the real guard.** Two patients can both see 10:00 free and
both submit. Application checks cannot close that gap, because the other
transaction can commit in between. The database closes it, and the loser gets a
409 and a friendly message.

**Reminders are marked sent as they go.** The second diagram's last write is
what makes the endpoint safe to call as often as you like. Running it twice in a
row sends nothing the second time.

---

## Data handling

A short, plain version. The full policy is at `/privacy`.

**What is collected.** The patient's name, email, mobile, date of birth, the
service and time, an optional insurer, and whatever they write in the reason for
visit. That last field is health information and is treated as such. Consent is
recorded with a timestamp before anything is stored.

**What is not collected.** No passwords, because there are no accounts. No
analytics, no advertising pixels, no tracking scripts. The site sets no cookies
at all.

**Manage tokens.** The database stores `SHA-256(token)` and nothing else. Someone
who read the entire appointments table still could not reconstruct a working
manage link. The raw token exists in exactly two places: the success screen and
the patient's email.

**Row level security.** Enabled on all eleven tables with zero policies, so the
Supabase `anon` and `authenticated` roles see empty tables. The three schemas are
also revoked from those roles, so they are not exposed through the data API in
the first place. `FORCE ROW LEVEL SECURITY` is deliberately not used: the
application connects as the owner and would lock itself out.

**Logs.** `lib/logger.ts` redacts by key before anything is written. Booking
references, appointment ids and statuses are logged; names, emails, phone
numbers, dates of birth, the reason for visit and tokens are not. Verify it by
making a booking and reading the server output.

**Secrets.** Only `NEXT_PUBLIC_*` variables reach the browser, and there are
exactly two of them: the site URL and the mock mode flag. Webhook URLs, the
callback secret and the connection string are read in server code only. Open the
network tab through a whole booking: the browser talks to nothing but your own
`/api/*` routes.

**Zapier's slice.** It receives one booking's details in order to run the triage
and, optionally, create a calendar event. It gets no database credential and can
write back only through one endpoint that touches a handful of fields.

**Brevo's slice.** One message at a time: a recipient address, a subject and the
rendered body. It never sees a date of birth, an insurer, or the reason for
visit, because none of those appear in any patient email.

**Everything user supplied is escaped** before it reaches an email body. A name
containing `<script>` renders as visible text rather than executing in whatever
client opens it.

---

## Pre launch checklist

**Before the first real deploy**

- [ ] `ADMIN_PASSWORD` is long and random, not `admin`
- [ ] `ZAPIER_CALLBACK_SECRET` came from `openssl rand -hex 32`
- [ ] `FEEDBACK_LINK_SECRET` is a different random value
- [ ] `BREVO_API_KEY` starts `xkeysib-`, not `xsmtp`
- [ ] `EMAIL_FROM_ADDRESS` is a Brevo verified sender or on an authenticated domain
- [ ] `NEXT_PUBLIC_SITE_URL` is the real URL, with no trailing slash
- [ ] `NEXT_PUBLIC_MOCK_MODE=false`
- [ ] `.env.local` is not committed; `.gitignore` already covers it
- [ ] `npm run build` passes
- [ ] `npm run typecheck` passes
- [ ] Migrations and the seed run clean against a throwaway local Postgres, not
      only against mock mode

**Database**

- [ ] Migrations applied, eleven tables across three schemas
- [ ] Seed run, `/doctors` shows six doctors
- [ ] Querying `medical.appointments` with the anon key returns nothing
- [ ] `manage_token_hash` holds 64 character hex, never a token
- [ ] Supabase automatic backups are on

**Automation**

- [ ] Both Zaps are published, not left as drafts
- [ ] Every webhook URL in Vercel points at the live Zap, not a test one
- [ ] A callback with a wrong secret returns 401
- [ ] A test booking produces: dashboard triage, a confirmation email, and a
      working manage button in it
- [ ] The `manageToken` row is present in Zap 1 step 3
- [ ] The reminder endpoint run twice in a row sends nothing the second time
- [ ] Cancelling an appointment sends an email and stops its pending reminder
- [ ] A booking mentioning chest pain shows Emergency and fires the staff alert

**The site**

- [ ] The demo notice is visible in the footer on every page
- [ ] The emergency banner is on `/book`
- [ ] 404 and error pages render properly
- [ ] `/sitemap.xml` and `/robots.txt` resolve
- [ ] Favicon shows in a browser tab
- [ ] Lighthouse 90+ on all four categories, against a production build
- [ ] Section 13 of `docs/TEST_PLAN.md` done at every listed width
- [ ] A whole booking completed with the keyboard alone
- [ ] Dark mode checked on every page

**Content, before showing anyone**

- [ ] Every name, number and address is clearly fictional
- [ ] Privacy and Terms reviewed if this stops being a demo
- [ ] The confirmation email carries the demo notice

---

## Licence and intent

A portfolio and demonstration project. The clinic does not exist. If you adapt
it for a real healthcare provider, get the privacy policy, the consent flow and
the retention rules reviewed by someone qualified in the jurisdiction you operate
in, and replace the Basic auth on `/admin` with per person accounts tied to
`core.organization_members`.
