'use client'

import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js'
import { useCallback } from 'react'

import { getStripe } from '@/lib/billing/stripe'
import { fetchEmbeddedCheckoutSecret } from '@/lib/graphql/hooks/use-billing'

/**
 * Stripe's in-page checkout, mounted in an iframe on our own wizard. The session
 * is created with `redirect_on_completion: 'never'` (see the API's StripeGateway),
 * so payment reports back through `onComplete` instead of a redirect — that is what
 * lets the wizard move to the next paid plan (or finish) without leaving the page.
 *
 * The subscription itself is still born from the webhook; `onComplete` only means
 * "the card went through", so the caller advances and lets the plan activate in the
 * background (the plan page confirms it via the realtime event).
 *
 * Renders nothing when Stripe has no publishable key — the caller falls back to
 * PayPal. Remount it (via a `key` on the price) to start a fresh checkout.
 */
export function StripeEmbeddedCheckout({
    planPriceId,
    offerId,
    onComplete,
}: {
    planPriceId: string
    offerId: string | null
    onComplete: () => void
}) {
    const stripe = getStripe()
    const fetchClientSecret = useCallback(
        () => fetchEmbeddedCheckoutSecret({ planPriceId, offerId }),
        [planPriceId, offerId],
    )

    if (!stripe) return null

    return (
        <div className="overflow-hidden rounded-2xl">
            <EmbeddedCheckoutProvider stripe={stripe} options={{ fetchClientSecret, onComplete }}>
                <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
        </div>
    )
}
