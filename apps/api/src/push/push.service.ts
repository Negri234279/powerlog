import { Injectable } from '@nestjs/common'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import { PinoLogger } from 'nestjs-pino'
import type { Counter } from 'prom-client'

import { METRIC } from '../observability/metrics'
import { PushNotifier } from './push-notifier'
import { PushSubscriptionStore } from './push-subscription-store'
import type { PushInput, StoredPushSubscription } from './push.types'
import { PushTransport } from './sender/push-transport'

/**
 * Concrete `PushNotifier`: looks up the users' subscriptions, delivers the
 * payload to each, counts the outcome and prunes the ones the push service
 * reports as gone. Fan-out is per subscription (a user with two devices gets two
 * deliveries). A single delivery failing never fails the others or the caller —
 * push is a best-effort re-engagement channel, not a source of truth.
 */
@Injectable()
export class PushService extends PushNotifier {
    constructor(
        private readonly store: PushSubscriptionStore,
        private readonly transport: PushTransport,
        @InjectMetric(METRIC.pushSent) private readonly sent: Counter<string>,
        private readonly logger: PinoLogger,
    ) {
        super()
        this.logger.setContext(PushService.name)
    }

    async send(userIds: readonly string[], payload: PushInput): Promise<void> {
        // `publicKey === null` is the "push not configured" signal — skip the DB
        // lookup entirely.
        if (this.transport.publicKey === null || userIds.length === 0) return

        const subscriptions = await this.store.findByUsers(userIds)
        if (subscriptions.length === 0) return

        await Promise.all(subscriptions.map((subscription) => this.deliverOne(subscription, payload)))
    }

    private async deliverOne(subscription: StoredPushSubscription, payload: PushInput): Promise<void> {
        // A factory renders the text in this device's own locale; a plain payload
        // is used as-is for everyone.
        const rendered = typeof payload === 'function' ? payload(subscription.locale) : payload
        const outcome = await this.transport.deliver(subscription, rendered)

        this.sent.inc({ status: outcome })

        if (outcome === 'gone') {
            await this.store.deleteByEndpoint(subscription.endpoint)
        }
    }
}
