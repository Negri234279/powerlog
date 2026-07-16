import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import { CoachLinks } from '../../../../../shared/contracts/coach-links'
import type { WorkoutSetFields } from '../../../domain/entities/workout-set.entity'
import { WorkoutSessionRepository } from '../../../domain/repositories/workout-session.repository'
import { RepsVO } from '../../../domain/value-objects/reps.vo'
import { RirVO } from '../../../domain/value-objects/rir.vo'
import { RpeVO } from '../../../domain/value-objects/rpe.vo'
import { WeightVO, type WeightUnit } from '../../../domain/value-objects/weight.vo'
import { Clock } from '../../ports/clock.port'
import { SetMetrics } from '../../ports/set-metrics.port'
import {
    type WorkoutSessionView,
    toWorkoutSessionView,
} from '../../queries/get-workout-session/get-workout-session.handler'
import { requireManageableSession } from '../../require-manageable-session'
import { CompleteSetCommand } from './complete-set.command'

@CommandHandler(CompleteSetCommand)
export class CompleteSetHandler implements ICommandHandler<CompleteSetCommand, WorkoutSessionView> {
    constructor(
        private readonly sessions: WorkoutSessionRepository,
        private readonly coachLinks: CoachLinks,
        private readonly clock: Clock,
        private readonly metrics: SetMetrics,
        private readonly logger?: PinoLogger,
    ) {
        this.logger?.setContext(CompleteSetHandler.name)
    }

    async execute(command: CompleteSetCommand): Promise<WorkoutSessionView> {
        const session = await requireManageableSession(
            this.sessions,
            this.coachLinks,
            command.sessionId,
            command.userId,
        )
        const raw = command.performed
        const unit = (raw.unit ?? 'kg') as WeightUnit

        // Only keys explicitly present change; `null` clears the value. A failed
        // set needn't carry numbers at all — failing can mean it never went up.
        const fields: WorkoutSetFields = {}
        if (raw.weight !== undefined) fields.weight = raw.weight === null ? null : WeightVO.fromUnit(raw.weight, unit)
        if (raw.reps !== undefined) fields.reps = raw.reps === null ? null : RepsVO.create(raw.reps)
        if (raw.rpe !== undefined) fields.rpe = raw.rpe === null ? null : RpeVO.create(raw.rpe)
        if (raw.rir !== undefined) fields.rir = raw.rir === null ? null : RirVO.create(raw.rir)
        if (raw.notes !== undefined) fields.notes = raw.notes

        session.completeSet(command.entryId, command.setId, command.outcome, fields, this.clock.now())

        await this.sessions.save(session)

        this.metrics.recordCompleted(command.outcome)
        this.logger?.info(
            { sessionId: session.id, entryId: command.entryId, setId: command.setId, outcome: command.outcome },
            'set marked done',
        )

        return toWorkoutSessionView(session)
    }
}
