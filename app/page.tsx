import Link from 'next/link'
import { ArrowRight, CalendarCheck, Clock, ShieldCheck, Stethoscope, Video } from 'lucide-react'

import { clinic } from '@/config/clinic'
import { listProviders, listServices } from '@/lib/repo'
import { formatDuration, formatPriceRange, formatWeekdays } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Card,
  InitialsAvatar,
} from '@/components/ui/primitives'
import { Reveal, StaggerItem, StaggerList } from '@/components/motion'

// Read through to the database on each request so a newly seeded service shows
// up without a redeploy. The pages themselves hold no personal data.
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [services, providers] = await Promise.all([listServices(), listProviders()])
  const featuredDoctors = providers.slice(0, 4)
  const teaserFaqs = clinic.faqs.slice(0, 4)

  return (
    <>
      {/* ------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden">
        {/* Soft asymmetric wash behind the hero, decorative only. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-40 h-[28rem] w-[28rem] rounded-full bg-primary-soft blur-3xl sm:-right-20 lg:right-[8%]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 top-48 h-64 w-64 rounded-full bg-accent-soft blur-3xl"
        />

        <div className="container relative grid items-center gap-12 pb-10 pt-12 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-20 lg:pt-24">
          <Reveal>
            <Badge tone="primary" className="mb-5">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              Booking open 24 hours a day
            </Badge>

            <h1 className="text-fluid-4xl font-semibold leading-[1.05]">
              Unhurried family care,
              <br className="hidden sm:block" />{' '}
              <span className="text-primary">booked in under a minute.</span>
            </h1>

            <p className="mt-6 max-w-xl text-fluid-lg leading-relaxed text-ink-soft">
              Six specialties under one roof in {clinic.contact.city}. Pick a doctor, pick a time
              that actually fits your week, and get a link that lets you change it later without
              phoning anyone.
            </p>

            <div className="mt-8 flex flex-col gap-3 xs:flex-row xs:items-center">
              <Button asChild size="lg">
                <Link href="/book">
                  Book an appointment
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/services">Browse services</Link>
              </Button>
            </div>

            <p className="mt-5 flex items-center gap-2 text-fluid-sm text-ink-muted">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              No account needed. No tracking cookies.
            </p>
          </Reveal>

          {/* Trust numbers, laid out as a bento block rather than a plain row. */}
          <Reveal delay={0.12}>
            <div className="@container grid grid-cols-2 gap-3 sm:gap-4">
              {clinic.trust.map((item, index) => (
                <Card
                  key={item.label}
                  className={
                    index === 0
                      ? 'col-span-2 bg-primary text-primary-ink sm:col-span-2'
                      : 'bg-surface'
                  }
                >
                  <p
                    className={`font-display text-fluid-3xl font-semibold leading-none ${
                      index === 0 ? 'text-primary-ink' : 'text-primary'
                    }`}
                  >
                    {item.value}
                  </p>
                  <p
                    className={`mt-2 text-fluid-sm font-medium ${
                      index === 0 ? 'text-primary-ink' : 'text-ink'
                    }`}
                  >
                    {item.label}
                  </p>
                  <p
                    className={`mt-1 text-fluid-xs ${
                      index === 0 ? 'text-primary-ink/75' : 'text-ink-muted'
                    }`}
                  >
                    {item.hint}
                  </p>
                </Card>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* --------------------------------------------------------- services */}
      <section className="section-y" aria-labelledby="services-heading">
        <div className="container">
          <Reveal className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="services-heading" className="text-fluid-3xl font-semibold">
                What we look after
              </h2>
              <p className="mt-3 max-w-xl text-fluid-base text-ink-soft">
                Each service lists its real length and price range, so there are no surprises at
                reception.
              </p>
            </div>
            <Link
              href="/services"
              className="link-underline inline-flex items-center gap-1.5 text-fluid-sm text-primary"
            >
              All services
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Reveal>

          {/* Bento grid: the first card spans two columns from `md` up. */}
          <StaggerList className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,17rem),1fr))]">
            {services.map((service, index) => (
              <StaggerItem key={service.id} className={index === 0 ? 'md:col-span-2' : ''}>
                <Card className="hover-lift @container flex h-full flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary-strong">
                      {service.isTelehealth ? (
                        <Video className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <Stethoscope className="h-5 w-5" aria-hidden="true" />
                      )}
                    </span>
                    {service.isTelehealth && <Badge tone="accent">Video</Badge>}
                  </div>

                  <h3 className="mt-4 font-display text-fluid-xl">{service.name}</h3>
                  <p className="mt-2 flex-1 text-fluid-sm leading-relaxed text-ink-soft">
                    {service.description}
                  </p>

                  <dl className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1 text-fluid-xs text-ink-muted">
                    <div className="flex items-center gap-1.5">
                      <dt className="sr-only">Length</dt>
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      <dd>{formatDuration(service.durationMinutes)}</dd>
                    </div>
                    <div>
                      <dt className="sr-only">Price range</dt>
                      <dd>{formatPriceRange(service.priceMin, service.priceMax)}</dd>
                    </div>
                  </dl>

                  <Button asChild variant="secondary" size="sm" className="mt-5 self-start">
                    <Link href={`/book?service=${service.slug}`}>Book this</Link>
                  </Button>
                </Card>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* ----------------------------------------------------- how it works */}
      <section className="section-y bg-surface-2/60" aria-labelledby="how-heading">
        <div className="container">
          <Reveal>
            <h2 id="how-heading" className="text-fluid-3xl font-semibold">
              How booking works
            </h2>
            <p className="mt-3 max-w-xl text-fluid-base text-ink-soft">
              Three steps, and the last one ends with a link you keep.
            </p>
          </Reveal>

          <StaggerList className="mt-10 grid gap-5 lg:grid-cols-3">
            {clinic.bookingSteps.map((step, index) => (
              <StaggerItem key={step.title}>
                <Card className="h-full">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary font-display text-fluid-base font-semibold text-primary-ink">
                    {index + 1}
                  </span>
                  <h3 className="mt-4 font-display text-fluid-lg">{step.title}</h3>
                  <p className="mt-2 text-fluid-sm leading-relaxed text-ink-soft">{step.body}</p>
                </Card>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* ---------------------------------------------------------- doctors */}
      <section className="section-y" aria-labelledby="doctors-heading">
        <div className="container">
          <Reveal className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="doctors-heading" className="text-fluid-3xl font-semibold">
                The people you will see
              </h2>
              <p className="mt-3 max-w-xl text-fluid-base text-ink-soft">
                Every doctor below is fictional, invented for this demonstration.
              </p>
            </div>
            <Link
              href="/doctors"
              className="link-underline inline-flex items-center gap-1.5 text-fluid-sm text-primary"
            >
              All doctors
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Reveal>

          <StaggerList className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,15rem),1fr))]">
            {featuredDoctors.map((doctor) => (
              <StaggerItem key={doctor.id}>
                <Card className="hover-lift flex h-full flex-col items-start">
                  <InitialsAvatar initials={doctor.initials} />
                  <h3 className="mt-4 font-display text-fluid-lg">{doctor.fullName}</h3>
                  <p className="text-fluid-sm text-primary">{doctor.specialty}</p>
                  <p className="mt-3 flex-1 text-fluid-sm leading-relaxed text-ink-soft">
                    {doctor.bio}
                  </p>
                  <p className="mt-4 text-fluid-xs text-ink-muted">
                    {formatWeekdays(doctor.schedule.map((s) => s.dayOfWeek))}
                  </p>
                </Card>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* ----------------------------------------------------- testimonials */}
      <section className="section-y bg-surface-2/60" aria-labelledby="reviews-heading">
        <div className="container">
          <Reveal>
            <h2 id="reviews-heading" className="text-fluid-3xl font-semibold">
              What patients say
            </h2>
            <p className="mt-3 text-fluid-sm text-ink-muted">
              Reviews are invented for this demonstration.
            </p>
          </Reveal>

          <StaggerList className="mt-10 grid gap-5 lg:grid-cols-3">
            {clinic.testimonials.map((review) => (
              <StaggerItem key={review.name}>
                <Card className="flex h-full flex-col">
                  <p className="flex-1 font-display text-fluid-lg leading-relaxed text-ink">
                    {review.quote}
                  </p>
                  <footer className="mt-6 border-t border-line pt-4">
                    <p className="font-medium text-ink">{review.name}</p>
                    <p className="text-fluid-xs text-ink-muted">{review.context}</p>
                  </footer>
                </Card>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* -------------------------------------------------------- faq teaser */}
      <section className="section-y" aria-labelledby="faq-teaser-heading">
        <div className="container grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <Reveal>
            <h2 id="faq-teaser-heading" className="text-fluid-3xl font-semibold">
              Questions people ask first
            </h2>
            <p className="mt-3 text-fluid-base text-ink-soft">
              Twelve more answers are on the FAQ page, including what to bring and how telehealth
              works.
            </p>
            <Button asChild variant="secondary" className="mt-6">
              <Link href="/faq">Read the full FAQ</Link>
            </Button>
          </Reveal>

          <Reveal delay={0.1}>
            <Accordion type="single" collapsible className="w-full">
              {teaserFaqs.map((faq, index) => (
                <AccordionItem key={faq.q} value={`faq-${index}`}>
                  <AccordionTrigger>{faq.q}</AccordionTrigger>
                  <AccordionContent>{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </section>

      {/* -------------------------------------------------------- final cta */}
      <section className="pb-section">
        <div className="container">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center sm:px-12 lg:py-20">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary-ink/10"
              />
              <CalendarCheck
                className="mx-auto h-10 w-10 text-primary-ink/80"
                aria-hidden="true"
              />
              <h2 className="mt-5 text-fluid-3xl font-semibold text-primary-ink">
                Ready when you are
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-fluid-lg text-primary-ink/85">
                Booking takes about a minute and you can change your mind afterwards without
                calling.
              </p>
              <Button asChild variant="secondary" size="lg" className="mt-8">
                <Link href="/book">
                  Book an appointment
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
