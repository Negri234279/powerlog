import type { PlanStatus } from '../../../domain/entities/plan.entity'

export class SetPlanStatusCommand {
    constructor(
        readonly planId: string,
        readonly status: PlanStatus,
    ) {}
}
