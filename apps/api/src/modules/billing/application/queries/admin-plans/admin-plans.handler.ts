import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import type { PlanAudience } from '../../../../../shared/contracts/entitlements'
import type { PlanPublicView } from '../../../domain/value-objects/plan-entitlements'
import type { IntroPhase, PlanOfferEntity } from '../../../domain/entities/plan-offer.entity'
import type { PlanStatus } from '../../../domain/entities/plan.entity'
import type { Currency, PlanInterval } from '../../../domain/plan-interval'
import { PlanOfferRepository } from '../../../domain/repositories/plan-offer.repository'
import { PlanPriceRepository } from '../../../domain/repositories/plan-price.repository'
import { PlanRepository } from '../../../domain/repositories/plan.repository'
import {
    type PlanTranslation,
    PlanTranslationRepository,
} from '../../../domain/repositories/plan-translation.repository'
import { AdminPlansQuery } from './admin-plans.query'

export interface AdminPlanPriceView {
    id: string
    interval: PlanInterval
    currency: Currency
    amountCents: number
    active: boolean
    stripePriceId: string | null
    paypalPlanId: string | null
}

export interface AdminPlanOfferView {
    id: string
    name: string
    message: string | null
    trialDays: number | null
    introPhase: IntroPhase | null
    startsAt: Date
    endsAt: Date | null
    stripeCouponId: string | null
}

/** The plan's entitlements flattened for display, labelled with its slug/audience. */
export interface AdminPlanSnapshotView extends PlanPublicView {
    plan: string
    audience: PlanAudience
}

export interface AdminPlanView {
    id: string
    audience: PlanAudience
    slug: string
    name: string
    description: string | null
    status: PlanStatus
    isFree: boolean
    sortOrder: number
    /** The raw jsonb the admin form edits. */
    entitlements: unknown
    /** The same entitlements collapsed — what a subscriber would actually get. */
    snapshot: AdminPlanSnapshotView
    /** Every version, active or withdrawn: the price history is part of the plan. */
    prices: AdminPlanPriceView[]
    /** The live offer, if the plan has one. */
    offer: AdminPlanOfferView | null
    /** Localized name/description per non-default locale — what the form edits. */
    translations: PlanTranslation[]
    /** Null until an admin publishes the plan to that gateway. */
    stripeProductId: string | null
    paypalProductId: string | null
    createdAt: Date
    updatedAt: Date
}

@QueryHandler(AdminPlansQuery)
export class AdminPlansHandler implements IQueryHandler<AdminPlansQuery, AdminPlanView[]> {
    constructor(
        private readonly plans: PlanRepository,
        private readonly prices: PlanPriceRepository,
        private readonly offers: PlanOfferRepository,
        private readonly translations: PlanTranslationRepository,
    ) {}

    async execute(query: AdminPlansQuery): Promise<AdminPlanView[]> {
        const plans = await this.plans.findAll(query.audience)
        const planIds = plans.map((plan) => plan.id)
        // One query for every price (and offer, and translation) of the page.
        const prices = await this.prices.findByPlans(planIds)
        const offers = await this.offers.findActiveByPlans(planIds)
        const translations = await this.translations.findByPlans(planIds)

        return plans.map((plan) => ({
            id: plan.id,
            audience: plan.audience,
            slug: plan.slug,
            name: plan.name,
            description: plan.description,
            status: plan.status,
            isFree: plan.isFree,
            sortOrder: plan.sortOrder,
            entitlements: plan.entitlements.value,
            snapshot: { plan: plan.slug, audience: plan.audience, ...plan.entitlements.publicView() },
            prices: prices
                .filter((price) => price.planId === plan.id)
                .map((price) => ({
                    id: price.id,
                    interval: price.interval,
                    currency: price.currency,
                    amountCents: price.amountCents,
                    active: price.active,
                    stripePriceId: price.stripePriceId,
                    paypalPlanId: price.paypalPlanId,
                })),
            offer: offerViewOf(offers.find((offer) => offer.planId === plan.id)),
            translations: translations
                .filter((translation) => translation.planId === plan.id)
                .map((translation) => ({
                    locale: translation.locale,
                    name: translation.name,
                    description: translation.description,
                })),
            stripeProductId: plan.stripeProductId,
            paypalProductId: plan.paypalProductId,
            createdAt: plan.createdAt,
            updatedAt: plan.updatedAt,
        }))
    }
}

function offerViewOf(offer: PlanOfferEntity | undefined): AdminPlanOfferView | null {
    if (!offer) return null

    return {
        id: offer.id,
        name: offer.name,
        message: offer.message,
        trialDays: offer.trialDays,
        introPhase: offer.introPhase,
        startsAt: offer.startsAt,
        endsAt: offer.endsAt,
        stripeCouponId: offer.stripeCouponId,
    }
}
