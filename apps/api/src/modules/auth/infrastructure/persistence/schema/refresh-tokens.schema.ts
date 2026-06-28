import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { users } from './users.schema'

/**
 * `refresh_tokens` — opaque refresh tokens, persisted as a SHA-256 hash so a
 * DB leak never exposes a usable token. Supports rotation (`replacedBy`) and
 * revocation (`revokedAt`); logout revokes the active token. The `family` groups
 * a token and all of its rotations, so reuse detection can revoke the whole chain.
 */
export const refreshTokens = pgTable('refresh_tokens', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    // Stable across rotations; reuse of a revoked token revokes the whole family.
    family: uuid('family').notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    // Self-reference to the token that rotated this one (audit trail).
    replacedBy: uuid('replaced_by'),
    // Device metadata captured at issue/rotation (for the sessions list).
    userAgent: text('user_agent'),
    ip: text('ip'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
