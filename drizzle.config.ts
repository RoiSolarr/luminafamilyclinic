// Loads .env.local before .env, the same way the db scripts do.
import './db/env'
import type { Config } from 'drizzle-kit'

export default {
  schema: './db/schema/index.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || '',
  },
  // The three domain schemas this project owns. Anything else in the database
  // is left alone by drizzle-kit.
  schemaFilter: ['core', 'medical', 'communications'],
  verbose: true,
  strict: true,
} satisfies Config
