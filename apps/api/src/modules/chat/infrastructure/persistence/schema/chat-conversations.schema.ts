import { pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core'

/**
 * `chat_conversations` — one thread per coach↔athlete pair. `coach_id`/
 * `athlete_id` are SOFT references to the auth `users` (no cross-module FK). The
 * pair is unique, so creation is idempotent (the link-established handler and the
 * migration backfill both rely on it). The row is created once and survives an
 * unlink — the same pair always maps to the same conversation.
 */
export const chatConversations = pgTable(
    'chat_conversations',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        coachId: uuid('coach_id').notNull(),
        athleteId: uuid('athlete_id').notNull(),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [unique('chat_conversation_pair_unique').on(t.coachId, t.athleteId)],
)
