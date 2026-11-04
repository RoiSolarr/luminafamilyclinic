import 'server-only'
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

/**
 * Server side database client.
 *
 * This module imports `server-only`, so if a client component ever imports it
 * by accident the build fails instead of leaking the connection string.
 *
 * The connection is cached on `globalThis` so Next.js hot reloads and serverless
 * warm starts reuse one pool instead of opening a new one per request.
 */

declare global {
  // eslint-disable-next-line no-var
  var __luminaSql: ReturnType<typeof postgres> | undefined
}

export const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === 'true'

function connectionString(): string {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Either set it, or run with NEXT_PUBLIC_MOCK_MODE=true to use in memory seed data.',
    )
  }
  return url
}

function createClient() {
  return postgres(connectionString(), {
    // Supabase's transaction pooler does not support prepared statements.
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: connectionString().includes('sslmode=disable') ? false : 'require',
    onnotice: () => {},
  })
}

export function getSql() {
  if (!globalThis.__luminaSql) {
    globalThis.__luminaSql = createClient()
  }
  return globalThis.__luminaSql
}

let cachedDb: PostgresJsDatabase<typeof schema> | null = null

export function getDb(): PostgresJsDatabase<typeof schema> {
  if (!cachedDb) {
    cachedDb = drizzle(getSql(), { schema })
  }
  return cachedDb
}

export { schema }
