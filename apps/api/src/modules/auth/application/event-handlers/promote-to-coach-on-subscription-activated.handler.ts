import { EventBus, EventsHandler, type IEventHandler } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import {
    type SubscriptionChangeReason,
    SubscriptionChangedIntegrationEvent,
} from '../../../../shared/integration-events/subscription-changed.integration-event'
import { UserRoleChangedIntegrationEvent } from '../../../../shared/integration-events/user-role-changed.integration-event'
import { UserRepository } from '../../domain/repositories/user.repository'
import { Clock } from '../ports/clock.port'

/**
 * Coach onboarding, second half. An athlete who buys a coach plan is **not** made
 * a coach when they start checkout — a user who pays and walks away must stay an
 * athlete — but here, when the coach-plan subscription actually activates and the
 * webhook announces it, they become a coach.
 *
 * Only ever **promotes** (athlete → coach): a coach whose subscription lapses
 * drops to the free coach plan, not back to athlete. `becomeCoach` is idempotent,
 * so a renewal — or a repeat activation of someone already a coach — is a no-op,
 * and the {@link UserRoleChangedIntegrationEvent} (which busts the entitlements
 * cache) only fires when the role really moved.
 *
 * The browser learns of the new role the same way it learns of the activation: the
 * realtime push tells the tab to refetch, and the plan page refreshes the session
 * so the JWT carries `role=coach` for the API's coach-gated surfaces.
 */
const PROMOTING: ReadonlySet<SubscriptionChangeReason> = new Set([
    'activated',
    'renewed',
    'resumed',
    'plan_changed',
])

@EventsHandler(SubscriptionChangedIntegrationEvent)
export class PromoteToCoachOnSubscriptionActivated implements IEventHandler<SubscriptionChangedIntegrationEvent> {
    constructor(
        private readonly users: UserRepository,
        private readonly clock: Clock,
        private readonly eventBus: EventBus,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(PromoteToCoachOnSubscriptionActivated.name)
    }

    async handle(event: SubscriptionChangedIntegrationEvent): Promise<void> {
        // Only a coach plan going (or staying) live promotes; an ending never does.
        if (event.audience !== 'coach' || !PROMOTING.has(event.reason)) return

        const user = await this.users.findById(event.userId)
        // Gone between paying and the webhook landing: nothing to promote, and no
        // reason to fail the webhook over it.
        if (!user) return
        if (user.role.value === 'coach') return

        user.becomeCoach(this.clock.now())
        await this.users.save(user)

        // Same announcement `becomeCoach`/`setRole` make: it busts the entitlements
        // cache so the coach catalog resolves right away.
        this.eventBus.publish(new UserRoleChangedIntegrationEvent(user.id, user.role.value))
        this.logger.info({ userId: user.id, plan: event.planSlug }, 'promoted to coach on coach-plan activation')
    }
}
