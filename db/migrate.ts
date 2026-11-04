/**
 * Applies every migration in db/migrations that has not run yet.
 *
 * Run with `npm run db:migrate`. Uses DIRECT_DATABASE_URL when present, because
 * Supabase's transaction pooler cannot run the DDL in these files.
 */
import { requireDatabaseUrl } from './env'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

async function main() {
  const url = requireDatabaseUrl()

  const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} })
  const db = drizzle(sql)

  console.log('Applying migrations...')
  await migrate(db, { migrationsFolder: './db/migrations' })
  console.log('Migrations applied.')

  await sql.end()
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
