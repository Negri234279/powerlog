import { Injectable } from '@nestjs/common'
import { EventBus } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import {
    CoachLinkRemovedIntegrationEvent,
    type UnlinkedBy,
} from '../../../../shared/integration-events/coach-link-removed.integration-event'
import { UserDirectory } from '../../../../shared/contracts/user-directory'
import { CoachLinkRepository } from '../../domain/repositories/coach-link.repository'
import { CoachingMetrics } from '../ports/coaching-metrics.port'

/**
 * Breaks a coach↔athlete link from either side and announces it. Shared by
 * `removeAthlete` (coach) and `leaveCoach` (athlete) — the only difference
 * between them is who asked and which error a missing link raises.
 */
@Injectable()
export class CoachUnlinker {
    constructor(
        private readonly links: CoachLinkRepository,
        private readonly users: UserDirectory,
        private readonly metrics: CoachingMetrics,
        private readonly eventBus: EventBus,
        private readonly logger?: PinoLogger,
    ) {
        this.logger?.setContext(CoachUnlinker.name)
    }

    /** Returns false when they were not linked (the caller picks the error). */
    async unlink(coachId: string, athleteId: string, unlinkedBy: UnlinkedBy): Promise<boolean> {
        if (!(await this.links.unlink(coachId, athleteId))) return false

        // Counted here rather than on the two commands: this is the one place a
        // link is actually broken (a no-op remove/leave must not look like churn).
        this.metrics.recordLinkRemoved(unlinkedBy)

        const [coach, athlete] = await Promise.all([this.users.getContact(coachId), this.users.getContact(athleteId)])
        this.eventBus.publish(
            new CoachLinkRemovedIntegrationEvent(
                coachId,
                athleteId,
                coach?.username ?? '',
                athlete?.username ?? '',
                unlinkedBy,
            ),
        )

        this.logger?.info({ coachId, athleteId, unlinkedBy }, 'coaching link removed')

        return true
    }
}
