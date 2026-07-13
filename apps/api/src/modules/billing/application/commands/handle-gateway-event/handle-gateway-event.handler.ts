import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import {
    type SubscriptionChangeReason,
    SubscriptionChangedIntegrationEvent,
} from '../../../../../shared/integration-events/subscription-changed.integration-event'
import { InvoiceEntity } from '../../../domain/entities/invoice.entity'
import { SubscriptionAggregate } from '../../../domain/entities/subscription.entity'
import { PlanPriceRepository } from '../../../domain/repositories/plan-price.repository'
import { PlanRepository } from '../../../domain/repositories/plan.repository'
import { InvoiceRepository } from '../../../domain/repositories/invoice.repository'
import { SubscriptionRepository } from '../../../domain/repositories/subscription.repository'
import { BillingMetrics } from '../../ports/billing-metrics.port'
import { Clock } from '../../ports/clock.port'
import type {
    CheckoutCompletedEvent,
    GatewayEvent,
    InvoiceEvent,
    SubscriptionChangedEvent,
} from '../../ports/gateway-event'
import { IdGenerator } from '../../ports/id-generator.port'
import { WebhookEventStore } from '../../ports/webhook-event.store'
import { HandleGatewayEventCommand } from './handle-gateway-event.command'

/**
 * The webhook pipeline: **the only way money changes anything in this app.**
 *
 * Everything the user does — subscribe, cancel, resume, switch plan — goes out to
 * the gateway and comes back through here. So does everything they do in the
 * provider's own portal, and everything the provider decides on its own (a
 * renewal, a failed charge, giving up on a card). One path, one place where the
 * local projection is written, and therefore no way for the two to disagree about
 * what was paid.
 *
 * Three properties this has to hold:
 *  - **Idempotent.** Providers retry. The event journal refuses a second write of
 *    the same `(gateway, eventId)`, so a replayed activation cannot produce a
 *    second subscription.
 *  - **Order-independent.** Webhooks arrive out of order. An invoice for a
 *    subscription we have not mirrored yet is still stored (with a null
 *    subscription id) rather than dropped, and a `subscription.updated` that beats
 *    `checkout.completed` creates the row it needs.
 *  - **Loud when it breaks.** A handler that throws leaves the row `failed` with
 *    its payload, ready to be replayed, and the counter says so.
 */
@CommandHandler(HandleGatewayEventCommand)
export class HandleGatewayEventHandler implements ICommandHandler<HandleGatewayEventCommand, void> {
    constructor(
        private readonly subscriptions: SubscriptionRepository,
        private readonly plans: PlanRepository,
        private readonly prices: PlanPriceRepository,
        private readonly invoices: InvoiceRepository,
        private readonly events: WebhookEventStore,
        private readonly metrics: BillingMetrics,
        private readonly clock: Clock,
        private readonly ids: IdGenerator,
        private readonly eventBus: EventBus,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(HandleGatewayEventHandler.name)
    }

    async execute(command: HandleGatewayEventCommand): Promise<void> {
        const event = command.event

        const fresh = await this.events.record({
            gateway: event.gateway,
            eventId: event.eventId,
            type: event.type,
            payload: event,
        })

        // A retry of something already handled. Counted, not re-applied — the
        // `duplicate` counter going up is the proof the idempotency works.
        if (!fresh) {
            this.metrics.recordWebhook(event.gateway, event.type, 'duplicate')

            return
        }

        try {
            await this.apply(event)
            await this.events.markProcessed(event.gateway, event.eventId, this.clock.now())
            this.metrics.recordWebhook(event.gateway, event.type, 'processed')
        } catch (error) {
            const detail = error instanceof Error ? error.message : 'unknown error'
            await this.events.markFailed(event.gateway, event.eventId, detail)
            this.metrics.recordWebhook(event.gateway, event.type, 'failed')
            // The event id, never the payload: it can carry the customer's details.
            this.logger.error({ eventId: event.eventId, type: event.type, err: error }, 'billing webhook failed')

            throw error
        }
    }

    private async apply(event: GatewayEvent): Promise<void> {
        switch (event.kind) {
            case 'checkout_completed':
                return this.onCheckoutCompleted(event)
            case 'subscription_changed':
                return this.onSubscriptionChanged(event)
            case 'invoice':
                return this.onInvoice(event)
            case 'checkout_expired':
                this.metrics.recordCheckout(event.gateway, event.planSlug ?? 'unknown', 'expired')

                return
            case 'unhandled':
                this.logger.debug({ type: event.type }, 'billing webhook not acted on')

                return
        }
    }

    /**
     * The subscription starts existing here — **not** on the success redirect. A
     * user who pays and closes the tab must still end up subscribed, and a user who
     * hand-crafts the redirect must not.
     */
    private async onCheckoutCompleted(event: CheckoutCompletedEvent): Promise<void> {
        const now = this.clock.now()

        const existing = await this.subscriptions.findByGatewayId(event.gatewaySubscriptionId)
        if (existing) return // The `subscription.updated` for it beat us here.

        const plan = await this.plans.findById(event.planId)
        if (!plan) throw new Error(`checkout completed for unknown plan ${event.planId}`)

        const subscription = SubscriptionAggregate.create({
            id: this.ids.uuid(),
            userId: event.userId,
            planId: plan.id,
            planPriceId: event.planPriceId,
            gateway: event.gateway,
            gatewayCustomerId: event.gatewayCustomerId,
            gatewaySubscriptionId: event.gatewaySubscriptionId,
            // `incomplete` until the gateway confirms the period in the subscription
            // event that follows. It grants nothing yet — being told "you paid" is not
            // the same as the provider saying the subscription is active.
            status: 'incomplete',
            currentPeriodStart: now,
            currentPeriodEnd: now,
            now,
        })
        await this.subscriptions.save(subscription)

        this.metrics.recordCheckout(event.gateway, plan.slug, 'completed')
        if (event.offerId) this.metrics.recordOfferRedemption(plan.slug)

        this.logger.info(
            { subscriptionId: subscription.id, plan: plan.slug, gateway: event.gateway },
            'checkout completed',
        )
    }

    /** Renewal, dunning, cancellation, plan change — the gateway's whole story. */
    private async onSubscriptionChanged(event: SubscriptionChangedEvent): Promise<void> {
        const subscription = await this.subscriptions.findByGatewayId(event.gatewaySubscriptionId)
        // Nothing to update yet: the checkout event has not arrived. It will, and it
        // creates the row; this one is simply early.
        if (!subscription) return

        const previousStatus = subscription.status
        const previousPeriodEnd = subscription.currentPeriodEnd
        const previousPriceId = subscription.planPriceId
        const now = this.clock.now()

        // The gateway may have moved them onto a different price (a plan change we
        // asked for, or one made in the provider's portal).
        const newPrice = event.gatewayPriceId ? await this.prices.findByGatewayPriceId(event.gatewayPriceId) : null

        subscription.syncFromGateway(
            {
                status: event.status,
                currentPeriodStart: event.currentPeriodStart,
                currentPeriodEnd: event.currentPeriodEnd,
                cancelAtPeriodEnd: event.cancelAtPeriodEnd,
                canceledAt: event.canceledAt,
                ...(newPrice ? { planId: newPrice.planId, planPriceId: newPrice.id } : {}),
            },
            now,
        )
        await this.subscriptions.save(subscription)

        const plan = await this.plans.findById(subscription.planId)
        const reason = reasonOf({
            previousStatus,
            previousPeriodEnd,
            previousPriceId,
            status: subscription.status,
            periodEnd: subscription.currentPeriodEnd,
            priceId: subscription.planPriceId,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        })

        // A plan change is an upgrade or a downgrade, and the difference is the whole
        // point of the metric — so compare what they will actually be billed a month.
        const previousPrice = previousPriceId ? await this.prices.findById(previousPriceId) : null
        const metricEvent =
            reason === 'plan_changed'
                ? (newPrice?.monthlyAmountCents() ?? 0) >= (previousPrice?.monthlyAmountCents() ?? 0)
                    ? 'upgraded'
                    : 'downgraded'
                : reason

        this.metrics.recordSubscriptionEvent(metricEvent, event.gateway)
        this.logger.info(
            { subscriptionId: subscription.id, plan: plan?.slug ?? null, status: subscription.status, reason },
            'subscription changed',
        )

        this.eventBus.publish(
            new SubscriptionChangedIntegrationEvent(
                subscription.userId,
                subscription.id,
                plan?.slug ?? 'unknown',
                reason,
                subscription.currentPeriodEnd,
            ),
        )
    }

    /**
     * Mirror the invoice. The gateway issued it — number, tax and all — and this is
     * the copy the user's billing page reads.
     */
    private async onInvoice(event: InvoiceEvent): Promise<void> {
        const subscription = event.gatewaySubscriptionId
            ? await this.subscriptions.findByGatewayId(event.gatewaySubscriptionId)
            : null

        // An invoice for a subscription we have not mirrored yet is still worth
        // keeping: the payment happened, and dropping it would lose the record. It is
        // linked by the `(gateway, invoice id)` upsert when the row catches up.
        const existing = await this.invoices.findByGatewayId(event.gateway, event.gatewayInvoiceId)

        const invoice = InvoiceEntity.create({
            id: existing?.id ?? this.ids.uuid(),
            userId: subscription?.userId ?? existing?.userId ?? '',
            subscriptionId: subscription?.id ?? existing?.subscriptionId ?? null,
            gateway: event.gateway,
            gatewayInvoiceId: event.gatewayInvoiceId,
            number: event.number,
            status: event.status,
            amountDueCents: event.amountDueCents,
            amountPaidCents: event.amountPaidCents,
            currency: event.currency,
            hostedUrl: event.hostedUrl,
            pdfUrl: event.pdfUrl,
            issuedAt: event.issuedAt,
            paidAt: event.paidAt,
        })

        // Without a user the row has nothing to belong to. Better to fail loudly and
        // replay once the subscription exists than to write an orphan.
        if (!invoice.userId) throw new Error(`invoice ${event.gatewayInvoiceId} has no subscriber yet`)

        await this.invoices.upsert(invoice)

        if (event.paymentFailed && subscription) {
            const plan = await this.plans.findById(subscription.planId)
            this.metrics.recordSubscriptionEvent('payment_failed', event.gateway)

            // The user has to be told: their card failed and the clock is running.
            this.eventBus.publish(
                new SubscriptionChangedIntegrationEvent(
                    subscription.userId,
                    subscription.id,
                    plan?.slug ?? 'unknown',
                    'payment_failed',
                    subscription.currentPeriodEnd,
                ),
            )
        }

        this.logger.info(
            { gateway: event.gateway, status: invoice.status, failed: event.paymentFailed },
            'invoice mirrored',
        )
    }
}

/** What actually happened, read from the before/after of the subscription. */
function reasonOf(input: {
    previousStatus: string
    previousPeriodEnd: Date
    previousPriceId: string | null
    status: string
    periodEnd: Date
    priceId: string | null
    cancelAtPeriodEnd: boolean
}): SubscriptionChangeReason {
    if (input.status === 'expired') return 'expired'
    if (input.status === 'canceled') return 'canceled'
    if (input.status === 'past_due') return 'payment_failed'
    if (input.priceId !== input.previousPriceId) return 'plan_changed'

    // Was going to end, and is not any more: they changed their mind in time.
    if (!input.cancelAtPeriodEnd && input.previousStatus === 'canceled') return 'resumed'

    // The paid period moved forward: the gateway billed them again.
    if (input.periodEnd > input.previousPeriodEnd && input.previousStatus !== 'incomplete') return 'renewed'

    return 'activated'
}
