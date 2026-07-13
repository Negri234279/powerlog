import { BillingConfig } from '../../../src/modules/billing/application/ports/billing-config.port'

/** Deterministic web origin, so checkout URLs are assertable. */
export class FakeBillingConfig extends BillingConfig {
    constructor(private readonly origin = 'https://app.test') {
        super()
    }

    get webOrigin(): string {
        return this.origin
    }
}
