'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { type PublicPrice, useStartCheckout } from '@/lib/graphql/hooks/use-billing'
import { stripeEnabled } from '@/lib/billing/stripe'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { FormError } from '@/components/ui/form-error'
import { TrackedButton, TrackedLink } from '@/components/ui/tracked'
import { StripeEmbeddedCheckout } from './embedded-checkout'

/** One paid plan to charge for, in the order the wizard pays them (athlete first). */
export interface PaymentItem {
    audience: 'athlete' | 'coach'
    price: PublicPrice
    offerId: string | null
    planName: string
}

/**
 * The payment step. Charges the paid plans one at a time (a checkout is one gateway
 * at a time): Stripe stays in-page and advances on `onComplete`, so athlete → coach
 * flows without leaving; PayPal is a redirect that finishes on the plan page.
 *
 * When the queue is done it sends the new user to their dashboard. The plan may
 * still be activating (it's the webhook, not this callback, that creates the
 * subscription) — the dashboard settles it via the realtime `subscription_updated`
 * event, which also refreshes the session so a paid coach plan's role reaches the JWT.
 */
export function PaymentStep({ queue }: { queue: PaymentItem[] }) {
    const tw = useTranslations('auth.wizard')
    const tb = useTranslations('billing')
    const router = useRouter()
    const toMessage = useErrorMessage()
    const paypal = useStartCheckout()
    const [index, setIndex] = useState(0)
    const [error, setError] = useState<string | null>(null)

    const item = queue[index]
    if (!item) return null

    function finish() {
        router.replace('/dashboard')
    }

    function onStripeComplete() {
        if (index < queue.length - 1) setIndex(index + 1)
        else finish()
    }

    const gateways = item.price.gateways
    const canStripe = stripeEnabled && gateways.includes('stripe')
    const canPaypal = gateways.includes('paypal')

    return (
        <div className="space-y-5">
            {queue.length > 1 ? (
                <p className="font-mono text-eyebrow uppercase text-text-faint">
                    {tw('planCount', { current: index + 1, total: queue.length })}
                </p>
            ) : null}
            <p className="text-sm text-text-dim">{tw('payingFor', { plan: item.planName })}</p>

            {canStripe ? (
                <StripeEmbeddedCheckout
                    key={item.price.id}
                    planPriceId={item.price.id}
                    offerId={item.offerId}
                    onComplete={onStripeComplete}
                />
            ) : null}

            {canPaypal ? (
                <TrackedButton
                    analyticsId="wizard-checkout-paypal"
                    type="button"
                    disabled={paypal.isPending}
                    onClick={() => {
                        setError(null)
                        paypal.mutate(
                            { planPriceId: item.price.id, gateway: 'paypal', offerId: item.offerId },
                            { onError: (err) => setError(toMessage(err)) },
                        )
                    }}
                    className="w-full rounded-full py-2.5 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:text-text disabled:opacity-50"
                >
                    {tb('subscribeWith', { gateway: tb('gateway.paypal' as 'gateway.stripe') })}
                </TrackedButton>
            ) : null}

            {!canStripe && !canPaypal ? <p className="text-center text-xs text-text-faint">{tb('noGateway')}</p> : null}

            <FormError error={error} />

            {/* The account already exists; paying is optional now — they can subscribe
                later from the plan page, so an escape hatch keeps them from being stuck. */}
            <div className="text-center">
                <TrackedLink
                    analyticsId="wizard-pay-later"
                    href="/dashboard"
                    className="text-sm text-text-faint underline-offset-4 transition-colors duration-300 hover:text-text hover:underline"
                >
                    {tw('payLater')}
                </TrackedLink>
            </div>
        </div>
    )
}
