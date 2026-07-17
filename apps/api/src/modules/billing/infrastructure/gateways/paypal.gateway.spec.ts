import { ConfigService } from '@nestjs/config'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FakeBillingMetrics } from '../../../../../tests/doubles/billing'
import { silentLogger } from '../../../../../tests/doubles/shared'
import type { Env } from '../../../../config/env'
import type { SubscriptionChangedEvent } from '../../application/ports/gateway-event'
import { GatewayNotConfiguredError } from '../../domain/errors/billing.errors'
import { PayPalGateway } from './paypal.gateway'

/**
 * The translation layer and the three ways PayPal is NOT Stripe. The HTTP calls
 * are stubbed at `fetch`: what is under test is the mapping and the semantics, not
 * PayPal's network.
 */

const CONFIG = {
    PAYPAL_CLIENT_ID: 'id',
    PAYPAL_CLIENT_SECRET: 'secret',
    PAYPAL_WEBHOOK_ID: 'wh-1',
    PAYPAL_ENV: 'sandbox',
} as const

function configService(overrides: Partial<Record<keyof typeof CONFIG, string>> = {}): ConfigService<Env, true> {
    const values: Record<string, string> = { ...CONFIG, ...overrides }

    return { get: (key: string) => values[key] } as unknown as ConfigService<Env, true>
}

function gateway(overrides: Partial<Record<keyof typeof CONFIG, string>> = {}): PayPalGateway {
    return new PayPalGateway(configService(overrides), new FakeBillingMetrics(), silentLogger())
}

/** PayPal's two-step: a token, then the call. Answers are queued in order. */
function stubFetch(...responses: unknown[]): void {
    const queue = [{ access_token: 'tok', expires_in: 3600 }, ...responses]

    vi.stubGlobal(
        'fetch',
        vi.fn(async () => ({
            ok: true,
            status: 200,
            json: async () => queue.shift(),
            text: async () => '',
        })),
    )
}

const subscriptionEvent = (status: string, extra: Record<string, unknown> = {}) => ({
    id: 'WH-1',
    event_type: `BILLING.SUBSCRIPTION.${status}`,
    resource: {
        id: 'I-SUB-1',
        status: status === 'ACTIVATED' ? 'ACTIVE' : status,
        custom_id: 'user-1',
        plan_id: 'P-PLAN-1',
        start_time: '2026-07-01T00:00:00Z',
        billing_info: { next_billing_time: '2026-08-01T00:00:00Z' },
        ...extra,
    },
})

describe('PayPalGateway', () => {
    let paypal: PayPalGateway

    beforeEach(() => {
        vi.unstubAllGlobals()
        paypal = gateway()
    })

    it('is not offered when this environment has no credentials', () => {
        expect(gateway({ PAYPAL_CLIENT_ID: '' }).isConfigured()).toBe(false)
    })

    it('cannot resume: PayPal cancellation is terminal', async () => {
        // Not a limitation we hide — the UI reads `supportsResume` and never offers a
        // button that could only produce an error.
        expect(paypal.supportsResume).toBe(false)
        await expect(paypal.resume()).rejects.toThrow(/cannot undo/i)
    })

    it('has no billing portal — subscribers manage their plan on paypal.com', async () => {
        expect(await paypal.billingPortalUrl()).toBeNull()
    })

    it('refuses to verify a webhook with no PAYPAL_WEBHOOK_ID', async () => {
        // PayPal authenticates an event by ASKING its API with that id. Without it,
        // nothing can be verified — so nothing is trusted.
        const blind = gateway({ PAYPAL_WEBHOOK_ID: '' })

        await expect(blind.verifyWebhook(Buffer.from('{}'), {})).rejects.toBeInstanceOf(GatewayNotConfiguredError)
    })

    it('refuses an event PayPal itself does not vouch for', async () => {
        stubFetch({ verification_status: 'FAILURE' })

        await expect(
            paypal.verifyWebhook(Buffer.from(JSON.stringify(subscriptionEvent('ACTIVATED'))), {}),
        ).rejects.toThrow(/not verified/i)
    })

    describe('translating what PayPal sends', () => {
        it('carries the user on ACTIVATED — there is no checkout event to create the row', async () => {
            stubFetch({ verification_status: 'SUCCESS' })

            const event = (await paypal.verifyWebhook(
                Buffer.from(JSON.stringify(subscriptionEvent('ACTIVATED'))),
                {},
            )) as SubscriptionChangedEvent

            expect(event.kind).toBe('subscription_changed')
            expect(event.userId).toBe('user-1')
            expect(event.status).toBe('active')
            expect(event.gatewaySubscriptionId).toBe('I-SUB-1')
            // What they paid for runs until the next charge would have been.
            expect(event.currentPeriodEnd).toEqual(new Date('2026-08-01T00:00:00Z'))
            expect(event.gatewayPriceId).toBe('P-PLAN-1')
        })

        it('reads a cancellation as "will not renew", because that is all it can be', async () => {
            stubFetch({ verification_status: 'SUCCESS' })

            const event = (await paypal.verifyWebhook(
                Buffer.from(JSON.stringify(subscriptionEvent('CANCELLED', { status: 'CANCELLED' }))),
                {},
            )) as SubscriptionChangedEvent

            expect(event.status).toBe('canceled')
            expect(event.cancelAtPeriodEnd).toBe(true)
        })

        it('reads SUSPENDED as past_due — the money is being chased, the plan is still theirs', async () => {
            stubFetch({ verification_status: 'SUCCESS' })

            const event = (await paypal.verifyWebhook(
                Buffer.from(JSON.stringify(subscriptionEvent('SUSPENDED', { status: 'SUSPENDED' }))),
                {},
            )) as SubscriptionChangedEvent

            expect(event.status).toBe('past_due')
        })

        it('mirrors a completed sale as a paid invoice with no PDF', async () => {
            // PayPal issues no invoice document: the sale IS the record. The billing
            // page shows it exactly like a Stripe one, minus the PDF link.
            stubFetch({ verification_status: 'SUCCESS' })
            const sale = {
                id: 'WH-2',
                event_type: 'PAYMENT.SALE.COMPLETED',
                resource: {
                    id: 'SALE-1',
                    billing_agreement_id: 'I-SUB-1',
                    create_time: '2026-07-01T10:00:00Z',
                    amount: { total: '7.99', currency: 'EUR' },
                },
            }

            const event = await paypal.verifyWebhook(Buffer.from(JSON.stringify(sale)), {})

            expect(event).toMatchObject({
                kind: 'invoice',
                gatewayInvoiceId: 'SALE-1',
                gatewaySubscriptionId: 'I-SUB-1',
                status: 'paid',
                amountPaidCents: 799,
                currency: 'EUR',
                pdfUrl: null,
                paymentFailed: false,
            })
        })

        it('reads a failed payment as the dunning signal, not as a status change', async () => {
            // PayPal still says ACTIVE at this point — SUSPENDED comes later, on its
            // own, if the retries keep failing. What this event carries is the same
            // signal Stripe puts on `invoice.payment_failed`: tell the user, count it.
            stubFetch({ verification_status: 'SUCCESS' })

            const event = await paypal.verifyWebhook(
                Buffer.from(
                    JSON.stringify({
                        id: 'WH-3',
                        event_type: 'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
                        resource: { id: 'I-SUB-1', status: 'ACTIVE' },
                    }),
                ),
                {},
            )

            expect(event).toMatchObject({ kind: 'payment_failed', gatewaySubscriptionId: 'I-SUB-1' })
        })

        it('records an event it does not act on instead of dropping it', async () => {
            stubFetch({ verification_status: 'SUCCESS' })

            const event = await paypal.verifyWebhook(
                Buffer.from(JSON.stringify({ id: 'WH-9', event_type: 'CATALOG.PRODUCT.CREATED', resource: {} })),
                {},
            )

            expect(event.kind).toBe('unhandled')
        })
    })

    describe('listing what PayPal is still billing', () => {
        it('pages through every live subscription instead of stopping at the first hundred', async () => {
            // Truncating here fabricates drift: everyone past the first page would be
            // reported as "live here but not there".
            stubFetch(
                { subscriptions: [{ id: 'I-1', status: 'ACTIVE' }], total_pages: 2 },
                { subscriptions: [{ id: 'I-2', status: 'ACTIVE' }], total_pages: 2 },
            )

            const ids = await paypal.listLiveSubscriptionIds(['P-PLAN-1'])

            expect(ids).toEqual(['I-1', 'I-2'])
        })
    })
})
