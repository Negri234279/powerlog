import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// Load apps/api/.env (run with cwd = apps/api) so drizzle-kit has DATABASE_URL.
config({ path: '.env' })

export default defineConfig({
    dialect: 'postgresql',
    // Feature modules keep tables under src/modules/**; transversal modules
    // (e.g. src/presence) keep theirs under their own infrastructure/schema.
    schema: [
        './src/modules/**/infrastructure/persistence/schema/*.schema.ts',
        './src/presence/infrastructure/schema/*.schema.ts',
    ],
    out: './drizzle',
    dbCredentials: {
        url: process.env['DATABASE_URL'] ?? '',
    },
    strict: true,
    verbose: true,
})
