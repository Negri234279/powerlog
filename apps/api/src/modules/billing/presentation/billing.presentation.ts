import { StripeWebhookController } from './controllers/stripe-webhook.controller'
import { AdminBillingResolver } from './resolvers/admin-billing.resolver'
import { BillingResolver } from './resolvers/billing.resolver'

/** GraphQL resolvers of the billing module. */
export const BILLING_RESOLVERS = [AdminBillingResolver, BillingResolver]

/** REST controllers — sanctioned only where the protocol rules GraphQL out (signed webhooks). */
export const BILLING_CONTROLLERS = [StripeWebhookController]
