import type { WorkoutSessionAggregate } from '../domain/entities/workout-session.entity'
import type { WorkoutTemplateAggregate } from '../domain/entities/workout-template.entity'
import type { IdGenerator } from './ports/id-generator.port'

/**
 * Copy a template's exercises and programmed sets into a (fresh) session: each
 * template set becomes a session set with only its `planned*`/intensity/notes
 * filled in — performed values stay empty until the athlete logs them.
 */
export function materializeTemplateInto(
    session: WorkoutSessionAggregate,
    template: WorkoutTemplateAggregate,
    ids: IdGenerator,
    now: Date,
): void {
    for (const exercise of template.exercises) {
        const entry = session.addEntry({ id: ids.uuid(), exerciseId: exercise.exerciseId, notes: exercise.notes }, now)

        for (const set of exercise.sets) {
            session.addSet(
                entry.id,
                {
                    id: ids.uuid(),
                    plannedWeight: set.plannedWeight,
                    plannedReps: set.plannedReps,
                    rpe: set.rpe,
                    rir: set.rir,
                    notes: set.notes,
                },
                now,
            )
        }
    }
}
