import { InvalidPlanPriceError } from '../errors/billing.errors'
import { type Currency, type PlanInterval, monthlyAmountCents } from '../plan-interval'

export interface PlanPriceProps {
    id: string
    planId: string
    interval: PlanInterval
    currency: Currency
    amountCents: number
    active: boolean
    stripePriceId: string | null
    paypalPlanId: string | null
    createdAt: Date
    updatedAt: Date
}

/**
 * `PlanPriceEntity` — an **immutable price version** of a plan. Plain entity, not
 * an aggregate root: it exists inside a plan.
 *
 * The amount never changes. Repricing deactivates this row and inserts another,
 * so the subscriptions signed on this version keep pointing at it and a price
 * change cannot silently re-bill anyone. That is the deliberate opposite of the
 * plan's entitlements, which ARE read live (see `PlanAggregate`).
 *
 * `deactivate` is therefore the only mutation, and it is one-way: a withdrawn
 * price is not put back on sale, a new version is.
 */
export class PlanPriceEntity {
    private constructor(private readonly props: PlanPriceProps) {}

    static create(input: {
        id: string
        planId: string
        interval: PlanInterval
        currency: Currency
        amountCents: number
        now: Date
    }): PlanPriceEntity {
        // A free plan is modelled by `isFree` on the plan (no subscription at all),
        // never by a 0-cent price — so a priced row must actually charge something.
        if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
            throw new InvalidPlanPriceError('The amount must be a positive whole number of cents.')
        }

        return new PlanPriceEntity({
            id: input.id,
            planId: input.planId,
            interval: input.interval,
            currency: input.currency,
            amountCents: input.amountCents,
            active: true,
            stripePriceId: null,
            paypalPlanId: null,
            createdAt: input.now,
            updatedAt: input.now,
        })
    }

    static rehydrate(props: PlanPriceProps): PlanPriceEntity {
        return new PlanPriceEntity(props)
    }

    /** Record the provider-side price this version was published as. */
    syncedToStripe(priceId: string, now: Date): void {
        this.props.stripePriceId = priceId
        this.props.updatedAt = now
    }

    /** Withdraw from sale. Live subscriptions on it are untouched — they paid for it. */
    deactivate(now: Date): void {
        this.props.active = false
        this.props.updatedAt = now
    }

    /** What this price contributes to MRR (its amount spread over its months). */
    monthlyAmountCents(): number {
        return monthlyAmountCents(this.props.amountCents, this.props.interval)
    }

    get id(): string {
        return this.props.id
    }
    get planId(): string {
        return this.props.planId
    }
    get interval(): PlanInterval {
        return this.props.interval
    }
    get currency(): Currency {
        return this.props.currency
    }
    get amountCents(): number {
        return this.props.amountCents
    }
    get active(): boolean {
        return this.props.active
    }
    get stripePriceId(): string | null {
        return this.props.stripePriceId
    }
    get paypalPlanId(): string | null {
        return this.props.paypalPlanId
    }
    get createdAt(): Date {
        return this.props.createdAt
    }
    get updatedAt(): Date {
        return this.props.updatedAt
    }
}
