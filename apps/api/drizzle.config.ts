import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// Load apps/api/.env (run with cwd = apps/api) so drizzle-kit has DATABASE_URL.
config({ path: '.env' })

export default defineConfig({
    dialect: 'postgresql',
    // Every module keeps its Drizzle tables under this path.
    schema: './src/modules/**/infrastructure/persistence/schema/*.schema.ts',
    out: './drizzle',
    dbCredentials: {
        url: process.env['DATABASE_URL'] ?? '',
    },
    strict: true,
    verbose: true,
})
