import type { AthleteStrength, CatalogExercise } from '../../../../shared/contracts/mesocycle-design-context'
import type { MesocycleDraftProposal } from '../../domain/entities/ai-mesocycle-draft.entity'
import { prescribeLoad } from '../../domain/load-calculator'

/**
 * Fills in every set's `plannedWeightKg` from the athlete's e1RM, the target
 * reps/intensity, and the exercise's equipment — the arithmetic the model used to
 * be asked to do in prose (IA.5). Runs after the parser, on the parsed week.
 *
 * A set keeps a null weight wherever there is nothing to compute from: no e1RM on
 * that lift, a bodyweight movement, or a target with no reps. That is exactly the
 * behaviour the prompt used to request by hand ("never guess a weight …").
 */
export function fillMesocycleLoads(
    proposal: MesocycleDraftProposal,
    catalog: ReadonlyMap<string, CatalogExercise>,
    strength: readonly AthleteStrength[],
): MesocycleDraftProposal {
    const e1rmBySlug = new Map(strength.map((lift) => [lift.slug, lift.e1rmKg]))

    return {
        ...proposal,
        days: proposal.days.map((day) => ({
            ...day,
            exercises: day.exercises.map((exercise) => {
                const equipment = catalog.get(exercise.slug)?.equipment ?? 'bodyweight'
                const e1rmKg = e1rmBySlug.get(exercise.slug) ?? null

                return {
                    ...exercise,
                    sets: exercise.sets.map((set) => ({
                        ...set,
                        plannedWeightKg:
                            set.plannedReps === null
                                ? null
                                : prescribeLoad({
                                      e1rmKg,
                                      reps: set.plannedReps,
                                      rir: set.rir,
                                      rpe: set.rpe,
                                      equipment,
                                  }),
                    })),
                }
            }),
        })),
    }
}
