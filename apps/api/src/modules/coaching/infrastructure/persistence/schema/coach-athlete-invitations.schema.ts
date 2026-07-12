import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { INVITATION_STATUSES } from '../../../domain/invitation-status'

/** Invitation status; values derive from the domain single source of truth. */
export const invitationStatusEnum = pgEnum('coach_invitation_status', INVITATION_STATUSES)

/**
 * `coach_athlete_invitations` — coach→athlete invitations. `coach_id`/`athlete_id`
 * are SOFT references to the auth `users` (no cross-module FK). `athlete_id` is
 * null while the invitee has no account yet (invited by `email`); it is filled in
 * and the invitation auto-accepted when they register with that email. A new
 * pending invitation per (coach, email) is guarded in the application layer
 * (terminal ones stay for history), so no DB uniqueness here.
 */
export const coachAthleteInvitations = pgTable(
    'coach_athlete_invitations',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        coachId: uuid('coach_id').notNull(),
        athleteId: uuid('athlete_id'),
        email: text('email').notNull(),
        // SHA-256 of the opaque signup-link token; null for older rows.
        tokenHash: text('token_hash'),
        status: invitationStatusEnum('status').notNull().default('pending'),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        index('coach_invitations_email_idx').on(table.email),
        index('coach_invitations_token_hash_idx').on(table.tokenHash),
    ],
)
