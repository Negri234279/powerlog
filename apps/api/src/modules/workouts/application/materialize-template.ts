import type { WorkoutSessionAggregate } from '../domain/entities/workout-session.entity'
import type { WorkoutTemplateAggregate } from '../domain/entities/workout-template.entity'
import type { RepsVO } from '../domain/value-objects/reps.vo'
import type { RirVO } from '../domain/value-objects/rir.vo'
import type { RpeVO } from '../domain/value-objects/rpe.vo'
import type { WeightVO } from '../domain/value-objects/weight.vo'
import type { IdGenerator } from './ports/id-generator.port'

/** A programmed set (planned targets only) — the shape template + mesocycle-day
 *  sets share, so both can be materialized through the same helper. */
export interface ProgrammedSet {
    plannedWeight: WeightVO | null
    plannedReps: RepsVO | null
    rpe: RpeVO | null
    rir: RirVO | null
    notes: string | null
}

/** A programmed exercise with its ordered sets. */
export interface ProgrammedExercise {
    exerciseId: string
    notes: string | null
    sets: readonly ProgrammedSet[]
}

/**
 * Copy programmed exercises and their sets into a (fresh) session: each set
 * becomes a session set with only its `planned*`/notes filled in — performed
 * values stay empty until the athlete logs them. Reused by template and
 * mesocycle materialization.
 */
export function materializeProgrammedExercises(
    session: WorkoutSessionAggregate,
    exercises: readonly ProgrammedExercise[],
    ids: IdGenerator,
    now: Date,
): void {
    for (const exercise of exercises) {
        const entry = session.addEntry({ id: ids.uuid(), exerciseId: exercise.exerciseId, notes: exercise.notes }, now)

        for (const set of exercise.sets) {
            session.addSet(
                entry.id,
                {
                    id: ids.uuid(),
                    plannedWeight: set.plannedWeight,
                    plannedReps: set.plannedReps,
                    // A programmed set's rpe/rir IS the target, so it lands in the
                    // session's planned_* fields — the performed ones stay empty
                    // until the athlete marks the set done.
                    plannedRpe: set.rpe,
                    plannedRir: set.rir,
                    notes: set.notes,
                },
                now,
            )
        }
    }
}

/** Copy a template's exercises and programmed sets into a (fresh) session. */
export function materializeTemplateInto(
    session: WorkoutSessionAggregate,
    template: WorkoutTemplateAggregate,
    ids: IdGenerator,
    now: Date,
): void {
    materializeProgrammedExercises(session, template.exercises, ids, now)
}
