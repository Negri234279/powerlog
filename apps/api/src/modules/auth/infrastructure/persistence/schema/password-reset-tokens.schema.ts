import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { users } from './users.schema'

/**
 * `password_reset_tokens` — single-use, hashed (SHA-256) tokens emailed for the
 * forgot-password flow. The raw token travels only in the email link; only the
 * hash is stored. `consumed_at` marks it used; tokens also expire.
 */
export const passwordResetTokens = pgTable('password_reset_tokens', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
