import { type Stripe, loadStripe } from '@stripe/stripe-js'

import { env } from '@/lib/env'

/**
 * The Stripe.js singleton. `loadStripe` injects the provider's script the first
 * time it runs, so we call it **once per page load** and hand the same promise to
 * every `<EmbeddedCheckoutProvider>` — mounting the checkout twice must not pull
 * the script twice.
 *
 * Null when no publishable key is configured: the in-page Stripe checkout is
 * simply not offered (the wizard falls back to the hosted redirect / PayPal),
 * mirroring how the API runs without `STRIPE_SECRET_KEY`.
 */
let stripePromise: Promise<Stripe | null> | null = null

export function getStripe(): Promise<Stripe | null> | null {
    if (!env.stripePublishableKey) return null
    if (!stripePromise) stripePromise = loadStripe(env.stripePublishableKey)

    return stripePromise
}

/** Whether this deployment can render the embedded Stripe checkout. */
export const stripeEnabled = env.stripePublishableKey !== null
