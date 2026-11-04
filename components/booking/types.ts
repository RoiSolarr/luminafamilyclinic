import type { OrgRecord, ProviderRecord, ServiceRecord } from '@/lib/types'

/** Everything the wizard collects, in one object. */
export type WizardState = {
  step: 1 | 2 | 3 | 4
  serviceId: string | null
  /** null means "any available doctor". */
  providerId: string | null
  date: string | null
  time: string | null
  details: {
    fullName: string
    email: string
    phone: string
    dateOfBirth: string
    patientType: 'new' | 'returning'
    reasonForVisit: string
    insurance: string
    reminderChannel: 'email' | 'sms'
    consentGiven: boolean
  }
}

export const emptyDetails: WizardState['details'] = {
  fullName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  patientType: 'new',
  reasonForVisit: '',
  insurance: '',
  reminderChannel: 'email',
  consentGiven: false,
}

export type WizardContext = {
  services: ServiceRecord[]
  providers: ProviderRecord[]
  org: Pick<OrgRecord, 'timezone' | 'settings'>
  /** Today in the clinic timezone. */
  today: string
}

/** The success payload returned by POST /api/book. */
export type BookingSuccess = {
  bookingRef: string
  status: string
  manageUrl: string
  manageToken: string
  startsAt: string
  endsAt: string
  localDate: string
  localTime: string
  localEndTime: string
  timezone: string
  providerName: string
  providerSpecialty: string
  serviceName: string
  durationMinutes: number
  isTelehealth: boolean
  patientName: string
  automationQueued: boolean
}

export const STEP_TITLES = [
  'Service and doctor',
  'Date and time',
  'Your details',
  'Review and confirm',
] as const
