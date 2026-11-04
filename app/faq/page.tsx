import type { Metadata } from 'next'
import Link from 'next/link'

import { clinic } from '@/config/clinic'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Card,
} from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { ContactForm } from '@/components/contact-form'
import { Reveal } from '@/components/motion'

export const metadata: Metadata = {
  title: 'Frequently asked questions',
  description:
    'Answers about booking, what to bring, HMO coverage, telehealth, reminders and how your information is handled.',
}

/** FAQPage structured data, built from the same list the page renders. */
function FaqJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: clinic.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  }
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  )
}

export default function FaqPage() {
  return (
    <div className="container section-y">
      <FaqJsonLd />

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
        <div className="min-w-0">
          <Reveal>
            <h1 className="text-fluid-4xl font-semibold">Frequently asked questions</h1>
            <p className="mt-5 max-w-2xl text-fluid-lg leading-relaxed text-ink-soft">
              The things people ask at the front desk, answered here so you do not have to.
            </p>
          </Reveal>

          <Reveal delay={0.08} className="mt-10">
            <Accordion type="multiple" className="w-full border-t border-line">
              {clinic.faqs.map((faq, index) => (
                <AccordionItem key={faq.q} value={`faq-${index}`}>
                  <AccordionTrigger>{faq.q}</AccordionTrigger>
                  <AccordionContent>{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>

        <aside className="lg:sticky lg:top-24">
          <Reveal delay={0.12}>
            <Card>
              <h2 className="font-display text-fluid-xl">Still have a question?</h2>
              <p className="mt-2 text-fluid-sm text-ink-soft">
                Send it over and a member of staff will reply by email.
              </p>
              <div className="mt-5">
                <ContactForm compact idPrefix="faq" defaultTopic="general" />
              </div>
            </Card>

            <Card className="mt-5 bg-surface-2/60">
              <h2 className="font-display text-fluid-lg">Ready to book?</h2>
              <p className="mt-2 text-fluid-sm text-ink-soft">
                It takes about a minute and you can change it later.
              </p>
              <Button asChild className="mt-4" full>
                <Link href="/book">Book an appointment</Link>
              </Button>
            </Card>
          </Reveal>
        </aside>
      </div>
    </div>
  )
}
