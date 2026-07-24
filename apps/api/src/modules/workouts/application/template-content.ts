import type { TemplateContentInput } from '../domain/entities/workout-template.entity'
import { ExerciseNotFoundError } from '../domain/errors/workouts.errors'
import { ExerciseRepository } from '../domain/repositories/exercise.repository'
import { RepsRangeVO } from '../domain/value-objects/reps-range.vo'
import { RirRangeVO } from '../domain/value-objects/rir-range.vo'
import { RpeRangeVO } from '../domain/value-objects/rpe-range.vo'
import { TemplateNameVO } from '../domain/value-objects/template-name.vo'
import type { WeightUnit } from '../domain/value-objects/weight.vo'
import { WeightRangeVO } from '../domain/value-objects/weight-range.vo'

/**
 * Raw template content from presentation. Every planned target arrives in the
 * range notation (`5` or `5-8`) and is parsed here; weights are in `unit`
 * (default kg) and converted to canonical kg. Shared by the create and update
 * template commands.
 */
export interface TemplateSetRaw {
    unit?: string | null
    plannedWeight?: string | null
    plannedReps?: string | null
    rpe?: string | null
    rir?: string | null
    notes?: string | null
}

export interface TemplateExerciseRaw {
    exerciseId: string
    notes?: string | null
    sets: TemplateSetRaw[]
}

export interface TemplateContentRaw {
    name: string
    notes?: string | null
    exercises: TemplateExerciseRaw[]
}

/**
 * Validate raw content and turn it into a domain `TemplateContentInput` (VOs):
 * checks every referenced exercise exists in the catalog and converts weights to
 * kg. The aggregate then enforces the rest (name length, RPE/RIR exclusivity).
 */
export async function buildTemplateContent(
    raw: TemplateContentRaw,
    exercises: ExerciseRepository,
): Promise<TemplateContentInput> {
    const uniqueExerciseIds = [...new Set(raw.exercises.map((exercise) => exercise.exerciseId))]
    for (const exerciseId of uniqueExerciseIds) {
        if (!(await exercises.findById(exerciseId))) {
            throw new ExerciseNotFoundError()
        }
    }

    return {
        name: TemplateNameVO.create(raw.name),
        notes: raw.notes ?? null,
        exercises: raw.exercises.map((exercise) => ({
            exerciseId: exercise.exerciseId,
            notes: exercise.notes ?? null,
            sets: exercise.sets.map((set) => {
                const unit = (set.unit ?? 'kg') as WeightUnit

                return {
                    plannedWeight: set.plannedWeight != null ? WeightRangeVO.parse(set.plannedWeight, unit) : null,
                    plannedReps: set.plannedReps != null ? RepsRangeVO.parse(set.plannedReps) : null,
                    rpe: set.rpe != null ? RpeRangeVO.parse(set.rpe) : null,
                    rir: set.rir != null ? RirRangeVO.parse(set.rir) : null,
                    notes: set.notes ?? null,
                }
            }),
        })),
    }
}
