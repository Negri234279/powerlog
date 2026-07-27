import { pgTable, timestamp, uuid } from 'drizzle-orm/pg-core'

/**
 * `user_presence` — the durable "last seen" per user. `user_id` is a SOFT
 * reference to the auth `users` (no cross-module FK). Lives in the transversal
 * presence module, NOT in `users`, so `auth` never has to know about presence —
 * the admin read-model reads it through the `PresenceReader` port instead. A row
 * appears the first time a user opens the realtime socket; whether they are
 * online *right now* is live state (see `OnlineRegistry`), not this table.
 */
export const userPresence = pgTable('user_presence', {
    userId: uuid('user_id').primaryKey(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull(),
})
