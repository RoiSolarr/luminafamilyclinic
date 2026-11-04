/**
 * Environment loading for the standalone scripts.
 *
 * Next.js loads `.env.local` by itself, but `db:migrate`, `db:seed` and
 * `db:reset` run under tsx, outside Next.js, where plain `import 'dotenv/config'`
 * reads only `.env`. That mismatch means a perfectly good `.env.local` is
 * invisible to the scripts, and they report a missing DATABASE_URL.
 *
 * Load order below is deliberate. dotenv never overwrites a variable that is
 * already set, so whichever file is read first wins:
 *
 *   1. anything already in the real environment (CI, a shell export)
 *   2. .env.local      - your machine, gitignored, where secrets live
 *   3. .env            - optional shared defaults, safe to commit
 *
 * Import this instead of 'dotenv/config' in any script that needs the database.
 */
import { config } from 'dotenv'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()

for (const file of ['.env.local', '.env']) {
  const path = resolve(root, file)
  if (existsSync(path)) config({ path })
}

/**
 * Returns the connection string for schema work, with a clear message when it
 * is missing or still holds the placeholder from `.env.example`.
 *
 * Migrations and the seed want a session style connection, so DIRECT_DATABASE_URL
 * is preferred and DATABASE_URL is the fallback.
 */
export function requireDatabaseUrl(): string {
  const direct = process.env.DIRECT_DATABASE_URL?.trim()
  const pooled = process.env.DATABASE_URL?.trim()
  const url = direct || pooled

  if (!url) {
    console.error(
      [
        'No database connection string found.',
        '',
        'Set DATABASE_URL (and ideally DIRECT_DATABASE_URL) in .env.local, in the',
        `project root: ${root}`,
        '',
        'Checked .env.local and .env. If your file is somewhere else, or is named',
        'something like ".env.local.txt", the scripts will not see it.',
      ].join('\n'),
    )
    process.exit(1)
  }

  if (url.includes('[YOUR-PASSWORD]') || url.includes('YOUR-PASSWORD')) {
    console.error(
      [
        'The connection string still contains the placeholder password.',
        '',
        'Replace [YOUR-PASSWORD] with your real Supabase database password.',
        'If the password has symbols in it, percent encode them: @ becomes %40.',
      ].join('\n'),
    )
    process.exit(1)
  }

  if (!url.startsWith('postgres://') && !url.startsWith('postgresql://')) {
    console.error(
      [
        'That does not look like a Postgres connection string.',
        '',
        'It should start with postgresql:// and come from the Supabase dashboard',
        'under Connect, not the NEXT_PUBLIC_SUPABASE_URL value.',
      ].join('\n'),
    )
    process.exit(1)
  }

  return url
}
