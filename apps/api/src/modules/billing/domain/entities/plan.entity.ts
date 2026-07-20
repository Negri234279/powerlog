import type { PlanAudience } from '../../../../shared/contracts/entitlements'
import type { PaymentGateway } from './subscription.entity'
import { InvalidPlanSlugError } from '../errors/billing.errors'
import { type PlanEntitlementsVO, planEntitlementsFor } from '../value-objects/plan-entitlements'

/** Catalog lifecycle: `draft` is invisible, `archived` takes no new signups. */
export type PlanStatus = 'draft' | 'active' | 'archived'

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const SLUG_MIN = 3
const SLUG_MAX = 40

export interface PlanProps {
    id: string
    audience: PlanAudience
    /** Stable public identifier (`athlete-pro`). Labels metrics, so it is bounded. */
    slug: string
    name: string
    description: string | null
    status: PlanStatus
    /** The fallback plan of its audience: no subscription row, no charge. */
    isFree: boolean
    sortOrder: number
    /** Editorial "recommended / most popular" flag — display only, not a grant. */
    highlighted: boolean
    entitlements: PlanEntitlementsVO
    /** The provider-side product this plan was published as. Null until synced. */
    stripeProductId: string | null
    paypalProductId: string | null
    createdAt: Date
    updatedAt: Date
}

/**
 * `PlanAggregate` — one plan of the catalog, and the root of its prices and
 * offers (which point back at it by id). No domain events yet, so it does not
 * extend `AggregateRoot`.
 *
 * Two invariants this class cannot hold on its own, and where they live instead:
 * only one active free plan per audience, and only one active price per
 * (plan, interval, currency) — both are partial unique indexes in Postgres,
 * because they are statements about the whole catalog, not about one row.
 *
 * Editing a live plan's entitlements is **retroactive by design**: subscribers
 * read their plan on every check, so granting a feature reaches them at once.
 * Prices are the opposite — immutable per version (see `PlanPriceEntity`).
 */
export class PlanAggregate {
    private constructor(private readonly props: PlanProps) {}

    static create(input: {
        id: string
        audience: PlanAudience
        slug: string
        name: string
        description?: string | null
        status?: PlanStatus
        isFree?: boolean
        sortOrder?: number
        highlighted?: boolean
        /** Raw entitlements; validated against the audience's schema. */
        entitlements: unknown
        now: Date
    }): PlanAggregate {
        const slug = input.slug.trim().toLowerCase()
        if (slug.length < SLUG_MIN || slug.length > SLUG_MAX || !SLUG_RE.test(slug)) {
            throw new InvalidPlanSlugError()
        }

        return new PlanAggregate({
            id: input.id,
            audience: input.audience,
            slug,
            name: input.name.trim(),
            description: input.description ?? null,
            status: input.status ?? 'draft',
            isFree: input.isFree ?? false,
            sortOrder: input.sortOrder ?? 0,
            highlighted: input.highlighted ?? false,
            entitlements: planEntitlementsFor(input.audience, input.entitlements),
            stripeProductId: null,
            paypalProductId: null,
            createdAt: input.now,
            updatedAt: input.now,
        })
    }

    /** Reconstruct from persistence; re-validates the jsonb against the schema. */
    static rehydrate(props: Omit<PlanProps, 'entitlements'> & { entitlements: unknown }): PlanAggregate {
        return new PlanAggregate({
            ...props,
            entitlements: planEntitlementsFor(props.audience, props.entitlements),
        })
    }

    /**
     * Edit the plan in place. `entitlements` is **retroactive on purpose**: every
     * check reads the plan as it is now, so granting a feature reaches live
     * subscribers immediately (and revoking one closes it for them just as fast).
     * Prices are the opposite — see `PlanPriceEntity`.
     *
     * `audience`, `slug` and `isFree` are not editable: the audience decides the
     * shape of the entitlements, the slug is a stable public id that labels metrics,
     * and which plan is the free fallback is not something to flip on a live catalog.
     * Undefined fields are left alone; `description` is nullable, so it is cleared
     * by passing null.
     */
    update(
        patch: {
            name?: string
            description?: string | null
            entitlements?: unknown
            sortOrder?: number
            highlighted?: boolean
        },
        now: Date,
    ): void {
        if (patch.name !== undefined) this.props.name = patch.name.trim()
        if (patch.description !== undefined) this.props.description = patch.description
        if (patch.sortOrder !== undefined) this.props.sortOrder = patch.sortOrder
        if (patch.highlighted !== undefined) this.props.highlighted = patch.highlighted
        if (patch.entitlements !== undefined) {
            this.props.entitlements = planEntitlementsFor(this.props.audience, patch.entitlements)
        }

        this.props.updatedAt = now
    }

    /**
     * Move through the catalog lifecycle. Archiving does not touch the
     * subscriptions already on the plan — they keep reading it until they end; it
     * only stops new signups. Refusing to archive the last free plan of an audience
     * is the handler's job: this object cannot see the rest of the catalog.
     */
    setStatus(status: PlanStatus, now: Date): void {
        this.props.status = status
        this.props.updatedAt = now
    }

    /** Record the product this plan was published as, on the gateway that made it. */
    syncedTo(gateway: PaymentGateway, productId: string, now: Date): void {
        if (gateway === 'stripe') this.props.stripeProductId = productId
        if (gateway === 'paypal') this.props.paypalProductId = productId
        this.props.updatedAt = now
    }

    /** The product id on a gateway, or null if the plan was never published there. */
    productIdOn(gateway: PaymentGateway): string | null {
        if (gateway === 'stripe') return this.props.stripeProductId
        if (gateway === 'paypal') return this.props.paypalProductId

        return null
    }

    /** Whether new subscriptions may be started on this plan. */
    acceptsSignups(): boolean {
        return this.props.status === 'active'
    }

    get id(): string {
        return this.props.id
    }
    get audience(): PlanAudience {
        return this.props.audience
    }
    get slug(): string {
        return this.props.slug
    }
    get name(): string {
        return this.props.name
    }
    get description(): string | null {
        return this.props.description
    }
    get status(): PlanStatus {
        return this.props.status
    }
    get isFree(): boolean {
        return this.props.isFree
    }
    get sortOrder(): number {
        return this.props.sortOrder
    }
    get highlighted(): boolean {
        return this.props.highlighted
    }
    get entitlements(): PlanEntitlementsVO {
        return this.props.entitlements
    }
    get stripeProductId(): string | null {
        return this.props.stripeProductId
    }
    get paypalProductId(): string | null {
        return this.props.paypalProductId
    }
    get createdAt(): Date {
        return this.props.createdAt
    }
    get updatedAt(): Date {
        return this.props.updatedAt
    }
}
