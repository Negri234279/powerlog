import { InvoiceReceiptController } from './controllers/invoice-receipt.controller'
import { PayPalWebhookController } from './controllers/paypal-webhook.controller'
import { StripeWebhookController } from './controllers/stripe-webhook.controller'
import { AdminBillingResolver } from './resolvers/admin-billing.resolver'
import { BillingResolver } from './resolvers/billing.resolver'

/** GraphQL resolvers of the billing module. */
export const BILLING_RESOLVERS = [AdminBillingResolver, BillingResolver]

/**
 * REST controllers — sanctioned only where the protocol rules GraphQL out: signed
 * webhooks, and the receipt PDF (bytes, same reasoning as the avatar routes).
 */
export const BILLING_CONTROLLERS = [StripeWebhookController, PayPalWebhookController, InvoiceReceiptController]
