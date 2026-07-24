import type { PlanAudience } from '../../../../../shared/contracts/entitlements'

/** Stop the subscription renewing. The user keeps it until the period they paid for
 *  ends. `audience` picks which of their plans — athlete and coach are independent. */
export class CancelSubscriptionCommand {
    constructor(
        readonly userId: string,
        readonly audience: PlanAudience,
    ) {}
}

/** Undo a scheduled cancellation, while the paid period is still running. */
export class ResumeSubscriptionCommand {
    constructor(
        readonly userId: string,
        readonly audience: PlanAudience,
    ) {}
}

/** Move to another plan (or another interval/currency of the same one). The
 *  audience is the target price's — you change the subscription in that audience. */
export class ChangePlanCommand {
    constructor(
        readonly userId: string,
        readonly planPriceId: string,
    ) {}
}
