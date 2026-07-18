import type { PaymentGateway } from '../../../domain/entities/subscription.entity'
import type { CheckoutUiMode } from '../../ports/payment-gateway.port'

/**
 * Begin paying for a plan. Returns a {@link CheckoutSession} — a redirect URL for
 * a hosted checkout, or a client secret for a Stripe embedded one.
 */
export class StartCheckoutCommand {
    constructor(
        readonly userId: string,
        readonly planPriceId: string,
        readonly gateway: PaymentGateway,
        readonly offerId: string | null,
        readonly uiMode: CheckoutUiMode = 'hosted',
    ) {}
}
