/**
 * Client mirror of the API's fixed exercise taxonomy (kept in sync with
 * `apps/api/.../domain/exercise-taxonomy.ts`). Used by the admin catalog filters
 * and the create/edit form. The API re-validates every value, so this is for UX.
 */
export const EXERCISE_CATEGORIES = [
    'squat',
    'bench',
    'deadlift',
    'chest',
    'back',
    'shoulders',
    'legs',
    'arms',
    'core',
] as const

export const EXERCISE_EQUIPMENT = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'] as const

export const EXERCISE_MUSCLES = [
    'chest',
    'back',
    'lats',
    'shoulders',
    'biceps',
    'triceps',
    'quads',
    'hamstrings',
    'glutes',
    'calves',
    'core',
] as const

const titleCase = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1)

/** `[{ value, label }]` for a MultiSelect/Select from a taxonomy tuple. */
export function taxonomyOptions(values: readonly string[]): { value: string; label: string }[] {
    return values.map((value) => ({ value, label: titleCase(value) }))
}
