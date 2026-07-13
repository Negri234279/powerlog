import { ENTITLING_STATUSES, type SubscriptionStatus } from '../subscription-status'

/** Where the subscription is billed. `manual` = granted by an admin (comp, support). */
export type PaymentGateway = 'stripe' | 'paypal' | 'manual'

export interface SubscriptionProps {
    id: string
    /** Soft reference to the auth user (no DB FK across modules). */
    userId: string
    planId: string
    /** The price version it was signed on. Null for `manual` grants. */
    planPriceId: string | null
    gateway: PaymentGateway
    gatewayCustomerId: string | null
    gatewaySubscriptionId: string | null
    status: SubscriptionStatus
    currentPeriodStart: Date
    currentPeriodEnd: Date
    /** It will not renew; the user keeps the plan until `currentPeriodEnd`. */
    cancelAtPeriodEnd: boolean
    canceledAt: Date | null
    /** A downgrade that has been paid for but not yet applied — it lands on renewal. */
    pendingPlanPriceId: string | null
    createdAt: Date
    updatedAt: Date
}

/**
 * `SubscriptionAggregate` — the local projection of what the gateway is billing.
 * The gateway owns the money; this owns the answer to "what may this user do".
 * No domain events yet (the webhook pipeline in 9.3 adds them), so it does not
 * extend `AggregateRoot`.
 *
 * At most one *live* subscription per user is enforced by a partial unique index
 * in Postgres — a statement about the table, not about one row.
 */
export class SubscriptionAggregate {
    private constructor(private readonly props: SubscriptionProps) {}

    static create(input: {
        id: string
        userId: string
        planId: string
        planPriceId?: string | null
        gateway: PaymentGateway
        gatewayCustomerId?: string | null
        gatewaySubscriptionId?: string | null
        status: SubscriptionStatus
        currentPeriodStart: Date
        currentPeriodEnd: Date
        now: Date
    }): SubscriptionAggregate {
        return new SubscriptionAggregate({
            id: input.id,
            userId: input.userId,
            planId: input.planId,
            planPriceId: input.planPriceId ?? null,
            gateway: input.gateway,
            gatewayCustomerId: input.gatewayCustomerId ?? null,
            gatewaySubscriptionId: input.gatewaySubscriptionId ?? null,
            status: input.status,
            currentPeriodStart: input.currentPeriodStart,
            currentPeriodEnd: input.currentPeriodEnd,
            cancelAtPeriodEnd: false,
            canceledAt: null,
            pendingPlanPriceId: null,
            createdAt: input.now,
            updatedAt: input.now,
        })
    }

    /** Reconstruct from persistence. */
    static rehydrate(props: SubscriptionProps): SubscriptionAggregate {
        return new SubscriptionAggregate(props)
    }

    /**
     * Bring the local projection in line with what the gateway just told us.
     *
     * **This is the only way a gateway-billed subscription changes.** Cancelling,
     * resuming and switching plan all go out to the provider and come back as a
     * webhook, so the app converges on the same state whether the change was made
     * in our UI or in Stripe's own portal — and a webhook we missed is repaired by
     * the next one, instead of leaving two versions of the truth.
     */
    syncFromGateway(
        input: {
            status: SubscriptionStatus
            currentPeriodStart: Date
            currentPeriodEnd: Date
            cancelAtPeriodEnd: boolean
            canceledAt?: Date | null
            /** Set when the gateway reports a different price (a plan change landed). */
            planId?: string
            planPriceId?: string | null
        },
        now: Date,
    ): void {
        this.props.status = input.status
        this.props.currentPeriodStart = input.currentPeriodStart
        this.props.currentPeriodEnd = input.currentPeriodEnd
        this.props.cancelAtPeriodEnd = input.cancelAtPeriodEnd
        this.props.canceledAt = input.canceledAt ?? this.props.canceledAt

        if (input.planId) this.props.planId = input.planId
        if (input.planPriceId !== undefined) this.props.planPriceId = input.planPriceId

        // The gateway applied the plan change, so there is nothing pending any more.
        if (input.planPriceId && input.planPriceId === this.props.pendingPlanPriceId) {
            this.props.pendingPlanPriceId = null
        }

        this.props.updatedAt = now
    }

    /** A downgrade that is paid for but not yet applied; it lands on renewal. */
    schedulePlanChange(planPriceId: string, now: Date): void {
        this.props.pendingPlanPriceId = planPriceId
        this.props.updatedAt = now
    }

    /**
     * End it now, with no grace period. Only admins revoking a `manual` grant get
     * here: a gateway-billed subscription is cancelled at the gateway, comes back
     * as `canceled` through the webhook, and keeps the time it paid for.
     */
    expire(now: Date): void {
        this.props.status = 'expired'
        this.props.canceledAt ??= now
        this.props.currentPeriodEnd = now
        this.props.updatedAt = now
    }

    /**
     * Does this subscription grant its plan's entitlements at `now`?
     *
     * `trialing | active | past_due` do outright. `canceled` does too **while the
     * period it already paid for is still running** — cancelling (here or in the
     * gateway's own portal) never takes back time the user bought. Anything else
     * (`incomplete`, `expired`, a canceled period that has elapsed) does not, and
     * the user falls back to the free plan.
     */
    isEntitledAt(now: Date): boolean {
        if (ENTITLING_STATUSES.includes(this.props.status)) return true

        return this.props.status === 'canceled' && now < this.props.currentPeriodEnd
    }

    get id(): string {
        return this.props.id
    }
    get userId(): string {
        return this.props.userId
    }
    get planId(): string {
        return this.props.planId
    }
    get planPriceId(): string | null {
        return this.props.planPriceId
    }
    get gateway(): PaymentGateway {
        return this.props.gateway
    }
    get gatewayCustomerId(): string | null {
        return this.props.gatewayCustomerId
    }
    get gatewaySubscriptionId(): string | null {
        return this.props.gatewaySubscriptionId
    }
    get status(): SubscriptionStatus {
        return this.props.status
    }
    get currentPeriodStart(): Date {
        return this.props.currentPeriodStart
    }
    get currentPeriodEnd(): Date {
        return this.props.currentPeriodEnd
    }
    get cancelAtPeriodEnd(): boolean {
        return this.props.cancelAtPeriodEnd
    }
    get canceledAt(): Date | null {
        return this.props.canceledAt
    }
    get pendingPlanPriceId(): string | null {
        return this.props.pendingPlanPriceId
    }
    get createdAt(): Date {
        return this.props.createdAt
    }
    get updatedAt(): Date {
        return this.props.updatedAt
    }
}
