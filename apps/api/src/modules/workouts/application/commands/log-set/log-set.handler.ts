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
import { IdGenerator } from '../../ports/id-generator.port'
import {
    type WorkoutSessionView,
    toWorkoutSessionView,
} from '../../queries/get-workout-session/get-workout-session.handler'
import { requireManageableSession } from '../../require-manageable-session'
import { LogSetCommand } from './log-set.command'

@CommandHandler(LogSetCommand)
export class LogSetHandler implements ICommandHandler<LogSetCommand, WorkoutSessionView> {
    constructor(
        private readonly sessions: WorkoutSessionRepository,
        private readonly coachLinks: CoachLinks,
        private readonly clock: Clock,
        private readonly ids: IdGenerator,
    ) {}

    async execute(command: LogSetCommand): Promise<WorkoutSessionView> {
        const session = await requireManageableSession(
            this.sessions,
            this.coachLinks,
            command.sessionId,
            command.userId,
        )
        const raw = command.set
        const unit = (raw.unit ?? 'kg') as WeightUnit
        const fields: WorkoutSetFields = {
            plannedWeight: raw.plannedWeight != null ? WeightRangeVO.parse(raw.plannedWeight, unit) : null,
            plannedReps: raw.plannedReps != null ? RepsRangeVO.parse(raw.plannedReps) : null,
            weight: raw.weight != null ? WeightVO.fromUnit(raw.weight, unit) : null,
            reps: raw.reps != null ? RepsVO.create(raw.reps) : null,
            rpe: raw.rpe != null ? RpeVO.create(raw.rpe) : null,
            rir: raw.rir != null ? RirVO.create(raw.rir) : null,
            notes: raw.notes ?? null,
        }

        session.addSet(command.entryId, { id: this.ids.uuid(), ...fields }, this.clock.now())

        await this.sessions.save(session)

        return toWorkoutSessionView(session)
    }
}
