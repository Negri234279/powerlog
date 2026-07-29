import { type DeliveryOutcome, PushTransport } from '../../../src/push/sender/push-transport'
import type { PushPayload, StoredPushSubscription } from '../../../src/push/push.types'

/**
 * A PushTransport double that records what it was asked to deliver and returns a
 * scripted outcome. `publicKey` defaults to a non-null test key (configured); set
 * it to `null` to model the "push not configured" mode.
 */
export class FakePushTransport extends PushTransport {
    readonly delivered: { subscription: StoredPushSubscription; payload: PushPayload }[] = []

    constructor(
        public publicKey: string | null = 'test-public-key',
        private outcome: DeliveryOutcome = 'sent',
    ) {
        super()
    }

    /** Script the outcome of the next deliveries (e.g. mark an endpoint gone). */
    returns(outcome: DeliveryOutcome): this {
        this.outcome = outcome
        return this
    }

    async deliver(subscription: StoredPushSubscription, payload: PushPayload): Promise<DeliveryOutcome> {
        this.delivered.push({ subscription, payload })
        return this.outcome
    }
}
