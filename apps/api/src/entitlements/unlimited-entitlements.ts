import { Injectable } from '@nestjs/common'

import { Entitlements } from '../shared/contracts/entitlements'

/**
 * Placeholder entitlements until subscription plans exist: every action is
 * allowed. Swapping this provider for a plan-aware adapter is the only change
 * needed to start enforcing limits.
 */
@Injectable()
export class UnlimitedEntitlements extends Entitlements {
    assertCanAddAthlete(): Promise<void> {
        return Promise.resolve()
    }
}
