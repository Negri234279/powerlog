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

/** Slugs are unique across the catalog: they are the plan's public identity. */
export class PlanSlugTakenError extends BillingError {
    readonly code = 'PLAN_SLUG_TAKEN'

    constructor() {
        super('Another plan already uses that slug.')
    }
}

/**
 * Refusing to take the last active free plan of an audience out of service.
 * Without it, every user of that audience without a subscription — most of them —
 * could not be told what they may do at all.
 */
export class LastFreePlanError extends BillingError {
    readonly code = 'LAST_FREE_PLAN'

    constructor(readonly audience: PlanAudience) {
        super(`The ${audience} catalog would be left with no free plan.`)
    }
}

/** An audience already has its free plan; there can only be one active. */
export class FreePlanExistsError extends BillingError {
    readonly code = 'FREE_PLAN_EXISTS'

    constructor(readonly audience: PlanAudience) {
        super(`The ${audience} catalog already has an active free plan.`)
    }
}

/** A price amount that would not charge anything (free is a plan flag, not a 0 price). */
export class InvalidPlanPriceError extends BillingError {
    readonly code = 'INVALID_PLAN_PRICE'

    constructor(detail: string) {
        super(detail)
    }
}

export class PlanPriceNotFoundError extends BillingError {
    readonly code = 'PLAN_PRICE_NOT_FOUND'

    constructor() {
        super('Price not found.')
    }
}

/** The plan is not open for signups (draft or archived). */
export class PlanNotAvailableError extends BillingError {
    readonly code = 'PLAN_NOT_AVAILABLE'

    constructor() {
        super('That plan is not available.')
    }
}

/**
 * The plan belongs to a catalog the user isn't in — an athlete on a coach plan,
 * or the reverse. Refused rather than sold: the plan would resolve entitlements
 * fine, but every coach-gated surface reads the ROLE, so the buyer would pay for
 * features that stay locked.
 *
 * Not a promotion in disguise, deliberately: becoming a coach is free and one
 * click (`becomeCoach`), and it re-issues the session so the role lands in the
 * JWT the guards read. Paying must never be what changes who you are.
 *
 * Carries both sides so the web can offer that click instead of a dead end.
 */
export class PlanAudienceMismatchError extends BillingError {
    readonly code = 'PLAN_AUDIENCE_MISMATCH'

    constructor(
        readonly audience: PlanAudience,
        readonly role: string,
    ) {
        super(`This plan is for the ${audience} catalog; the user is a ${role}.`)
    }

    override get details(): Record<string, unknown> {
        return {
            audience: this.audience,
            role: this.role,
        }
    }
}

/** The user already has a live subscription; end it before granting another. */
export class SubscriptionAlreadyActiveError extends BillingError {
    readonly code = 'SUBSCRIPTION_ALREADY_ACTIVE'

    constructor() {
        super('This user already has an active subscription.')
    }
}

export class SubscriptionNotFoundError extends BillingError {
    readonly code = 'SUBSCRIPTION_NOT_FOUND'

    constructor() {
        super('Subscription not found.')
    }
}

/**
 * Only a `manual` grant can be revoked from here. A subscription billed by a
 * gateway must be ended at the gateway — killing the local row would leave the
 * user's card being charged for something they no longer have.
 */
export class NotAManualSubscriptionError extends BillingError {
    readonly code = 'NOT_A_MANUAL_SUBSCRIPTION'

    constructor() {
        super('This subscription is billed by a payment gateway; end it there.')
    }
}

/** An offer that would promise nothing, or promise the impossible. */
export class InvalidPlanOfferError extends BillingError {
    readonly code = 'INVALID_PLAN_OFFER'

    constructor(detail: string) {
        super(detail)
    }
}

export class PlanOfferNotFoundError extends BillingError {
    readonly code = 'PLAN_OFFER_NOT_FOUND'

    constructor() {
        super('Offer not found.')
    }
}

/** The offer is over, not started, or belongs to another plan. */
export class OfferNotRedeemableError extends BillingError {
    readonly code = 'OFFER_NOT_REDEEMABLE'

    constructor() {
        super('That offer is no longer available.')
    }
}

/**
 * The gateway asked for has no keys in this environment. Not a bug: with no
 * `STRIPE_SECRET_KEY` the app runs perfectly well in free/manual mode — it just
 * cannot take money.
 */
export class GatewayNotConfiguredError extends BillingError {
    readonly code = 'GATEWAY_NOT_CONFIGURED'

    constructor(readonly gateway: string) {
        super(`Payments through ${gateway} are not available right now.`)
    }
}

/** The catalog could not be pushed to the gateway (its API said no). */
export class PlanSyncFailedError extends BillingError {
    readonly code = 'PLAN_SYNC_FAILED'

    constructor(
        readonly gateway: string,
        detail: string,
    ) {
        super(`Could not sync the plan to ${gateway}: ${detail}`)
    }
}

/** The plan/price the user is trying to buy has never been pushed to the gateway. */
export class PriceNotSyncedError extends BillingError {
    readonly code = 'PRICE_NOT_SYNCED'

    constructor() {
        super('That price is not on sale yet. Try again in a moment.')
    }
}

/** The user has nothing to cancel, resume or change: they are on the free plan. */
export class NoActiveSubscriptionError extends BillingError {
    readonly code = 'NO_ACTIVE_SUBSCRIPTION'

    constructor() {
        super('You do not have an active subscription.')
    }
}

/**
 * A manual grant is not the user's to manage: an admin gave it and an admin takes
 * it away. There is no gateway to ask.
 */
export class NotAGatewaySubscriptionError extends BillingError {
    readonly code = 'NOT_A_GATEWAY_SUBSCRIPTION'

    constructor() {
        super('This subscription was granted by an admin; there is nothing to manage here.')
    }
}

/** Changing to the plan they are already on. */
export class SamePlanError extends BillingError {
    readonly code = 'SAME_PLAN'

    constructor() {
        super('You are already on that plan.')
    }
}

/**
 * The provider cannot undo a cancellation (PayPal's is terminal). The UI reads
 * `supportsResume` and never offers the button, so this only fires if somebody
 * calls the API directly.
 */
export class ResumeNotSupportedError extends BillingError {
    readonly code = 'RESUME_NOT_SUPPORTED'

    constructor(readonly gateway: string) {
        super(`${gateway} cannot undo a cancellation. Subscribe again to come back.`)
    }
}

export class WebhookEventNotFoundError extends BillingError {
    readonly code = 'WEBHOOK_EVENT_NOT_FOUND'

    constructor() {
        super('Webhook event not found.')
    }
}

/** A gateway call failed (network, API error). Distinct from "not configured". */
export class GatewayRequestFailedError extends BillingError {
    readonly code = 'GATEWAY_REQUEST_FAILED'

    constructor(
        readonly gateway: string,
        detail: string,
    ) {
        super(`The payment provider could not complete the request: ${detail}`)
    }
}
