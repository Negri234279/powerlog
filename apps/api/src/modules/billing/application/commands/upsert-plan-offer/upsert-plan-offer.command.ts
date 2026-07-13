import type { IntroPhase } from '../../../domain/entities/plan-offer.entity'

/**
 * Publish an offer on a plan. It **replaces** whatever offer the plan had live:
 * an offer's terms are immutable (its coupon is immutable at the gateway too), so
 * changing them means retiring one offer and starting another.
 */
export class UpsertPlanOfferCommand {
    constructor(
        readonly planId: string,
        readonly name: string,
        readonly trialDays: number | null,
        readonly introPhase: IntroPhase | null,
        readonly startsAt: Date,
        readonly endsAt: Date | null,
    ) {}
}
