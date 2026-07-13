import type { PlanAudience } from '../../../../shared/contracts/entitlements'
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
    entitlements: PlanEntitlementsVO
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
            entitlements: planEntitlementsFor(input.audience, input.entitlements),
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
    get entitlements(): PlanEntitlementsVO {
        return this.props.entitlements
    }
    get createdAt(): Date {
        return this.props.createdAt
    }
    get updatedAt(): Date {
        return this.props.updatedAt
    }
}
