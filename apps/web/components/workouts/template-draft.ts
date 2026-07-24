import type { WorkoutTemplateData } from '@/lib/graphql/hooks/use-workout-templates'
import { formatRange, formatWeightRange } from '@/lib/range'
import type { Units } from '@/lib/units'

export type IntensityKind = 'none' | 'rpe' | 'rir'

export interface DraftSet {
    key: string
    weight: string
    reps: string
    intensityKind: IntensityKind
    intensity: string
    notes: string
}

export interface DraftExercise {
    key: string
    exerciseId: string
    notes: string
    sets: DraftSet[]
}

export function newKey(): string {
    return crypto.randomUUID()
}

export function emptySet(): DraftSet {
    return { key: newKey(), weight: '', reps: '', intensityKind: 'none', intensity: '', notes: '' }
}

/** Build the editable draft from a loaded template (kg → display units), each
 *  planned target seeded as its range text (`5` or `5-8`). */
export function draftFromTemplate(template: WorkoutTemplateData, units: Units): DraftExercise[] {
    return template.exercises.map((exercise) => ({
        key: newKey(),
        exerciseId: exercise.exerciseId,
        notes: exercise.notes ?? '',
        sets: exercise.sets.map((set) => ({
            key: newKey(),
            weight: formatWeightRange(set.plannedWeightKg, units),
            reps: formatRange(set.plannedReps),
            intensityKind: set.rpe ? 'rpe' : set.rir ? 'rir' : 'none',
            intensity: formatRange(set.rpe ?? set.rir),
            notes: set.notes ?? '',
        })),
    }))
}

/** Trim the field to text, or null when blank — the API parses `5` / `5-8`. */
export function textOrNull(value: string): string | null {
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
}
