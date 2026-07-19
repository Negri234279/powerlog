import type { PaymentGateway } from '../../../domain/entities/subscription.entity'
import type { CheckoutUiMode } from '../../ports/payment-gateway.port'

/**
 * Where a hosted checkout sends the browser back to. A bounded set, not a free URL,
 * so the caller can't turn the gateway redirect into an open redirect: `plan` is the
 * account area's plan page (the default, for upgrades from inside the app), `dashboard`
 * is the app home (used by the sign-up wizard, which finishes there).
 */
export type CheckoutReturnTo = 'plan' | 'dashboard'

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
        readonly returnTo: CheckoutReturnTo = 'plan',
    ) {}
}
