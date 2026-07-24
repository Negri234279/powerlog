import type { PlanAudience } from '../../../../../shared/contracts/entitlements'

/** The whole catalog (any status) for the admin panel, optionally by audience. */
export class AdminPlansQuery {
    constructor(readonly audience?: PlanAudience) {}
}
