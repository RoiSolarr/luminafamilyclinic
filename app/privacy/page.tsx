import type { Metadata } from 'next'
import { clinic } from '@/config/clinic'
import { Card } from '@/components/ui/primitives'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How this demonstration clinic handles the details you enter when booking, including health information in the reason for visit.',
}

export default function PrivacyPage() {
  return (
    <div className="container section-y">
      <article className="mx-auto max-w-3xl">
        <h1 className="text-fluid-4xl font-semibold">Privacy Policy</h1>
        <p className="mt-4 text-fluid-sm text-ink-muted">
          Last updated {clinic.legal.lastUpdated}
        </p>

        <Card className="mt-8 border-accent/30 bg-accent-soft">
          <p className="text-fluid-sm leading-relaxed text-accent">
            {clinic.demoNotice} This policy is a realistic template written for a demonstration
            project. Before using anything like it for a real clinic, have it reviewed against the
            law that applies to you, which in the Philippines means the Data Privacy Act of 2012 and
            the rules of the National Privacy Commission.
          </p>
        </Card>

        <div className="prose-lumina mt-10 flex flex-col gap-8">
          <Section title="Who is responsible">
            <p>
              {clinic.legal.entityName} decides what is collected on this site and why. Questions
              about this policy can go to{' '}
              <a href={`mailto:${clinic.legal.dataProtectionEmail}`} className="link-underline text-primary">
                {clinic.legal.dataProtectionEmail}
              </a>
              .
            </p>
          </Section>

          <Section title="What we collect">
            <p>Only what a booking needs:</p>
            <ul>
              <li>
                <strong>Identity and contact.</strong> The patient&apos;s full name, email address,
                mobile number and date of birth.
              </li>
              <li>
                <strong>Appointment details.</strong> The service, the doctor, the time, your
                preferred reminder channel, and your HMO or insurer if you give one.
              </li>
              <li>
                <strong>Health information.</strong> Whatever you write in the reason for visit
                field. This is sensitive personal information and is treated as such.
              </li>
              <li>
                <strong>Messages.</strong> Anything you send through the contact form, and any
                rating or comment you leave after a visit.
              </li>
            </ul>
            <p>
              We do not collect an account password, because the site has no patient accounts. We do
              not use tracking cookies, advertising pixels or analytics scripts, and the site sets no
              cookies of its own.
            </p>
          </Section>

          <Section title="Why we use it">
            <ul>
              <li>To hold your slot in the clinic diary and tell the clinical team to expect you.</li>
              <li>To send your confirmation, your reminder and, after your visit, a short survey.</li>
              <li>To let you reschedule or cancel through your private link.</li>
              <li>To answer messages you send us.</li>
            </ul>
            <p>
              Your reason for visit is passed through an automated step that writes a short, neutral
              summary for staff and flags anything that sounds urgent. That step never diagnoses,
              never gives medical advice and never replies to you directly. A member of staff always
              reads what you actually wrote.
            </p>
          </Section>

          <Section title="Your consent">
            <p>
              You tick a box before the booking is submitted, which is how we record your consent to
              store and process these details, including the health information in your reason for
              visit. You can withdraw that consent by cancelling the appointment and emailing us to
              ask that the record be removed.
            </p>
          </Section>

          <Section title="Who else sees it">
            <p>
              The clinic&apos;s own staff, and a small number of service providers acting on our
              instructions:
            </p>
            <ul>
              <li>
                <strong>Hosting and database.</strong> The site and the appointment database run on
                managed cloud infrastructure.
              </li>
              <li>
                <strong>Automation.</strong> An automation service sends confirmations, reminders and
                calendar entries, and alerts staff when something looks urgent. It receives the
                details of your booking in order to do that. It never receives a database credential.
              </li>
              <li>
                <strong>Email, messaging and calendar providers</strong> used to actually deliver
                those messages.
              </li>
            </ul>
            <p>
              We do not sell your information, and we do not share it for advertising. We may
              disclose it where the law requires.
            </p>
          </Section>

          <Section title="How it is protected">
            <ul>
              <li>Traffic to the site is encrypted in transit.</li>
              <li>
                The database is reachable only by the application server. Row level security is
                enabled on every table with no public access policy, so the database cannot be read
                through a public interface.
              </li>
              <li>
                Your manage link contains a random token. We store only a one way hash of it, which
                means an attacker who read the database still could not reconstruct your link.
              </li>
              <li>
                Server logs deliberately exclude names, contact details, dates of birth and the
                reason for visit.
              </li>
            </ul>
          </Section>

          <Section title="How long we keep it">
            <p>
              Appointment records are kept for as long as the clinic needs them for care and for its
              own legal obligations. Contact messages are kept for two years. In this demonstration,
              the data is sample data and may be reset at any time.
            </p>
          </Section>

          <Section title="Your rights">
            <p>
              Subject to the law that applies to you, you can ask to see what we hold, to correct it,
              to have it erased, to object to how it is used, and to receive a copy. Write to{' '}
              <a href={`mailto:${clinic.legal.dataProtectionEmail}`} className="link-underline text-primary">
                {clinic.legal.dataProtectionEmail}
              </a>{' '}
              and we will respond within the period the law allows. If you are not satisfied you may
              complain to your data protection authority.
            </p>
          </Section>

          <Section title="Children">
            <p>
              Appointments for children are booked by a parent or guardian, who provides the
              contact details and gives the consent on the child&apos;s behalf.
            </p>
          </Section>

          <Section title="Changes">
            <p>
              If this policy changes, the date at the top changes with it. Material changes would be
              announced on the site.
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
      <div className="mt-3 flex flex-col gap-3 text-fluid-base leading-relaxed text-ink-soft [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2 [&_strong]:text-ink">
        {children}
      </div>
    </section>
  )
}
