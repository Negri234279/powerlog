import type { PaymentGateway } from '../../domain/entities/subscription.entity'
import type { Currency, PlanInterval } from '../../domain/plan-interval'
import type { SubscriptionStatus } from '../../domain/subscription-status'

/**
 * Filters of the admin subscription list. All optional, all AND-ed.
 *
 * There is no free-text filter here: the subscriber's email lives in auth, which
 * billing may not join to. The handler resolves the admin's search term to a
 * `userId` through the `UserDirectory` first — so a search is an exact email or
 * handle, and the SQL stays inside this module's tables.
 */
export interface AdminSubscriptionFilter {
    status?: SubscriptionStatus
    gateway?: PaymentGateway
    /** Plan id, not slug: the row points at an id. */
    planId?: string
    userId?: string
}

/** One row as billing knows it — who the user IS gets added by the handler. */
export interface AdminSubscriptionRow {
    id: string
    userId: string
    planId: string
    planSlug: string
    planName: string
    gateway: PaymentGateway
    status: SubscriptionStatus
    /** Null for a manual grant: nobody is being charged, so there is no price. */
    amountCents: number | null
    currency: Currency | null
    interval: PlanInterval | null
    currentPeriodStart: Date
    currentPeriodEnd: Date
    cancelAtPeriodEnd: boolean
    createdAt: Date
}

export interface AdminSubscriptionPage {
    rows: AdminSubscriptionRow[]
    total: number
}

export abstract class AdminSubscriptionReadModel {
    abstract list(
        filter: AdminSubscriptionFilter,
        page: { limit: number; offset: number },
    ): Promise<AdminSubscriptionPage>
}
