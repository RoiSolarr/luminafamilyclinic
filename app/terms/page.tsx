import type { Metadata } from 'next'
import Link from 'next/link'
import { clinic } from '@/config/clinic'
import { Card } from '@/components/ui/primitives'

export const metadata: Metadata = {
  title: 'Terms of Use',
  description:
    'The terms that apply when you use this demonstration booking site, including what it is and is not for.',
}

export default function TermsPage() {
  return (
    <div className="container section-y">
      <article className="mx-auto max-w-3xl">
        <h1 className="text-fluid-4xl font-semibold">Terms of Use</h1>
        <p className="mt-4 text-fluid-sm text-ink-muted">
          Last updated {clinic.legal.lastUpdated}
        </p>

        <Card className="mt-8 border-accent/30 bg-accent-soft">
          <p className="text-fluid-sm leading-relaxed text-accent">
            {clinic.demoNotice} No clinic of this name exists, no doctor listed here is a real
            person, and no appointment booked through this site will be honoured anywhere.
          </p>
        </Card>

        <div className="mt-10 flex flex-col gap-8">
          <Section title="What this site is">
            <p>
              A demonstration of an online appointment booking flow. It exists to show how a booking
              website, a database and an automation platform can work together. It is not a medical
              service and it provides no medical advice.
            </p>
          </Section>

          <Section title="Not for medical emergencies">
            <p>
              {clinic.emergencyNotice} Nothing here is monitored in real time and nobody will see an
              urgent message in time to act on it.
            </p>
          </Section>

          <Section title="No medical advice">
            <p>
              Nothing on this site, including any automatically generated summary or confirmation
              message, is medical advice, a diagnosis or a treatment recommendation. Decisions about
              your health should be made with a qualified clinician.
            </p>
          </Section>

          <Section title="Using the booking form">
            <ul>
              <li>Give accurate details, so a booking can actually be matched to you.</li>
              <li>Book only slots you intend to use, and cancel ones you do not.</li>
              <li>
                Keep your manage link private. Anyone who has it can change or cancel that
                appointment.
              </li>
              <li>
                Do not attempt to overwhelm the site with automated requests, to bypass its rate
                limits, or to access bookings that are not yours.
              </li>
            </ul>
          </Section>

          <Section title="Cancellations">
            <p>
              This demonstration charges nothing and holds nothing against you for a late
              cancellation. We ask that you release a slot you cannot use at least four hours ahead.
            </p>
          </Section>

          <Section title="Availability">
            <p>
              The site is offered as it is. It may be taken down, reset or changed without notice,
              and sample data may be deleted at any time. No uptime is promised.
            </p>
          </Section>

          <Section title="Liability">
            <p>
              To the extent the law allows, no liability is accepted for any loss arising from use
              of this demonstration site, including any reliance on an appointment booked through
              it.
            </p>
          </Section>

          <Section title="Your information">
            <p>
              How your details are handled is set out in the{' '}
              <Link href="/privacy" className="link-underline text-primary">
                Privacy Policy
              </Link>
              .
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions about these terms can go to{' '}
              <a href={`mailto:${clinic.contact.email}`} className="link-underline text-primary">
                {clinic.contact.email}
              </a>
              .
            </p>
          </Section>
        </div>
      </article>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-fluid-2xl">{title}</h2>
      <div className="mt-3 flex flex-col gap-3 text-fluid-base leading-relaxed text-ink-soft [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2">
        {children}
      </div>
    </section>
  )
}
