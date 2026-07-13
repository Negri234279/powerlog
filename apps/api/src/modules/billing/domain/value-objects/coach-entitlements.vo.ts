import { z } from 'zod'

import type { EntitlementsSnapshot } from '../../../../shared/contracts/entitlements'
import { ValueObject } from '../../../../shared/domain/value-object'
import { InvalidPlanEntitlementsError } from '../errors/billing.errors'
import { athleteEntitlementsSchema } from './athlete-entitlements.vo'

/**
 * What a coach plan grants.
 *
 * It **nests the athlete section** instead of repeating its flags: a coach trains
 * too, and their personal features are exactly an athlete's. One source of truth
 * for "may this person use AI" — two flags could disagree, and the admin form
 * would show the same check twice. The coach section only holds what is
 * exclusively about coaching, so a coach plan is an athlete plan plus a roster.
 */
const schema = z.strictObject({
    /** How many athletes the coach may have linked. `null` = unlimited. */
    maxAthletes: z.int().min(0).nullable(),
    /** Program for their athletes: plan sessions, design/assign blocks to them. */
    planSessions: z.boolean(),
    /** The coach's own training features. */
    athlete: athleteEntitlementsSchema,
})

export type CoachEntitlements = z.infer<typeof schema>

/** The coach schema, exposed so the admin form can be generated from it. */
export const coachEntitlementsSchema = schema

export class CoachEntitlementsVO extends ValueObject<CoachEntitlements> {
    /** Validate raw input (admin form, jsonb column) into a VO. */
    static create(raw: unknown): CoachEntitlementsVO {
        return new CoachEntitlementsVO(raw as CoachEntitlements)
    }

    /** The flat view the rest of the app gates on: the nested athlete section is
     *  merged in as the coach's own features. */
    toSnapshot(plan: string): EntitlementsSnapshot {
        return {
            plan,
            audience: 'coach',
            templates: this.value.athlete.templates,
            mesocycles: this.value.athlete.mesocycles,
            ai: this.value.athlete.ai,
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
