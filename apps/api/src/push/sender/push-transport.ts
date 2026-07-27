import type { PushPayload, StoredPushSubscription } from '../push.types'

/** What became of a single delivery attempt. `gone` ⇒ prune the subscription. */
export type DeliveryOutcome = 'sent' | 'gone' | 'error'

/**
 * The low-level Web Push transport: encrypts + delivers one payload to one
 * subscription. Abstract so it doubles as the DI token and so the module can
 * swap the real web-push adapter for a no-op when VAPID keys are unset.
 */
export abstract class PushTransport {
    /** VAPID public key to hand the browser at subscribe time, or `null` when
     *  push is not configured (no key pair) — the signal the channel is off. */
    abstract readonly publicKey: string | null

    abstract deliver(subscription: StoredPushSubscription, payload: PushPayload): Promise<DeliveryOutcome>
}
