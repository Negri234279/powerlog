import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'

import { UserRegisteredIntegrationEvent } from '../../../../shared/integration-events/user-registered.integration-event'
import { AuthMetrics } from '../ports/auth-metrics.port'

/**
 * Counts new account registrations (`powerlog_auth_registrations_total{method}`)
 * from the registration integration event, which already carries the method
 * (password vs google) — so both flows are covered without touching their handlers.
 */
@EventsHandler(UserRegisteredIntegrationEvent)
export class CountRegistrationOnUserRegistered implements IEventHandler<UserRegisteredIntegrationEvent> {
    constructor(private readonly metrics: AuthMetrics) {}

    handle(event: UserRegisteredIntegrationEvent): void {
        this.metrics.recordRegistration(event.source)
    }
}
