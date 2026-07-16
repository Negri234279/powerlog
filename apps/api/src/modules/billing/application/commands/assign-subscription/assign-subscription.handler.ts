import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import { UserDirectory } from '../../../../../shared/contracts/user-directory'
import { SubscriptionChangedIntegrationEvent } from '../../../../../shared/integration-events/subscription-changed.integration-event'
import { SubscriptionAggregate } from '../../../domain/entities/subscription.entity'
import {
    PlanAudienceMismatchError,
    PlanNotAvailableError,
    PlanNotFoundError,
    SubscriptionAlreadyActiveError,
} from '../../../domain/errors/billing.errors'
import { PlanRepository } from '../../../domain/repositories/plan.repository'
import { SubscriptionRepository } from '../../../domain/repositories/subscription.repository'
import { Clock } from '../../ports/clock.port'
import { IdGenerator } from '../../ports/id-generator.port'
import { AssignSubscriptionCommand } from './assign-subscription.command'

/** A grant with no end date lasts a year — long enough to be useful, short enough
 *  that a forgotten comp does not become permanent. */
const DEFAULT_GRANT_DAYS = 365

/**
 * Puts a user on a plan by hand: comps, support, testing. `gateway = 'manual'`, no
 * price, nothing charged — but from every other point of view it is an ordinary
 * subscription, so entitlements resolve through exactly the same path as a paid one.
 */
@CommandHandler(AssignSubscriptionCommand)
export class AssignSubscriptionHandler implements ICommandHandler<AssignSubscriptionCommand, string> {
    constructor(
        private readonly subscriptions: SubscriptionRepository,
        private readonly plans: PlanRepository,
        private readonly users: UserDirectory,
        private readonly clock: Clock,
        private readonly ids: IdGenerator,
        private readonly eventBus: EventBus,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(AssignSubscriptionHandler.name)
    }

    async execute(command: AssignSubscriptionCommand): Promise<string> {
        const plan = await this.plans.findById(command.planId)
        if (!plan) throw new PlanNotFoundError()
        if (!plan.acceptsSignups()) throw new PlanNotAvailableError()

        // A comp is a subscription like any other, so it can miss the same way a
        // sale can: the entitlements would say coach while every coach-gated
        // surface reads the role and says athlete. Better to tell the admin than
        // to hand someone a plan that does nothing.
        const role = (await this.users.getRole(command.userId)) ?? 'athlete'
        if (plan.audience !== role) throw new PlanAudienceMismatchError(plan.audience, role)

        // One live subscription per user. Refusing here (rather than letting the
        // partial unique index do it) also stops an admin from silently shadowing a
        // paid subscription with a comp.
        if (await this.subscriptions.findLiveByUser(command.userId)) {
            throw new SubscriptionAlreadyActiveError()
        }

        const now = this.clock.now()
        const until = command.until ?? new Date(now.getTime() + DEFAULT_GRANT_DAYS * 24 * 60 * 60 * 1000)

        const subscription = SubscriptionAggregate.create({
            id: this.ids.uuid(),
            userId: command.userId,
            planId: plan.id,
            gateway: 'manual',
            status: 'active',
            currentPeriodStart: now,
            currentPeriodEnd: until,
            now,
        })
        await this.subscriptions.save(subscription)

        // The same announcement a paid activation makes: the bell, the open tab and
        // the entitlements cache all react to a comp exactly as they do to a payment.
        this.eventBus.publish(
            new SubscriptionChangedIntegrationEvent(
                subscription.userId,
                subscription.id,
                plan.slug,
                'activated',
                subscription.currentPeriodEnd,
            ),
        )

        this.logger.info(
            { subscriptionId: subscription.id, plan: plan.slug, gateway: 'manual', until },
            'subscription granted manually',
        )

        return subscription.id
    }
}
