# Zapier setup

Five Zaps, built in order. Each section lists the exact clicks, the field
mappings and the AI prompts to paste.

**Before you start, two things are worth knowing.**

Webhooks by Zapier is a premium app. Catching a hook needs a paid plan or an
active trial. Zaps 1, 3 and 4 are triggered by a Catch Hook, and Zaps 2 and 5
use a Webhooks action, so all five need it. A Zapier trial is enough to build and
test everything here.

Nothing in Zapier ever receives a database credential. The site writes to
Postgres, then posts an event to Zapier; Zapier posts results back to one
endpoint, authenticated by a shared secret. If a Zap is deleted, or a Zapier
account is compromised, the database is untouched.

---

## 0. Before building any Zap

### 0.1 Generate the shared secret

On your machine:

```bash
openssl rand -hex 32
```

No `openssl`? Use Node:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Put the value in `ZAPIER_CALLBACK_SECRET`, both in `.env.local` and in Vercel.
Keep it somewhere you can copy from, because every Zap below sends it in a
header.

### 0.2 Know your two URLs

Through this guide, `YOUR_SITE` means your deployed base URL, for example
`https://lumina-family-clinic.vercel.app`. Local testing with `http://localhost:3000`
will not work from Zapier, because Zapier's servers cannot reach your laptop.
To test locally, run `npx ngrok http 3000` and use the public URL it prints.

The two endpoints Zapier talks to:

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `YOUR_SITE/api/zapier/callback` | POST | Where every Zap writes its results back |
| `YOUR_SITE/api/zapier/due-reminders` | GET | The work queue Zaps 2 and 5 poll |

Both require the header `x-zapier-secret` set to your secret. Both answer `401`
without it.

### 0.3 Check the secret works before building anything

```bash
curl -i "YOUR_SITE/api/zapier/due-reminders" \
  -H "x-zapier-secret: YOUR_SECRET"
```

A `200` with a JSON body means you are ready. A `401` means the secret in Vercel
does not match the one you just sent; fix that before continuing, because every
Zap below depends on it.

---

## Zap 1: New booking

The big one. A booking arrives, an AI step triages it, the result is written
back, a calendar event is created, the patient is emailed and staff are alerted.

### Step 1: Trigger, Webhooks by Zapier, Catch Hook

1. Create Zap, search **Webhooks by Zapier**, pick it as the trigger.
2. Event: **Catch Hook**. Continue.
3. Leave **Pick off a Child Key** empty. Continue.
4. Zapier shows a URL like `https://hooks.zapier.com/hooks/catch/1234567/abcdef/`.
   Copy it.
5. Paste it into `ZAPIER_BOOKING_WEBHOOK_URL` in `.env.local` and in Vercel.
   Redeploy if you changed it in Vercel.
6. Go to your site and make a real test booking.
7. Back in Zapier, click **Test trigger**. Your booking appears. Continue.

The payload you now have to map:

```json
{
  "bookingId": "LFC-A1B2C3",
  "manageToken": "xK2p9mQ7vR4tY8wE3nB6jL1sD5fH0gZa",
  "createdAt": "2026-11-04T06:12:48.512Z",
  "service": "General Consultation",
  "providerId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "doctorName": "Dr. Elena Reyes",
  "date": "2026-11-18",
  "time": "09:30",
  "endTime": "10:00",
  "timezone": "Asia/Manila",
  "patient": {
    "fullName": "Marisol Dizon",
    "email": "marisol.dizon@example.com",
    "phone": "+63 917 555 0142",
    "dob": "1988-03-14",
    "patientType": "returning",
    "insurance": "Maxicare"
  },
  "reasonForVisit": "Blood pressure has been higher than usual at home for two weeks.",
  "reminderChannel": "email",
  "consentGiven": true,
  "manageUrl": "https://YOUR_SITE/manage?ref=LFC-A1B2C3&token=xK2p9mQ7..."
}
```

Zapier flattens the nested object, so in later steps the patient fields appear as
`Patient Full Name`, `Patient Email`, `Patient Phone`, and so on.

### Step 2: AI by Zapier, Analyze and Return Data

1. Add an action, search **AI by Zapier**, event **Analyze and Return Data**.
2. In **Instructions**, paste exactly this:

```
You are a clinical intake assistant for an outpatient family clinic. You are NOT
a doctor. You never diagnose, never give medical advice, never suggest
treatment, and never promise an outcome or a wait time.

Read the patient's reason for visit below and return ONLY a JSON object with
these four keys and nothing else.

urgency: one of "routine", "soon", "urgent", "emergency".
  routine   = a check up, a repeat prescription, a long standing stable issue,
              a cosmetic concern, a form or certificate.
  soon      = a new symptom that has lasted days to weeks and is not improving.
  urgent    = a symptom that should be seen today or tomorrow: severe pain,
              a high fever in a small child, a rapidly spreading rash,
              anything getting worse quickly.
  emergency = possible chest pain, difficulty breathing, stroke symptoms,
              severe bleeding, loss of consciousness, a severe allergic
              reaction, thoughts of self harm, or any other immediately life
              threatening description.

summary: one neutral sentence for the clinical team, describing only what the
  patient reported. No interpretation, no diagnosis, no recommendation.
  Maximum 200 characters.

red_flag: true or false. Set it to true if urgency is "urgent" or "emergency",
  or if the text mentions chest pain, trouble breathing, fainting, severe
  bleeding, stroke symptoms, a seizure, a severe allergic reaction, or self
  harm. Otherwise false.

confirmation_message: exactly three warm, plain sentences addressed to the
  patient by first name, confirming the appointment is booked. Mention the
  service and the doctor. Do NOT mention urgency, do NOT comment on their
  symptoms, do NOT give any advice or reassurance about their condition, and do
  NOT promise what will happen at the visit. If red_flag is true, make the third
  sentence: "If your symptoms get worse before then, please call your local
  emergency number or go to the nearest emergency department."

Patient first name: {{first name}}
Service: {{service}}
Doctor: {{doctor name}}
Reason for visit: {{reason for visit}}

Return raw JSON only. No markdown, no code fences, no commentary.
```

3. Replace each `{{...}}` by clicking the field and inserting from step 1:
   - `{{first name}}` to **Patient Full Name**
   - `{{service}}` to **Service**
   - `{{doctor name}}` to **Doctor Name**
   - `{{reason for visit}}` to **Reason For Visit**
4. Test. You should get back a JSON object. If the output is wrapped in a code
   fence, add a **Formatter by Zapier, Text, Replace** step to strip the
   backticks, or re-test; the instruction above usually prevents it.

### Step 3: Webhooks by Zapier, POST the triage back

1. Add an action: **Webhooks by Zapier**, event **POST**.
2. Fill it in:

| Field | Value |
| --- | --- |
| URL | `YOUR_SITE/api/zapier/callback` |
| Payload Type | `json` |
| Data: `type` | `booking_triage` |
| Data: `bookingRef` | Step 1 **Booking Id** |
| Data: `aiUrgency` | Step 2 **Urgency** |
| Data: `aiSummary` | Step 2 **Summary** |
| Data: `aiRedFlag` | Step 2 **Red Flag** |
| Data: `aiConfirmationMessage` | Step 2 **Confirmation Message** |
| Data: `confirm` | `true` |
| Unflatten | `no` |
| Headers: `x-zapier-secret` | your secret |

3. Test. A `200` with `{"ok":true,"data":{"applied":"booking_triage"}}` means the
   appointment row now holds the triage, and its status moved from `pending` to
   `confirmed`.

> `confirm: true` is what flips the status. Send it only from a step that runs
> after the patient email, if you would rather a booking stay `pending` until the
> patient has actually been told.

### Step 4: Google Calendar, Create Detailed Event

1. Add an action: **Google Calendar**, event **Create Detailed Event**.
2. Connect the clinic's Google account.
3. Map:

| Field | Value |
| --- | --- |
| Calendar | the doctor's calendar, or one shared clinic calendar |
| Summary | `{{Service}} — {{Patient Full Name}}` |
| Description | see below |
| Start Date & Time | Step 1 **Date** then a space then Step 1 **Time** |
| End Date & Time | Step 1 **Date** then a space then Step 1 **End Time** |
| Time Zone | Step 1 **Timezone** |
| Attendees | leave empty, or Step 1 **Patient Email** to invite the patient |

Description:

```
Booking reference: {{Booking Id}}
Patient: {{Patient Full Name}} ({{Patient Patient Type}})
Phone: {{Patient Phone}}
Service: {{Service}} with {{Doctor Name}}

Triage summary: {{Step 2 Summary}}
Urgency: {{Step 2 Urgency}}

Manage this booking: {{Manage Url}}
```

4. Test, and check the event lands in the right calendar at the right time. The
   most common mistake is leaving **Time Zone** unset, which puts the event in
   the calendar's default zone rather than the clinic's.

### Step 5: Webhooks by Zapier, POST the calendar event id back

Same shape as step 3:

| Field | Value |
| --- | --- |
| URL | `YOUR_SITE/api/zapier/callback` |
| Payload Type | `json` |
| Data: `type` | `calendar_event` |
| Data: `bookingRef` | Step 1 **Booking Id** |
| Data: `calendarEventId` | Step 4 **Id** |
| Headers: `x-zapier-secret` | your secret |

Storing the id matters: Zap 3 needs it to move or delete the event when the
patient reschedules or cancels.

### Step 6: Gmail, Send Email to the patient

1. Add an action: **Gmail** (or **Outlook**, or **Email by Zapier**), event
   **Send Email**.
2. Map:

| Field | Value |
| --- | --- |
| To | Step 1 **Patient Email** |
| Subject | `Your appointment is booked — {{Booking Id}}` |
| Body Type | `html` |

Body:

```html
<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;color:#0f2a38">
  <h1 style="font-size:22px;margin:0 0 4px">You are booked in</h1>
  <p style="font-size:15px;line-height:1.6;color:#475d6a;margin:0 0 20px">
    {{Step 2 Confirmation Message}}
  </p>

  <table style="width:100%;border-collapse:collapse;font-size:15px">
    <tr><td style="padding:8px 0;color:#70828c">Reference</td>
        <td style="padding:8px 0;text-align:right"><strong>{{Booking Id}}</strong></td></tr>
    <tr><td style="padding:8px 0;color:#70828c">Service</td>
        <td style="padding:8px 0;text-align:right">{{Service}}</td></tr>
    <tr><td style="padding:8px 0;color:#70828c">Doctor</td>
        <td style="padding:8px 0;text-align:right">{{Doctor Name}}</td></tr>
    <tr><td style="padding:8px 0;color:#70828c">When</td>
        <td style="padding:8px 0;text-align:right">{{Date}} at {{Time}} ({{Timezone}})</td></tr>
  </table>

  <p style="margin:24px 0">
    <a href="{{Manage Url}}"
       style="display:inline-block;background:#0d7b6e;color:#fff;text-decoration:none;
              padding:13px 26px;border-radius:999px;font-weight:600">
      Reschedule or cancel
    </a>
  </p>

  <p style="font-size:14px;line-height:1.6;color:#475d6a">
    2nd Floor, Everly Medical Arts Building, 118 Mirasol Avenue,
    Barangay San Roque, Quezon City, Metro Manila 1109
  </p>

  <p style="font-size:13px;color:#70828c;border-top:1px solid #e2e2db;padding-top:16px;margin-top:24px">
    Keep the link above private: anyone who has it can change this appointment.
    <br><br>
    Demo website. Fictional business. Not for real medical use.
  </p>
</div>
```

3. Test, and read the email that arrives. Check the manage link actually opens
   the booking.

### Step 7: Staff notification, with a priority path

Staff should not get the same message for a routine check up and for chest pain.
Split the Zap so the urgent path is unmissable.

1. Add **Filter by Zapier** after step 6.
2. Set it to continue only if **Step 2 Red Flag** `(boolean) is true`.
3. After the filter, add **Slack, Send Channel Message** (or Telegram, or email):

| Field | Value |
| --- | --- |
| Channel | `#clinic-urgent` |
| Message Text | see below |
| Send as a bot | yes |

```
🔴 *CALL THIS PATIENT NOW* — urgency: {{Step 2 Urgency}}

*{{Patient Full Name}}* · {{Patient Phone}}
{{Service}} with {{Doctor Name}}
{{Date}} at {{Time}} ({{Timezone}})
Reference: {{Booking Id}}

What they wrote: {{Reason For Visit}}
Triage summary: {{Step 2 Summary}}
```

4. Now add the routine path. Use **Paths by Zapier** instead of a plain filter if
   you want both branches in one Zap:
   - **Path A**, condition: Red Flag is true, to the urgent Slack message above.
   - **Path B**, condition: Red Flag is false, to a quieter message in
     `#clinic-bookings`:

```
New booking · {{Service}} with {{Doctor Name}}
{{Date}} at {{Time}} · {{Patient Full Name}} · ref {{Booking Id}}
{{Step 2 Summary}}
```

5. Turn the Zap on.

---

## Zap 2: Day before reminders

A scheduled Zap that drains the reminder queue.

### Step 1: Trigger, Schedule by Zapier

1. **Schedule by Zapier**, event **Every Hour**.
2. Set **Trigger on weekends** to `yes`, since appointments run on Saturdays.

> Zapier's shortest built in interval is hourly. The endpoint is safe to call
> more often if your plan allows a shorter schedule; reminders are marked sent
> individually, so nothing goes out twice.

### Step 2: Webhooks by Zapier, GET the queue

| Field | Value |
| --- | --- |
| URL | `YOUR_SITE/api/zapier/due-reminders?type=24h_reminder` |
| Headers: `x-zapier-secret` | your secret |

The response:

```json
{
  "ok": true,
  "data": {
    "count": 2,
    "callbackUrl": "https://YOUR_SITE/api/zapier/callback",
    "reminders": [
      {
        "reminderId": "0b4f2a1e-...",
        "type": "24h_reminder",
        "channel": "email",
        "scheduledFor": "2026-11-17T01:30:00.000Z",
        "bookingRef": "LFC-A1B2C3",
        "startsAt": "2026-11-18T01:30:00.000Z",
        "localDate": "2026-11-18",
        "localTime": "09:30",
        "timezone": "Asia/Manila",
        "providerName": "Dr. Elena Reyes",
        "serviceName": "General Consultation",
        "patientFirstName": "Marisol",
        "patientEmail": "marisol.dizon@example.com",
        "patientPhone": "+63 917 555 0142",
        "manageUrl": "https://YOUR_SITE/manage?ref=LFC-A1B2C3",
        "feedbackUrl": null
      }
    ]
  }
}
```

Note what is *not* in there: no date of birth, no insurance, no reason for visit,
no manage token. A reminder only needs enough to send one message.

### Step 3: Looping by Zapier, Create Loop From Line Items

1. Add **Looping by Zapier**, event **Create Loop From Line Items**.
2. Add one value per field you need, mapping from step 2's `reminders` array:
   `reminderId`, `channel`, `patientFirstName`, `patientEmail`, `patientPhone`,
   `localDate`, `localTime`, `providerName`, `serviceName`, `manageUrl`.
3. Every step after this one runs once per reminder.

### Step 4: Paths, email or SMS

Add **Paths by Zapier** so the patient gets the channel they picked.

**Path A, condition:** Loop `Channel` exactly matches `email`.
Action: **Gmail, Send Email**

| Field | Value |
| --- | --- |
| To | Loop **Patient Email** |
| Subject | `Reminder: your appointment tomorrow at {{Local Time}}` |

```
Hi {{Patient First Name}},

A quick reminder about your appointment tomorrow.

{{Service Name}} with {{Provider Name}}
{{Local Date}} at {{Local Time}}

2nd Floor, Everly Medical Arts Building, 118 Mirasol Avenue, Quezon City.
Arriving ten minutes early is plenty, or fifteen if it is your first visit.

Need to change it? {{Manage Url}}

Lumina Family Clinic
Demo website. Fictional business. Not for real medical use.
```

**Path B, condition:** Loop `Channel` exactly matches `sms`.
Action: **SMS by Zapier**, or Twilio, or your local provider.

| Field | Value |
| --- | --- |
| To Number | Loop **Patient Phone** |
| Message | see below |

```
Lumina Family Clinic: Hi {{Patient First Name}}, reminder of your {{Service Name}} with {{Provider Name}} tomorrow {{Local Date}} at {{Local Time}}. Change it here: {{Manage Url}}
```

> Keep SMS under 160 characters where you can. Shorten `manageUrl` with a link
> shortener step if your provider charges per segment.

### Step 5: Webhooks, mark each reminder sent

On **both** paths, as the final action:

| Field | Value |
| --- | --- |
| URL | `YOUR_SITE/api/zapier/callback` |
| Payload Type | `json` |
| Data: `type` | `reminder_sent` |
| Data: `reminderId` | Loop **Reminder Id** |
| Data: `status` | `sent` |
| Headers: `x-zapier-secret` | your secret |

Without this step the reminder stays `pending` and goes out again on the next
run, every hour, forever. It is the single most important step in this Zap.

If a send fails, post `status: failed` with an `error` string instead; the row is
marked failed and is not retried automatically.

---

## Zap 3: Cancel and reschedule

Token checking and freeing the slot have already happened in the API by the time
this Zap runs. Its only job is the calendar and the notifications.

Build it twice, once per hook, or use one Zap with Paths keyed on the `type`
field. Two Zaps is simpler to follow.

### Zap 3a: Cancellations

**Trigger:** Webhooks by Zapier, Catch Hook. Copy the URL into
`ZAPIER_CANCEL_WEBHOOK_URL`.

Payload:

```json
{
  "type": "cancel",
  "bookingId": "LFC-A1B2C3",
  "cancelledAt": "2026-11-16T03:21:09.447Z",
  "service": "General Consultation",
  "providerId": "7c9e6679-...",
  "doctorName": "Dr. Elena Reyes",
  "date": "2026-11-18",
  "time": "09:30",
  "timezone": "Asia/Manila",
  "calendarEventId": "abc123def456",
  "patient": {
    "fullName": "Marisol Dizon",
    "email": "marisol.dizon@example.com",
    "phone": "+63 917 555 0142"
  },
  "cancelledReason": "Work conflict"
}
```

**Action 1:** Google Calendar, **Delete Event**.
Map **Event** to `calendarEventId`. Add a **Filter** before it so the step only
runs when `calendarEventId` **exists** — a booking cancelled before Zap 1 ran
will not have one.

**Action 2:** Gmail, Send Email to `Patient Email`.

```
Subject: Your appointment has been cancelled — {{Booking Id}}

Hi {{Patient Full Name}},

Your {{Service}} with {{Doctor Name}} on {{Date}} at {{Time}} has been
cancelled, and the slot has been released.

Book again whenever you are ready: https://YOUR_SITE/book

Lumina Family Clinic
Demo website. Fictional business. Not for real medical use.
```

**Action 3:** Slack to `#clinic-bookings`:

```
Cancelled · {{Service}} with {{Doctor Name}}
{{Date}} at {{Time}} · ref {{Booking Id}}
Reason: {{Cancelled Reason}}
```

### Zap 3b: Reschedules

**Trigger:** Catch Hook. URL into `ZAPIER_RESCHEDULE_WEBHOOK_URL`.

Payload:

```json
{
  "type": "reschedule",
  "bookingId": "LFC-A1B2C3",
  "rescheduledAt": "2026-11-16T03:25:11.902Z",
  "service": "General Consultation",
  "providerId": "7c9e6679-...",
  "doctorName": "Dr. Elena Reyes",
  "previous": { "date": "2026-11-18", "time": "09:30", "startsAt": "2026-11-18T01:30:00.000Z" },
  "date": "2026-11-20",
  "time": "14:00",
  "endTime": "14:30",
  "startsAt": "2026-11-20T06:00:00.000Z",
  "endsAt": "2026-11-20T06:30:00.000Z",
  "timezone": "Asia/Manila",
  "calendarEventId": "abc123def456",
  "patient": { "fullName": "...", "email": "...", "phone": "..." },
  "reminderChannel": "email"
}
```

**Action 1:** Google Calendar, **Update Event**.

| Field | Value |
| --- | --- |
| Event | `calendarEventId` |
| Start Date & Time | `Date` space `Time` |
| End Date & Time | `Date` space `End Time` |
| Time Zone | `Timezone` |

**Action 2:** Gmail to the patient, showing both the old time and the new one:

```
Subject: Your appointment has moved — {{Booking Id}}

Hi {{Patient Full Name}},

Your {{Service}} with {{Doctor Name}} has moved.

Was:  {{Previous Date}} at {{Previous Time}}
Now:  {{Date}} at {{Time}} ({{Timezone}})

Nothing else has changed, and your reminder will follow the new time.

Lumina Family Clinic
Demo website. Fictional business. Not for real medical use.
```

**Action 3:** Slack to `#clinic-bookings`.

> The site already moved the reminder to match the new date. There is nothing to
> do about reminders in this Zap.

---

## Zap 4: Contact form triage

**Trigger:** Catch Hook. URL into `ZAPIER_CONTACT_WEBHOOK_URL`.

Payload:

```json
{
  "type": "contact",
  "contactMessageId": "9f8e7d6c-5b4a-3210-fedc-ba9876543210",
  "receivedAt": "2026-11-04T07:44:02.118Z",
  "name": "Teresa Aguilar",
  "email": "teresa.aguilar@example.com",
  "topic": "billing",
  "message": "I was charged twice for my consultation last Tuesday...",
  "callbackUrl": "https://YOUR_SITE/api/zapier/callback"
}
```

### Step 2: AI by Zapier, Analyze and Return Data

```
You are a front desk assistant at an outpatient family clinic. Read the message
below and return ONLY a JSON object with two keys.

topic: one of "billing", "appointment", "general", "complaint".
  billing     = charges, receipts, refunds, insurance claims, prices.
  appointment = booking, rescheduling, cancelling, confirmations, arrival times.
  complaint   = dissatisfaction with care, waiting, staff conduct, or outcome.
  general     = anything else, including directions, parking, opening hours,
                accessibility and what to bring.
The sender picked their own topic, which may be wrong. Classify on the text.

draft_reply: a polite reply for a STAFF MEMBER TO REVIEW AND SEND. Rules:
  - Address the sender by first name and keep it under 120 words.
  - Never give medical advice, never diagnose, never interpret symptoms.
  - Never promise a refund, a specific outcome, a compensation or a timeframe.
  - If the message is a complaint, acknowledge it plainly, do not be defensive,
    do not admit fault on the clinic's behalf, and say a manager will look at it.
  - If you cannot answer without information the clinic has not given you, say
    so and ask the sender for what is missing instead of inventing an answer.
  - Sign off as "Lumina Family Clinic" with no individual name.

Sender name: {{name}}
Topic they chose: {{topic}}
Message: {{message}}

Return raw JSON only. No markdown, no code fences, no commentary.
```

Map `{{name}}`, `{{topic}}` and `{{message}}` from step 1.

### Step 3: Webhooks, POST the triage back

| Field | Value |
| --- | --- |
| URL | `YOUR_SITE/api/zapier/callback` |
| Payload Type | `json` |
| Data: `type` | `contact_triage` |
| Data: `contactMessageId` | Step 1 **Contact Message Id** |
| Data: `aiTopic` | Step 2 **Topic** |
| Data: `aiDraftReply` | Step 2 **Draft Reply** |
| Data: `status` | `in_review` |
| Headers: `x-zapier-secret` | your secret |

The draft now appears on `/admin` under the message, labelled for review.

### Step 4: Email the draft to staff

**To:** your clinic inbox, **not** the sender.

```
Subject: [{{Step 2 Topic}}] New message from {{Name}}

From:  {{Name}} <{{Email}}>
Topic they picked: {{Topic}}
Topic classified:  {{Step 2 Topic}}

--- what they wrote ---
{{Message}}

--- suggested reply, REVIEW BEFORE SENDING ---
{{Step 2 Draft Reply}}

Nothing has been sent to the patient. Open the dashboard to action it:
https://YOUR_SITE/admin
```

> **Do not** add a step that emails the draft to the sender. The draft is written
> by a language model and has not been read by anyone. The whole point of this
> Zap is that a person approves it first.

---

## Zap 5: Post visit follow up

Reuses the same queue endpoint as Zap 2, filtered to the other reminder type.

**Trigger:** Schedule by Zapier, **Every Day**, at a civilised hour such as 10am.

**Step 2:** Webhooks, GET
`YOUR_SITE/api/zapier/due-reminders?type=post_visit`, with the secret header.

> The endpoint creates the `post_visit` rows itself, for appointments that
> finished roughly a day ago, so there is nothing to schedule separately.

**Step 3:** Looping by Zapier, over `reminders`. Include `reminderId`,
`patientFirstName`, `patientEmail`, `providerName`, `serviceName`, `localDate`
and `feedbackUrl`.

**Step 4:** Gmail, Send Email:

```
Subject: How was your visit?

Hi {{Patient First Name}},

Thank you for coming in on {{Local Date}} to see {{Provider Name}}.

If you have a moment, how did it go? One tap is plenty:

{{Feedback Url}}

It goes straight to the clinic manager and is not published anywhere.

Lumina Family Clinic
Demo website. Fictional business. Not for real medical use.
```

The `feedbackUrl` already carries a signature, so the rating page opens without
asking the patient to identify themselves, and a reference nobody was sent
cannot be rated.

**Step 5:** Webhooks, POST `reminder_sent` with the loop's `reminderId`, exactly
as in Zap 2. Same warning applies: skip it and the thank you goes out daily.

---

## Callback payloads, all five shapes

Every one goes to `POST YOUR_SITE/api/zapier/callback` with
`Content-Type: application/json` and `x-zapier-secret: YOUR_SECRET`.

```jsonc
// 1. Triage results from Zap 1. Every field after bookingRef is optional,
//    so a Zap can send partial results as each step finishes.
{
  "type": "booking_triage",
  "bookingRef": "LFC-A1B2C3",
  "aiUrgency": "soon",               // routine | soon | urgent | emergency
  "aiSummary": "Patient reports...",
  "aiRedFlag": false,
  "aiConfirmationMessage": "Hi Marisol, you are booked in...",
  "confirm": true                    // moves status from pending to confirmed
}

// 2. Calendar event id, from Zap 1 step 5.
{
  "type": "calendar_event",
  "bookingRef": "LFC-A1B2C3",
  "calendarEventId": "abc123def456"
}

// 3. A reminder went out, from Zap 2 and Zap 5.
{
  "type": "reminder_sent",
  "reminderId": "0b4f2a1e-...",
  "status": "sent",                  // sent | failed
  "error": "SMS gateway timeout"     // only when failed
}

// 4. Contact triage, from Zap 4.
{
  "type": "contact_triage",
  "contactMessageId": "9f8e7d6c-...",
  "aiTopic": "billing",
  "aiDraftReply": "Hi Teresa, thank you for...",
  "status": "in_review"              // new | in_review | replied
}

// 5. A rating captured outside the web form, if you ever collect one in Zapier.
{
  "type": "feedback",
  "bookingRef": "LFC-A1B2C3",
  "rating": 5,
  "comment": "Seen on time."
}
```

Responses: `200` with `{"ok":true,"data":{"applied":"..."}}`, `400` for a
malformed body, `401` for a wrong or missing secret, `404` when the reference or
id does not exist.

---

## Test checklist

Work down this list once everything is built. Each line is a thing that has
actually broken for someone.

**Zap 1**

- [ ] A real booking on the site fires the Zap within a few seconds.
- [ ] The AI step returns parseable JSON, with no code fences around it.
- [ ] After the callback, `/admin` shows the urgency badge and the summary.
- [ ] The appointment status reads **Confirmed**, not **Awaiting confirmation**.
- [ ] The calendar event is at the right time, in the clinic's timezone, on the right calendar.
- [ ] The patient email arrives, and its manage link opens the booking.
- [ ] A routine booking goes to the quiet channel, not the urgent one.
- [ ] A booking whose reason mentions chest pain sets `red_flag` true and triggers the urgent alert.
- [ ] That alert contains a phone number a staff member can actually call.

**Zap 2**

- [ ] `GET /api/zapier/due-reminders` returns `200` with the secret and `401` without.
- [ ] The loop runs once per reminder, not once in total.
- [ ] An email patient gets the email, an SMS patient gets the SMS.
- [ ] The `reminder_sent` callback fires on **both** paths.
- [ ] Run the Zap twice in a row: the second run sends nothing.
- [ ] Cancel an appointment that has a pending reminder, then run the Zap: nothing goes out.

**Zap 3**

- [ ] Cancelling on the site deletes the calendar event.
- [ ] Cancelling a booking with no `calendarEventId` does not error the Zap.
- [ ] Rescheduling moves the event rather than creating a second one.
- [ ] The reschedule email shows both the old and the new time.

**Zap 4**

- [ ] A contact message fires the Zap.
- [ ] A clearly misfiled message, say a billing question filed under "general", is reclassified.
- [ ] The draft appears on `/admin` labelled for review.
- [ ] Nothing is auto sent to the sender. Check your sent folder to be sure.

**Zap 5**

- [ ] The endpoint creates `post_visit` rows for yesterday's appointments.
- [ ] The feedback link opens the rating page and a rating saves.
- [ ] Editing the signature in the URL gives a "not valid" message.
- [ ] The `reminder_sent` callback stops it repeating tomorrow.

**Security**

- [ ] Every callback with a wrong secret returns `401`.
- [ ] Every callback with no secret header returns `401`.
- [ ] `GET /api/zapier/due-reminders` with no header returns `401`.
- [ ] The due-reminders payload contains no date of birth, insurance, reason for visit, or manage token.
- [ ] No webhook URL or secret appears anywhere in the browser: open dev tools, search the page source and the network tab.

---

## When something does not work

**The Zap never fires.** The webhook URL in your env vars does not match the one
in the trigger, or you changed it in Vercel without redeploying. Check the
server logs for `zapier.skipped` with `reason: not_configured`, which means the
env var is empty.

**Callbacks return 401.** The secret differs between Vercel and the Zap. Watch
for a trailing space when pasting into Zapier's header field.

**Callbacks return 404.** The `bookingRef` is wrong. It must be the whole
reference including the prefix, `LFC-A1B2C3`, not just the six characters.

**Reminders go out repeatedly.** The `reminder_sent` callback is missing, or it
is only on one branch of a Path. Check both.

**Calendar events land at the wrong time.** The **Time Zone** field is empty in
the Google Calendar step. Map it to the payload's `timezone`.

**The AI step returns text instead of JSON.** Add a Formatter step to strip code
fences, or tighten the instruction with "Return raw JSON only" on its own line at
the end, which is already how the prompts above end.

**Bookings succeed but no automation runs.** That is by design: the booking is
committed before Zapier is called, and a webhook failure never fails a booking.
Look for `zapier.exhausted` in the server logs, and check the success screen,
which tells the patient the confirmation has not gone out yet.
