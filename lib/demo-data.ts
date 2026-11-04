/**
 * The fictional operational data for the demo.
 *
 * Both `db/seed.ts` (which writes it to Postgres) and `lib/mock/store.ts`
 * (which keeps it in memory for mock mode) read from here, so the two modes
 * always show the same clinic.
 *
 * Every person, phone number and review below is invented.
 */

export type DemoService = {
  slug: string
  name: string
  description: string
  durationMinutes: number
  priceMin: number
  priceMax: number
  isTelehealth: boolean
}

export type DemoProvider = {
  key: string
  fullName: string
  specialty: string
  initials: string
  languages: string[]
  bio: string
  /** Service slugs this doctor offers. */
  services: string[]
  /** Weekly hours in clinic local time. day 0 = Sunday. */
  schedule: { dayOfWeek: number; startTime: string; endTime: string }[]
}

export const demoServices: DemoService[] = [
  {
    slug: 'general-consultation',
    name: 'General Consultation',
    description:
      'An unhurried appointment with a family physician for new symptoms, ongoing conditions, medical certificates or a second opinion on a referral.',
    durationMinutes: 30,
    priceMin: 800,
    priceMax: 1200,
    isTelehealth: false,
  },
  {
    slug: 'pediatrics',
    name: 'Pediatrics',
    description:
      'Well child checks, immunisation schedules, growth and feeding concerns, and sick visits for infants through to teenagers.',
    durationMinutes: 30,
    priceMin: 900,
    priceMax: 1500,
    isTelehealth: false,
  },
  {
    slug: 'dental-check-up',
    name: 'Dental Check-up',
    description:
      'Examination, scaling and polishing, with digital x rays when needed. Treatment that follows is quoted before anything starts.',
    durationMinutes: 60,
    priceMin: 1200,
    priceMax: 2500,
    isTelehealth: false,
  },
  {
    slug: 'dermatology',
    name: 'Dermatology',
    description:
      'Skin, hair and nail concerns: acne, eczema, pigmentation, mole checks and persistent rashes that have not settled on their own.',
    durationMinutes: 30,
    priceMin: 1500,
    priceMax: 2800,
    isTelehealth: false,
  },
  {
    slug: 'laboratory-tests',
    name: 'Laboratory Tests',
    description:
      'Blood chemistry, complete blood count, urinalysis and fasting panels. Results are released through the clinic within two working days.',
    durationMinutes: 30,
    priceMin: 450,
    priceMax: 3500,
    isTelehealth: false,
  },
  {
    slug: 'telehealth-consultation',
    name: 'Telehealth Consultation',
    description:
      'A video appointment for follow ups, prescription renewals and questions that do not need a physical examination. A link is emailed before your slot.',
    durationMinutes: 30,
    priceMin: 600,
    priceMax: 900,
    isTelehealth: true,
  },
]

/** Weekday 1 to 5 shorthand used below. */
const weekdayMorning = [1, 2, 3, 4, 5].map((d) => ({
  dayOfWeek: d,
  startTime: '08:00',
  endTime: '12:00',
}))

export const demoProviders: DemoProvider[] = [
  {
    key: 'reyes',
    fullName: 'Dr. Elena Reyes',
    specialty: 'Family Medicine',
    initials: 'ER',
    languages: ['English', 'Filipino'],
    bio: 'Sees whole families and keeps the long view: what changed since the last visit, what can wait, and what should not. Particular interest in blood pressure and diabetes that has drifted.',
    services: ['general-consultation', 'telehealth-consultation'],
    schedule: [
      ...weekdayMorning,
      { dayOfWeek: 1, startTime: '13:00', endTime: '17:00' },
      { dayOfWeek: 3, startTime: '13:00', endTime: '17:00' },
      { dayOfWeek: 6, startTime: '08:00', endTime: '12:00' },
    ],
  },
  {
    key: 'navarro',
    fullName: 'Dr. Miguel Navarro',
    specialty: 'Pediatrics',
    initials: 'MN',
    languages: ['English', 'Filipino', 'Cebuano'],
    bio: 'Fifteen years of well child clinics. Explains an immunisation schedule once, clearly, and writes it down so nobody has to remember it in the car park.',
    services: ['pediatrics', 'general-consultation', 'telehealth-consultation'],
    schedule: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
      { dayOfWeek: 2, startTime: '09:00', endTime: '12:00' },
      { dayOfWeek: 2, startTime: '14:00', endTime: '18:00' },
      { dayOfWeek: 4, startTime: '09:00', endTime: '12:00' },
      { dayOfWeek: 4, startTime: '14:00', endTime: '18:00' },
      { dayOfWeek: 6, startTime: '08:00', endTime: '12:00' },
    ],
  },
  {
    key: 'tolentino',
    fullName: 'Dr. Grace Tolentino',
    specialty: 'Dermatology',
    initials: 'GT',
    languages: ['English', 'Filipino'],
    bio: 'Treats skin as a long game rather than a single appointment. Builds routines patients can actually keep, and says plainly when something needs a biopsy.',
    services: ['dermatology', 'telehealth-consultation'],
    schedule: [
      { dayOfWeek: 2, startTime: '10:00', endTime: '13:00' },
      { dayOfWeek: 3, startTime: '10:00', endTime: '13:00' },
      { dayOfWeek: 3, startTime: '14:00', endTime: '18:00' },
      { dayOfWeek: 5, startTime: '10:00', endTime: '16:00' },
    ],
  },
  {
    key: 'delacruz',
    fullName: 'Dr. Paolo dela Cruz',
    specialty: 'Dentistry',
    initials: 'PC',
    languages: ['English', 'Filipino'],
    bio: 'Gentle with nervous patients and unusually good at explaining what an x ray actually shows. Quotes any treatment in writing before beginning it.',
    services: ['dental-check-up'],
    schedule: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
      { dayOfWeek: 1, startTime: '14:00', endTime: '18:00' },
      { dayOfWeek: 3, startTime: '09:00', endTime: '12:00' },
      { dayOfWeek: 5, startTime: '09:00', endTime: '12:00' },
      { dayOfWeek: 5, startTime: '14:00', endTime: '18:00' },
    ],
  },
  {
    key: 'salazar',
    fullName: 'Dr. Andrea Salazar',
    specialty: 'Internal Medicine',
    initials: 'AS',
    languages: ['English', 'Filipino', 'Spanish'],
    bio: 'Handles the complicated middle ground: several medicines at once, results that do not agree, and symptoms that have been brushed off elsewhere.',
    services: ['general-consultation', 'laboratory-tests', 'telehealth-consultation'],
    schedule: [
      { dayOfWeek: 1, startTime: '08:00', endTime: '12:00' },
      { dayOfWeek: 2, startTime: '08:00', endTime: '12:00' },
      { dayOfWeek: 4, startTime: '08:00', endTime: '12:00' },
      { dayOfWeek: 4, startTime: '13:00', endTime: '17:00' },
      { dayOfWeek: 5, startTime: '08:00', endTime: '12:00' },
    ],
  },
  {
    key: 'ocampo',
    fullName: 'Dr. Rafael Ocampo',
    specialty: 'Laboratory Medicine',
    initials: 'RO',
    languages: ['English', 'Filipino'],
    bio: 'Runs the clinic laboratory and reads the panels himself. Will tell you which test is worth running and which one will not change anything.',
    services: ['laboratory-tests'],
    schedule: [
      { dayOfWeek: 1, startTime: '07:00', endTime: '11:00' },
      { dayOfWeek: 2, startTime: '07:00', endTime: '11:00' },
      { dayOfWeek: 3, startTime: '07:00', endTime: '11:00' },
      { dayOfWeek: 4, startTime: '07:00', endTime: '11:00' },
      { dayOfWeek: 5, startTime: '07:00', endTime: '11:00' },
      { dayOfWeek: 6, startTime: '07:00', endTime: '11:00' },
    ],
  },
]

export const demoMembers = [
  { userEmail: 'owner@luminafamilyclinic.example', fullName: 'Cecilia Marquez', role: 'owner' as const },
  { userEmail: 'admin@luminafamilyclinic.example', fullName: 'Daniel Bautista', role: 'admin' as const },
  { userEmail: 'reception@luminafamilyclinic.example', fullName: 'Lira Mendoza', role: 'staff' as const },
]

/** Patients used by the sample appointments. */
export const demoPatients = [
  { fullName: 'Marisol Dizon', email: 'marisol.dizon@example.com', phone: '+63 917 555 0142', dateOfBirth: '1988-03-14', patientType: 'returning' as const, insurance: 'Maxicare' },
  { fullName: 'Enrique Villanueva', email: 'enrique.villanueva@example.com', phone: '+63 918 555 0119', dateOfBirth: '1976-11-02', patientType: 'returning' as const, insurance: null },
  { fullName: 'Joan Trinidad', email: 'joan.trinidad@example.com', phone: '+63 905 555 0188', dateOfBirth: '1995-07-21', patientType: 'new' as const, insurance: 'Intellicare' },
  { fullName: 'Noel Pangilinan', email: 'noel.pangilinan@example.com', phone: '+63 927 555 0163', dateOfBirth: '1969-01-30', patientType: 'returning' as const, insurance: 'PhilCare' },
  { fullName: 'Bea Cordero', email: 'bea.cordero@example.com', phone: '+63 939 555 0107', dateOfBirth: '2018-09-09', patientType: 'returning' as const, insurance: 'Maxicare' },
  { fullName: 'Arvin Lazaro', email: 'arvin.lazaro@example.com', phone: '+63 916 555 0175', dateOfBirth: '1992-05-18', patientType: 'new' as const, insurance: null },
  { fullName: 'Katrina Soriano', email: 'katrina.soriano@example.com', phone: '+63 920 555 0151', dateOfBirth: '1984-12-05', patientType: 'returning' as const, insurance: 'Medicard' },
  { fullName: 'Rogelio Bautista', email: 'rogelio.bautista@example.com', phone: '+63 922 555 0133', dateOfBirth: '1958-06-27', patientType: 'returning' as const, insurance: 'PhilCare' },
]

export type DemoAppointmentSeed = {
  patientEmail: string
  providerKey: string
  serviceSlug: string
  /** Days from the seed run date. Negative is in the past. */
  dayOffset: number
  /** Local clinic time, HH:mm. */
  time: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  reasonForVisit: string
  reminderChannel: 'email' | 'sms'
  aiUrgency?: 'routine' | 'soon' | 'urgent' | 'emergency'
  aiSummary?: string
  aiRedFlag?: boolean
}

/**
 * Fifteen sample appointments spread across the past and the next two weeks.
 * Times are chosen to sit inside the matching provider's schedule.
 */
export const demoAppointments: DemoAppointmentSeed[] = [
  { patientEmail: 'marisol.dizon@example.com', providerKey: 'reyes', serviceSlug: 'general-consultation', dayOffset: 1, time: '09:00', status: 'confirmed', reasonForVisit: 'Blood pressure has been higher than usual at home for two weeks. Would like my medication reviewed.', reminderChannel: 'email', aiUrgency: 'soon', aiSummary: 'Patient reports elevated home blood pressure readings over two weeks and requests a medication review.', aiRedFlag: false },
  { patientEmail: 'bea.cordero@example.com', providerKey: 'navarro', serviceSlug: 'pediatrics', dayOffset: 1, time: '09:30', status: 'confirmed', reasonForVisit: 'Routine well child check and the next scheduled vaccine.', reminderChannel: 'sms', aiUrgency: 'routine', aiSummary: 'Routine well child visit with a scheduled immunisation.', aiRedFlag: false },
  { patientEmail: 'joan.trinidad@example.com', providerKey: 'tolentino', serviceSlug: 'dermatology', dayOffset: 2, time: '10:30', status: 'confirmed', reasonForVisit: 'A patch on my forearm has not cleared after a month of over the counter cream.', reminderChannel: 'email', aiUrgency: 'routine', aiSummary: 'Persistent forearm skin lesion unresolved after a month of over the counter treatment.', aiRedFlag: false },
  { patientEmail: 'noel.pangilinan@example.com', providerKey: 'salazar', serviceSlug: 'laboratory-tests', dayOffset: 2, time: '08:00', status: 'pending', reasonForVisit: 'Fasting blood work requested by my cardiologist before my next review.', reminderChannel: 'email', aiUrgency: 'routine', aiSummary: 'Fasting laboratory panel requested ahead of a cardiology review.', aiRedFlag: false },
  { patientEmail: 'arvin.lazaro@example.com', providerKey: 'delacruz', serviceSlug: 'dental-check-up', dayOffset: 3, time: '09:00', status: 'confirmed', reasonForVisit: 'First cleaning in about three years. Some bleeding when brushing.', reminderChannel: 'sms', aiUrgency: 'routine', aiSummary: 'First dental cleaning in roughly three years, with reported gum bleeding on brushing.', aiRedFlag: false },
  { patientEmail: 'katrina.soriano@example.com', providerKey: 'reyes', serviceSlug: 'telehealth-consultation', dayOffset: 3, time: '13:30', status: 'confirmed', reasonForVisit: 'Follow up on last month visit and renewal of my maintenance prescription.', reminderChannel: 'email', aiUrgency: 'routine', aiSummary: 'Follow up consultation and maintenance prescription renewal.', aiRedFlag: false },
  { patientEmail: 'rogelio.bautista@example.com', providerKey: 'salazar', serviceSlug: 'general-consultation', dayOffset: 4, time: '08:30', status: 'confirmed', reasonForVisit: 'Shortness of breath when climbing stairs that started about ten days ago.', reminderChannel: 'sms', aiUrgency: 'urgent', aiSummary: 'New exertional shortness of breath over ten days in an older adult patient.', aiRedFlag: true },
  { patientEmail: 'marisol.dizon@example.com', providerKey: 'ocampo', serviceSlug: 'laboratory-tests', dayOffset: 5, time: '07:30', status: 'pending', reasonForVisit: 'Annual fasting panel.', reminderChannel: 'email', aiUrgency: 'routine', aiSummary: 'Annual fasting laboratory panel.', aiRedFlag: false },
  { patientEmail: 'enrique.villanueva@example.com', providerKey: 'navarro', serviceSlug: 'general-consultation', dayOffset: 7, time: '09:00', status: 'pending', reasonForVisit: 'Cough that has lingered for three weeks after a cold.', reminderChannel: 'email', aiUrgency: 'soon', aiSummary: 'Post viral cough persisting for three weeks.', aiRedFlag: false },
  { patientEmail: 'joan.trinidad@example.com', providerKey: 'tolentino', serviceSlug: 'dermatology', dayOffset: 9, time: '11:00', status: 'pending', reasonForVisit: 'Mole check. One has changed shape since last year.', reminderChannel: 'sms', aiUrgency: 'soon', aiSummary: 'Mole assessment requested after a reported change in shape over a year.', aiRedFlag: false },
  { patientEmail: 'bea.cordero@example.com', providerKey: 'navarro', serviceSlug: 'pediatrics', dayOffset: 10, time: '14:30', status: 'pending', reasonForVisit: 'Fever for two days and not eating much.', reminderChannel: 'sms', aiUrgency: 'soon', aiSummary: 'Two days of fever with reduced appetite in a young child.', aiRedFlag: false },
  { patientEmail: 'arvin.lazaro@example.com', providerKey: 'reyes', serviceSlug: 'general-consultation', dayOffset: -4, time: '10:00', status: 'completed', reasonForVisit: 'Medical certificate for a new job.', reminderChannel: 'email', aiUrgency: 'routine', aiSummary: 'Pre employment medical certificate request.', aiRedFlag: false },
  { patientEmail: 'katrina.soriano@example.com', providerKey: 'delacruz', serviceSlug: 'dental-check-up', dayOffset: -6, time: '15:00', status: 'completed', reasonForVisit: 'Six month cleaning.', reminderChannel: 'email', aiUrgency: 'routine', aiSummary: 'Routine six month dental cleaning.', aiRedFlag: false },
  { patientEmail: 'noel.pangilinan@example.com', providerKey: 'reyes', serviceSlug: 'general-consultation', dayOffset: -2, time: '09:30', status: 'no_show', reasonForVisit: 'Review of recent laboratory results.', reminderChannel: 'sms', aiUrgency: 'routine', aiSummary: 'Scheduled review of recent laboratory results.', aiRedFlag: false },
  { patientEmail: 'enrique.villanueva@example.com', providerKey: 'tolentino', serviceSlug: 'dermatology', dayOffset: -1, time: '12:00', status: 'cancelled', reasonForVisit: 'Recurring rash on both hands.', reminderChannel: 'email', aiUrgency: 'routine', aiSummary: 'Recurring bilateral hand rash.', aiRedFlag: false },
]

export const demoContactMessages = [
  {
    name: 'Teresa Aguilar',
    email: 'teresa.aguilar@example.com',
    topic: 'billing' as const,
    message:
      'I was charged twice for my consultation last Tuesday. The receipt number ends in 4471. Could someone check and let me know?',
    aiTopic: 'billing',
    status: 'new' as const,
  },
  {
    name: 'Rommel Castillo',
    email: 'rommel.castillo@example.com',
    topic: 'appointment' as const,
    message:
      'I booked a dental cleaning for next week but I cannot find the confirmation email. Can you resend it to this address?',
    aiTopic: 'appointment',
    status: 'in_review' as const,
  },
  {
    name: 'Luisa Fernandez',
    email: 'luisa.fernandez@example.com',
    topic: 'general' as const,
    message:
      'Do you have parking on site, and is the clinic accessible for someone using a wheelchair? My mother has an appointment on Friday.',
    aiTopic: 'general',
    status: 'replied' as const,
  },
  {
    name: 'Hector Ramos',
    email: 'hector.ramos@example.com',
    topic: 'complaint' as const,
    message:
      'I waited forty minutes past my slot last Thursday with no explanation from the front desk. I would like someone to look into what happened.',
    aiTopic: 'complaint',
    status: 'new' as const,
  },
  {
    name: 'Divina Santos',
    email: 'divina.santos@example.com',
    topic: 'general' as const,
    message:
      'Does the laboratory accept walk ins for a fasting panel, or does everything need a booking in advance?',
    aiTopic: 'general',
    status: 'new' as const,
  },
]
