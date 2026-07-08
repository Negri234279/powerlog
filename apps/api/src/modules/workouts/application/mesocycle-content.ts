import type { MesocycleContentInput } from '../domain/entities/mesocycle.entity'
import { ExerciseNotFoundError } from '../domain/errors/workouts.errors'
import { ExerciseRepository } from '../domain/repositories/exercise.repository'
import { MesocycleNameVO } from '../domain/value-objects/mesocycle-name.vo'
import { RepsVO } from '../domain/value-objects/reps.vo'
import { RirVO } from '../domain/value-objects/rir.vo'
import { RpeVO } from '../domain/value-objects/rpe.vo'
import { WeightVO, type WeightUnit } from '../domain/value-objects/weight.vo'

/**
 * Raw mesocycle content from presentation. Weights are in `unit` (default kg) and
 * converted to canonical kg by `buildMesocycleContent`. Shared by the create and
 * update mesocycle commands.
 */
export interface MesocycleDaySetRaw {
    unit?: string | null
    plannedWeight?: number | null
    plannedReps?: number | null
    rpe?: number | null
    rir?: number | null
    notes?: string | null
}

export interface MesocycleDayExerciseRaw {
    exerciseId: string
    notes?: string | null
    sets: MesocycleDaySetRaw[]
}

export interface MicrocycleDayRaw {
    dayOffset: number
    label?: string | null
    notes?: string | null
    exercises: MesocycleDayExerciseRaw[]
}

export interface MicrocycleRaw {
    label?: string | null
    notes?: string | null
    days: MicrocycleDayRaw[]
}

export interface MesocycleContentRaw {
    name: string
    notes?: string | null
    goal?: string | null
    /** ISO date (YYYY-MM-DD) anchoring week 1; null/absent = unscheduled. */
    startDate?: string | null
    microcycles: MicrocycleRaw[]
}

/**
 * Validate raw content and turn it into a domain `MesocycleContentInput` (VOs):
 * checks every referenced exercise exists in the catalog and converts weights to
 * kg. The aggregate then enforces the rest (name length, RPE/RIR exclusivity).
 */
export async function buildMesocycleContent(
    raw: MesocycleContentRaw,
    exercises: ExerciseRepository,
): Promise<MesocycleContentInput> {
    const uniqueExerciseIds = [
        ...new Set(
            raw.microcycles.flatMap((microcycle) =>
                microcycle.days.flatMap((day) => day.exercises.map((exercise) => exercise.exerciseId)),
            ),
        ),
    ]
    
    for (const exerciseId of uniqueExerciseIds) {
        if (!(await exercises.findById(exerciseId))) {
            throw new ExerciseNotFoundError()
        }
    }

    return {
        name: MesocycleNameVO.create(raw.name),
        notes: raw.notes ?? null,
        goal: raw.goal ?? null,
        startDate: raw.startDate ? new Date(raw.startDate) : null,
        microcycles: raw.microcycles.map((microcycle) => ({
            label: microcycle.label ?? null,
            notes: microcycle.notes ?? null,
            days: microcycle.days.map((day) => ({
                dayOffset: day.dayOffset,
                label: day.label ?? null,
                notes: day.notes ?? null,
                exercises: day.exercises.map((exercise) => ({
                    exerciseId: exercise.exerciseId,
                    notes: exercise.notes ?? null,
                    sets: exercise.sets.map((set) => {
                        const unit = (set.unit ?? 'kg') as WeightUnit

                        return {
                            plannedWeight:
                                set.plannedWeight != null ? WeightVO.fromUnit(set.plannedWeight, unit) : null,
                            plannedReps: set.plannedReps != null ? RepsVO.create(set.plannedReps) : null,
                            rpe: set.rpe != null ? RpeVO.create(set.rpe) : null,
                            rir: set.rir != null ? RirVO.create(set.rir) : null,
                            notes: set.notes ?? null,
                        }
                    }),
                })),
            })),
        })),
    }
}
