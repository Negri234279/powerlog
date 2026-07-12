import { pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'

/**
 * `coach_athlete_notes` — a coach's PRIVATE free-text note about one athlete.
 * `coach_id`/`athlete_id` are soft references to auth users (no cross-module FK).
 * One note per (coach, athlete) pair — the composite primary key makes it an
 * upsert. Only the authoring coach can ever read or write their note.
 */
export const coachAthleteNotes = pgTable(
    'coach_athlete_notes',
    {
        coachId: uuid('coach_id').notNull(),
        athleteId: uuid('athlete_id').notNull(),
        body: text('body').notNull(),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [primaryKey({ columns: [table.coachId, table.athleteId] })],
)
