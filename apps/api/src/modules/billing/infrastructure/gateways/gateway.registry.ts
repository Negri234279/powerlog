import { Injectable } from '@nestjs/common'

import { GatewayProvider } from '../../application/ports/gateway-provider.port'
import type { PaymentGatewayPort } from '../../application/ports/payment-gateway.port'
import type { PaymentGateway } from '../../domain/entities/subscription.entity'
import { GatewayNotConfiguredError } from '../../domain/errors/billing.errors'
import { StripeGateway } from './stripe.gateway'

/**
 * The only place that knows which providers exist. A handler says "stripe" and
 * gets a port back.
 *
 * A provider with no keys in this environment is **not** a boot failure: it is
 * simply not offered — `available()` leaves it out and asking for it by name
 * throws `GATEWAY_NOT_CONFIGURED`. That is what lets dev, CI and a free-tier
 * deployment run the whole app with no payment credentials at all. PayPal is not
 * here yet (9.4), so asking for it lands on the same clean refusal.
 */
@Injectable()
export class GatewayRegistry extends GatewayProvider {
    private readonly gateways: PaymentGatewayPort[]

    constructor(stripe: StripeGateway) {
        super()
        this.gateways = [stripe]
    }

    available(): PaymentGatewayPort[] {
        return this.gateways.filter((gateway) => gateway.isConfigured())
    }

    get(name: PaymentGateway): PaymentGatewayPort {
        const gateway = this.gateways.find((candidate) => candidate.name === name)
        if (!gateway?.isConfigured()) throw new GatewayNotConfiguredError(name)

        return gateway
    }
}
