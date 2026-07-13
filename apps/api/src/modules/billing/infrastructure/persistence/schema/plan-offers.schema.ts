import { sql } from 'drizzle-orm'
import { boolean, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

import type { IntroPhase } from '../../../domain/entities/plan-offer.entity'
import { plans } from './plans.schema'

/**
 * `plan_offers` — an introductory offer on a plan: free days, a discounted opening
 * phase, or both.
 *
 * It applies **only to new signups**, and it is implemented with the gateway's own
 * mechanisms (Stripe: a trial on the checkout session plus a repeating coupon), so
 * when it runs out **the gateway starts charging full price by itself**. Nothing
 * here has to remember to end it — which is the whole reason not to model an offer
 * as a second price.
 *
 * `intro_phase` is jsonb because it is one small closed shape read whole, and
 * because a second offer mechanism later (a fixed-amount phase, say) should not
 * cost a migration.
 */
export const planOffers = pgTable(
    'plan_offers',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        planId: uuid('plan_id')
            .notNull()
            .references(() => plans.id, { onDelete: 'cascade' }),
        name: text('name').notNull(),
        /** Free days before the first charge (the card is still taken up front). */
        trialDays: integer('trial_days'),
        introPhase: jsonb('intro_phase').$type<IntroPhase>(),
        startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
        /** Null = open-ended. */
        endsAt: timestamp('ends_at', { withTimezone: true }),
        active: boolean('active').notNull().default(true),
        stripeCouponId: text('stripe_coupon_id'),
        // PayPal has no coupons: an offer's trial and intro cycles are part of the
        // BILLING PLAN itself. So an offer needs its own PayPal plan per price —
        // this maps our price id to it.
        paypalPlanIds: jsonb('paypal_plan_ids').$type<Record<string, string>>(),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        // One live offer per plan: two at once would raise "which one does a new
        // signup get?", and the answer would be arbitrary.
        uniqueIndex('plan_offers_one_active_per_plan')
            .on(table.planId)
            .where(sql`${table.active}`),
    ],
)
