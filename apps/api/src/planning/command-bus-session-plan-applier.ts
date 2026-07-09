import { Injectable } from '@nestjs/common'
import { CommandBus } from '@nestjs/cqrs'

import { ApplySessionPlanCommand } from '../shared/contracts/apply-session-plan.command'
import { SessionPlanApplier, type SessionPlanInput } from '../shared/contracts/session-plan-applier'

/**
 * Bridges the AI-side `SessionPlanApplier` port to the workouts module via the
 * CommandBus. The command awaits the handler and surfaces its failure, so a
 * rejected plan (stale set id, session already trained) never leaves the draft
 * marked as accepted. Mirrors `CommandBusProfileProvisioner`.
 */
@Injectable()
export class CommandBusSessionPlanApplier extends SessionPlanApplier {
    constructor(private readonly commandBus: CommandBus) {
        super()
    }

    async apply(input: SessionPlanInput): Promise<void> {
        const command = new ApplySessionPlanCommand(input.userId, input.sessionId, input.sets)

        await this.commandBus.execute(command)
    }
}
