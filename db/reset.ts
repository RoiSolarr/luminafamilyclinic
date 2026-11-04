/**
 * Destructive. Drops the three application schemas and the drizzle bookkeeping
 * schema so `npm run db:reset` can rebuild everything from scratch.
 *
 * It refuses to run unless you pass --yes, so a stray command cannot wipe a
 * database you care about.
 */
import { requireDatabaseUrl } from './env'
import postgres from 'postgres'

async function main() {
  if (!process.argv.includes('--yes') && process.env.CONFIRM_RESET !== 'yes') {
    console.error(
      'Refusing to drop schemas. Re-run as `npm run db:reset -- --yes` if you really mean it.',
    )
    process.exit(1)
  }

  const url = requireDatabaseUrl()

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
