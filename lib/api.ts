import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { fieldErrors } from './validation'

/**
 * One response shape for every API route, so the client never has to guess.
 *
 *   success: { ok: true, data: T }
 *   failure: { ok: false, error: { code, message, fields? } }
 */

export type ApiError = {
  code: string
  message: string
  fields?: Record<string, string>
}

export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: ApiError }

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json<ApiResponse<T>>({ ok: true, data }, { status: 200, ...init })
}

export function fail(
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string>,
) {
  return NextResponse.json<ApiResponse<never>>(
    { ok: false, error: { code, message, ...(fields ? { fields } : {}) } },
    { status },
  )
}

export function failValidation(error: ZodError) {
  return fail(
    400,
    'validation_error',
    'Some of the details need a second look.',
    fieldErrors(error),
  )
}

export function failRateLimit(retryAfter: number) {
  return NextResponse.json<ApiResponse<never>>(
    {
      ok: false,
      error: {
        code: 'rate_limited',
        message: 'That is a few too many attempts in a short time. Please try again shortly.',
      },
    },
    { status: 429, headers: { 'Retry-After': String(Math.max(1, retryAfter)) } },
  )
}

export function failUnauthorized() {
  return fail(401, 'unauthorized', 'Not authorised.')
}

export function failServer(message = 'Something went wrong on our side. Please try again.') {
  return fail(500, 'server_error', message)
}

/** Read and parse a JSON body without throwing on malformed input. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return null
  }
}
