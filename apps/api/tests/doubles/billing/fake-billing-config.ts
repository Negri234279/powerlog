import { BillingConfig } from '../../../src/modules/billing/application/ports/billing-config.port'

/** Deterministic web origin + API url, so checkout and receipt URLs are assertable. */
export class FakeBillingConfig extends BillingConfig {
    constructor(
        private readonly origin = 'https://app.test',
        private readonly apiUrl = 'https://api.test',
    ) {
        super()
    }

    get webOrigin(): string {
        return this.origin
    }

    get apiPublicUrl(): string {
        return this.apiUrl
    }
}
