import { ValueObject } from '../../../../shared/domain/value-object'
import { InvalidPlanDraftStatusError } from '../errors/ai-plan.errors'

export const PLAN_DRAFT_STATUSES = ['open', 'accepted', 'discarded'] as const

export type PlanDraftStatusValue = (typeof PLAN_DRAFT_STATUSES)[number]

/**
 * Where a draft is in its short life: `open` while the athlete is still reading
 * or refining it, then `accepted` (written onto the session) or `discarded`.
 * Both end states are terminal.
 */
export class PlanDraftStatusVO extends ValueObject<PlanDraftStatusValue> {
    static create(raw: string): PlanDraftStatusVO {
        return new PlanDraftStatusVO(raw as PlanDraftStatusValue)
    }

    static open(): PlanDraftStatusVO {
        return new PlanDraftStatusVO('open')
    }

    get isOpen(): boolean {
        return this.value === 'open'
    }

    override equals(other: PlanDraftStatusVO): boolean {
        return this.value === other.value
    }

    protected override assertIsValid(value: PlanDraftStatusValue): void {
        if (!(PLAN_DRAFT_STATUSES as readonly string[]).includes(value)) {
            throw new InvalidPlanDraftStatusError(value)
        }
    }
}
