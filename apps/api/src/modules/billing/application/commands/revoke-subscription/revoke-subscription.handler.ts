import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import { SubscriptionChangedIntegrationEvent } from '../../../../../shared/integration-events/subscription-changed.integration-event'
import { NotAManualSubscriptionError, SubscriptionNotFoundError } from '../../../domain/errors/billing.errors'
import { PlanRepository } from '../../../domain/repositories/plan.repository'
import { SubscriptionRepository } from '../../../domain/repositories/subscription.repository'
import { Clock } from '../../ports/clock.port'
import { RevokeSubscriptionCommand } from './revoke-subscription.command'

/**
 * Ends a manual grant immediately — the user drops back to the free plan of their
 * audience on their next action.
 *
 * Only `manual` grants: a gateway-billed subscription must be ended at the
 * gateway, or the local row would say "gone" while the card kept being charged.
 * That path comes back through the webhook (9.3) as a cancellation, which keeps
 * the time already paid for.
 */
@CommandHandler(RevokeSubscriptionCommand)
export class RevokeSubscriptionHandler implements ICommandHandler<RevokeSubscriptionCommand, void> {
    constructor(
        private readonly subscriptions: SubscriptionRepository,
        private readonly plans: PlanRepository,
        private readonly clock: Clock,
        private readonly eventBus: EventBus,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(RevokeSubscriptionHandler.name)
    }

    async execute(command: RevokeSubscriptionCommand): Promise<void> {
        const subscription = await this.subscriptions.findById(command.subscriptionId)
        if (!subscription) throw new SubscriptionNotFoundError()
        if (subscription.gateway !== 'manual') throw new NotAManualSubscriptionError()

        subscription.expire(this.clock.now())
        await this.subscriptions.save(subscription)

        // Announce it like any other ending: the cached entitlements have to go, or
        // the user would keep the features they no longer have for up to a minute.
        const plan = await this.plans.findById(subscription.planId)
        this.eventBus.publish(
            new SubscriptionChangedIntegrationEvent(
                subscription.userId,
                subscription.id,
                plan?.slug ?? 'unknown',
                plan?.audience ?? 'athlete',
                'expired',
                subscription.currentPeriodEnd,
            ),
        )

        this.logger.info({ subscriptionId: subscription.id, planId: subscription.planId }, 'manual grant revoked')
    }
}
