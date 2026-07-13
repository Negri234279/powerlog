import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'

import { SubscriptionChangedIntegrationEvent } from '../../shared/integration-events/subscription-changed.integration-event'
import { RealtimeHub } from '../realtime.hub'

/**
 * The tab the user left open on `/account/plan` while paying in Stripe's window.
 *
 * This is what closes the loop: the checkout redirect cannot be trusted (the
 * subscription is created by the webhook), so the page has to be told when the
 * webhook actually landed. Every reason pushes — a renewal, a failed card and a
 * plan change all change what the page shows.
 */
@EventsHandler(SubscriptionChangedIntegrationEvent)
export class PushOnSubscriptionChanged implements IEventHandler<SubscriptionChangedIntegrationEvent> {
    constructor(private readonly hub: RealtimeHub) {}

    handle(event: SubscriptionChangedIntegrationEvent): void {
        this.hub.publish([event.userId], { type: 'subscription_updated' })
    }
}
