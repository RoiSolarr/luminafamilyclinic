# Test plan

Manual test cases for the whole system. Each one lists what to do, what should
happen, and why it matters. Work through them in mock mode first
(`NEXT_PUBLIC_MOCK_MODE=true`), which needs neither Supabase nor Zapier, then
repeat the database and automation sections against the real thing.

Results from a run of the automated checks against mock mode are noted where
relevant, so you know which lines have already been proven once.

---

## 1. Booking, happy path

| # | Step | Expected |
| --- | --- | --- |
| 1.1 | Open `/book` | Step 1 of 4, emergency banner visible above the wizard |
| 1.2 | Pick **General Consultation** | Doctor list appears, showing only doctors who offer it |
| 1.3 | Pick a named doctor, press **Next** | Step 2, calendar visible, timezone label reads Philippine Time (GMT+8) |
| 1.4 | Pick a weekday the doctor works | Slots load, grouped into Morning and Afternoon |
| 1.5 | Pick a time, press **Next** | Step 3 |
| 1.6 | Fill every field, tick consent, press **Next** | Step 4, summary matches what you entered |
| 1.7 | Press **Confirm booking** | Success screen, animated tick, reference in the form `LFC-XXXXXX` |
| 1.8 | Read the success screen | Reference, summary, manage link, what happens next timeline |
| 1.9 | Press **Add to calendar** | An `.ics` downloads and opens in your calendar app at the right time |
| 1.10 | Press **Copy** on the manage link | Link copied, toast confirms |

> Verified automatically in mock mode: reference format, token length of 32, and
> correct doctor assignment.

## 2. Booking, "any available doctor"

| # | Step | Expected |
| --- | --- | --- |
| 2.1 | Step 1, choose a service, then **Any available doctor** | Card says how many doctors offer it |
| 2.2 | Go to step 2 | More slots than for a single doctor: the union across all of them |
| 2.3 | Pick a slot several doctors are free for | Chip shows "N free"; the desktop sidebar repeats it |
| 2.4 | Confirm | Success screen names one specific doctor |
| 2.5 | Book the same slot again from another browser | A different doctor is assigned |
| 2.6 | Keep going until the slot is exhausted | The next attempt returns the "just taken" message |

> Verified automatically: availability predicted three free doctors at a slot,
> exactly three bookings were accepted, each with a distinct doctor, and the
> fourth got a 409.

## 3. Double booking

This is the case worth being careful about, because it is the one real users
will hit.

| # | Step | Expected |
| --- | --- | --- |
| 3.1 | Open `/book` in two browsers, both on the same doctor and slot | Both reach step 4 |
| 3.2 | Confirm in browser A | Success |
| 3.3 | Confirm in browser B | Error toast "That slot was just taken", wizard returns to step 2, chosen time cleared |
| 3.4 | Reload availability in browser B | The taken slot is gone from the list |
| 3.5 | Cancel the booking from browser A | Slot reappears in availability |

> The guarantee comes from the partial unique index on
> `appointments(provider_id, starts_at) WHERE status IN ('pending','confirmed')`,
> not from the availability check, which cannot close the race on its own.

## 4. Validation

| # | Input | Expected |
| --- | --- | --- |
| 4.1 | Press Next on step 1 with nothing chosen | Next is disabled; toast if forced |
| 4.2 | Press Next on step 3 with every field empty | Each field shows its own message, focus moves to the first one |
| 4.3 | Email `not-an-email` | "That email address does not look right" |
| 4.4 | Name `A` | "Enter the full name of the patient" |
| 4.5 | Name `Robert123` | Rejected: letters, spaces, apostrophes, periods and hyphens only |
| 4.6 | Name `Maria dela Cruz-Santos` | Accepted |
| 4.7 | Phone `abc` | Rejected |
| 4.8 | Phone `+63 917 555 0142` | Accepted |
| 4.9 | Date of birth in the future | "Enter a date of birth in the past" |
| 4.10 | Reason for visit of 5 characters | "Tell us in a sentence or two..." |
| 4.11 | Reason for visit, type past 450 characters | Counter turns coral, stops at 500 |
| 4.12 | Leave consent unticked | "We need your consent before we can store these details" |
| 4.13 | Submit a crafted request bypassing the form | Server returns 400 with the same field errors |

> Verified automatically: the server rejects a short name, a malformed email and
> a short message with the identical wording the form shows.

## 5. Honeypot

| # | Step | Expected |
| --- | --- | --- |
| 5.1 | In dev tools, fill the hidden `website` field, then submit a booking | `200` with a bland success body, no appointment created |
| 5.2 | Same on the contact form | `200`, nothing in `/admin` |
| 5.3 | Check `/admin` | Neither submission appears |

> Verified automatically: a honeypot contact submission returned
> `{"ok":true,"data":{"received":true}}` and stored nothing. The response is
> deliberately a success, so a bot learns nothing about why it failed.

## 6. Rate limiting

| # | Step | Expected |
| --- | --- | --- |
| 6.1 | Submit six bookings from one IP within ten minutes | The sixth returns `429` with a `Retry-After` header |
| 6.2 | Read the message | "That is a few too many attempts in a short time" |
| 6.3 | Wait out the window, try again | Accepted |

> Verified automatically, by accident: a test run tripped the limiter at the
> sixth attempt, which is the intended behaviour.

## 7. Manage booking

| # | Step | Expected |
| --- | --- | --- |
| 7.1 | Open the manage link from the success screen | Booking summary, correct date and time |
| 7.2 | Change one character of the token in the URL | "We could not open that booking" |
| 7.3 | Open `/manage` with no query string | A message asking for the full link |
| 7.4 | Use a reference that does not exist | The same message as a wrong token, not a different one |
| 7.5 | Press **Reschedule** | Calendar opens, only that doctor's free times are shown |
| 7.6 | Pick a new time, confirm | Success toast, summary updates |
| 7.7 | Check the old slot | Available again |
| 7.8 | Press **Cancel appointment** | Confirmation dialog, with a Keep my appointment escape |
| 7.9 | Confirm the cancellation | Status becomes Cancelled, slot released |
| 7.10 | Reload the same link | Shows cancelled, with a button to book again |

> Cases 7.2 and 7.4 give the same answer on purpose: a different response would
> let someone probe for valid references.

> Verified automatically: correct token `200`, tampered token `404`, reschedule
> succeeded and moved the time, cancel succeeded, cancel with a wrong token `404`.

## 8. Contact form

| # | Step | Expected |
| --- | --- | --- |
| 8.1 | Send a valid message from `/contact` | Success panel, offer to send another |
| 8.2 | Check `/admin` | Message listed with status "new" |
| 8.3 | Send one from the FAQ sidebar instead | Also arrives |
| 8.4 | After Zap 4 runs | A suggested reply appears under the message, labelled for review |
| 8.5 | Check the sender's inbox | Nothing auto sent to them |

## 9. Feedback

| # | Step | Expected |
| --- | --- | --- |
| 9.1 | Open a `feedbackUrl` from the due-reminders payload | Rating page with five stars |
| 9.2 | Hover the stars | Labels change: Poor to Excellent |
| 9.3 | Submit without choosing | Toast asks for a rating |
| 9.4 | Choose and submit | Thank you panel |
| 9.5 | Change one character of `sig` in the URL | "That feedback link is not valid" |
| 9.6 | Open `/feedback` with no query string | Message asking for the full link |

> Verified automatically: a correct HMAC signature returned `200`, a forged one
> returned `404`.

## 10. Zapier integration

| # | Step | Expected |
| --- | --- | --- |
| 10.1 | `GET /api/zapier/due-reminders` with the right secret | `200`, JSON queue |
| 10.2 | The same with a wrong secret | `401` |
| 10.3 | The same with no header at all | `401` |
| 10.4 | `POST /api/zapier/callback` with a wrong secret | `401` |
| 10.5 | `booking_triage` callback | Urgency, summary and message saved; status becomes confirmed |
| 10.6 | `calendar_event` callback | `calendarEventId` stored |
| 10.7 | `reminder_sent` callback | That reminder drops out of the queue |
| 10.8 | Any callback for a reference that does not exist | `404` |
| 10.9 | Inspect the due-reminders payload | No date of birth, no insurance, no reason for visit, no manage token |
| 10.10 | Stop Zapier, then make a booking | Booking still succeeds; success screen says the confirmation has not gone out |

> Every line in this section was verified automatically against mock mode,
> including 10.9: the payload carries sixteen fields and none of them is
> sensitive.

## 11. Database behaviour

Run these against Supabase, not mock mode.

| # | Step | Expected |
| --- | --- | --- |
| 11.1 | `npm run db:migrate` on an empty database | Three schemas, eleven tables |
| 11.2 | `npm run db:seed` | Counts printed match `docs/DATABASE.md` |
| 11.3 | Run the seed again | Succeeds, does not duplicate anything |
| 11.4 | In Supabase SQL editor, `SELECT * FROM medical.appointments` | Rows visible: you are the owner role |
| 11.5 | Query the same table through the public REST API with the anon key | Empty or an error, never data |
| 11.6 | `SELECT manage_token_hash FROM medical.appointments LIMIT 1` | A 64 character hex string, not a token |
| 11.7 | Try to insert two live appointments for one doctor at one time | Second raises `23505` |
| 11.8 | Set the first to `cancelled`, insert again | Succeeds |
| 11.9 | Stop the database, load `/book` | Clear error state with a retry, not a crash and not invented availability |

## 12. Staff dashboard

| # | Step | Expected |
| --- | --- | --- |
| 12.1 | Open `/admin` | Browser asks for credentials |
| 12.2 | Cancel the prompt | 401 page |
| 12.3 | Wrong password | Asked again |
| 12.4 | Username `staff` and `ADMIN_PASSWORD` | Dashboard loads |
| 12.5 | Filter by date | Only that day shown; the URL carries the filter |
| 12.6 | Filter by doctor and status together | Both applied |
| 12.7 | Reload the filtered URL | Filters survive |
| 12.8 | Tick "Include past appointments" | Past ones appear |
| 12.9 | Look at a red flagged booking | Row tinted, urgency badge, "Call the patient" |
| 12.10 | Unset `ADMIN_PASSWORD` and redeploy | `/admin` returns 503 with an explanation, never an open dashboard |

> Verified automatically: no credentials `401`, wrong password `401`.

---

## 13. Responsive design

Test every width below. In Chrome, dev tools, device toolbar, set the width by
hand rather than picking a device preset, so you catch the gaps between presets.

**On every width, on every page, check:** no horizontal scrollbar, no text
clipped, no control smaller than 44 by 44 pixels, nothing hidden behind the
sticky bars.

| Width | Represents | Specifically check |
| --- | --- | --- |
| 320px | iPhone SE 1st gen, small Android | Calendar cells still legible; slot chips do not overflow; stepper collapses to numbers only |
| 360px | Galaxy S series, common Android | Hero text does not break mid word |
| 390px | iPhone 14 | Sticky Book now bar clears the home indicator |
| 430px | iPhone Pro Max | Trust cards line up in two columns |
| 480px | `xs` breakpoint | Buttons move from stacked to side by side |
| 600px | Small tablet portrait | Service grid moves to two columns |
| 768px | iPad portrait, `md` | Mobile Book now bar disappears; header still shows the hamburger |
| 820px | iPad Air portrait | Doctor cards two across |
| 1024px | iPad landscape, `lg` | Full horizontal nav appears; booking wizard gains its summary sidebar |
| 1280px | Laptop | Container caps; hero asymmetry visible |
| 1440px | Desktop | Margins balanced, not drifting left |
| 1920px | Large desktop | Content capped at 1440px, centred |
| 2560px+ | Ultrawide and 4K | Still centred with even margins; no stretched line lengths |

**Orientation and odd viewports**

| Case | Check |
| --- | --- |
| Phone landscape, 844x390 | Mobile drawer scrolls; the booking bar does not eat the viewport |
| Short viewport, 800x500 | Hero does not force scrolling to reach the CTA |
| Foldable unfolded, 717x512 | Layout picks the tablet arrangement cleanly |
| Foldable folded, 280x653 | Degrades without breaking; this is below the supported floor but should not shatter |
| iPhone with a notch, landscape | Safe area insets keep content clear of the notch and the home indicator |

**Zoom and font size**

| Case | Check |
| --- | --- |
| Browser zoom 200% at 1280px | Nothing overlaps, nothing is cut off, all controls reachable |
| Browser zoom 400% at 1280px | Page reflows to a single column rather than requiring horizontal scrolling |
| OS large text on iOS or Android | Buttons grow with the text rather than clipping it |

**Tables on small screens**

| Case | Check |
| --- | --- |
| `/admin` at 1024px and up | Real table |
| `/admin` below 1024px | Stacked cards, no sideways scrolling |
| `/doctors` schedule lists at 320px | Day and time wrap rather than overflow |

**Browsers**

Run at least the booking happy path and the manage flow in each.

| Browser | Watch for |
| --- | --- |
| Chrome, desktop | Baseline |
| Safari on iOS | Form fields must not zoom the page on focus; `.ics` download; `dvh` units behaving; safe area insets |
| Firefox, desktop | Calendar grid keyboard navigation; focus rings visible |
| Edge, desktop | Date input rendering |
| Safari, macOS | Backdrop blur on the sticky header; fallback if unsupported |
| Chrome on Android | Sticky bottom bar against the URL bar as it hides and shows |

---

## 14. Accessibility

| # | Step | Expected |
| --- | --- | --- |
| 14.1 | Load any page, press Tab once | "Skip to content" appears and works |
| 14.2 | Complete a whole booking with the keyboard only | Possible, never trapped, focus always visible |
| 14.3 | In the calendar, use arrow keys | Moves by day, up and down by week, PageUp and PageDown by month |
| 14.4 | Home and End in the calendar | Jump to the ends of the week |
| 14.5 | Tab to a disabled date | Not reachable; announced as closed when read |
| 14.6 | Advance a step with a screen reader on | "Step 2 of 4, Date and time" announced |
| 14.7 | Submit step 3 with errors, screen reader on | Errors announced; focus moves to the first bad field |
| 14.8 | Open the mobile menu with the keyboard | Focus trapped inside, Escape closes, focus returns to the button |
| 14.9 | Open the cancel dialog | Same trap and restore behaviour |
| 14.10 | Turn on "Reduce motion" in the OS | No page transitions, no scroll reveals, no shimmer, no drawn tick |
| 14.11 | Check contrast with dev tools on body text, muted text and buttons | All at least AA |
| 14.12 | Read the doctor cards with a screen reader | Initials avatars are skipped as decorative, names read normally |
| 14.13 | Tab through the slot chips | Reachable as a radio group with a group label |

## 15. Dark mode

| # | Step | Expected |
| --- | --- | --- |
| 15.1 | Set the OS to dark, load the site with no stored preference | Dark theme |
| 15.2 | Set the OS to light | Light theme |
| 15.3 | Pick Light explicitly while the OS is dark | Light; survives a reload |
| 15.4 | Pick System | Follows the OS again |
| 15.5 | Reload with a stored dark preference | No flash of light theme before paint |
| 15.6 | Check every page in dark mode | Contrast holds; no black text on a dark card |
| 15.7 | Check toasts, dialogs and badges in dark mode | All legible, borders visible |
| 15.8 | Private browsing with storage blocked | Toggle does not crash; falls back to the system preference |

## 16. Empty, loading, error and offline states

| # | Step | Expected |
| --- | --- | --- |
| 16.1 | Throttle to Slow 3G, pick a date | Skeleton loaders, not a blank area |
| 16.2 | Pick a Sunday | "The clinic does not open on that day" |
| 16.3 | Pick a holiday from the config | "The clinic is closed that day for a holiday" |
| 16.4 | Pick a day that is fully booked | "Fully booked that day" with a suggestion |
| 16.5 | Go offline, pick a date | Error panel with a working **Try again** |
| 16.6 | Go offline, confirm a booking | "We could not reach the clinic. Nothing has been booked" |
| 16.7 | Come back online, press Try again | Recovers without a reload |
| 16.8 | Visit a URL that does not exist | Custom 404 with useful links |
| 16.9 | Force a server error | Error boundary with a digest, never a stack trace |

## 17. Session persistence

| # | Step | Expected |
| --- | --- | --- |
| 17.1 | Fill steps 1 to 3, reload the page | Back on the same step with your answers intact |
| 17.2 | Reload after a successful booking | Wizard is clear, not pre-filled from the last one |
| 17.3 | Open `/book?service=dermatology` | Dermatology preselected |
| 17.4 | Open `/book?doctor=<uuid>` from the doctors page | That doctor preselected, with one of their services |
| 17.5 | Change the service so the chosen doctor no longer offers it | Doctor resets to "Any available doctor" rather than becoming invalid |
| 17.6 | Private browsing with sessionStorage blocked | Wizard still works, just does not survive a reload |

## 18. Security

| # | Step | Expected |
| --- | --- | --- |
| 18.1 | View source on every page, search for `hooks.zapier.com` | Not present |
| 18.2 | Search the page source and JS bundles for the callback secret | Not present |
| 18.3 | Search for `DATABASE_URL` or any connection string | Not present |
| 18.4 | Open the network tab through a whole booking | The browser only ever calls your own `/api/*` routes |
| 18.5 | Check response headers | CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy present |
| 18.6 | Check cookies after browsing the whole site | None set |
| 18.7 | Put `<script>alert(1)</script>` in the reason for visit | Stored and displayed as text, never executed |
| 18.8 | Put `'; DROP TABLE medical.appointments; --` in a field | Stored as text; queries are parameterised by the ORM |
| 18.9 | Read the server logs after a booking | Booking reference and ids present; no name, email, phone, date of birth or reason for visit |
| 18.10 | Check the URL on the success screen | No personal data in the query string; only the random manage token |

## 19. Performance

Run Lighthouse on a production build (`npm run build && npm start`), not on the
dev server, which is much slower by design.

| # | Page | Target |
| --- | --- | --- |
| 19.1 | `/` | 90+ on Performance, Accessibility, Best Practices, SEO |
| 19.2 | `/book` | 90+ on all four |
| 19.3 | `/services` | 90+ on all four |
| 19.4 | Any page, mobile preset | 90+ on all four |

| # | Check | Expected |
| --- | --- | --- |
| 19.5 | Cumulative layout shift | Under 0.1; fonts use `display: swap` with a matched fallback |
| 19.6 | View source for metadata | Title, description and Open Graph tags per page |
| 19.7 | `/sitemap.xml` | Lists the eight public pages, excludes `/manage`, `/admin` and `/feedback` |
| 19.8 | `/robots.txt` | Disallows `/api/`, `/admin`, `/manage`, `/feedback` |
| 19.9 | Page source on `/` | `MedicalClinic` JSON-LD present |
| 19.10 | Page source on `/faq` | `FAQPage` JSON-LD present |

## 20. Mock mode

| # | Step | Expected |
| --- | --- | --- |
| 20.1 | Set `NEXT_PUBLIC_MOCK_MODE=true` with no `DATABASE_URL`, start the app | Every page loads |
| 20.2 | Complete a booking | Works end to end, success screen and all |
| 20.3 | Open the manage link | Opens, reschedules, cancels |
| 20.4 | Open `/admin` | Shows seeded appointments plus yours, with a "Mock mode" badge |
| 20.5 | Restart the server | Your test booking is gone, the seeded demo data is back |
| 20.6 | Switch to `false` with a working `DATABASE_URL` | Identical behaviour, backed by Postgres |

> Mock mode exists so the whole interface can be reviewed before Supabase and
> Zapier exist. Everything in sections 1 to 9 can be tested in it.
