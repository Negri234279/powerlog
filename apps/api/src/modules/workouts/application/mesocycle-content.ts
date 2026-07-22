import type { MesocycleAggregate, MesocycleContentInput } from '../domain/entities/mesocycle.entity'
import { ExerciseNotFoundError } from '../domain/errors/workouts.errors'
import { ExerciseRepository } from '../domain/repositories/exercise.repository'
import { MesocycleNameVO } from '../domain/value-objects/mesocycle-name.vo'
import { RepsRangeVO } from '../domain/value-objects/reps-range.vo'
import { RirRangeVO } from '../domain/value-objects/rir-range.vo'
import { RpeRangeVO } from '../domain/value-objects/rpe-range.vo'
import type { WeightUnit } from '../domain/value-objects/weight.vo'
import { WeightRangeVO } from '../domain/value-objects/weight-range.vo'

/**
 * Raw mesocycle content from presentation. Every planned target arrives in the
 * range notation (`5` or `5-8`) and is parsed here; weights are in `unit`
 * (default kg) and converted to canonical kg. Shared by the create and update
 * mesocycle commands.
 */
export interface MesocycleDaySetRaw {
    unit?: string | null
    plannedWeight?: string | null
    plannedReps?: string | null
    rpe?: string | null
    rir?: string | null
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
                                set.plannedWeight != null ? WeightRangeVO.parse(set.plannedWeight, unit) : null,
                            plannedReps: set.plannedReps != null ? RepsRangeVO.parse(set.plannedReps) : null,
                            rpe: set.rpe != null ? RpeRangeVO.parse(set.rpe) : null,
                            rir: set.rir != null ? RirRangeVO.parse(set.rir) : null,
                            notes: set.notes ?? null,
                        }
                    }),
                })),
            })),
        })),
    }
}

/**
 * The content of an existing mesocycle, ready to build a copy of it (the VOs are
 * immutable, so they are shared rather than rebuilt). `MesocycleAggregate.create`
 * mints fresh ids for the whole tree, so the copy is independent of the source.
 */
export function contentOf(mesocycle: MesocycleAggregate, startDate?: Date | null): MesocycleContentInput {
    return {
        name: mesocycle.name,
        notes: mesocycle.notes,
        goal: mesocycle.goal,
        startDate: startDate === undefined ? mesocycle.startDate : startDate,
        microcycles: mesocycle.microcycles.map((microcycle) => ({
            label: microcycle.label,
            notes: microcycle.notes,
            days: microcycle.days.map((day) => ({
                dayOffset: day.dayOffset,
                label: day.label,
                notes: day.notes,
                exercises: day.exercises.map((exercise) => ({
                    exerciseId: exercise.exerciseId,
                    notes: exercise.notes,
                    sets: exercise.sets.map((set) => ({
                        plannedWeight: set.plannedWeight,
                        plannedReps: set.plannedReps,
                        rpe: set.rpe,
                        rir: set.rir,
                        notes: set.notes,
                    })),
                })),
            })),
        })),
    }
}
