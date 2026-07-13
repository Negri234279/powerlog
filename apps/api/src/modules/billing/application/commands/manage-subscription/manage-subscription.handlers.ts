import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import type { SubscriptionAggregate } from '../../../domain/entities/subscription.entity'
import {
    NoActiveSubscriptionError,
    NotAGatewaySubscriptionError,
    PlanNotAvailableError,
    PlanNotFoundError,
    PlanPriceNotFoundError,
    ResumeNotSupportedError,
    SamePlanError,
} from '../../../domain/errors/billing.errors'
import { PlanPriceRepository } from '../../../domain/repositories/plan-price.repository'
import { PlanRepository } from '../../../domain/repositories/plan.repository'
import { SubscriptionRepository } from '../../../domain/repositories/subscription.repository'
import { Clock } from '../../ports/clock.port'
import { GatewayProvider } from '../../ports/gateway-provider.port'
import { CancelSubscriptionCommand, ChangePlanCommand, ResumeSubscriptionCommand } from './manage-subscription.commands'

/**
 * The three things a subscriber can do to their own subscription.
 *
 * All of them are **requests to the gateway, not local edits**: we ask, and the
 * row changes when the webhook confirms it. That is what keeps the app and the
 * provider from disagreeing about what was paid for — and it means cancelling in
 * Stripe's portal and cancelling here end up in exactly the same place.
 *
 * A `manual` grant is not any of this: an admin gave it, an admin takes it away.
 */
abstract class SubscriberAction {
    protected constructor(
        protected readonly subscriptions: SubscriptionRepository,
        protected readonly gateways: GatewayProvider,
        protected readonly clock: Clock,
    ) {}

    /** The user's live, gateway-billed subscription — or a clean refusal. */
    protected async requireGatewaySubscription(userId: string): Promise<SubscriptionAggregate> {
        const subscription = await this.subscriptions.findLiveByUser(userId)
        if (!subscription?.isEntitledAt(this.clock.now())) throw new NoActiveSubscriptionError()
        if (subscription.gateway === 'manual') throw new NotAGatewaySubscriptionError()

        return subscription
    }
}

@CommandHandler(CancelSubscriptionCommand)
export class CancelSubscriptionHandler extends SubscriberAction implements ICommandHandler<CancelSubscriptionCommand> {
    constructor(
        subscriptions: SubscriptionRepository,
        gateways: GatewayProvider,
        clock: Clock,
        private readonly logger: PinoLogger,
    ) {
        super(subscriptions, gateways, clock)
        this.logger.setContext(CancelSubscriptionHandler.name)
    }

    async execute(command: CancelSubscriptionCommand): Promise<void> {
        const subscription = await this.requireGatewaySubscription(command.userId)

        // Cancel-at-period-end, always: the user paid for this month and they keep it.
        // The local row flips when the webhook says so.
        await this.gateways.get(subscription.gateway).cancelAtPeriodEnd(subscription)

        this.logger.info({ subscriptionId: subscription.id, gateway: subscription.gateway }, 'cancellation requested')
    }
}

@CommandHandler(ResumeSubscriptionCommand)
export class ResumeSubscriptionHandler extends SubscriberAction implements ICommandHandler<ResumeSubscriptionCommand> {
    constructor(
        subscriptions: SubscriptionRepository,
        gateways: GatewayProvider,
        clock: Clock,
        private readonly logger: PinoLogger,
    ) {
        super(subscriptions, gateways, clock)
        this.logger.setContext(ResumeSubscriptionHandler.name)
    }

    async execute(command: ResumeSubscriptionCommand): Promise<void> {
        const subscription = await this.requireGatewaySubscription(command.userId)
        const gateway = this.gateways.get(subscription.gateway)

        // PayPal's cancellation is terminal. The UI already hides the button; this is
        // the server saying the same thing to anyone who calls the API directly.
        if (!gateway.supportsResume) throw new ResumeNotSupportedError(subscription.gateway)

        await gateway.resume(subscription)

        this.logger.info({ subscriptionId: subscription.id }, 'resume requested')
    }
}

@CommandHandler(ChangePlanCommand)
export class ChangePlanHandler extends SubscriberAction implements ICommandHandler<ChangePlanCommand, string | null> {
    constructor(
        subscriptions: SubscriptionRepository,
        gateways: GatewayProvider,
        clock: Clock,
        private readonly plans: PlanRepository,
        private readonly prices: PlanPriceRepository,
        private readonly logger: PinoLogger,
    ) {
        super(subscriptions, gateways, clock)
        this.logger.setContext(ChangePlanHandler.name)
    }

    async execute(command: ChangePlanCommand): Promise<string | null> {
        const subscription = await this.requireGatewaySubscription(command.userId)
        if (subscription.planPriceId === command.planPriceId) throw new SamePlanError()

        const target = await this.prices.findById(command.planPriceId)
        if (!target || !target.active) throw new PlanPriceNotFoundError()

        const plan = await this.plans.findById(target.planId)
        if (!plan) throw new PlanNotFoundError()
        if (!plan.acceptsSignups()) throw new PlanNotAvailableError()

        const current = subscription.planPriceId ? await this.prices.findById(subscription.planPriceId) : null
        const isUpgrade = target.monthlyAmountCents() >= (current?.monthlyAmountCents() ?? 0)

        // An upgrade is charged now, pro-rated: they want the feature today.
        // A downgrade waits for the period they already paid for to run out — this
        // app does not take money back, and it does not take away time either.
        // PayPal makes the subscriber approve the change; Stripe applies it. So this
        // is an approval URL or nothing, and the caller sends the browser there.
        const approvalUrl = await this.gateways
            .get(subscription.gateway)
            .changePlan(subscription, target, isUpgrade ? 'immediate_proration' : 'at_period_end')

        if (!isUpgrade) {
            // Remembered locally so the UI can say "you move to X on the 3rd" before
            // the gateway's renewal webhook makes it real.
            subscription.schedulePlanChange(target.id, this.clock.now())
            await this.subscriptions.save(subscription)
        }

        this.logger.info(
            {
                subscriptionId: subscription.id,
                plan: plan.slug,
                upgrade: isUpgrade,
                needsApproval: Boolean(approvalUrl),
            },
            'plan change requested',
        )

        return approvalUrl
    }
}
