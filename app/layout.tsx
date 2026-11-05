import type { Metadata, Viewport } from 'next'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'

import './globals.css'
import { clinic, clinicAddressLine, siteUrl } from '@/config/clinic'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { MobileBookBar } from '@/components/mobile-book-bar'
import { ToastProvider } from '@/components/ui/toast'
import { LoadingOverlayProvider } from '@/components/loading-overlay'
import { themeScript } from '@/components/theme-toggle'

const body = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
})

const display = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  weight: ['500', '600', '700'],
  variable: '--font-display',
})

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${clinic.name} | Book a doctor online`,
    template: `%s | ${clinic.name}`,
  },
  description: clinic.description,
  applicationName: clinic.name,
  keywords: [
    'clinic booking demo',
    'appointment booking',
    'family clinic',
    'telehealth',
    'Next.js booking system',
  ],
  authors: [{ name: clinic.name }],
  openGraph: {
    type: 'website',
    siteName: clinic.name,
    title: `${clinic.name} | Book a doctor online`,
    description: clinic.description,
    url: siteUrl(),
    locale: 'en_PH',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${clinic.name} | Book a doctor online`,
    description: clinic.description,
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  other: {
    // The notice travels with the page, not only with the footer.
    'demo-notice': clinic.demoNotice,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Pinch zoom is left on. Capping it would break the 200% zoom requirement.
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf9f6' },
    { media: '(prefers-color-scheme: dark)', color: '#0b141a' },
  ],
}

/** Structured data so search engines understand what this page is. */
function JsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'MedicalClinic',
    name: clinic.name,
    description: clinic.description,
    url: siteUrl(),
    telephone: clinic.contact.phone,
    email: clinic.contact.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: `${clinic.contact.addressLine1}, ${clinic.contact.addressLine2}`,
      addressLocality: clinic.contact.city,
      addressRegion: clinic.contact.region,
      postalCode: clinic.contact.postalCode,
      addressCountry: 'PH',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: clinic.contact.coordinates.lat,
      longitude: clinic.contact.coordinates.lng,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '08:00',
        closes: '18:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Saturday'],
        opens: '08:00',
        closes: '13:00',
      },
    ],
    availableService: [
      'General Consultation',
      'Pediatrics',
      'Dental Check-up',
      'Dermatology',
      'Laboratory Tests',
      'Telehealth Consultation',
    ].map((name) => ({ '@type': 'MedicalProcedure', name })),
    disambiguatingDescription: clinic.demoNotice,
  }

  return (
    <script
      type="application/ld+json"
      // Static, locally built object. No user input reaches it.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-PH" suppressHydrationWarning className={`${body.variable} ${display.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <JsonLd />
      </head>
      <body className="flex min-h-[100svh] flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-5 focus:py-3 focus:text-primary-ink"
        >
          Skip to content
        </a>

        <ToastProvider>
          <LoadingOverlayProvider>
            <SiteHeader />
            <main id="main" className="flex-1">
              {children}
            </main>
            <SiteFooter />
            <MobileBookBar />
            {/* Breathing room so the sticky mobile bar never covers the footer. */}
            <div aria-hidden="true" className="h-20 md:hidden" />
          </LoadingOverlayProvider>
        </ToastProvider>
      </body>
    </html>
  )
}
