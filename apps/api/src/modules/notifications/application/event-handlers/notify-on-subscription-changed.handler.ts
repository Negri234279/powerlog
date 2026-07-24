import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'

import { SubscriptionChangedIntegrationEvent } from '../../../../shared/integration-events/subscription-changed.integration-event'
import type { NotificationType } from '../../domain/notification-type'
import { NotificationService } from '../services/notification.service'

/**
 * Bells the three subscription moments a user actually needs to hear about:
 *
 *  - **activated** — you're in (whether you paid or an admin comped you).
 *  - **canceled** — it will not renew, and here is the date you keep it until.
 *  - **payment_failed** — your card failed and the clock is running. This is the
 *    one that matters: silence here ends with an account that quietly stops working.
 *
 * A renewal is not a notification: nothing changed for the user, and a bell every
 * month would be noise. Neither is a plan change they made themselves.
 */
const BELLED: Partial<Record<SubscriptionChangedIntegrationEvent['reason'], NotificationType>> = {
    activated: 'subscription_activated',
    canceled: 'subscription_canceled',
    payment_failed: 'subscription_payment_failed',
}

@EventsHandler(SubscriptionChangedIntegrationEvent)
export class NotifyOnSubscriptionChanged implements IEventHandler<SubscriptionChangedIntegrationEvent> {
    constructor(private readonly notifications: NotificationService) {}

    async handle(event: SubscriptionChangedIntegrationEvent): Promise<void> {
        const type = BELLED[event.reason]
        if (!type) return

        await this.notifications.create({
            userId: event.userId,
            type,
            data: {
                plan: event.planSlug,
                // The copy says "you keep it until the 3rd" / "we retry until the 3rd",
                // so the date has to travel with the notification.
                currentPeriodEnd: event.currentPeriodEnd.toISOString(),
            },
        })
    }
}
