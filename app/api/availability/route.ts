import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { fail, failRateLimit, failValidation } from '@/lib/api'
import { getAvailability } from '@/lib/availability'
import { clientIp, hit, LIMITS } from '@/lib/rate-limit'
import { listServices } from '@/lib/repo'
import { availabilityQuerySchema } from '@/lib/validation'
import { errorInfo, log } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/availability?date=YYYY-MM-DD&serviceId=uuid&providerId=uuid
 *
 * Returns the bookable start times for one day. The payload holds no patient
 * data at all, which is why it can be cached for 30 seconds at the edge.
 */
export async function GET(request: NextRequest) {
  const ip = clientIp(request.headers)
  const limited = hit(`availability:${ip}`, LIMITS.availability.limit, LIMITS.availability.windowMs)
  if (!limited.allowed) return failRateLimit(limited.retryAfter)

  const params = request.nextUrl.searchParams
  const parsed = availabilityQuerySchema.safeParse({
    date: params.get('date') ?? '',
    serviceId: params.get('serviceId') ?? '',
    providerId: params.get('providerId') || undefined,
  })
  if (!parsed.success) return failValidation(parsed.error)

  try {
    const services = await listServices()
    const service = services.find((s) => s.id === parsed.data.serviceId)
    if (!service) return fail(404, 'unknown_service', 'That service is no longer offered.')

    const result = await getAvailability({
      date: parsed.data.date,
      service,
      providerId: parsed.data.providerId,
    })

    const response = NextResponse.json({ ok: true, data: result })
    response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=30')
    return response
  } catch (err) {
    log.error('availability.failed', { date: parsed.data.date, ...errorInfo(err) })
    return fail(
      503,
      'availability_unavailable',
      'We could not load available times just now. Please try again.',
    )
  }
}
