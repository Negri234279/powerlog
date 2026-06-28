import type { TemplateContentInput } from '../domain/entities/workout-template.entity'
import { ExerciseNotFoundError } from '../domain/errors/workouts.errors'
import { ExerciseRepository } from '../domain/repositories/exercise.repository'
import { RepsVO } from '../domain/value-objects/reps.vo'
import { RirVO } from '../domain/value-objects/rir.vo'
import { RpeVO } from '../domain/value-objects/rpe.vo'
import { TemplateNameVO } from '../domain/value-objects/template-name.vo'
import { WeightVO, type WeightUnit } from '../domain/value-objects/weight.vo'

/**
 * Raw template content from presentation. Weights are in `unit` (default kg) and
 * converted to canonical kg by `buildTemplateContent`. Shared by the create and
 * update template commands.
 */
export interface TemplateSetRaw {
    unit?: string | null
    plannedWeight?: number | null
    plannedReps?: number | null
    rpe?: number | null
    rir?: number | null
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
                    plannedWeight: set.plannedWeight != null ? WeightVO.fromUnit(set.plannedWeight, unit) : null,
                    plannedReps: set.plannedReps != null ? RepsVO.create(set.plannedReps) : null,
                    rpe: set.rpe != null ? RpeVO.create(set.rpe) : null,
                    rir: set.rir != null ? RirVO.create(set.rir) : null,
                    notes: set.notes ?? null,
                }
            }),
        })),
    }
}
