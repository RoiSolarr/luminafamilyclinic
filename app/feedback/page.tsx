import type { Metadata } from 'next'
import { Suspense } from 'react'
import { FeedbackClient } from '@/components/feedback-client'
import { Skeleton } from '@/components/ui/primitives'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'How was your visit?',
  description: 'Leave a rating after your appointment.',
  robots: { index: false, follow: false },
}

export default function FeedbackPage() {
  return (
    <div className="container py-12 lg:py-20">
      <Suspense fallback={<Skeleton className="mx-auto h-72 w-full max-w-lg" />}>
        <FeedbackClient />
      </Suspense>
    </div>
  )
}
