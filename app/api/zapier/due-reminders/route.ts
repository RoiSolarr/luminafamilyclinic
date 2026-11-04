import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { failServer, failUnauthorized } from '@/lib/api'
import { verifyZapierSecret } from '@/lib/tokens'
import { ensurePostVisitReminders, listDueReminders } from '@/lib/repo'
import { errorInfo, log } from '@/lib/logger'
import { siteUrl } from '@/config/clinic'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/zapier/due-reminders
 *
 * The work queue Zap 2 (day before reminders) and Zap 5 (post visit follow up)
 * poll on a schedule. Secured with the same shared secret as the callback.
 *
 * The response carries only what is needed to send one message: a first name,
 * one contact field, the appointment time and the links. No date of birth, no
 * insurance, no reason for visit, no manage token.
 *
 * Each call also creates any missing post visit rows for appointments that
 * finished about a day ago, so Zap 5 has something to pick up without a
 * separate scheduler.
 */
export async function GET(request: NextRequest) {
  if (!verifyZapierSecret(request.headers.get('x-zapier-secret'))) {
    log.warn('zapier.due_reminders_unauthorized', {})
    return failUnauthorized()
  }

  const typeFilter = request.nextUrl.searchParams.get('type')

  try {
    const created = await ensurePostVisitReminders()
    const all = await listDueReminders()

    const due =
      typeFilter === '24h_reminder' || typeFilter === 'post_visit'
        ? all.filter((r) => r.type === typeFilter)
        : all

    log.info('zapier.due_reminders', { count: due.length, postVisitCreated: created })

    const response = NextResponse.json({
      ok: true,
      data: {
        count: due.length,
        callbackUrl: `${siteUrl()}/api/zapier/callback`,
        reminders: due,
      },
    })
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (err) {
    log.error('zapier.due_reminders_failed', errorInfo(err))
    return failServer('Could not build the reminder queue.')
  }
}
