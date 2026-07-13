import type { PlanAudience } from '../../../../../shared/contracts/entitlements'
import { PlanAggregate, type PlanStatus } from '../../../domain/entities/plan.entity'
import type { plans } from '../schema/plans.schema'

type PlanRow = typeof plans.$inferSelect
type PlanInsert = typeof plans.$inferInsert

/**
 * Rehydration re-validates the `entitlements` jsonb against the audience's zod
 * schema, so a hand-edited or half-migrated row fails loudly here instead of
 * quietly granting (or denying) the wrong thing.
 */
export function toPlanAggregate(row: PlanRow): PlanAggregate {
    return PlanAggregate.rehydrate({
        id: row.id,
        audience: row.audience as PlanAudience,
        slug: row.slug,
        name: row.name,
        description: row.description,
        status: row.status as PlanStatus,
        isFree: row.isFree,
        sortOrder: row.sortOrder,
        entitlements: row.entitlements,
        stripeProductId: row.stripeProductId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    })
}

export function toPlanRow(plan: PlanAggregate): PlanInsert {
    return {
        id: plan.id,
        audience: plan.audience,
        slug: plan.slug,
        name: plan.name,
        description: plan.description,
        status: plan.status,
        isFree: plan.isFree,
        sortOrder: plan.sortOrder,
        // The VO's value is the validated jsonb — it went through zod on the way in.
        entitlements: plan.entitlements.value,
        stripeProductId: plan.stripeProductId,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
    }
}
