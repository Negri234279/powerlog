import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { ApplySessionPlanCommand } from '../../../../../shared/contracts/apply-session-plan.command'
import type { WorkoutSetFields } from '../../../domain/entities/workout-set.entity'
import { WorkoutSessionNotFoundError, WorkoutSetNotFoundError } from '../../../domain/errors/workouts.errors'
import { WorkoutSessionRepository } from '../../../domain/repositories/workout-session.repository'
import { RepsVO } from '../../../domain/value-objects/reps.vo'
import { RirVO } from '../../../domain/value-objects/rir.vo'
import { RpeVO } from '../../../domain/value-objects/rpe.vo'
import { WeightVO } from '../../../domain/value-objects/weight.vo'
import { Clock } from '../../ports/clock.port'

/**
 * Writes an AI-accepted plan's targets onto a planned session. Workouts is the
 * authority here and revalidates everything: the caller owns the session, the
 * session is still `planned`, and every set id belongs to it.
 *
 * The whole plan is checked before a single set is touched, so a plan that names
 * one stale set leaves the session exactly as it was rather than half-programmed.
 * Only `planned*` targets and intensity change — performed values are untouched,
 * and no set is added, removed or reordered.
 */
@CommandHandler(ApplySessionPlanCommand)
export class ApplySessionPlanHandler implements ICommandHandler<ApplySessionPlanCommand, void> {
    constructor(
        private readonly sessions: WorkoutSessionRepository,
        private readonly clock: Clock,
    ) {}

    async execute(command: ApplySessionPlanCommand): Promise<void> {
        const session = await this.sessions.findById(command.sessionId)
        if (!session || session.userId !== command.userId) throw new WorkoutSessionNotFoundError()
        // A session already trained is history; a plan cannot rewrite it.
        if (session.status !== 'planned') throw new WorkoutSessionNotFoundError()

        // setId → entryId, so an unknown set is caught before anything is written.
        const entryOfSet = new Map<string, string>()
        for (const entry of session.entries) {
            for (const set of entry.sets) {
                entryOfSet.set(set.id, entry.id)
            }
        }

        const targets = command.sets.map((prescribed) => {
            const entryId = entryOfSet.get(prescribed.setId)
            if (!entryId) throw new WorkoutSetNotFoundError()

            return { entryId, prescribed }
        })

        const now = this.clock.now()
        for (const { entryId, prescribed } of targets) {
            const fields: WorkoutSetFields = {
                plannedWeight: prescribed.plannedWeightKg === null ? null : WeightVO.create(prescribed.plannedWeightKg),
                plannedReps: prescribed.plannedReps === null ? null : RepsVO.create(prescribed.plannedReps),
                rpe: prescribed.rpe === null ? null : RpeVO.create(prescribed.rpe),
                rir: prescribed.rir === null ? null : RirVO.create(prescribed.rir),
            }
            // `undefined` leaves the athlete's own note alone; a string replaces it.
            if (prescribed.notes !== null) fields.notes = prescribed.notes

            session.updateSet(entryId, prescribed.setId, fields, now)
        }

        await this.sessions.save(session)
    }
}
