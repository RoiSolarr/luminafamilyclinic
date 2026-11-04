/**
 * Structured server logging with a hard rule: no patient data ever reaches a
 * log line. Names, emails, phone numbers, dates of birth and the reason for a
 * visit are stripped before anything is written.
 *
 * Identifiers that are safe to log: booking reference, appointment id,
 * provider id, service id, status, HTTP status, duration.
 */

const BLOCKED_KEYS = new Set([
  'fullname',
  'name',
  'email',
  'phone',
  'dateofbirth',
  'dob',
  'reasonforvisit',
  'reason',
  'insurance',
  'message',
  'comment',
  'managetoken',
  'token',
  'aisummary',
  'aiconfirmationmessage',
  'aidraftreply',
  'patient',
  'authorization',
  'x-zapier-secret',
  'databaseurl',
  'password',
])

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[deep]'
  if (value === null || value === undefined) return value
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1))
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = BLOCKED_KEYS.has(k.toLowerCase()) ? '[redacted]' : redact(v, depth + 1)
    }
    return out
  }
  return value
}

type Level = 'info' | 'warn' | 'error'

function write(level: Level, event: string, context?: Record<string, unknown>) {
  const line = {
    ts: new Date().toISOString(),
    level,
    event,
    ...(context ? (redact(context) as Record<string, unknown>) : {}),
  }
  const serialized = JSON.stringify(line)
  if (level === 'error') console.error(serialized)
  else if (level === 'warn') console.warn(serialized)
  else console.log(serialized)
}

export const log = {
  info: (event: string, context?: Record<string, unknown>) => write('info', event, context),
  warn: (event: string, context?: Record<string, unknown>) => write('warn', event, context),
  error: (event: string, context?: Record<string, unknown>) => write('error', event, context),
}

/** Reduce an unknown thrown value to something safe to log. */
export function errorInfo(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return { errorName: err.name, errorMessage: err.message }
  }
  return { errorName: 'Unknown', errorMessage: String(err).slice(0, 200) }
}
