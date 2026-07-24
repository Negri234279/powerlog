/**
 * Cross-module read contract: lets auth show an admin everything billing knows
 * about one user — their subscriptions and the recurring revenue they represent —
 * without importing the billing module. Billing provides the implementation and
 * dispatches over the QueryBus (the {@link ProfileSnapshotReader} pattern).
 *
 * The gateway/status/interval/currency fields are plain strings here on purpose:
 * their unions are billing-domain types, and the shared kernel must not depend on
 * a module. The presentation layer surfaces them as strings anyway.
 */

/** One of the user's subscriptions, active or historical (newest first). */
export interface UserSubscriptionSummary {
    id: string
    planId: string
    planSlug: string
    planName: string
    /** stripe | paypal | manual. */
    gateway: string
    status: string
    /** Null for a manual grant: nothing is charged, so there is no price. */
    amountCents: number | null
    currency: string | null
    interval: string | null
    currentPeriodStart: Date
    currentPeriodEnd: Date
    cancelAtPeriodEnd: boolean
    createdAt: Date
}

export interface UserBillingSummary {
    subscriptions: UserSubscriptionSummary[]
    /**
     * Monthly-normalised sum of the subscriptions that are entitling right now and
     * actually priced — a yearly plan spread over twelve months. Manual grants add
     * nothing (no price); a trial counts at its post-trial price.
     */
    mrrCents: number
    /** Currency of the MRR figure; null when nothing is being charged. */
    currency: string | null
}

export abstract class UserBillingReader {
    abstract read(userId: string): Promise<UserBillingSummary>
}
