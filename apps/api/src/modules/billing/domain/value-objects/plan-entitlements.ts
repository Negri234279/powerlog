import { z } from 'zod'

import type { PlanAudience } from '../../../../shared/contracts/entitlements'
import { AthleteEntitlementsVO, athleteEntitlementsSchema } from './athlete-entitlements.vo'
import { CoachEntitlementsVO, coachEntitlementsSchema } from './coach-entitlements.vo'

/**
 * A plan's entitlements: the athlete shape or the coach shape, decided by the
 * plan's audience. Both collapse to the same flat {@link EntitlementsSnapshot},
 * so nothing downstream has to know which one it got.
 */
export type PlanEntitlementsVO = AthleteEntitlementsVO | CoachEntitlementsVO

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
