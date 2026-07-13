import type { Currency, PlanInterval } from '../../../domain/plan-interval'

export class AddPlanPriceCommand {
    constructor(
        readonly planId: string,
        readonly interval: PlanInterval,
        readonly currency: Currency,
        readonly amountCents: number,
    ) {}
}
