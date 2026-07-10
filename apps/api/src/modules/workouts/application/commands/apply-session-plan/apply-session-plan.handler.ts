import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { ApplySessionPlanCommand } from '../../../../../shared/contracts/apply-session-plan.command'
import type { PrescribedSet } from '../../../../../shared/contracts/session-plan-applier'
import type { WorkoutSetFields } from '../../../domain/entities/workout-set.entity'
import { ExerciseEntryNotFoundError, WorkoutSessionNotFoundError } from '../../../domain/errors/workouts.errors'
import { WorkoutSessionRepository } from '../../../domain/repositories/workout-session.repository'
import { RepsVO } from '../../../domain/value-objects/reps.vo'
import { RirVO } from '../../../domain/value-objects/rir.vo'
import { RpeVO } from '../../../domain/value-objects/rpe.vo'
import { WeightVO } from '../../../domain/value-objects/weight.vo'
import { Clock } from '../../ports/clock.port'
import { IdGenerator } from '../../ports/id-generator.port'

/**
 * Writes an AI-accepted plan onto a planned session. Workouts is the authority
 * here and revalidates everything: the caller owns the session, the session is
 * still `planned`, and every entry id belongs to it — all checked before a
 * single set is touched, so a stale plan leaves the session exactly as it was.
 *
 * Prescriptions are positional within their entry: position `n` fills the nth
 * existing set's targets, positions past the end append new planned sets. The
 * plan decides how many working sets a day has, but it never deletes a set the
 * athlete created, never reorders, and never touches performed values.
 */
@CommandHandler(ApplySessionPlanCommand)
export class ApplySessionPlanHandler implements ICommandHandler<ApplySessionPlanCommand, void> {
    constructor(
        private readonly sessions: WorkoutSessionRepository,
        private readonly clock: Clock,
        private readonly ids: IdGenerator,
    ) {}

    async execute(command: ApplySessionPlanCommand): Promise<void> {
        const session = await this.sessions.findById(command.sessionId)
        if (!session || session.userId !== command.userId) throw new WorkoutSessionNotFoundError()
        // A session already trained is history; a plan cannot rewrite it.
        if (session.status !== 'planned') throw new WorkoutSessionNotFoundError()

        // Whole-plan validation up front: one stale entry rejects everything.
        const entryIds = new Set(session.entries.map((entry) => entry.id))
        for (const prescribed of command.sets) {
            if (!entryIds.has(prescribed.entryId)) throw new ExerciseEntryNotFoundError()
        }

        const now = this.clock.now()
        for (const [entryId, prescriptions] of groupByEntry(command.sets)) {
            // Existing sets in position order; entities keep them sorted already.
            const existing = session.entries.find((entry) => entry.id === entryId)!.sets.map((set) => set.id)

            for (const prescribed of prescriptions) {
                const targetSetId = existing[prescribed.order - 1]

                if (targetSetId) {
                    session.updateSet(entryId, targetSetId, fieldsOf(prescribed), now)
                } else {
                    // `addSet` appends and assigns the next order itself; the
                    // prescriptions are sorted, so positions line up.
                    session.addSet(entryId, { id: this.ids.uuid(), ...fieldsOf(prescribed) }, now)
                }
            }
        }

        await this.sessions.save(session)
    }
}

/** Prescriptions per entry, each list sorted by position. */
function groupByEntry(sets: readonly PrescribedSet[]): Map<string, PrescribedSet[]> {
    const byEntry = new Map<string, PrescribedSet[]>()
    for (const set of sets) {
        const list = byEntry.get(set.entryId) ?? []
        list.push(set)
        byEntry.set(set.entryId, list)
    }
    for (const list of byEntry.values()) {
        list.sort((a, b) => a.order - b.order)
    }

    return byEntry
}

function fieldsOf(prescribed: PrescribedSet): WorkoutSetFields {
    const fields: WorkoutSetFields = {
        plannedWeight: prescribed.plannedWeightKg === null ? null : WeightVO.create(prescribed.plannedWeightKg),
        plannedReps: prescribed.plannedReps === null ? null : RepsVO.create(prescribed.plannedReps),
        rpe: prescribed.rpe === null ? null : RpeVO.create(prescribed.rpe),
        rir: prescribed.rir === null ? null : RirVO.create(prescribed.rir),
    }
    // `undefined` leaves the athlete's own note alone; a string replaces it.
    if (prescribed.notes !== null) fields.notes = prescribed.notes

    return fields
}
