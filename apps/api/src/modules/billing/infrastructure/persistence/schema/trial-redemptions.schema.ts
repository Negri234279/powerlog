import { pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

import { planAudienceEnum } from './plans.schema'

/**
 * `trial_redemptions` — the record that an account has already used its free trial.
 *
 * A trial is a reason to start paying, offered **once**: without this row a user
 * could trial, cancel, and sign up again for another free run every time. The
 * gateways do not enforce that on their own (Stripe has no "one trial per
 * customer"), so it is enforced here — the checkout reads this before deciding
 * whether to send the trial, and the webhook writes it the moment a trial actually
 * begins (`trialing`).
 *
 * `user_id` is a SOFT reference (no DB foreign key): a real FK would make this file
 * import the auth module's schema and cross a module boundary, like `subscriptions`.
 *
 * Keyed **per audience**: athlete and coach plans are independent subscriptions, so
 * each gets its own single trial. The unique index makes the webhook write
 * idempotent — the same trial reported twice cannot create a second row.
 */
export const trialRedemptions = pgTable(
    'trial_redemptions',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        userId: uuid('user_id').notNull(),
        audience: planAudienceEnum('audience').notNull(),
        redeemedAt: timestamp('redeemed_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [uniqueIndex('trial_redemptions_one_per_user_audience').on(table.userId, table.audience)],
)
