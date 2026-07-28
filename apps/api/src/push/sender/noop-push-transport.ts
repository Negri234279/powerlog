import type { PushPayload, StoredPushSubscription } from '../push.types'
import { type DeliveryOutcome, PushTransport } from './push-transport'

/**
 * Used when no VAPID key pair is configured — the supported "push is off" mode,
 * like Redis or Stripe being unset. `publicKey` is `null` so the client knows the
 * channel is unavailable, and `deliver` is never reached (the service short-
 * circuits on `publicKey === null`); if it were, it's a harmless no-op.
 */
export class NoopPushTransport extends PushTransport {
    readonly publicKey = null

    deliver(_subscription: StoredPushSubscription, _payload: PushPayload): Promise<DeliveryOutcome> {
        return Promise.resolve('error')
    }
}
