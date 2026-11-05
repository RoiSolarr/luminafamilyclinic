/**
 * Destructive. Drops the three application schemas and the drizzle bookkeeping
 * schema, so the database can be rebuilt from scratch.
 *
 * Refuses to run without --yes, and prints which host it is about to wipe
 * before doing it. The host matters more than the flag: the same command is
 * harmless against a local database and ruinous against a live one.
 *
 *   npm run db:drop -- --yes     drop only
 *   npm run db:reset             drop, migrate and seed in one go
 */
import { requireDatabaseUrl } from './env'
import postgres from 'postgres'

/** Host and database name, with any password stripped out. */
function describeTarget(url: string): string {
  try {
    const parsed = new URL(url)
    const database = parsed.pathname.replace(/^\//, '') || 'postgres'
    return `${database} on ${parsed.hostname}:${parsed.port || '5432'}`
  } catch {
    return 'an unreadable connection string'
  }
}

async function main() {
  if (!process.argv.includes('--yes') && process.env.CONFIRM_RESET !== 'yes') {
    console.error(
      [
        'Refusing to drop schemas without confirmation.',
        '',
        'To drop only:            npm run db:drop -- --yes',
        'To drop, migrate, seed:  npm run db:reset',
        '',
        'Note the position of the flag. `npm run db:reset -- --yes` does NOT work,',
        'because npm appends the flag to the end of the whole chain, where it',
        'reaches the seed script rather than this one.',
      ].join('\n'),
    )
    process.exit(1)
  }

  const url = requireDatabaseUrl()

  // Say out loud what is about to be destroyed. If this line names a Supabase
  // host when you expected localhost, stop.
  console.log(`About to drop every table in: ${describeTarget(url)}`)

  const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} })

  console.log('Dropping schemas core, medical, communications, drizzle...')
  await sql.unsafe(`
    DROP SCHEMA IF EXISTS "communications" CASCADE;
    DROP SCHEMA IF EXISTS "medical" CASCADE;
    DROP SCHEMA IF EXISTS "core" CASCADE;
    DROP SCHEMA IF EXISTS "drizzle" CASCADE;
  `)
  console.log('Dropped. Run db:migrate and db:seed next.')

  await sql.end()
}

main().catch((err) => {
  console.error('Reset failed:', err)
  process.exit(1)
})
