import { z } from 'zod'

import type { PlanAudience } from '../../../../shared/contracts/entitlements'
import { AthleteEntitlementsVO, athleteEntitlementsSchema } from './athlete-entitlements.vo'
import { CoachEntitlementsVO, coachEntitlementsSchema } from './coach-entitlements.vo'

/**
 * A plan's entitlements: the athlete shape or the coach shape, decided by the
 * plan's audience. The two are independent — an athlete plan grants personal
 * training, a coach plan grants coaching — and each contributes its own section
 * of the user's {@link EntitlementsSnapshot}.
 */
export type PlanEntitlementsVO = AthleteEntitlementsVO | CoachEntitlementsVO

/**
 * The flat view a pricing card renders from, shared by both audiences so the
 * catalog handler and the GraphQL type stay shape-stable. A field the audience
 * has no business with reads as "none" (`maxWorkouts: 0` on a coach plan), never
 * as `null` — `null` means unlimited.
 */
export interface PlanPublicView {
    maxTemplates: number | null
    maxMesocycles: number | null
    maxWorkouts: number | null
    ai: boolean
    planSessions: boolean
    maxAthletes: number | null
}

/** Validate raw entitlements (admin form, jsonb column) against their audience. */
export function planEntitlementsFor(audience: PlanAudience, raw: unknown): PlanEntitlementsVO {
    return audience === 'coach' ? CoachEntitlementsVO.create(raw) : AthleteEntitlementsVO.create(raw)
}

/**
 * The zod schema of an audience, as JSON Schema — what the **admin form renders
 * itself from**. This is what makes the plans dynamic in practice: adding a
 * feature check is a line in the zod schema, and the form grows a field for it on
 * its own. No migration, no GraphQL type, no hand-written form field.
 */
export function entitlementsJsonSchema(audience: PlanAudience): unknown {
    return z.toJSONSchema(audience === 'coach' ? coachEntitlementsSchema : athleteEntitlementsSchema)
}
