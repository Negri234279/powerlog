import type { PlanAudience } from '../../../../shared/contracts/entitlements'
import { DomainError } from '../../../../shared/domain/domain-error'

/**
 * Domain errors for the billing context. Each carries a stable `code` the global
 * exception filter maps to GraphQL/HTTP + metrics.
 *
 * The two errors users actually hit — `FEATURE_NOT_IN_PLAN` and
 * `PLAN_LIMIT_REACHED` — live with the `Entitlements` port in
 * `shared/contracts/entitlements.ts`: they are part of that contract, and the
 * adapter that throws them sits outside this module.
 */
export abstract class BillingError extends DomainError {}

/** The entitlements jsonb doesn't match the schema for its plan's audience. */
export class InvalidPlanEntitlementsError extends BillingError {
    readonly code = 'INVALID_PLAN_ENTITLEMENTS'

    constructor(
        readonly audience: PlanAudience,
        readonly detail: string,
    ) {
        super(`Invalid entitlements for a ${audience} plan: ${detail}`)
    }
}

/** A plan slug must be a stable, url-safe identifier (it labels metrics too). */
export class InvalidPlanSlugError extends BillingError {
    readonly code = 'INVALID_PLAN_SLUG'

    constructor() {
        super('A plan slug must be 3–40 lowercase letters, digits or hyphens.')
    }
}

/** A plan referenced by a subscription (or asked for by slug) is not there. */
export class PlanNotFoundError extends BillingError {
    readonly code = 'PLAN_NOT_FOUND'

    constructor() {
        super('Plan not found.')
    }
}

/**
 * No active free plan exists for an audience, so a user without a subscription
 * cannot be told what they may do. A misconfiguration, not a user error: the
 * seed migration ships one free plan per audience and archiving the last one is
 * refused.
 */
export class FreePlanMissingError extends BillingError {
    readonly code = 'FREE_PLAN_MISSING'

    constructor(readonly audience: PlanAudience) {
        super(`No active free plan for the ${audience} catalog.`)
    }
}
