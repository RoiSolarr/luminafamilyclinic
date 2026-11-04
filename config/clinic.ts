/**
 * Single source of truth for branding and marketing copy.
 *
 * Everything a future owner would want to swap when rebranding this demo lives
 * here. Operational data (doctors, services, schedules, appointments) lives in
 * the database and is created by `db/seed.ts`, not here.
 *
 * All people, numbers, addresses and reviews below are invented.
 */

export const clinic = {
  /** Must match the `slug` of the seeded organization row in `core.organizations`. */
  slug: 'lumina-family-clinic',
  name: 'Lumina Family Clinic',
  shortName: 'Lumina',
  tagline: 'Unhurried family care, booked in under a minute.',
  description:
    'Lumina Family Clinic is a fictional multi specialty outpatient clinic used to demonstrate an online booking flow backed by a real database and automated follow up.',

  /** IANA timezone. Also stored on the organization row and used for every slot calculation. */
  timezone: 'Asia/Manila',
  timezoneLabel: 'Philippine Time (GMT+8)',

  /** Prefix for booking references, e.g. LFC-7KQ2M9. */
  bookingRefPrefix: 'LFC',

  contact: {
    phone: '+63 2 8555 0147',
    phoneHref: '+63285550147',
    email: 'hello@luminafamilyclinic.example',
    addressLine1: '2nd Floor, Everly Medical Arts Building',
    addressLine2: '118 Mirasol Avenue, Barangay San Roque',
    city: 'Quezon City',
    region: 'Metro Manila',
    postalCode: '1109',
    country: 'Philippines',
    /** Fake coordinates for the map placeholder. */
    coordinates: { lat: 14.6507, lng: 121.0489 },
  },

  /** Display hours. The bookable hours come from `medical.provider_schedules`. */
  hours: [
    { label: 'Monday to Friday', value: '8:00 AM to 6:00 PM' },
    { label: 'Saturday', value: '8:00 AM to 1:00 PM' },
    { label: 'Sunday and public holidays', value: 'Closed' },
  ],

  /** Headline numbers for the home page trust strip. Invented. */
  trust: [
    { value: '12', label: 'Years serving families', hint: 'Open since 2014' },
    { value: '48,000+', label: 'Patient visits', hint: 'Across six specialties' },
    { value: '4.9', label: 'Average rating', hint: 'From 1,284 post visit surveys' },
    { value: '< 9 min', label: 'Typical wait', hint: 'Measured at reception' },
  ],

  /** Invented reviews. */
  testimonials: [
    {
      quote:
        'I booked at 11pm from my phone and had a confirmation before I put it down. The reminder the day before meant nobody in the family forgot.',
      name: 'Marisol D.',
      context: 'Pediatrics, returning patient',
    },
    {
      quote:
        'The reception desk already knew why I was coming in, so I did not have to explain everything twice. Consultation started on time.',
      name: 'Enrique V.',
      context: 'General consultation',
    },
    {
      quote:
        'Rescheduling took one tap on the link in my email. No phone queue, no waiting on hold during work hours.',
      name: 'Joan T.',
      context: 'Dermatology',
    },
  ],

  /** Shown on the home page "How booking works" section. */
  bookingSteps: [
    {
      title: 'Pick a service and a doctor',
      body: 'Choose what you need. We show only the doctors who offer that service, or let us pick the first one free.',
    },
    {
      title: 'Choose a time that fits',
      body: 'Live availability in Philippine Time. Slots that are already taken never appear, so there is nothing to double check.',
    },
    {
      title: 'Confirm and get your link',
      body: 'You get a booking reference, a calendar file and a private link you can use any time to reschedule or cancel.',
    },
  ],

  faqs: [
    {
      q: 'Do I need to create an account to book?',
      a: 'No. You book with your name, email and mobile number. Afterwards you get a private manage link that lets you reschedule or cancel without signing in anywhere.',
    },
    {
      q: 'How early should I arrive for my appointment?',
      a: 'Ten minutes before your slot is enough for a returning patient. If it is your first visit, give yourself fifteen minutes so reception can complete your record.',
    },
    {
      q: 'What should I bring to my first visit?',
      a: 'A valid ID, your HMO or insurance card if you have one, a list of any medicines you currently take, and any previous test results that relate to your visit.',
    },
    {
      q: 'Can I reschedule or cancel online?',
      a: 'Yes. Open the manage link from your confirmation email, or use the Manage booking button on the success screen. You can move your appointment or cancel it outright.',
    },
    {
      q: 'How late can I cancel without a fee?',
      a: 'This demo clinic charges nothing for cancellations. We ask that you cancel at least four hours ahead so the slot can go to someone else.',
    },
    {
      q: 'Do you accept HMO and insurance?',
      a: 'The booking form has an optional field for your HMO or insurer. Coverage is confirmed at reception on the day of your visit, not at booking time.',
    },
    {
      q: 'How does the telehealth consultation work?',
      a: 'You book it like any other service. A video link is sent to the email address on your booking shortly before the slot starts. You need a stable connection and a quiet room.',
    },
    {
      q: 'Can I book for my child or a parent?',
      a: 'Yes. Enter the patient details of the person being seen, then use your own email and mobile number so the reminders reach you.',
    },
    {
      q: 'Will I get a reminder before my appointment?',
      a: 'Yes. You choose email or SMS when you book, and the reminder goes out roughly a day before your slot with your manage link included.',
    },
    {
      q: 'What happens to the information I enter?',
      a: 'It is stored in our appointment database and used to run your booking and the reminders around it. Nothing is sold, no advertising tools are loaded, and the site sets no tracking cookies. See the Privacy Policy for the full description.',
    },
    {
      q: 'Is the reason for visit read by a person?',
      a: 'An automated step writes a short neutral summary for the clinical team so they can prepare. It never diagnoses and never replies to you. A member of staff always reads the original text.',
    },
    {
      q: 'What if I need urgent care?',
      a: 'Do not use this form. Call your local emergency number or go to the nearest emergency department. This clinic is an outpatient service and does not handle emergencies.',
    },
  ],

  /** Shown wherever a user could mistake the demo for a real clinic. */
  demoNotice: 'Demo website. Fictional business. Not for real medical use.',

  emergencyNotice:
    'If this is a medical emergency, call your local emergency number. Do not use this form.',

  legal: {
    /** Used in the privacy and terms pages. */
    entityName: 'Lumina Family Clinic (demonstration project)',
    lastUpdated: 'November 4, 2026',
    dataProtectionEmail: 'privacy@luminafamilyclinic.example',
  },

  nav: [
    { href: '/services', label: 'Services' },
    { href: '/doctors', label: 'Doctors' },
    { href: '/faq', label: 'FAQ' },
    { href: '/contact', label: 'Contact' },
  ],

  /** Booking rules the UI enforces before the server re validates them. */
  booking: {
    /** How many days ahead the calendar opens. Also stored in org settings. */
    bookingWindowDays: 60,
    /** Minimum notice in hours before the next bookable slot. */
    minNoticeHours: 2,
    /** Slot grid in minutes. Services longer than this occupy several grid steps. */
    slotMinutes: 30,
    /** Dates the clinic is closed, YYYY-MM-DD. Mirrored into org settings by the seed. */
    holidays: [
      '2026-11-30',
      '2026-12-08',
      '2026-12-24',
      '2026-12-25',
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-04-09',
    ],
    /** 0 = Sunday. Days the clinic never opens, regardless of provider schedules. */
    closedWeekdays: [0],
  },
} as const

export type ClinicConfig = typeof clinic

/** Full postal address on one line. */
export function clinicAddressLine(): string {
  const c = clinic.contact
  return `${c.addressLine1}, ${c.addressLine2}, ${c.city}, ${c.region} ${c.postalCode}, ${c.country}`
}

/** Base URL without a trailing slash. Safe on both server and client. */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  return raw.replace(/\/+$/, '')
}
