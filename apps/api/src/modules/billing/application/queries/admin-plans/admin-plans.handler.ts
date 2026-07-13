import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import type { EntitlementsSnapshot, PlanAudience } from '../../../../../shared/contracts/entitlements'
import type { PlanStatus } from '../../../domain/entities/plan.entity'
import type { Currency, PlanInterval } from '../../../domain/plan-interval'
import { PlanPriceRepository } from '../../../domain/repositories/plan-price.repository'
import { PlanRepository } from '../../../domain/repositories/plan.repository'
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
    snapshot: EntitlementsSnapshot
    /** Every version, active or withdrawn: the price history is part of the plan. */
    prices: AdminPlanPriceView[]
    createdAt: Date
    updatedAt: Date
}

@QueryHandler(AdminPlansQuery)
export class AdminPlansHandler implements IQueryHandler<AdminPlansQuery, AdminPlanView[]> {
    constructor(
        private readonly plans: PlanRepository,
        private readonly prices: PlanPriceRepository,
    ) {}

    async execute(query: AdminPlansQuery): Promise<AdminPlanView[]> {
        const plans = await this.plans.findAll(query.audience)
        // One query for every price of the page, not one per plan.
        const prices = await this.prices.findByPlans(plans.map((plan) => plan.id))

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
            snapshot: plan.entitlements.toSnapshot(plan.slug),
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
            createdAt: plan.createdAt,
            updatedAt: plan.updatedAt,
        }))
    }
}
