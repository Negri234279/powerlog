import { pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core'

/**
 * `coach_athlete` — the m2m link created when an athlete accepts an invitation.
 * `coach_id`/`athlete_id` are SOFT references to the auth `users` (no
 * cross-module FK). The (coach, athlete) pair is unique, so linking is idempotent.
 */
export const coachAthlete = pgTable(
    'coach_athlete',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        coachId: uuid('coach_id').notNull(),
        athleteId: uuid('athlete_id').notNull(),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [unique('coach_athlete_pair_unique').on(t.coachId, t.athleteId)],
)
