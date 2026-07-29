import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'

import { UserDirectory } from '../../shared/contracts/user-directory'
import { WorkoutSessionPlannedIntegrationEvent } from '../../shared/integration-events/workout-session-planned.integration-event'
import { PushCopy } from '../push-copy'
import { PushNotifier } from '../push-notifier'

/** Pushes the athlete when their coach puts a session on their calendar — the
 *  same event that bells them, reaching the device with the app closed. */
@EventsHandler(WorkoutSessionPlannedIntegrationEvent)
export class PushOnSessionPlanned implements IEventHandler<WorkoutSessionPlannedIntegrationEvent> {
    constructor(
        private readonly push: PushNotifier,
        private readonly users: UserDirectory,
    ) {}

    async handle(event: WorkoutSessionPlannedIntegrationEvent): Promise<void> {
        const coach = await this.users.getContact(event.coachId)
        const coachName = coach?.username ?? ''

        await this.push.send([event.athleteId], (locale) => PushCopy.sessionPlanned(locale, coachName))
    }
}
