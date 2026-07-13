import type { PaymentGateway } from '../../../domain/entities/subscription.entity'

/** Begin paying for a plan. Returns the URL to send the browser to. */
export class StartCheckoutCommand {
    constructor(
        readonly userId: string,
        readonly planPriceId: string,
        readonly gateway: PaymentGateway,
        readonly offerId: string | null,
    ) {}
}
