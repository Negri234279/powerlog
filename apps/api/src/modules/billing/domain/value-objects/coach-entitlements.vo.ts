import { z } from 'zod'

import type { CoachEntitlementsSection } from '../../../../shared/contracts/entitlements'
import { ValueObject } from '../../../../shared/domain/value-object'
import { InvalidPlanEntitlementsError } from '../errors/billing.errors'
import type { PlanPublicView } from './plan-entitlements'

/**
 * What a coach plan grants: **coaching only**. It used to nest an athlete section
 * (a coach plan was "an athlete plan plus a roster"); now athlete and coach plans
 * are independent subscriptions, so the coach's own training comes from their
 * athlete plan (or the free athlete fallback) and this shape holds nothing but
 * the coaching side. `maxTemplates`/`maxMesocycles` cap the material built for
 * athletes — not the coach's personal library.
 */
const schema = z.strictObject({
    /** How many athletes the coach may have linked. `null` = unlimited. */
    maxAthletes: z.int().min(0).nullable(),
    /** Program for their athletes: plan sessions, design/assign blocks to them. */
    planSessions: z.boolean(),
    /** How many coaching templates (to use with athletes) they may create. */
    maxTemplates: z.int().min(0).nullable(),
    /** How many blocks they may design for their athletes. */
    maxMesocycles: z.int().min(0).nullable(),
    /** The AI assistant when designing for athletes (BYOK, so boolean not quota). */
    ai: z.boolean(),
})

export type CoachEntitlements = z.infer<typeof schema>

/** The coach schema, exposed so the admin form can be generated from it. */
export const coachEntitlementsSchema = schema

export class CoachEntitlementsVO extends ValueObject<CoachEntitlements> {
    /** Validate raw input (admin form, jsonb column) into a VO. */
    static create(raw: unknown): CoachEntitlementsVO {
        return new CoachEntitlementsVO(raw as CoachEntitlements)
    }

    /** The coach section of a snapshot — what this plan grants its holder. */
    toSection(plan: string): CoachEntitlementsSection {
        return {
            plan,
            maxAthletes: this.value.maxAthletes,
            planSessions: this.value.planSessions,
            maxTemplates: this.value.maxTemplates,
            maxMesocycles: this.value.maxMesocycles,
            ai: this.value.ai,
        }
    }

    /** The pricing-page view. A coach plan grants no personal training. */
    publicView(): PlanPublicView {
        return {
            maxTemplates: this.value.maxTemplates,
            maxMesocycles: this.value.maxMesocycles,
            maxWorkouts: 0,
            ai: this.value.ai,
            planSessions: this.value.planSessions,
            maxAthletes: this.value.maxAthletes,
        }
    }

    protected override assertIsValid(value: CoachEntitlements): void {
        const parsed = schema.safeParse(value)
        if (!parsed.success) {
            throw new InvalidPlanEntitlementsError('coach', z.prettifyError(parsed.error))
        }
    }

    override equals(other: CoachEntitlementsVO): boolean {
        return JSON.stringify(this.value) === JSON.stringify(other.value)
    }
}
