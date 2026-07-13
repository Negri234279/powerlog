import type { PlanAudience } from '../../../../shared/contracts/entitlements'
import type { PaymentGateway } from '../../domain/entities/subscription.entity'
import type { Currency } from '../../domain/plan-interval'
import type { SubscriptionStatus } from '../../domain/subscription-status'

/** Live subscriptions split by where they are and where they are billed. */
export interface SubscriptionsByStatus {
    status: SubscriptionStatus
    gateway: PaymentGateway
    count: number
}

/** Which plans of the catalog actually sell, and which are dead. */
export interface SubscriptionsByPlan {
    plan: string
    audience: PlanAudience
    count: number
}

/** Recurring revenue, normalised to a month (a yearly plan is not 12× a monthly one). */
export interface MrrByPlan {
    plan: string
    currency: Currency
    /** Sum of the monthly-normalised amounts of the paying subscriptions. */
    amountCents: number
}

/**
 * The one read model behind both the admin billing panel and the Prometheus state
 * gauges — the coaching pattern. Two queries would drift, and the number on the
 * dashboard and the number in Grafana disagreeing is worse than either being late.
 */
export interface AdminBillingStats {
    byStatus: SubscriptionsByStatus[]
    byPlan: SubscriptionsByPlan[]
    mrr: MrrByPlan[]
    /** Entitling right now (`trialing | active | past_due`). */
    activeSubscriptions: number
    trialing: number
    pastDue: number
    /** Cancelled but still inside the period they paid for: churn already decided
     *  but not yet visible in the numbers. */
    canceling: number
}

export abstract class AdminBillingStatsReadModel {
    abstract read(): Promise<AdminBillingStats>
}
