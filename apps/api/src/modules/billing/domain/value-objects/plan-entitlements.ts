import type { PlanAudience } from '../../../../shared/contracts/entitlements'
import { AthleteEntitlementsVO } from './athlete-entitlements.vo'
import { CoachEntitlementsVO } from './coach-entitlements.vo'

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
