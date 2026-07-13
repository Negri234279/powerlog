import type { PaymentGateway } from '../../domain/entities/subscription.entity'
import type { PaymentGatewayPort } from './payment-gateway.port'

/**
 * Hands a handler the gateway it asked for. Infrastructure decides which ones
 * exist and which have keys in this environment; the application only ever says
 * "give me stripe" and gets a {@link PaymentGatewayPort} — or
 * `GATEWAY_NOT_CONFIGURED`, which is a legitimate answer, not a crash.
 */
export abstract class GatewayProvider {
    /** The gateways this environment can actually take money with. */
    abstract available(): PaymentGatewayPort[]

    /** The named gateway; throws `GATEWAY_NOT_CONFIGURED` if it has no keys here. */
    abstract get(name: PaymentGateway): PaymentGatewayPort
}
