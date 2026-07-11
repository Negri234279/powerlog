import { Entitlements } from '../../../src/shared/contracts/entitlements'

/**
 * Configurable Entitlements double. Allows everything by default; call
 * `denyAddAthlete()` to make `assertCanAddAthlete` throw, so tests can drive the
 * "plan limit reached" path once real plans exist.
 */
export class FakeEntitlements extends Entitlements {
    private addAthleteError: Error | null = null

    denyAddAthlete(error: Error): this {
        this.addAthleteError = error
        return this
    }

    assertCanAddAthlete(): Promise<void> {
        return this.addAthleteError ? Promise.reject(this.addAthleteError) : Promise.resolve()
    }
}
