import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { users } from './users.schema'

/**
 * `email_verification_tokens` — single-use, hashed (SHA-256) tokens emailed to
 * confirm email ownership. The raw token travels only in the email link; only
 * its hash is stored. `consumed_at` marks it used; tokens also expire.
 */
export const emailVerificationTokens = pgTable('email_verification_tokens', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
