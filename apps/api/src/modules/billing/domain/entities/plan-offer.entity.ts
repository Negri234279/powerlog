import { InvalidPlanOfferError } from '../errors/billing.errors'

/**
 * A cheaper opening phase: N cycles at a discount before the plan's real price
 * kicks in ("3 months at half price, then the full 9,99 €").
 *
 * It is a **percentage**, not an amount — the plan doc said cents, but a plan has
 * four prices (EUR/USD × month/year) and a fixed number of cents cannot mean the
 * same thing against all of them. A percentage does, and it maps to a single
 * gateway discount instead of one per currency.
 */
export interface IntroPhase {
    /** How many billing cycles it lasts. */
    cycles: number
    /** How much is taken off each of those cycles (1–100). */
    percentOff: number
}

export interface PlanOfferProps {
    id: string
    planId: string
    name: string
    /** Free days before the first charge. The payment method is still taken up front. */
    trialDays: number | null
    introPhase: IntroPhase | null
    startsAt: Date
    /** Null = open-ended. */
    endsAt: Date | null
    active: boolean
    /** The Stripe coupon that implements the intro phase (filled by the catalog sync). */
    stripeCouponId: string | null
    /**
     * PayPal has no coupons: an offer's trial and intro cycles are part of the
     * billing plan itself, so the offer needs its OWN PayPal plan per price. Maps
     * our price id → that plan.
     */
    paypalPlanIds: Record<string, string> | null
    createdAt: Date
    updatedAt: Date
}

/**
 * `PlanOfferEntity` — an introductory offer attached to a plan.
 *
 * It only ever applies to **new signups**: an offer is a reason to start paying,
 * not a discount on what someone already pays. It is not modelled as a price
 * either — the plan's real price is what the subscription is signed on, and the
 * offer is expressed with the gateway's own mechanisms (Stripe: a trial plus a
 * repeating coupon), so **when the offer runs out the gateway charges the full
 * price on its own**. Nothing in this app has to remember to end it.
 */
export class PlanOfferEntity {
    private constructor(private readonly props: PlanOfferProps) {}

    static create(input: {
        id: string
        planId: string
        name: string
        trialDays?: number | null
        introPhase?: IntroPhase | null
        startsAt: Date
        endsAt?: Date | null
        now: Date
    }): PlanOfferEntity {
        const trialDays = input.trialDays ?? null
        const introPhase = input.introPhase ?? null

        // An offer that offers nothing is a mistake, not a no-op: it would show up
        // in the pricing page promising something and change nothing at checkout.
        if (trialDays === null && introPhase === null) {
            throw new InvalidPlanOfferError('An offer needs a trial, an intro phase, or both.')
        }
        if (trialDays !== null && (!Number.isInteger(trialDays) || trialDays < 1 || trialDays > 365)) {
            throw new InvalidPlanOfferError('A trial lasts between 1 and 365 days.')
        }
        if (introPhase && (!Number.isInteger(introPhase.cycles) || introPhase.cycles < 1 || introPhase.cycles > 36)) {
            throw new InvalidPlanOfferError('An intro phase lasts between 1 and 36 cycles.')
        }
        if (introPhase && (introPhase.percentOff <= 0 || introPhase.percentOff > 100)) {
            throw new InvalidPlanOfferError('An intro discount is between 1% and 100%.')
        }
        if (input.endsAt && input.endsAt <= input.startsAt) {
            throw new InvalidPlanOfferError('An offer cannot end before it starts.')
        }

        return new PlanOfferEntity({
            id: input.id,
            planId: input.planId,
            name: input.name.trim(),
            trialDays,
            introPhase,
            startsAt: input.startsAt,
            endsAt: input.endsAt ?? null,
            active: true,
            stripeCouponId: null,
            paypalPlanIds: null,
            createdAt: input.now,
            updatedAt: input.now,
        })
    }

    static rehydrate(props: PlanOfferProps): PlanOfferEntity {
        return new PlanOfferEntity(props)
    }

    /** Is this offer redeemable right now? Checked at checkout, never after. */
    isRedeemableAt(now: Date): boolean {
        if (!this.props.active) return false
        if (now < this.props.startsAt) return false

        return this.props.endsAt === null || now < this.props.endsAt
    }

    /** Record the Stripe coupon that implements the intro phase. */
    syncedToStripe(couponId: string | null, now: Date): void {
        this.props.stripeCouponId = couponId
        this.props.updatedAt = now
    }

    /** Record the PayPal plans (one per price) that carry the trial + intro cycles. */
    syncedToPaypal(planIds: Record<string, string>, now: Date): void {
        this.props.paypalPlanIds = { ...this.props.paypalPlanIds, ...planIds }
        this.props.updatedAt = now
    }

    /** What a checkout on this offer must point at, on a given gateway. */
    paypalPlanFor(priceId: string): string | null {
        return this.props.paypalPlanIds?.[priceId] ?? null
    }

    deactivate(now: Date): void {
        this.props.active = false
        this.props.updatedAt = now
    }

    get id(): string {
        return this.props.id
    }
    get planId(): string {
        return this.props.planId
    }
    get name(): string {
        return this.props.name
    }
    get trialDays(): number | null {
        return this.props.trialDays
    }
    get introPhase(): IntroPhase | null {
        return this.props.introPhase
    }
    get startsAt(): Date {
        return this.props.startsAt
    }
    get endsAt(): Date | null {
        return this.props.endsAt
    }
    get active(): boolean {
        return this.props.active
    }
    get stripeCouponId(): string | null {
        return this.props.stripeCouponId
    }
    get paypalPlanIds(): Record<string, string> | null {
        return this.props.paypalPlanIds
    }
    get createdAt(): Date {
        return this.props.createdAt
    }
    get updatedAt(): Date {
        return this.props.updatedAt
    }
}
