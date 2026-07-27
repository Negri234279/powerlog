import { PinoLogger } from 'nestjs-pino'
import webpush from 'web-push'

import type { PushPayload, StoredPushSubscription } from '../push.types'
import { type DeliveryOutcome, PushTransport } from './push-transport'

/** The three VAPID values web-push needs to sign an authenticated push. */
export interface VapidKeys {
    subject: string
    publicKey: string
    privateKey: string
}

/**
 * web-push adapter. Built only when the key pair is present (the module picks
 * `NoopPushTransport` otherwise), so `publicKey` here is always a real key.
 * `setVapidDetails` is process-global in web-push; this is the single place that
 * calls it, and the single file that imports the library.
 */
export class WebPushTransport extends PushTransport {
    readonly publicKey: string

    constructor(
        keys: VapidKeys,
        private readonly logger: PinoLogger,
    ) {
        super()
        webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey)
        this.publicKey = keys.publicKey
        this.logger.setContext(WebPushTransport.name)
    }

    async deliver(subscription: StoredPushSubscription, payload: PushPayload): Promise<DeliveryOutcome> {
        try {
            await webpush.sendNotification(
                {
                    endpoint: subscription.endpoint,
                    keys: { p256dh: subscription.p256dh, auth: subscription.auth },
                },
                JSON.stringify(payload),
            )

            return 'sent'
        } catch (error) {
            // 404/410 = the push service dropped this subscription (browser
            // uninstalled, permission revoked). It will never work again ⇒ prune.
            if (error instanceof webpush.WebPushError && (error.statusCode === 404 || error.statusCode === 410)) {
                return 'gone'
            }

            this.logger.error(
                { statusCode: error instanceof webpush.WebPushError ? error.statusCode : undefined },
                'web push delivery failed',
            )

            return 'error'
        }
    }
}
