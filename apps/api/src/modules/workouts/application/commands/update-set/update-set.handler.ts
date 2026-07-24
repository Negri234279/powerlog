import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { CoachLinks } from '../../../../../shared/contracts/coach-links'
import type { WorkoutSetFields } from '../../../domain/entities/workout-set.entity'
import { WorkoutSessionRepository } from '../../../domain/repositories/workout-session.repository'
import { RepsRangeVO } from '../../../domain/value-objects/reps-range.vo'
import { RepsVO } from '../../../domain/value-objects/reps.vo'
import { RirVO } from '../../../domain/value-objects/rir.vo'
import { RpeVO } from '../../../domain/value-objects/rpe.vo'
import { WeightRangeVO } from '../../../domain/value-objects/weight-range.vo'
import { WeightVO, type WeightUnit } from '../../../domain/value-objects/weight.vo'
import { Clock } from '../../ports/clock.port'
import {
    type WorkoutSessionView,
    toWorkoutSessionView,
} from '../../queries/get-workout-session/get-workout-session.handler'
import { requireManageableSession } from '../../require-manageable-session'
import { UpdateSetCommand } from './update-set.command'

@CommandHandler(UpdateSetCommand)
export class UpdateSetHandler implements ICommandHandler<UpdateSetCommand, WorkoutSessionView> {
    constructor(
        private readonly sessions: WorkoutSessionRepository,
        private readonly coachLinks: CoachLinks,
        private readonly clock: Clock,
    ) {}

    async execute(command: UpdateSetCommand): Promise<WorkoutSessionView> {
        const session = await requireManageableSession(
            this.sessions,
            this.coachLinks,
            command.sessionId,
            command.userId,
        )
        const raw = command.fields
        const unit = (raw.unit ?? 'kg') as WeightUnit

        // Only keys explicitly present change; `null` clears the value.
        const fields: WorkoutSetFields = {}
        if (raw.plannedWeight !== undefined)
            fields.plannedWeight = raw.plannedWeight === null ? null : WeightRangeVO.parse(raw.plannedWeight, unit)
        if (raw.plannedReps !== undefined)
            fields.plannedReps = raw.plannedReps === null ? null : RepsRangeVO.parse(raw.plannedReps)
        if (raw.weight !== undefined) fields.weight = raw.weight === null ? null : WeightVO.fromUnit(raw.weight, unit)
        if (raw.reps !== undefined) fields.reps = raw.reps === null ? null : RepsVO.create(raw.reps)
        if (raw.rpe !== undefined) fields.rpe = raw.rpe === null ? null : RpeVO.create(raw.rpe)
        if (raw.rir !== undefined) fields.rir = raw.rir === null ? null : RirVO.create(raw.rir)
        if (raw.outcome !== undefined) fields.outcome = raw.outcome
        if (raw.notes !== undefined) fields.notes = raw.notes

        session.updateSet(command.entryId, command.setId, fields, this.clock.now())

        await this.sessions.save(session)

        return toWorkoutSessionView(session)
    }
}
